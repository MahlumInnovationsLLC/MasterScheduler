import { Request, Response } from "express";
import { db } from "../db";
import { 
  deliveryTracking, 
  projects, 
  insertDeliveryTrackingSchema,
  users,
  delayResponsibilityEnum
} from "@shared/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { differenceInCalendarDays } from "date-fns";
import { isAuthenticated, hasEditRights } from "../replitAuth";

// Get delivery tracking records for a specific project
export async function getProjectDeliveryTracking(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const deliveryRecords = await db.query.deliveryTracking.findMany({
      where: eq(deliveryTracking.projectId, projectId),
      orderBy: [desc(deliveryTracking.createdAt)],
      with: {
        createdBy: {
          columns: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return res.status(200).json(deliveryRecords);
  } catch (error) {
    console.error("Error fetching delivery tracking records:", error);
    return res.status(500).json({ error: "Failed to fetch delivery tracking records" });
  }
}

// Get all delivery tracking records (with optional filtering)
export async function getAllDeliveryTracking(req: Request, res: Response) {
  try {
    const { responsibility, daysLateMin, daysLateMax } = req.query;
    
    let query = db
      .select({
        tracking: deliveryTracking,
        project: {
          id: projects.id,
          projectNumber: projects.projectNumber,
          name: projects.name,
          status: projects.status,
        },
        createdBy: {
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(deliveryTracking)
      .leftJoin(projects, eq(deliveryTracking.projectId, projects.id))
      .leftJoin(users, eq(deliveryTracking.createdById, users.id));
    
    // Apply filters if provided
    let queryWithFilters = query;
    
    if (responsibility) {
      queryWithFilters = queryWithFilters.where(eq(deliveryTracking.delayResponsibility, responsibility as string));
    }
    
    if (daysLateMin && !isNaN(Number(daysLateMin))) {
      queryWithFilters = queryWithFilters.where(sql`${deliveryTracking.daysLate} >= ${Number(daysLateMin)}`);
    }
    
    if (daysLateMax && !isNaN(Number(daysLateMax))) {
      queryWithFilters = queryWithFilters.where(sql`${deliveryTracking.daysLate} <= ${Number(daysLateMax)}`);
    }
    
    query = queryWithFilters;
    
    const records = await query.orderBy(desc(deliveryTracking.createdAt));
    
    return res.status(200).json(records);
  } catch (error) {
    console.error("Error fetching all delivery tracking records:", error);
    return res.status(500).json({ error: "Failed to fetch delivery tracking records" });
  }
}

// Create a new delivery tracking record
export async function createDeliveryTracking(req: Request, res: Response) {
  try {
    // Require edit rights to create delivery tracking records
    const validationResult = insertDeliveryTrackingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid delivery tracking data", 
        details: validationResult.error.format() 
      });
    }

    const data = validationResult.data;
    
    // Validate project exists
    const projectExists = await db.query.projects.findFirst({
      where: eq(projects.id, data.projectId),
    });
    
    if (!projectExists) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Calculate days late if provided dates allow it and it's not already set
    if (!data.daysLate && data.actualDeliveryDate && data.originalEstimatedDate) {
      data.daysLate = differenceInCalendarDays(
        new Date(data.actualDeliveryDate), 
        new Date(data.originalEstimatedDate)
      );
    }
    
    // Default to not_applicable if responsibility not provided
    if (!data.delayResponsibility) {
      data.delayResponsibility = "not_applicable";
    }
    
    // Set the current user as creator
    if (req.user && typeof req.user === 'object') {
      // Try to handle both Replit auth (claims.sub) and local auth (id)
      if ('claims' in req.user && req.user.claims && typeof req.user.claims === 'object' && 'sub' in req.user.claims) {
        data.createdById = req.user.claims.sub;
      } else if ('id' in req.user) {
        data.createdById = req.user.id as string;
      }
    }
    
    // Insert the new record
    const [newTracking] = await db.insert(deliveryTracking).values(data).returning();
    
    return res.status(201).json(newTracking);
  } catch (error) {
    console.error("Error creating delivery tracking record:", error);
    return res.status(500).json({ error: "Failed to create delivery tracking record" });
  }
}

// Update an existing delivery tracking record
export async function updateDeliveryTracking(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid delivery tracking ID" });
    }
    
    // Ensure the record exists
    const existingRecord = await db.query.deliveryTracking.findFirst({
      where: eq(deliveryTracking.id, id),
    });
    
    if (!existingRecord) {
      return res.status(404).json({ error: "Delivery tracking record not found" });
    }
    
    // Validate the update data
    const validationResult = insertDeliveryTrackingSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid delivery tracking data", 
        details: validationResult.error.format() 
      });
    }
    
    const updateData = validationResult.data;
    
    // Recalculate days late if needed
    if ((updateData.actualDeliveryDate || updateData.originalEstimatedDate) && 
        !updateData.daysLate) {
      const actualDelivery = updateData.actualDeliveryDate || existingRecord.actualDeliveryDate;
      const originalEstimate = updateData.originalEstimatedDate || existingRecord.originalEstimatedDate;
      
      if (actualDelivery && originalEstimate) {
        updateData.daysLate = differenceInCalendarDays(
          new Date(actualDelivery), 
          new Date(originalEstimate)
        );
      }
    }
    
    // Update the record
    const [updatedRecord] = await db
      .update(deliveryTracking)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(deliveryTracking.id, id))
      .returning();
    
    return res.status(200).json(updatedRecord);
  } catch (error) {
    console.error("Error updating delivery tracking record:", error);
    return res.status(500).json({ error: "Failed to update delivery tracking record" });
  }
}

// Delete a delivery tracking record
export async function deleteDeliveryTracking(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid delivery tracking ID" });
    }
    
    // Ensure the record exists
    const existingRecord = await db.query.deliveryTracking.findFirst({
      where: eq(deliveryTracking.id, id),
    });
    
    if (!existingRecord) {
      return res.status(404).json({ error: "Delivery tracking record not found" });
    }
    
    // Delete the record
    await db.delete(deliveryTracking).where(eq(deliveryTracking.id, id));
    
    return res.status(200).json({ message: "Delivery tracking record deleted successfully" });
  } catch (error) {
    console.error("Error deleting delivery tracking record:", error);
    return res.status(500).json({ error: "Failed to delete delivery tracking record" });
  }
}

// Get delivery analytics data
export async function getDeliveryAnalytics(req: Request, res: Response) {
  try {
    // Get overall statistics
    const totalProjects = await db.query.projects.findMany({
      columns: {
        id: true,
        estimatedCompletionDate: true,
        actualCompletionDate: true,
        deliveryDate: true,
      },
    });
    
    const deliveryRecords = await db.query.deliveryTracking.findMany();
    
    // Calculate stats
    const totalTracked = deliveryRecords.length;
    const onTimeCount = deliveryRecords.filter(r => r.daysLate !== null && r.daysLate <= 0).length;
    const lateCount = deliveryRecords.filter(r => r.daysLate !== null && r.daysLate > 0).length;
    
    // Count by responsibility
    const countByResponsibility = {
      nomad_fault: deliveryRecords.filter(r => r.delayResponsibility === 'nomad_fault').length,
      vendor_fault: deliveryRecords.filter(r => r.delayResponsibility === 'vendor_fault').length,
      client_fault: deliveryRecords.filter(r => r.delayResponsibility === 'client_fault').length,
      not_applicable: deliveryRecords.filter(r => r.delayResponsibility === 'not_applicable').length,
    };
    
    // Calculate average days late
    const validRecords = deliveryRecords.filter(r => r.daysLate !== null);
    const avgDaysLate = validRecords.length > 0
      ? validRecords.reduce((sum, r) => sum + (r.daysLate || 0), 0) / validRecords.length
      : 0;
    
    // Create performance trends by month (last 12 months)
    const now = new Date();
    const lastYear = new Date();
    lastYear.setMonth(lastYear.getMonth() - 12);
    
    const monthlyStats = [];
    let currentDate = new Date(lastYear);
    
    while (currentDate <= now) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const monthRecords = deliveryRecords.filter(r => {
        if (!r.actualDeliveryDate) return false;
        const recordDate = new Date(r.actualDeliveryDate);
        return recordDate.getFullYear() === year && recordDate.getMonth() === month;
      });
      
      const onTime = monthRecords.filter(r => r.daysLate !== null && r.daysLate <= 0).length;
      const late = monthRecords.filter(r => r.daysLate !== null && r.daysLate > 0).length;
      const total = monthRecords.length;
      
      monthlyStats.push({
        yearMonth: `${year}-${String(month + 1).padStart(2, '0')}`,
        total,
        onTime,
        late,
        onTimePercentage: total > 0 ? (onTime / total) * 100 : 0,
      });
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return res.status(200).json({
      summary: {
        totalProjects: totalProjects.length,
        totalTracked,
        onTimeCount,
        lateCount,
        onTimePercentage: totalTracked > 0 ? (onTimeCount / totalTracked) * 100 : 0,
        avgDaysLate,
      },
      countByResponsibility,
      monthlyTrends: monthlyStats,
    });
  } catch (error) {
    console.error("Error generating delivery analytics:", error);
    return res.status(500).json({ error: "Failed to generate delivery analytics" });
  }
}