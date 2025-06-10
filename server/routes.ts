import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { ZodError } from "zod";
import crypto from "crypto";
import { promisify } from "util";
import passport from "passport";
import multer from "multer";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  insertProjectSchema,
  insertTaskSchema,
  insertBillingMilestoneSchema,
  insertManufacturingBaySchema,
  insertManufacturingScheduleSchema,
  insertUserPreferencesSchema,
  insertNotificationSchema,
  insertSalesDealSchema,
  insertProjectCostSchema,
  insertProjectMilestoneIconSchema,
  insertProjectLabelSchema,
  insertProjectLabelAssignmentSchema,
  insertMeetingSchema,
  insertMeetingAttendeeSchema,
  insertMeetingNoteSchema,
  insertMeetingTaskSchema,
  insertMeetingTemplateSchema,
  insertMeetingEmailNotificationSchema
} from "@shared/schema";

import { exportReport } from "./routes/export";
import { hashPassword } from "./auth";
import { sendEmail, generatePasswordResetEmail } from "./email";
import { randomBytes } from "crypto";
import { trackChanges, createForensicsRecord, getForensicsContext } from "./forensics";

// Helper functions for forensics tracking
function normalizeValueForComparison(value: any): string {
  if (value === null || value === undefined || value === '') {
    return 'null';
  }
  
  // Handle dates - convert to ISO string for comparison
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  // Handle strings that might be dates
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return new Date(value).toISOString();
    } catch {
      return String(value);
    }
  }
  
  return JSON.stringify(value);
}

function formatFieldNameForDisplay(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
// Removed Replit auth - using simple local auth bypass

import { 
  importProjects, 
  importBillingMilestones, 
  importManufacturingBays,
  importManufacturingSchedules,
  importDeliveryTracking
} from "./import";
import { importBayScheduling } from "./routes/baySchedulingImport";
import rolePermissionsRouter from "./routes/rolePermissions";
import {
  getProjectDeliveryTracking,
  getAllDeliveryTracking,
  createDeliveryTracking,
  updateDeliveryTracking,
  deleteDeliveryTracking,
  getDeliveryAnalytics
} from "./routes/deliveryTracking";
import { countWorkingDays } from "@shared/utils/date-utils";
import { format, differenceInDays, addDays } from "date-fns";
import {
  analyzeProjectHealth,
  generateBillingInsights,
  generateManufacturingInsights,
  generateTimelineInsights
} from "./ai";
import {
  getFinancialReports,
  getProjectStatusReports,
  getManufacturingReports,
  getDeliveryReports
} from "./routes/reports";
import { handleExportReport } from "./routes/export";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  createNotification,
  generateBillingNotifications,
  generateManufacturingNotifications
} from "./notifications";
import { getAIInsights } from "./routes/aiInsights";
import supplyChainRoutes from "./routes/supply-chain";
import systemRoutes from "./routes/system";
import { createForensicsRecord, getForensicsContext, trackChanges } from "./forensics";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * Helper function to synchronize delivery milestones with project ship date
 * This ensures any delivery milestones are updated when a project's schedule changes
 */
async function syncDeliveryMilestonesToShipDate(projectId: number, shipDate: string): Promise<void> {
  try {
    console.log(`🔄 Synchronizing delivery milestones for project ${projectId} to ship date ${shipDate}`);
    
    // Get all billing milestones for this project
    const billingMilestones = await storage.getProjectBillingMilestones(projectId);
    
    // Find all delivery milestones by common naming patterns
    const deliveryMilestones = billingMilestones.filter(
      milestone => 
        milestone.isDeliveryMilestone || 
        (milestone.name && (
          milestone.name.toUpperCase().includes("DELIVERY") ||
          milestone.name.toUpperCase().includes("100%") ||
          milestone.name.includes("Final") ||
          milestone.name.includes("final") ||
          milestone.name.toUpperCase().includes("FINAL")
        ))
    );
    
    if (deliveryMilestones.length > 0) {
      console.log(`Found ${deliveryMilestones.length} delivery milestones for project ${projectId} to update to date: ${shipDate}`);
      
      for (const milestone of deliveryMilestones) {
        // Store the current ship date as liveDate and mark as changed if it differs from lastAcceptedShipDate
        const shipDateChanged = milestone.lastAcceptedShipDate && 
                              new Date(shipDate).getTime() !== new Date(milestone.lastAcceptedShipDate).getTime();
        
        console.log(`Updating delivery milestone ${milestone.id} (${milestone.name}) to date ${shipDate}`);
        
        const milestoneUpdate = {
          targetInvoiceDate: shipDate,
          liveDate: shipDate,
          shipDateChanged: shipDateChanged
        };
        
        await storage.updateBillingMilestone(milestone.id, milestoneUpdate);
        console.log(`✅ Updated delivery milestone ${milestone.id} successfully`);
      }
      
      // Add notification about delivery milestone updates
      await storage.createNotification({
        userId: null, // System notification
        title: "Delivery Milestones Updated",
        message: `${deliveryMilestones.length} delivery milestone(s) have been updated to match the new project ship date.`,
        type: "system",
        priority: "medium",
        link: `/billing-milestones?projectId=${projectId}`,
        isRead: false,
        expiresAt: addDays(new Date(), 7),
      });
      
      console.log(`Created notification for ${deliveryMilestones.length} updated delivery milestones`);
    } else {
      console.log(`No delivery milestones found for project ${projectId} to update`);
    }
  } catch (error) {
    console.error(`Error synchronizing delivery milestones for project ${projectId}:`, error);
    throw error; // Re-throw to be handled by the caller
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // CRITICAL FIX: Ensure API routes are processed with proper JSON responses
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Proper authentication middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      console.log(`🔍 Auth middleware: Checking authentication for ${req.method} ${req.url}`);
      
      // Check session for authenticated user
      const sessionUser = (req.session as any)?.user;
      const userId = (req.session as any)?.userId;
      
      if (!sessionUser && !userId) {
        console.log("❌ No session found");
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // If we have complete session data, use it
      if (sessionUser && sessionUser.isApproved) {
        req.user = sessionUser;
        console.log(`✅ Authenticated user: ${sessionUser.email} with role ${sessionUser.role}`);
        return next();
      }
      
      // If we only have userId, fetch fresh user data
      if (userId) {
        const user = await storage.getUser(userId);
        if (user && user.isApproved) {
          req.user = user;
          // Update session with fresh data
          (req.session as any).user = user;
          console.log(`✅ Authenticated user: ${user.email} with role ${user.role}`);
          return next();
        }
      }
      
      console.log("❌ User not found or not approved");
      res.status(401).json({ message: "Authentication required" });
    } catch (error) {
      console.error("Auth middleware error:", error);
      res.status(401).json({ message: "Authentication error" });
    }
  };

  // Admin-only middleware
  const requireAdmin = async (req: any, res: any, next: any) => {
    await requireAuth(req, res, () => {
      if (req.user?.role !== 'admin') {
        console.log(`❌ Admin access denied for role: ${req.user?.role}`);
        return res.status(403).json({ message: "Admin access required" });
      }
      console.log(`✅ Admin access granted for: ${req.user.email}`);
      next();
    });
  };

  // Editor or Admin middleware
  const requireEditor = async (req: any, res: any, next: any) => {
    await requireAuth(req, res, () => {
      if (req.user?.role !== 'admin' && req.user?.role !== 'editor') {
        console.log(`❌ Editor access denied for role: ${req.user?.role}`);
        return res.status(403).json({ message: "Editor or Admin access required" });
      }
      console.log(`✅ Editor access granted for: ${req.user.email}`);
      next();
    });
  };


  // User module visibility routes
  app.get("/api/users/:userId/module-visibility", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const visibility = await storage.getUserModuleVisibility(userId);
      
      // Transform to match expected format
      const formattedVisibility = visibility.map(v => ({
        user_id: v.userId,
        module: v.moduleId,
        is_visible: v.visible
      }));
      
      res.json(formattedVisibility);
    } catch (error) {
      console.error("Error fetching user module visibility:", error);
      res.status(500).json({ message: "Error fetching user module visibility" });
    }
  });

  app.patch("/api/users/:userId/module-visibility", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { moduleId, visible } = req.body;
      
      console.log(`Updating module visibility for user ${userId}, module ${moduleId} to ${visible}`);
      
      const success = await storage.updateUserModuleVisibility(userId, moduleId, visible);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ message: "Failed to update module visibility" });
      }
    } catch (error) {
      console.error("Error updating module visibility:", error);
      res.status(500).json({ message: "Error updating module visibility: " + (error as Error).message });
    }
  });

  // Special route to update project hours from 40 to 1000
  app.post("/api/admin/update-project-hours", async (req, res) => {
    try {
      // Update all existing projects that still have the default 40 hours
      const projectsUpdated = await storage.updateDefaultProjectHours();
      
      // Update all existing manufacturing schedules that still have the default 40 hours
      const schedulesUpdated = await storage.updateDefaultScheduleHours();
      
      res.status(200).json({
        success: true,
        message: `Updated hours to 1000 for ${projectsUpdated} projects and ${schedulesUpdated} schedules`,
      });
    } catch (error) {
      console.error("Error updating project hours:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to update project hours",
        error: String(error)
      });
    }
  });
  // Single authentication system - proper role-based access
  
  // Get current user endpoint
  app.get("/api/user", async (req, res) => {
    try {
      console.log("📍 Auth check: Validating user session");
      
      // Check session for authenticated user
      const sessionUser = (req.session as any)?.user;
      const userId = (req.session as any)?.userId;
      
      if (!sessionUser && !userId) {
        console.log("❌ No session found - user not authenticated");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // If we have complete session data, return it
      if (sessionUser && sessionUser.isApproved) {
        console.log(`✅ Returning session user: ${sessionUser.email} with role ${sessionUser.role}`);
        return res.json({
          id: sessionUser.id,
          email: sessionUser.email,
          firstName: sessionUser.firstName,
          lastName: sessionUser.lastName,
          username: sessionUser.username,
          role: sessionUser.role,
          isApproved: sessionUser.isApproved
        });
      }
      
      // If we only have userId, fetch fresh user data from database
      if (userId) {
        console.log("Fetching fresh user data from database");
        const user = await storage.getUser(userId);
        if (user && user.isApproved) {
          // Update session with fresh data
          (req.session as any).user = user;
          
          return res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            role: user.role,
            isApproved: user.isApproved
          });
        }
      }
      
      console.log("❌ User not found or not approved");
      res.status(401).json({ message: "User not found or not approved" });
    } catch (error) {
      console.error("Auth user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // System settings - Get all authenticated users from Neon database
  app.get("/api/system/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching system users:", error);
      res.status(500).json({ message: "Error fetching system users" });
    }
  });

  // Simple auth middleware that uses the same logic as requireAuth
  const simpleAuth = requireAuth;

  // Error handling middleware for Zod validation
  const validateRequest = (schema: z.ZodSchema<any>) => {
    return (req: Request, res: Response, next: any) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        } else {
          next(error);
        }
      }
    };
  };

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      // Get ALL projects including delivered ones for the bay schedule
      // This ensures delivered projects can still be found and re-scheduled if needed
      const projects = await storage.getProjects();
      
      console.log(`📊 PROJECTS API: Returning ${projects.length} total projects (including delivered)`);
      
      // Calculate QC Days for each project based on qcStartDate and shipDate
      const projectsWithQcDays = projects.map(project => {
        if (project.qcStartDate && project.shipDate) {
          const qcDaysCount = countWorkingDays(project.qcStartDate, project.shipDate);
          return { ...project, qcDays: qcDaysCount };
        }
        return project;
      });
      
      res.json(projectsWithQcDays);
    } catch (error) {
      console.error("Error fetching projects:", error);
      // Log additional details for debugging
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ message: "Error fetching projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Calculate QC Days based on qcStartDate and shipDate (excluding weekends and US holidays)
      if (project.qcStartDate && project.shipDate) {
        const qcDaysCount = countWorkingDays(project.qcStartDate, project.shipDate);
        project.qcDays = qcDaysCount;
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Error fetching project" });
    }
  });

  app.post("/api/projects", requireEditor, validateRequest(insertProjectSchema), async (req, res) => {
    try {
      const projectData = req.body;
      
      // Calculate QC Days only if both dates are present
      if (projectData.qcStartDate && projectData.shipDate) {
        const qcDaysCount = countWorkingDays(projectData.qcStartDate, projectData.shipDate);
        // Add the calculated QC Days to the data being created
        projectData.qcDays = qcDaysCount;
        console.log(`Calculated QC Days for new project: ${qcDaysCount} working days`);
      }
      
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ message: "Error creating project" });
    }
  });

  // PATCH endpoint for handling partial updates (especially dates)
  app.patch("/api/projects/:id", requireEditor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`PATCH request received for project ID: ${id}`, req.body);
      
      // Get the current project data
      const currentProject = await storage.getProject(id);
      if (!currentProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get data from request
      const updateData = req.body;
      
      // Process date fields specifically
      const dateFields = [
        'startDate', 'contractDate', 'estimatedCompletionDate', 'actualCompletionDate',
        'chassisETA', 'fabricationStart', 'paintStart', 'assemblyStart', 'wrapDate', 'ntcTestingDate',
        'qcStartDate', 'executiveReviewDate', 'shipDate', 'deliveryDate'
      ];
      
      // Handle each date field correctly with timezone adjustment
      dateFields.forEach(field => {
        if (field in updateData) {
          // If the value is null, keep it null for clearing dates
          if (updateData[field] === null) {
            console.log(`Clearing date field ${field} to null`);
          }
          // Store the date exactly as provided by the user - no timezone adjustments
          else if (updateData[field]) {
            console.log(`Storing date for ${field} exactly as provided: ${updateData[field]}`);
          }
        }
      });
      
      // Check if shipDate or deliveryDate has changed
      const shipDateChanged = 'shipDate' in updateData && 
                             currentProject.shipDate !== updateData.shipDate;
      
      const deliveryDateChanged = 'deliveryDate' in updateData && 
                                 currentProject.deliveryDate !== updateData.deliveryDate;
      
      // Calculate QC Days if both dates are present
      if (('qcStartDate' in updateData || currentProject.qcStartDate) && 
          ('shipDate' in updateData || currentProject.shipDate)) {
        const qcStartDate = 'qcStartDate' in updateData ? updateData.qcStartDate : currentProject.qcStartDate;
        const shipDate = 'shipDate' in updateData ? updateData.shipDate : currentProject.shipDate;
        
        if (qcStartDate && shipDate) {
          const qcDaysCount = countWorkingDays(qcStartDate, shipDate);
          updateData.qcDays = qcDaysCount;
          console.log(`Calculated QC Days for project ${id}: ${qcDaysCount} working days`);
        }
      }
      
      // Update the project
      const project = await storage.updateProject(id, updateData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // If ship date or delivery date changed, check for delivery milestones to update
      if (shipDateChanged || deliveryDateChanged) {
        const dateToSync = updateData.deliveryDate || updateData.shipDate;
        
        try {
          // Get all billing milestones for this project
          const billingMilestones = await storage.getProjectBillingMilestones(id);
          const deliveryMilestones = billingMilestones.filter(
            milestone => milestone.name.toLowerCase().includes('delivery') || 
                        milestone.description?.toLowerCase().includes('delivery')
          );
          
          // Update any delivery-related milestones to match the new delivery date
          if (deliveryMilestones.length > 0 && dateToSync) {
            console.log(`Found ${deliveryMilestones.length} delivery milestones to update`);
            
            for (const milestone of deliveryMilestones) {
              await storage.updateBillingMilestone(milestone.id, {
                targetInvoiceDate: dateToSync,
                shipDateChanged: true
              });
              console.log(`Updated delivery milestone ${milestone.id} to match date ${dateToSync}`);
            }
          }
        } catch (syncError) {
          console.error("Error syncing delivery milestones:", syncError);
          // Don't fail the whole request if milestone sync fails
        }
      }
      
      // Return the updated project
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Error updating project" });
    }
  });

  // PUT endpoint for updating projects (used by project edit form)
  app.put("/api/projects/:id", requireEditor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`PUT request received for project ID: ${id}`, req.body);
      
      // Get the current project data
      const currentProject = await storage.getProject(id);
      if (!currentProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get data from request
      const updateData = req.body;
      
      // Handle text values like "N/A" and "PENDING" by storing in separate text fields
      const dateTextFields: Record<string, string> = {
        'fabricationStart': 'fabricationStartText',
        'wrapDate': 'wrapDateText', 
        'ntcTestingDate': 'ntcTestingDateText',
        'executiveReviewDate': 'executiveReviewDateText',
        'deliveryDate': 'deliveryDateText'
      };
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === 'N/A' || updateData[key] === 'PENDING') {
          console.log(`Converting ${key} from "${updateData[key]}" to null for database`);
          
          // If this is a date field that supports text overrides, save to text field
          if (dateTextFields[key]) {
            updateData[dateTextFields[key]] = updateData[key]; // Save text value
            updateData[key] = null; // Clear the date field
            console.log(`Storing text value "${updateData[dateTextFields[key]]}" in ${dateTextFields[key]} field`);
          } else {
            updateData[key] = null;
          }
        } else {
          // If setting a real date value, clear any existing text override
          if (dateTextFields[key]) {
            updateData[dateTextFields[key]] = null;
          }
        }
      });
      
      // Process date fields specifically
      const dateFields = [
        'startDate', 'contractDate', 'estimatedCompletionDate', 'actualCompletionDate',
        'chassisETA', 'fabricationStart', 'paintStart', 'assemblyStart', 'wrapDate', 'ntcTestingDate',
        'qcStartDate', 'executiveReviewDate', 'shipDate', 'deliveryDate'
      ];
      
      // Handle each date field correctly with timezone adjustment
      dateFields.forEach(field => {
        if (field in updateData) {
          // If the value is null, keep it null for clearing dates
          if (updateData[field] === null) {
            console.log(`Clearing date field ${field} to null`);
          }
          // Store the date exactly as provided by the user - no timezone adjustments
          else if (updateData[field]) {
            console.log(`Storing date for ${field} exactly as provided: ${updateData[field]}`);
          }
        }
      });
      
      // Check if shipDate or deliveryDate has changed
      const shipDateChanged = 'shipDate' in updateData && 
                             currentProject.shipDate !== updateData.shipDate;
      
      const deliveryDateChanged = 'deliveryDate' in updateData && 
                                 currentProject.deliveryDate !== updateData.deliveryDate;
      
      // Calculate QC Days if both dates are present
      if (('qcStartDate' in updateData || currentProject.qcStartDate) && 
          ('shipDate' in updateData || currentProject.shipDate)) {
        const qcStartDate = 'qcStartDate' in updateData ? updateData.qcStartDate : currentProject.qcStartDate;
        const shipDate = 'shipDate' in updateData ? updateData.shipDate : currentProject.shipDate;
        
        if (qcStartDate && shipDate) {
          const qcDaysCount = countWorkingDays(qcStartDate, shipDate);
          updateData.qcDays = qcDaysCount;
          console.log(`Calculated QC Days for project ${id}: ${qcDaysCount} working days`);
        }
      }
      
      // Update the project
      const project = await storage.updateProject(id, updateData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // If ship date or delivery date changed, check for delivery milestones to update
      if (shipDateChanged || deliveryDateChanged) {
        const dateToSync = updateData.deliveryDate || updateData.shipDate;
        
        try {
          // Get all billing milestones for this project
          const billingMilestones = await storage.getProjectBillingMilestones(id);
          const deliveryMilestones = billingMilestones.filter(
            milestone => milestone.name.toLowerCase().includes('delivery') || 
                        milestone.description?.toLowerCase().includes('delivery')
          );
          
          // Update any delivery-related milestones to match the new delivery date
          if (deliveryMilestones.length > 0 && dateToSync) {
            console.log(`Found ${deliveryMilestones.length} delivery milestones to update`);
            
            for (const milestone of deliveryMilestones) {
              await storage.updateBillingMilestone(milestone.id, {
                targetInvoiceDate: dateToSync,
                shipDateChanged: true
              });
              console.log(`Updated delivery milestone ${milestone.id} to match date ${dateToSync}`);
            }
          }
        } catch (syncError) {
          console.error("Error syncing delivery milestones:", syncError);
          // Don't fail the whole request if milestone sync fails
        }
      }
      
      // Track changes for forensics after successful update
      try {
        // Only track changes for fields that were actually modified
        const actualChanges = [];
        const fieldsToCheck = Object.keys(updateData);
        
        for (const field of fieldsToCheck) {
          if (['updatedAt', 'createdAt', 'id'].includes(field)) continue;
          
          const oldValue = (currentProject as any)[field];
          const newValue = updateData[field];
          
          // Normalize values for comparison
          const oldNormalized = normalizeValueForComparison(oldValue);
          const newNormalized = normalizeValueForComparison(newValue);
          
          if (oldNormalized !== newNormalized) {
            actualChanges.push({
              field,
              previousValue: oldValue,
              newValue: newValue,
              displayName: formatFieldNameForDisplay(field)
            });
          }
        }
        
        if (actualChanges.length > 0) {
          const forensicsContext = getForensicsContext(req, req.user);
          await createForensicsRecord(
            id,
            'project',
            id,
            'update',
            actualChanges,
            forensicsContext
          );
          console.log(`Forensics: Tracked ${actualChanges.length} actual changes for project ${id}`);
        }
      } catch (forensicsError) {
        console.error('Error creating forensics record:', forensicsError);
        // Don't fail the request if forensics fails
      }
      
      // Return the updated project
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Error updating project" });
    }
  });
      
  // Mark a project as delivered
  app.post("/api/projects/:id/mark-delivered", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { lateDeliveryReason, delayResponsibility, deliveryDate } = req.body;
      
      console.log("🚀 DELIVERY API: Received request for project", id);
      console.log("🚀 DELIVERY API: Request body:", JSON.stringify(req.body, null, 2));
      console.log("🚀 DELIVERY API: DeliveryDate received:", deliveryDate);
      
      // Get the current project
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Use user-provided delivery date or today as fallback
      const actualDeliveryDate = deliveryDate ? new Date(deliveryDate) : new Date();
      const contractDate = project.contractDate ? new Date(project.contractDate) : null;
      
      let isDeliveredOnTime = true;
      if (contractDate) {
        isDeliveredOnTime = actualDeliveryDate <= contractDate;
      }
      
      // Update project data
      const updateData: Partial<Project> = {
        status: "delivered",
        deliveryDate: actualDeliveryDate.toISOString().split('T')[0],
        is_delivered_on_time: isDeliveredOnTime,
      };
      
      // Add reason for late delivery if provided
      if (lateDeliveryReason) {
        updateData.lateDeliveryReason = lateDeliveryReason;
      }
      
      console.log("🚀 DELIVERY API: Updating project with data:", JSON.stringify(updateData, null, 2));
      
      // Update the project first
      const updatedProject = await storage.updateProject(id, updateData);

      // Automatically assign blue DELIVERED label
      try {
        const DELIVERED_LABEL_ID = 4; // Blue DELIVERED label
        
        // Remove any existing labels first (single label per project constraint)
        const currentLabels = await storage.getProjectLabelAssignments(id);
        for (const assignment of currentLabels) {
          await storage.removeLabelFromProject(id, assignment.labelId);
        }
        
        // Assign the DELIVERED label
        await storage.assignLabelToProject(id, DELIVERED_LABEL_ID);
        console.log(`✅ Auto-assigned DELIVERED label to project ${id}`);
      } catch (labelError) {
        console.error(`❌ Failed to auto-assign DELIVERED label to project ${id}:`, labelError);
      }
      
      // Handle delay responsibility separately using the specific method
      if (delayResponsibility && delayResponsibility !== 'not_applicable') {
        console.log("🚀 DELIVERY API: Updating delay responsibility:", delayResponsibility);
        try {
          const responsibilitySuccess = await storage.updateDeliveredProjectResponsibility(id, delayResponsibility);
          if (!responsibilitySuccess) {
            console.warn("⚠️ DELIVERY API: Failed to update delay responsibility, but project delivery was successful");
            // Return a partial success response
            return res.status(200).json({ 
              ...updatedProject, 
              warning: "Project delivered successfully but responsibility update failed" 
            });
          } else {
            console.log("✅ DELIVERY API: Successfully updated delay responsibility");
          }
        } catch (error) {
          console.error("🔥 DELIVERY API: Error updating delay responsibility:", error);
          // Return partial success since the main delivery worked
          return res.status(200).json({ 
            ...updatedProject, 
            warning: "Project delivered successfully but responsibility update failed" 
          });
        }
      }
      
      // Create a notification for the delivery
      const deliveryStatus = isDeliveredOnTime ? "on time" : "late";
      await storage.createNotification({
        title: `Project Delivered: ${project.name}`,
        message: `Project #${project.projectNumber} has been marked as delivered ${deliveryStatus}.`,
        type: "project",
        priority: isDeliveredOnTime ? "low" : "medium",
        relatedProjectId: id
      });
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Error marking project as delivered:", error);
      res.status(500).json({ message: "Error marking project as delivered" });
    }
  });
  
  // Mark a delivered project as active again (revert delivered status)
  app.post("/api/projects/:id/revert-delivered", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the current project
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Ensure the project is currently marked as delivered
      if (project.status !== "delivered") {
        return res.status(400).json({ message: "Project is not currently marked as delivered" });
      }
      
      // Update project data to revert to active status
      const updateData: Partial<Project> = {
        status: "active",
        is_delivered_on_time: null,
        late_delivery_reason: null
      };
      
      // Update the project
      const updatedProject = await storage.updateProject(id, updateData);

      // Automatically remove DELIVERED label when reverting from delivered status
      try {
        const DELIVERED_LABEL_ID = 4; // Blue DELIVERED label
        await storage.removeLabelFromProject(id, DELIVERED_LABEL_ID);
        console.log(`✅ Auto-removed DELIVERED label from project ${id} during revert`);
      } catch (labelError) {
        console.error(`❌ Failed to auto-remove DELIVERED label from project ${id}:`, labelError);
      }
      
      // Create a notification for the status change
      await storage.createNotification({
        title: `Delivery Status Reverted: ${project.name}`,
        message: `Project #${project.projectNumber} has been reverted from delivered status to active.`,
        type: "project",
        priority: "medium",
        relatedProjectId: id
      });
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Error reverting delivered status:", error);
      res.status(500).json({ message: "Error reverting delivered status" });
    }
  });
  
  // Get all delivered projects
  app.get("/api/delivered-projects", async (req, res) => {
    // Force no cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    try {
      const deliveredProjects = await storage.getDeliveredProjects();
      
      // Calculate daysLate for each project
      const projectsWithDays = deliveredProjects.map(project => {
        let daysLate = 0;
        
        if (project.deliveryDate && project.contractDate) {
          const deliveryDate = new Date(project.deliveryDate);
          const contractDate = new Date(project.contractDate);
          
          // Calculate difference in days
          const diffTime = deliveryDate.getTime() - contractDate.getTime();
          daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        
        return {
          ...project,
          daysLate
        };
      });

      
      res.json(projectsWithDays);
    } catch (error) {
      console.error("Error fetching delivered projects:", error);
      res.status(500).json({ message: "Error fetching delivered projects" });
    }
  });

  // Update delivered project reason
  app.patch("/api/delivered-projects/:id/reason", simpleAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { reason } = req.body;
      
      console.log("🔥🔥🔥 ROUTE: Updating reason for project", projectId, "with value:", reason);
      
      const success = await storage.updateDeliveredProjectReason(projectId, reason);
      
      if (success) {
        console.log("✅ ROUTE: Reason update successful");
        res.json({ success: true });
      } else {
        console.log("💥 ROUTE: Reason update failed");
        res.status(500).json({ message: "Failed to update reason" });
      }
    } catch (error) {
      console.error("💥💥💥 ROUTE ERROR:", error);
      res.status(500).json({ message: "Error updating delivered project reason" });
    }
  });

  // Update delivered project responsibility  
  app.patch("/api/delivered-projects/:id/responsibility", simpleAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { responsibility } = req.body;
      
      console.log("🔥🔥🔥 ROUTE: Updating responsibility for project", projectId, "with value:", responsibility);
      
      const success = await storage.updateDeliveredProjectResponsibility(projectId, responsibility);
      
      if (success) {
        console.log("✅ ROUTE: Responsibility update successful");
        res.json({ success: true });
      } else {
        console.log("💥 ROUTE: Responsibility update failed");
        res.status(500).json({ message: "Failed to update responsibility" });
      }
    } catch (error) {
      console.error("💥💥💥 ROUTE ERROR:", error);
      res.status(500).json({ message: "Error updating delivered project responsibility" });
    }
  });

  // Update delivered project contract extensions
  app.patch("/api/delivered-projects/:id/contract-extensions", simpleAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { contractExtensions } = req.body;
      
      console.log("🔥 ROUTE: Updating contract extensions for project", projectId, "with value:", contractExtensions);
      
      const success = await storage.updateDeliveredProjectContractExtensions(projectId, contractExtensions);
      
      if (success) {
        console.log("✅ ROUTE: Contract extensions update successful");
        res.json({ success: true });
      } else {
        console.log("💥 ROUTE: Contract extensions update failed");
        res.status(500).json({ message: "Failed to update contract extensions" });
      }
    } catch (error) {
      console.error("💥 ROUTE ERROR:", error);
      res.status(500).json({ message: "Error updating delivered project contract extensions" });
    }
  });

  // Get delivered projects analytics
  app.get("/api/delivered-projects/analytics", async (req, res) => {
    // Force no cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    try {
      // Use the same data source as the Delivered Projects module - only projects with status = 'delivered'
      const deliveredProjects = await storage.getDeliveredProjects();
      
      console.log("📊 Found delivered projects (status = 'delivered'):", deliveredProjects.length);
      
      // Enhanced analytics calculation
      let onTimeCount = 0;
      let lateCount = 0;
      let totalDaysLate = 0;
      
      // Responsibility breakdown counters
      const responsibilityBreakdown = {
        nomad_fault: 0,
        vendor_fault: 0,
        client_fault: 0,
        not_applicable: 0
      };
      
      // Days late distribution
      const daysLateDistribution = {
        onTime: 0,
        week1: 0,      // 1-7 days late
        week2: 0,      // 8-14 days late
        month1: 0,     // 15-30 days late
        month2: 0,     // 31-60 days late
        longTerm: 0    // 60+ days late
      };
      
      // Monthly trends data
      const monthlyData = new Map();
      const yearlyData = new Map();
      
      deliveredProjects.forEach(project => {
        let daysLate = 0;
        
        // Use the same calculation logic as the Delivered Projects module
        if (project.deliveryDate && project.contractDate) {
          const deliveryDate = new Date(project.deliveryDate);
          const contractDate = new Date(project.contractDate);
          const diffTime = deliveryDate.getTime() - contractDate.getTime();
          daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        
        // Count responsibility
        if (project.delayResponsibility && responsibilityBreakdown.hasOwnProperty(project.delayResponsibility)) {
          responsibilityBreakdown[project.delayResponsibility]++;
        } else {
          responsibilityBreakdown.not_applicable++;
        }
        
        // Categorize delivery performance
        if (daysLate <= 0) {
          onTimeCount++;
          daysLateDistribution.onTime++;
        } else {
          lateCount++;
          totalDaysLate += daysLate;
          
          // Distribute by delay severity
          if (daysLate <= 7) {
            daysLateDistribution.week1++;
          } else if (daysLate <= 14) {
            daysLateDistribution.week2++;
          } else if (daysLate <= 30) {
            daysLateDistribution.month1++;
          } else if (daysLate <= 60) {
            daysLateDistribution.month2++;
          } else {
            daysLateDistribution.longTerm++;
          }
        }
        
        // Track monthly trends if delivery date exists
        if (project.deliveryDate) {
          const deliveryDate = new Date(project.deliveryDate);
          const monthKey = `${deliveryDate.getFullYear()}-${String(deliveryDate.getMonth() + 1).padStart(2, '0')}`;
          const yearKey = String(deliveryDate.getFullYear());
          
          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, {
              month: monthKey,
              total: 0,
              onTime: 0,
              late: 0,
              totalDaysLate: 0
            });
          }
          
          if (!yearlyData.has(yearKey)) {
            yearlyData.set(yearKey, {
              year: yearKey,
              total: 0,
              onTime: 0,
              late: 0,
              totalDaysLate: 0
            });
          }
          
          const monthStats = monthlyData.get(monthKey);
          const yearStats = yearlyData.get(yearKey);
          
          monthStats.total++;
          yearStats.total++;
          
          if (daysLate <= 0) {
            monthStats.onTime++;
            yearStats.onTime++;
          } else {
            monthStats.late++;
            yearStats.late++;
            monthStats.totalDaysLate += daysLate;
            yearStats.totalDaysLate += daysLate;
          }
        }
      });
      
      // Convert monthly trends to array and calculate percentages
      const monthlyTrends = Array.from(monthlyData.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-13) // Last 13 months to include current month
        .map(month => ({
          ...month,
          onTimePercentage: month.total > 0 ? Math.round((month.onTime / month.total) * 100) : 0,
          avgDaysLate: month.late > 0 ? Math.round((month.totalDaysLate / month.late) * 10) / 10 : 0
        }));
      
      // Convert yearly comparison to array and calculate percentages
      const yearlyComparison = Array.from(yearlyData.values())
        .sort((a, b) => a.year.localeCompare(b.year))
        .slice(-3) // Last 3 years
        .map(year => ({
          ...year,
          onTimePercentage: year.total > 0 ? Math.round((year.onTime / year.total) * 100) : 0,
          avgDaysLate: year.late > 0 ? Math.round((year.totalDaysLate / year.late) * 10) / 10 : 0
        }));
      
      const analytics = {
        summary: {
          totalProjects: deliveredProjects.length,
          onTimeCount,
          lateCount,
          onTimePercentage: deliveredProjects.length > 0 ? Math.round((onTimeCount / deliveredProjects.length) * 100) : 0,
          avgDaysLate: lateCount > 0 ? Math.round((totalDaysLate / lateCount) * 10) / 10 : 0,
          totalDaysLate
        },
        responsibilityBreakdown,
        monthlyTrends,
        daysLateDistribution,
        yearlyComparison
      };
      
      console.log("📊 Returning analytics:", analytics);
      res.json(analytics);
    } catch (error) {
      console.error("Error in analytics endpoint:", error);
      res.status(500).json({ message: "Error fetching analytics" });
    }
  });

  // Manual entry for delivered projects
  app.post("/api/delivered-projects/manual", async (req, res) => {
    try {
      const data = req.body;
      
      // Create a new project with delivered status
      const newProject = await storage.createProject({
        projectNumber: data.projectNumber,
        name: data.name,
        contractDate: data.contractDate || null,
        deliveryDate: data.deliveryDate,
        status: 'delivered',
        percentComplete: data.percentComplete || '100',
        reason: data.reason || null,
        lateDeliveryReason: data.lateDeliveryReason || null,
        delayResponsibility: data.delayResponsibility || 'not_applicable',
        contractExtensions: data.contractExtensions || 0,
        // Set required fields with defaults
        description: null,
        pmOwnerId: null,
        pmOwner: null,
        team: null,
        location: null,
        startDate: data.deliveryDate, // Use delivery date as start date
        endDate: data.deliveryDate,
        qcStartDate: null,
        shipDate: null,
        billableHours: 0,
        estimatedHours: 0,
        actualHours: 0,
        materialCost: 0,
        laborCost: 0,
        isDeliveredOnTime: data.daysLate === 0,
        daysLate: data.daysLate || 0
      });

      // Create notification
      await storage.createNotification({
        title: `New Delivered Project Added: ${data.name}`,
        message: `Project #${data.projectNumber} has been manually added to delivered projects.`,
        type: "project",
        priority: "medium",
        relatedProjectId: newProject.id
      });

      res.json(newProject);
    } catch (error) {
      console.error("Error creating delivered project:", error);
      res.status(500).json({ message: "Error creating delivered project" });
    }
  });

  // Import delivered projects from CSV with real-time progress
  app.post("/api/delivered-projects/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV file must have headers and at least one data row" });
      }

      // Set up Server-Sent Events for real-time progress
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const sendProgress = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const headers = lines[0].split(',').map(h => h.trim());
      const dataLines = lines.slice(1);
      
      let successCount = 0;
      const errors: string[] = [];

      sendProgress({ 
        type: 'start', 
        message: `Starting file upload. Processing 0 rows from CSV.`,
        totalRows: dataLines.length 
      });

      for (let i = 0; i < dataLines.length; i++) {
        try {
          // Parse CSV with proper comma handling for quoted fields
          const values = parseCSVLine(dataLines[i]);
          
          // Helper function to properly parse CSV lines with commas in quoted fields
          function parseCSVLine(line: string): string[] {
            const result = [];
            let current = '';
            let inQuotes = false;
            let i = 0;
            
            while (i < line.length) {
              const char = line[i];
              
              if (char === '"') {
                // Handle escaped quotes (double quotes)
                if (inQuotes && line[i + 1] === '"') {
                  current += '"';
                  i += 2;
                } else {
                  inQuotes = !inQuotes;
                  i++;
                }
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
                i++;
              } else {
                current += char;
                i++;
              }
            }
            
            result.push(current.trim().replace(/^"|"$/g, ''));
            return result;
          }
          
          if (values.length < headers.length) {
            errors.push(`Row ${i + 2}: Insufficient data columns`);
            continue;
          }

          const projectData = {
            projectNumber: values[0]?.trim() || '',
            name: values[1]?.trim() || '',
            contractDate: values[2]?.trim() || null,
            deliveryDate: values[3]?.trim() || null,
            daysLate: parseDaysLate(values[4]),
            lateDeliveryReason: values[5]?.trim() || null,
            delayResponsibility: (values[6]?.trim() as any) || 'not_applicable',
            percentComplete: parsePercentComplete(values[7]),
            contractExtensions: !isNaN(parseInt(values[8])) ? parseInt(values[8]) : 0
          };

          // Helper function to parse percent complete, handling text values
          function parsePercentComplete(value: string): string {
            if (!value || value.trim() === '') return '100';
            const trimmed = value.trim();
            // If it's a text value like "Nomad", return 100% (delivered projects are complete)
            if (isNaN(parseInt(trimmed))) return '100';
            return trimmed;
          }

          // Helper function to parse days late, handling text values
          function parseDaysLate(value: string): number {
            if (!value || value.trim() === '') return 0;
            const trimmed = value.trim();
            // If it's a text value like "Nomad", return 0 (handled as on-time)
            if (isNaN(parseInt(trimmed))) return 0;
            return parseInt(trimmed);
          }

          // Validate required fields
          if (!projectData.projectNumber) {
            errors.push(`Row ${i + 2}: Project Number is required`);
            continue;
          }
          if (!projectData.name) {
            errors.push(`Row ${i + 2}: Project Name is required`);
            continue;
          }
          if (!projectData.deliveryDate) {
            errors.push(`Row ${i + 2}: Delivery Date is required`);
            continue;
          }

          // Check for duplicate project number (only among delivered projects)
          const existingDeliveredProjects = await storage.getDeliveredProjects();
          const existingProject = existingDeliveredProjects.find(p => p.projectNumber === projectData.projectNumber);
          
          if (existingProject) {
            const errorMsg = `Row ${i + 2}: Project ${projectData.projectNumber} already exists - skipping duplicate`;
            errors.push(errorMsg);
            sendProgress({ 
              type: 'progress', 
              message: errorMsg,
              processedRows: i + 1,
              totalRows: dataLines.length,
              successCount,
              errorCount: errors.length
            });
            continue;
          }

          sendProgress({ 
            type: 'progress', 
            message: `Processing project ${projectData.projectNumber}...`,
            processedRows: i + 1,
            totalRows: dataLines.length,
            successCount,
            errorCount: errors.length
          });

          // Create the project
          await storage.createProject({
            projectNumber: projectData.projectNumber,
            name: projectData.name,
            contractDate: projectData.contractDate || null,
            deliveryDate: projectData.deliveryDate,
            status: 'delivered',
            percentComplete: projectData.percentComplete,
            lateDeliveryReason: projectData.lateDeliveryReason,
            delayResponsibility: projectData.delayResponsibility as any,
            contractExtensions: projectData.contractExtensions,
            // Set required fields with defaults
            description: null,
            pmOwnerId: null,
            pmOwner: null,
            team: null,
            location: null,
            startDate: projectData.deliveryDate,
            endDate: projectData.deliveryDate,
            estimatedCompletionDate: null, // Now optional for delivered projects
            qcStartDate: null,
            shipDate: null,
            billableHours: 0,
            estimatedHours: 0,
            actualHours: 0,
            materialCost: 0,
            laborCost: 0,
            isDeliveredOnTime: projectData.daysLate === 0,
            daysLate: projectData.daysLate
          });

          successCount++;
          sendProgress({ 
            type: 'progress', 
            message: `✓ Successfully imported project ${projectData.projectNumber}`,
            processedRows: i + 1,
            totalRows: dataLines.length,
            successCount,
            errorCount: errors.length
          });
        } catch (error) {
          const errorMsg = `Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          sendProgress({ 
            type: 'progress', 
            message: `✗ Error: ${errorMsg}`,
            processedRows: i + 1,
            totalRows: dataLines.length,
            successCount,
            errorCount: errors.length
          });
        }
      }

      // Create notification for import
      if (successCount > 0) {
        await storage.createNotification({
          title: `Delivered Projects Import Completed`,
          message: `Successfully imported ${successCount} delivered projects${errors.length > 0 ? ` with ${errors.length} errors` : ''}.`,
          type: "system",
          priority: "medium"
        });
      }

      // Send final completion message
      sendProgress({
        type: 'complete',
        message: `Import completed! Successfully imported ${successCount} projects.`,
        count: successCount,
        totalRows: dataLines.length,
        errors,
        successCount,
        errorCount: errors.length
      });

      res.end();
    } catch (error) {
      console.error("Error importing delivered projects:", error);
      res.status(500).json({ message: "Error importing delivered projects" });
    }
  });

  // Get billing milestones
  app.get("/api/billing-milestones", async (req, res) => {
    try {
      const milestones = await storage.getBillingMilestones();
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching billing milestones:", error);
      res.status(500).json({ message: "Error fetching billing milestones" });
    }
  });

  // Get billing milestones for a specific project
  app.get("/api/projects/:id/billing-milestones", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const milestones = await storage.getProjectBillingMilestones(projectId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching project billing milestones:", error);
      res.status(500).json({ message: "Error fetching project billing milestones" });
    }
  });

  // Delete all billing milestones (admin only)
  app.delete("/api/billing-milestones/all", async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || (user.role !== 'admin' && !req.isDevMode)) {
        return res.status(403).json({ message: "Only administrators can perform this action" });
      }
      
      const count = await storage.deleteAllBillingMilestones();
      res.json({ success: true, count });
    } catch (error) {
      console.error("Error deleting all billing milestones:", error);
      res.status(500).json({ message: "Error deleting all billing milestones" });
    }
  });
  
  // Delete a single billing milestone by ID
  app.delete("/api/billing-milestones/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteBillingMilestone(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ message: "Error deleting billing milestone" });
    }
  });

  // Manufacturing Bay routes
  app.get("/api/manufacturing-bays", async (req, res) => {
    try {
      const bays = await storage.getManufacturingBays();
      res.json(bays);
    } catch (error) {
      res.status(500).json({ message: "Error fetching manufacturing bays" });
    }
  });

  app.get("/api/manufacturing-bays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bay = await storage.getManufacturingBay(id);
      if (!bay) {
        return res.status(404).json({ message: "Manufacturing bay not found" });
      }
      res.json(bay);
    } catch (error) {
      res.status(500).json({ message: "Error fetching manufacturing bay" });
    }
  });

  app.post("/api/manufacturing-bays", simpleAuth, validateRequest(insertManufacturingBaySchema), async (req, res) => {
    try {
      const bay = await storage.createManufacturingBay(req.body);
      res.status(201).json(bay);
    } catch (error) {
      res.status(500).json({ message: "Error creating manufacturing bay" });
    }
  });

  app.put("/api/manufacturing-bays/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bay = await storage.updateManufacturingBay(id, req.body);
      if (!bay) {
        return res.status(404).json({ message: "Manufacturing bay not found" });
      }
      res.json(bay);
    } catch (error) {
      res.status(500).json({ message: "Error updating manufacturing bay" });
    }
  });
  
  // Add PATCH endpoint to support the frontend's PATCH requests
  app.patch("/api/manufacturing-bays/:id", simpleAuth, async (req, res) => {
    try {
      console.log("PATCH request received for bay ID:", req.params.id);
      console.log("PATCH data:", req.body);
      
      const id = parseInt(req.params.id);
      
      // Add extra validation for team updates
      if (req.body.team || req.body.description) {
        console.log("Team/description update detected:", req.body.team, req.body.description);
      }
      
      // Calculate staffCount if not provided
      if (req.body.assemblyStaffCount !== undefined && req.body.electricalStaffCount !== undefined && req.body.staffCount === undefined) {
        req.body.staffCount = req.body.assemblyStaffCount + req.body.electricalStaffCount;
        console.log("Auto-calculated staffCount:", req.body.staffCount);
      }
      
      const bay = await storage.updateManufacturingBay(id, req.body);
      if (!bay) {
        console.error("Bay not found for ID:", id);
        return res.status(404).json({ message: "Manufacturing bay not found" });
      }
      
      console.log("Successfully updated bay:", bay.id, bay.name);
      res.json(bay);
    } catch (error) {
      console.error("Error in PATCH /api/manufacturing-bays/:id:", error);
      res.status(500).json({ message: "Error updating manufacturing bay" });
    }
  });

  app.delete("/api/manufacturing-bays/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteManufacturingBay(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ message: "Error deleting manufacturing bay" });
    }
  });

  // Manufacturing Schedule routes
  app.get("/api/manufacturing-schedules", async (req, res) => {
    try {
      const filters: {
        bayId?: number;
        projectId?: number;
        startDate?: Date;
        endDate?: Date;
      } = {};

      if (req.query.bayId) {
        filters.bayId = parseInt(req.query.bayId as string);
      }

      if (req.query.projectId) {
        filters.projectId = parseInt(req.query.projectId as string);
      }

      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const schedules = await storage.getManufacturingSchedules(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Error fetching manufacturing schedules" });
    }
  });

  app.get("/api/manufacturing-schedules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const schedule = await storage.getManufacturingSchedule(id);
      if (!schedule) {
        return res.status(404).json({ message: "Manufacturing schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Error fetching manufacturing schedule" });
    }
  });

  app.post("/api/manufacturing-schedules", simpleAuth, validateRequest(insertManufacturingScheduleSchema), async (req, res) => {
    try {
      // 🚨 MAY 16 2025 UPDATE - CRITICAL CHANGE:
      // 🚨 BAY 1: REMOVED ALL ROW LIMITS - Using exact row as requested
      // 🚨 Projects will be placed at EXACTLY the Y position where they were dropped
      // 🚨 NO RESTRICTIONS on row values - allowing ANY value with no adjustment
      
      // Get forced row data from request - highest priority
      const forcedRowIndex = req.body.forcedRowIndex !== undefined ? parseInt(req.body.forcedRowIndex) : undefined;
      const rowIndexParam = req.body.rowIndex !== undefined ? parseInt(req.body.rowIndex) : undefined;
      const rowParam = req.body.row !== undefined ? parseInt(req.body.row) : undefined;
      
      // Collect all possible row sources for logging
      console.log(`🚨 EXACT PLACEMENT: Prioritizing row values from multiple sources
        forcedRowIndex: ${forcedRowIndex}
        rowIndexParam: ${rowIndexParam}
        rowParam: ${rowParam}
      `);
      
      // 🚨 MAY 17 2025 UPDATE - ENHANCED ROW PLACEMENT LOGIC
      // Priority order: forcedRowIndex > rowIndex > row
      // This ensures projects stay EXACTLY where they're dropped by users
      let computedRowIndex = forcedRowIndex !== undefined ? forcedRowIndex : 
                           (rowIndexParam !== undefined ? rowIndexParam :
                           (rowParam !== undefined ? rowParam : 0));
    
      // Add extremely detailed logging for diagnostics
      console.log(`⭐ FINAL ROW CALCULATION (May 17 fix):
        - Original forced row index: ${forcedRowIndex}
        - Original row index param: ${rowIndexParam}
        - Original row param: ${rowParam}
        - Final computed row: ${computedRowIndex}
        
        🔴 CRITICAL: Using exact pixel-perfect row position with ZERO adjustments
        🔴 Projects will appear at EXACTLY the Y position where cursor drops them
      `);
      
      // ONLY ensure rows aren't negative - but allow ANY positive value without limits
      if (computedRowIndex < 0) computedRowIndex = 0;
      
      // This is our final row value that will be used everywhere
      const finalRowIndex = computedRowIndex;
      
      console.log(`🚨 EXACT PLACEMENT: Using PRECISE row ${finalRowIndex} with NO ADJUSTMENTS OR LIMITS`);
      console.log(`🚨 This ensures pixel-perfect placement with projects appearing at exact drop position`);
      
      // MAY 16 2025 UPDATE - CRITICAL CHANGE:
      // - NO ROW CONSTRAINTS - Project should stay EXACTLY where the user drops it
      // - ALLOW ANY ROW VALUE with no adjustment of any kind
      // - COMPLETELY REMOVE ALL AUTO-ADJUSTMENT / ROW ENFORCEMENT MECHANISMS
      
      const bayId = parseInt(req.body.bayId.toString());
      
      // Get the bay data for logging only (no enforcement)
      const bay = await storage.getManufacturingBay(bayId);
      const bayNumber = bay ? bay.bayNumber : null;
      
      console.log(`✅ MAY 16 2025 UPDATE - CRITICAL CHANGE:`);
      console.log(`✅ BAY ${bayNumber || bayId}: REMOVED ALL ROW LIMITS - Using exact row ${finalRowIndex} as requested`);
      console.log(`✅ Projects will be placed at EXACTLY the Y position where they were dropped`);
      console.log(`✅ NO RESTRICTIONS on row values - allowing ANY value with no adjustment`);
      
      console.log(`🚨 EXACT PLACEMENT: Using PRECISE row ${finalRowIndex} with NO ADJUSTMENTS OR LIMITS`);
      console.log(`🚨 This ensures pixel-perfect placement with projects appearing at exact drop position`);
      console.log(`🚨 Original row from drop event: ${rowParam} -> Using: ${finalRowIndex}`);
      console.log(`🚨 Projects may overlap/stack in same row - this is intentional per user request`);
      
      const data = {
        ...req.body,
        // MAY 16 2025 CRITICAL CHANGE: Projects stay EXACTLY where dropped with NO limits
        row: finalRowIndex, // Use exact row with NO adjustments or limits of any kind
        rowIndex: finalRowIndex // Store in both fields for compatibility
      };
      
      // HIGHEST PRIORITY LOGGING: Critical placement details
      console.log("🚨 CRITICAL - Creating schedule with EXACT row placement:", data);
      console.log("🚨 MANDATORY: Using row value:", data.row, "as DIRECTLY specified by UI");
      console.log("🚨 NO AUTO ROW ADJUSTMENT: Project will be placed EXACTLY where dropped");
      
      // First create the schedule
      const schedule = await storage.createManufacturingSchedule(data);
      
      // COMMENTED OUT: Automatic project date updates when creating new schedules
      // This functionality has been disabled to keep schedule and project dates separate
      /*
      // Then update the project's dates to match the schedule
      if (schedule && data.projectId) {
        try {
          // Get the current project data
          const project = await storage.getProject(data.projectId);
          
          if (project) {
            // Create project update with new dates from the schedule
            const startDate = new Date(data.startDate);
            const endDate = new Date(data.endDate);
            
            // CRITICAL FIX: Calculate all phase dates based on the schedule
            // This ensures that the PROD phase shown in the bay schedule is correctly 
            // reflected in the project data
            
            // Calculate total days for the project
            const totalDays = differenceInDays(endDate, startDate);
            console.log(`Total project days: ${totalDays} from ${startDate} to ${endDate}`);
            
            // Get phase percentages from the project schema fields (Schema has fabPercentage, etc)
            // Convert to number since schema uses decimal type
            const fabPercent = (project.fabPercentage !== null && project.fabPercentage !== undefined) ? 
                Number(project.fabPercentage) : 27;
            const paintPercent = (project.paintPercentage !== null && project.paintPercentage !== undefined) ? 
                Number(project.paintPercentage) : 7;
            const assemblyPercent = (project.productionPercentage !== null && project.productionPercentage !== undefined) ? 
                Number(project.productionPercentage) : 60; // PROD phase
            const itPercent = (project.itPercentage !== null && project.itPercentage !== undefined) ? 
                Number(project.itPercentage) : 7;
            const ntcPercent = (project.ntcPercentage !== null && project.ntcPercentage !== undefined) ? 
                Number(project.ntcPercentage) : 7;
            const qcPercent = (project.qcPercentage !== null && project.qcPercentage !== undefined) ? 
                Number(project.qcPercentage) : 7;
            
            console.log(`Using phase percentages: FAB=${fabPercent}%, PAINT=${paintPercent}%, PROD=${assemblyPercent}%, IT=${itPercent}%, NTC=${ntcPercent}%, QC=${qcPercent}%`);
            
            // Calculate days for each phase
            const fabDays = Math.round((fabPercent / 100) * totalDays);
            const paintDays = Math.round((paintPercent / 100) * totalDays);
            
            // Add 3-week (21 day) buffer to Production/Assembly phase
            const assemblyDaysBase = Math.round((assemblyPercent / 100) * totalDays);
            const assemblyDays = assemblyDaysBase + 21; // Adding 3 weeks (21 days) buffer
            
            const itDays = Math.round((itPercent / 100) * totalDays);
            const ntcDays = Math.round((ntcPercent / 100) * totalDays);
            const qcDays = Math.round((qcPercent / 100) * totalDays);
            
            console.log(`Phase durations in days: FAB=${fabDays}, PAINT=${paintDays}, PROD=${assemblyDays} (includes 21-day buffer), IT=${itDays}, NTC=${ntcDays}, QC=${qcDays}`);
            
            // PRIORITY RULE: When a project is placed in bay schedule, the schedule's dates
            // must always override the project dates - STRICT ENFORCEMENT
            console.log("STRICT PHASE DATE ENFORCEMENT: Schedule dates will always be the source of truth");
            
            // CRITICAL FIX: Calculate all phase dates based on the schedule's dates
            // This ensures phase dates in backend EXACTLY match visual representation in frontend
            console.log("Recalculating ALL phase dates from bay schedule start/end dates");
            
            // Import date utility functions
            const { adjustToNextBusinessDay } = await import("../shared/utils/date-utils");
            
            // REAL-TIME DATE USAGE WITH NO CALIBRATION WHATSOEVER
            // Use exact dates from the request with no adjustments
            
            // Process the dates directly from the request without any modification
            const endDateFromRequest = new Date(endDate);
            const totalProjectDuration = differenceInDays(endDateFromRequest, startDate);
            
            console.log(`USING EXACT DATES: startDate=${format(startDate, 'yyyy-MM-dd')}, endDate=${format(endDateFromRequest, 'yyyy-MM-dd')}`);
            console.log(`Total project duration using real dates: ${totalProjectDuration} days`);
            
            // Calculate phase dates using exact percentages to match the visual representation
            const fabDuration = Math.ceil(totalProjectDuration * (fabPercent / 100));
            const paintDuration = Math.ceil(totalProjectDuration * (paintPercent / 100));
            const prodDuration = Math.ceil(totalProjectDuration * (assemblyPercent / 100));
            const itDuration = Math.ceil(totalProjectDuration * (itPercent / 100));
            const ntcDuration = Math.ceil(totalProjectDuration * (ntcPercent / 100));
            const qcDuration = Math.ceil(totalProjectDuration * (qcPercent / 100));
            
            // Calculate exact phase end dates using real dates (no adjustments)
            const fabEndDate = addDays(startDate, fabDuration);
            const paintEndDate = addDays(fabEndDate, paintDuration);
            const prodEndDate = addDays(paintEndDate, prodDuration);
            const itEndDate = addDays(prodEndDate, itDuration);
            const ntcEndDate = addDays(itEndDate, ntcDuration);
            // QC end date is exactly the endDateFromRequest (no adjustments)
            
            // Now adjust for business days
            const fabStartAdjusted = adjustToNextBusinessDay(startDate) || startDate;
            const paintStartAdjusted = adjustToNextBusinessDay(fabEndDate) || fabEndDate;
            const assemblyStartAdjusted = adjustToNextBusinessDay(paintEndDate) || paintEndDate;
            const itStartAdjusted = adjustToNextBusinessDay(prodEndDate) || prodEndDate;
            const ntcStartAdjusted = adjustToNextBusinessDay(itEndDate) || itEndDate;
            const qcStartAdjusted = adjustToNextBusinessDay(ntcEndDate) || ntcEndDate;
            
            // Calculate Executive Review date (80% through QC phase)
            // Calculate from QC start date to end date (end of project)
            const qcToEndDuration = differenceInDays(endDateFromRequest, qcStartAdjusted);
            const execReviewDaysFromQcStart = Math.ceil(qcToEndDuration * 0.8);
            const tempExecReviewStart = addDays(qcStartAdjusted, execReviewDaysFromQcStart);
            const execReviewAdjusted = adjustToNextBusinessDay(tempExecReviewStart) || tempExecReviewStart;
            
            console.log("Final phase dates with business day adjustments:", {
              fabricationStart: format(fabStartAdjusted, 'yyyy-MM-dd'),
              wrapDate: format(paintStartAdjusted, 'yyyy-MM-dd'),
              assemblyStart: format(assemblyStartAdjusted, 'yyyy-MM-dd'),
              ntcTestingDate: format(ntcStartAdjusted, 'yyyy-MM-dd'),
              qcStartDate: format(qcStartAdjusted, 'yyyy-MM-dd'),
              executiveReviewDate: format(execReviewAdjusted, 'yyyy-MM-dd'),
              shipDate: format(endDate, 'yyyy-MM-dd')
            });
            
            // Create project update object with all calculated phase dates
            const projectUpdate = {
              // ENHANCED: Mark this project as scheduled
              isScheduled: true,
              
              // Store original phase values to allow reverting if needed
              lastScheduledDate: new Date().toISOString(),
              lastScheduledStartDate: format(startDate, 'yyyy-MM-dd'),
              lastScheduledEndDate: format(endDateFromRequest, 'yyyy-MM-dd'),
              
              // Basic dates - use EXACT dates from request with no adjustments
              startDate: format(startDate, 'yyyy-MM-dd'),
              // Use the exact end date from the request
              estimatedCompletionDate: format(endDateFromRequest, 'yyyy-MM-dd'),
              // Set shipDate to match the exact end date from request
              shipDate: format(endDateFromRequest, 'yyyy-MM-dd'),
              // Only update deliveryDate if it's not already set
              ...(
                !project.deliveryDate 
                  ? { deliveryDate: format(endDate, 'yyyy-MM-dd') }
                  : {}
              ),
              
              // ENHANCED: Update all phase dates to match the schedule
              // This ensures that project dates are precisely aligned with the schedule timeline
              fabricationStart: format(fabStartAdjusted, 'yyyy-MM-dd'),
              wrapDate: format(paintStartAdjusted, 'yyyy-MM-dd'),
              assemblyStart: format(assemblyStartAdjusted, 'yyyy-MM-dd'),
              ntcTestingDate: format(ntcStartAdjusted, 'yyyy-MM-dd'),
              qcStartDate: format(qcStartAdjusted, 'yyyy-MM-dd'),
              executiveReviewDate: format(execReviewAdjusted, 'yyyy-MM-dd'),
            };
            
            console.log(`Updating project ${data.projectId} with dates from schedule: `, projectUpdate);
            await storage.updateProject(data.projectId, projectUpdate);
          }
        } catch (projectUpdateError) {
          console.error("Error updating project dates:", projectUpdateError);
          // Don't fail the request if project update fails - still return the created schedule
        }
      }
      */
      
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating manufacturing schedule:", error);
      res.status(500).json({ message: "Error creating manufacturing schedule" });
    }
  });

  app.put("/api/manufacturing-schedules/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // CRITICAL FIX: Ensure row parameter is processed correctly and enforced
      // Get the row value with highest priority from either:
      // 1. forcedRowIndex (highest priority)
      // 2. rowIndex parameter 
      // 3. row parameter
      // 4. Fallback to undefined (do not change row)
      const forcedRowIndex = req.body.forcedRowIndex !== undefined ? parseInt(req.body.forcedRowIndex) : undefined;
      const rowIndex = req.body.rowIndex !== undefined ? parseInt(req.body.rowIndex) : undefined;
      const rowValue = req.body.row !== undefined ? parseInt(req.body.row) : undefined;
      
      // Choose the first defined value with priority order
      let finalRow = forcedRowIndex !== undefined ? forcedRowIndex : 
                     (rowIndex !== undefined ? rowIndex : rowValue);
      
      // MAY 16 2025 UPDATE - CRITICAL CHANGE:
      // - NO ROW CONSTRAINTS - Project should stay EXACTLY where the user drops it
      // - ALLOW ANY ROW VALUE with no adjustment of any kind
      // - COMPLETELY REMOVE ALL AUTO-ADJUSTMENT / ROW ENFORCEMENT MECHANISMS
      
      if (finalRow !== undefined) {
        // Get the bay ID from the request or from the existing schedule
        let bayId = req.body.bayId !== undefined ? parseInt(req.body.bayId.toString()) : undefined;
        
        // If bayId not in request, get it from the original schedule (which we'll fetch below)
        if (bayId === undefined && originalSchedule) {
          bayId = originalSchedule.bayId;
        }
        
        // ONLY ensure rows aren't negative - but allow ANY positive value without limits
        if (finalRow < 0) finalRow = 0;
        
        // Get the bay data for logging only (no enforcement)
        if (bayId !== undefined) {
          const bay = await storage.getManufacturingBay(bayId);
          const bayNumber = bay ? bay.bayNumber : null;
          
          console.log(`✅ MAY 16 2025 UPDATE - CRITICAL CHANGE:`);
          console.log(`✅ BAY ${bayNumber || bayId}: REMOVED ALL ROW LIMITS - Using exact row ${finalRow} as requested`);
          console.log(`✅ Projects will be placed at EXACTLY the Y position where they were dropped`);
          console.log(`✅ NO RESTRICTIONS on row values - allowing ANY value with no adjustment`);
        }
        
        console.log(`🚨 EXACT PLACEMENT: Using PRECISE row ${finalRow} with NO ADJUSTMENTS OR LIMITS`);
        console.log(`🚨 This ensures pixel-perfect placement with projects appearing at exact drop position`);
        console.log(`🚨 Original row from drop event: ${forcedRowIndex || rowIndex || rowValue} -> Using: ${finalRow}`);
        console.log(`🚨 Projects may overlap/stack in same row - this is intentional per user request`);
      }
      
      // Create final data object with exact row placement (and row limit enforcement)
      const data = {
        ...req.body,
        row: finalRow,
        rowIndex: finalRow // Set both for maximum compatibility
      };
      
      // PIXEL-PERFECT PLACEMENT: Absolutely critical logging
      console.log("🚨 SERVER UPDATE - EXACT ROW PLACEMENT: Using row =", finalRow);
      console.log("Row sources: forcedRowIndex =", forcedRowIndex, "rowIndex =", rowIndex, "row =", rowValue);
      console.log("NO AUTO ROW ADJUSTMENT: Project will remain EXACTLY where user placed it");
      console.log("CRITICAL POLICY: Implementing pixel-perfect positioning with ZERO automatic repositioning");
      
      // First get the original schedule to access the projectId
      const originalSchedule = await storage.getManufacturingSchedule(id);
      if (!originalSchedule) {
        return res.status(404).json({ message: "Manufacturing schedule not found" });
      }
      
      // Update the schedule
      const schedule = await storage.updateManufacturingSchedule(id, data);
      if (!schedule) {
        return res.status(404).json({ message: "Manufacturing schedule not found" });
      }
      
      // Create a separate log entry showing the row information for debugging purposes
      console.log("💾 SCHEDULE UPDATE - CRITICAL ROW INFO:", {
        id: schedule.id,
        rowRequested: finalRow,
        rowSaved: schedule.row,
        match: schedule.row === finalRow ? "✅ EXACT MATCH" : "❌ ROW MISMATCH"
      });
      
      // COMMENTED OUT: Automatic project date updates when moving schedule bars
      // This functionality has been disabled to keep schedule and project dates separate
      /* 
      // Then update the project's dates to match the schedule
      try {
        const projectId = originalSchedule.projectId;
        if (projectId && (data.startDate || data.endDate)) {
          // Get the current project data
          const project = await storage.getProject(projectId);
          
          if (project) {
            // Need both start and end dates for calculation
            const startDate = data.startDate ? new Date(data.startDate) : new Date(originalSchedule.startDate);
            const endDate = data.endDate ? new Date(data.endDate) : new Date(originalSchedule.endDate);
            
            // Calculate total days for the project
            const totalDays = differenceInDays(endDate, startDate);
            console.log(`Total project days: ${totalDays} from ${startDate} to ${endDate}`);
            
            // Get phase percentages from the project schema fields (Schema has fabPercentage, etc)
            // Convert to number since schema uses decimal type
            const fabPercent = (project.fabPercentage !== null && project.fabPercentage !== undefined) ? 
                Number(project.fabPercentage) : 27;
            const paintPercent = (project.paintPercentage !== null && project.paintPercentage !== undefined) ? 
                Number(project.paintPercentage) : 7;
            const assemblyPercent = (project.productionPercentage !== null && project.productionPercentage !== undefined) ? 
                Number(project.productionPercentage) : 60; // PROD phase
            const itPercent = (project.itPercentage !== null && project.itPercentage !== undefined) ? 
                Number(project.itPercentage) : 7;
            const ntcPercent = (project.ntcPercentage !== null && project.ntcPercentage !== undefined) ? 
                Number(project.ntcPercentage) : 7;
            const qcPercent = (project.qcPercentage !== null && project.qcPercentage !== undefined) ? 
                Number(project.qcPercentage) : 7;
            
            console.log(`Using phase percentages: FAB=${fabPercent}%, PAINT=${paintPercent}%, PROD=${assemblyPercent}%, IT=${itPercent}%, NTC=${ntcPercent}%, QC=${qcPercent}%`);
            
            // Calculate days for each phase
            const fabDays = Math.round((fabPercent / 100) * totalDays);
            const paintDays = Math.round((paintPercent / 100) * totalDays);
            
            // Add 3-week (21 day) buffer to Production/Assembly phase
            const assemblyDaysBase = Math.round((assemblyPercent / 100) * totalDays);
            const assemblyDays = assemblyDaysBase + 21; // Adding 3 weeks (21 days) buffer
            
            const itDays = Math.round((itPercent / 100) * totalDays);
            const ntcDays = Math.round((ntcPercent / 100) * totalDays);
            const qcDays = Math.round((qcPercent / 100) * totalDays);
            
            console.log(`Phase durations in days: FAB=${fabDays}, PAINT=${paintDays}, PROD=${assemblyDays} (includes 21-day buffer), IT=${itDays}, NTC=${ntcDays}, QC=${qcDays}`);
            
            // Create project update with new dates from the schedule
            // ENHANCED: Always create a project update object to ensure all dates get updated
          // This guarantees that project dates are always in sync with the schedule
          const projectUpdate: any = {};
            
          // CRITICAL: Always update all dates whenever a schedule changes
          // This ensures the project dates are kept in sync with the schedule at all times
          
          // Basic dates - unconditionally update to ensure consistency
          projectUpdate.startDate = format(startDate, 'yyyy-MM-dd');
          projectUpdate.estimatedCompletionDate = format(endDate, 'yyyy-MM-dd');
          projectUpdate.shipDate = format(endDate, 'yyyy-MM-dd');
              
          // Only update deliveryDate if the project end date is after the current delivery date
          // or if deliveryDate is not set
          if (!project.deliveryDate || 
              (new Date(data.endDate) > new Date(project.deliveryDate))) {
            projectUpdate.deliveryDate = format(endDate, 'yyyy-MM-dd');
          }
            
            // CRITICAL: Update all phase dates based on the new schedule
            // Import date utility functions
            const { adjustToNextBusinessDay } = await import("../shared/utils/date-utils");
            
            // PRIORITY RULE: When a project is placed in bay schedule, the schedule's dates
            // must always override the project dates - STRICT ENFORCEMENT
            console.log("STRICT PHASE DATE ENFORCEMENT: Schedule dates will always be the source of truth");
            
            // Calculate all phase dates from scratch based on the schedule's dates
            // This ensures dates are always in sync with the bay schedule
            console.log("Recalculating ALL phase dates from bay schedule start/end dates");
            
            // Recalculate phase dates from scratch with adjusted business days
            const fabStartAdjusted = adjustToNextBusinessDay(startDate) || startDate;
            
            // Calculate FAB end date / Paint start date (after FAB days)
            const tempPaintStart = addDays(startDate, fabDays);
            const paintStartAdjusted = adjustToNextBusinessDay(tempPaintStart) || tempPaintStart;
            
            // Calculate Paint end date / Assembly (Production) start date (after Paint days)
            const tempAssemblyStart = addDays(paintStartAdjusted, paintDays);
            const assemblyStartAdjusted = adjustToNextBusinessDay(tempAssemblyStart) || tempAssemblyStart;
            
            // Calculate Assembly end date / IT+NTC start date (after Assembly/Production days)
            const tempNtcStart = addDays(assemblyStartAdjusted, assemblyDays);
            const ntcStartAdjusted = adjustToNextBusinessDay(tempNtcStart) || tempNtcStart;
            
            // Calculate NTC end date / QC start date (after NTC days)
            const tempQcStart = addDays(ntcStartAdjusted, ntcDays);
            const qcStartAdjusted = adjustToNextBusinessDay(tempQcStart) || tempQcStart;
            
            // Calculate Executive Review date (80% through QC phase)
            const tempExecReviewStart = addDays(qcStartAdjusted, Math.round(qcDays * 0.8));
            const execReviewAdjusted = adjustToNextBusinessDay(tempExecReviewStart) || tempExecReviewStart;
            
            // Force update ALL phase dates when schedule changes
            // This is critical for UI consistency across all project views
            projectUpdate.fabricationStart = format(fabStartAdjusted, 'yyyy-MM-dd');
            projectUpdate.wrapDate = format(paintStartAdjusted, 'yyyy-MM-dd');
            projectUpdate.assemblyStart = format(assemblyStartAdjusted, 'yyyy-MM-dd');
            projectUpdate.ntcTestingDate = format(ntcStartAdjusted, 'yyyy-MM-dd');
            projectUpdate.qcStartDate = format(qcStartAdjusted, 'yyyy-MM-dd');
            projectUpdate.executiveReviewDate = format(execReviewAdjusted, 'yyyy-MM-dd');
            projectUpdate.shipDate = format(endDate, 'yyyy-MM-dd');
            
            console.log("Final phase dates with business day adjustments:", {
              fabricationStart: format(fabStartAdjusted, 'yyyy-MM-dd'),
              wrapDate: format(paintStartAdjusted, 'yyyy-MM-dd'),
              assemblyStart: format(assemblyStartAdjusted, 'yyyy-MM-dd'),
              ntcTestingDate: format(ntcStartAdjusted, 'yyyy-MM-dd'),
              qcStartDate: format(qcStartAdjusted, 'yyyy-MM-dd'),
              executiveReviewDate: format(execReviewAdjusted, 'yyyy-MM-dd'),
              shipDate: format(endDate, 'yyyy-MM-dd')
            });
            
            // Log comparison with previous dates to verify changes
            console.log("PHASE DATE CHANGES - Previous vs New:", {
              fabricationStart: { old: project.fabricationStart, new: format(fabStartAdjusted, 'yyyy-MM-dd') },
              wrapDate: { old: project.wrapDate, new: format(paintStartAdjusted, 'yyyy-MM-dd') },
              assemblyStart: { old: project.assemblyStart, new: format(assemblyStartAdjusted, 'yyyy-MM-dd') },
              ntcTestingDate: { old: project.ntcTestingDate, new: format(ntcStartAdjusted, 'yyyy-MM-dd') },
              qcStartDate: { old: project.qcStartDate, new: format(qcStartAdjusted, 'yyyy-MM-dd') },
              shipDate: { old: project.shipDate, new: format(endDate, 'yyyy-MM-dd') }
            });
            
            if (Object.keys(projectUpdate).length > 0) {
              console.log(`Updating project ${projectId} with dates from schedule: `, projectUpdate);
              await storage.updateProject(projectId, projectUpdate);
              
              // Check if delivery/ship date changed, and update any associated delivery milestones
              if (projectUpdate.deliveryDate || projectUpdate.shipDate) {
                try {
                  const dateToSync = projectUpdate.deliveryDate || projectUpdate.shipDate;
                  await syncDeliveryMilestonesToShipDate(projectId, dateToSync);
                } catch (milestoneError) {
                  console.error("Error updating delivery milestones after schedule change:", milestoneError);
                  // Don't fail the request if milestone updates fail
                }
              }
            }
          }
        }
      } catch (projectUpdateError) {
        console.error("Error updating project dates:", projectUpdateError);
        // Don't fail the request if project update fails - still return the updated schedule
      }
      */
      
      // Create enhanced response with explicit row information for testing and verification
      const enhancedResponse = {
        schedule,
        rowInfo: {
          requestedRow: finalRow,
          actualRow: schedule.row,
          exactMatch: schedule.row === finalRow
        }
      };
      
      console.log("🔄 FINAL RESPONSE WITH ROW INFO:", JSON.stringify(enhancedResponse, null, 2));
      res.json(enhancedResponse);
    } catch (error) {
      console.error("Error updating manufacturing schedule:", error);
      res.status(500).json({ message: "Error updating manufacturing schedule" });
    }
  });

  app.delete("/api/manufacturing-schedules/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // ENHANCEMENT: Get the schedule information before deleting to update project dates
      const scheduleToDelete = await storage.getManufacturingSchedule(id);
      
      // Delete the schedule first
      const result = await storage.deleteManufacturingSchedule(id);
      
      // Update the project dates when a schedule is removed
      if (scheduleToDelete && scheduleToDelete.projectId) {
        try {
          // Get the project data
          const project = await storage.getProject(scheduleToDelete.projectId);
          
          if (project) {
            console.log(`Updating project ${project.id} after schedule removal`);
            
            // When a project is removed from schedule, reset its schedule-derived dates
            // but preserve any manually set dates
            const projectUpdate: any = {
              // Mark this project as no longer scheduled
              isScheduled: false
            };
            
            // Only update the project if we have something to update
            if (Object.keys(projectUpdate).length > 0) {
              await storage.updateProject(project.id, projectUpdate);
              console.log(`Project ${project.id} updated after schedule removal`);
            }
          }
        } catch (projectUpdateError) {
          console.error('Error updating project after schedule removal:', projectUpdateError);
          // Don't fail the request if project update fails
        }
      }
      
      res.json({ success: result });
    } catch (error) {
      console.error("Error deleting manufacturing schedule:", error);
      res.status(500).json({ message: "Error deleting manufacturing schedule" });
    }
  });

  // Billing milestone routes
  app.post("/api/billing-milestones", async (req, res) => {
    try {
      console.log("🔍 Billing milestone creation request received");
      console.log("📝 Request body:", JSON.stringify(req.body, null, 2));
      
      const validatedData = insertBillingMilestoneSchema.parse(req.body);
      console.log("✅ Data validation passed");
      console.log("📊 Validated data:", JSON.stringify(validatedData, null, 2));
      
      // Convert empty strings to null for date fields
      const processedData = {
        ...validatedData,
        targetInvoiceDate: validatedData.targetInvoiceDate === "" ? null : validatedData.targetInvoiceDate,
        actualInvoiceDate: validatedData.actualInvoiceDate === "" ? null : validatedData.actualInvoiceDate,
        paymentReceivedDate: validatedData.paymentReceivedDate === "" ? null : validatedData.paymentReceivedDate,
      };
      
      console.log("🔧 Processed data for database:", JSON.stringify(processedData, null, 2));
      
      const newMilestone = await storage.createBillingMilestone(processedData);
      console.log("🎉 Billing milestone created successfully:", newMilestone.id);
      
      res.status(201).json(newMilestone);
    } catch (error) {
      if (error instanceof ZodError) {
        console.log("❌ Validation failed - Zod errors:");
        console.log(JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid billing milestone data", errors: error.errors });
      }
      console.error("💥 Error creating billing milestone:", error);
      res.status(500).json({ message: "Error creating billing milestone" });
    }
  });

  app.get("/api/billing-milestones/:id", async (req, res) => {
    try {
      const milestoneId = parseInt(req.params.id);
      const milestone = await storage.getBillingMilestone(milestoneId);
      if (!milestone) {
        return res.status(404).json({ message: "Billing milestone not found" });
      }
      res.json(milestone);
    } catch (error) {
      console.error("Error fetching billing milestone:", error);
      res.status(500).json({ message: "Error fetching billing milestone" });
    }
  });

  app.put("/api/billing-milestones/:id", async (req, res) => {
    try {
      const milestoneId = parseInt(req.params.id);
      const updatedMilestone = await storage.updateBillingMilestone(milestoneId, req.body);
      if (!updatedMilestone) {
        return res.status(404).json({ message: "Billing milestone not found" });
      }
      res.json(updatedMilestone);
    } catch (error) {
      console.error("Error updating billing milestone:", error);
      res.status(500).json({ message: "Error updating billing milestone" });
    }
  });

  // Import routes
  app.post("/api/import/projects", simpleAuth, importProjects);
  app.post("/api/import/billing-milestones", simpleAuth, importBillingMilestones);
  app.post("/api/import/manufacturing-bays", simpleAuth, importManufacturingBays);
  app.post("/api/import/manufacturing-schedules", simpleAuth, importManufacturingSchedules);
  
  // Special endpoint to clear all manufacturing schedules
  // This will move ALL projects back to the Unassigned section
  // CRITICAL FIX: Temporarily disable authentication for clearing schedules
  app.post("/api/manufacturing-schedules/clear-all", async (req, res) => {
    try {
      console.log("Clearing all manufacturing schedules - moving all projects to Unassigned section");
      // Get all existing schedules
      const allSchedules = await storage.getManufacturingSchedules();
      console.log(`Found ${allSchedules.length} schedules to clear`);
      
      // Delete all existing schedules
      let deletedCount = 0;
      const errors = [];
      
      // Use Promise.all for better performance
      try {
        const results = await Promise.all(
          allSchedules.map(schedule => 
            storage.deleteManufacturingSchedule(schedule.id)
              .then(success => {
                if (success) {
                  deletedCount++;
                  return { success: true, id: schedule.id };
                } else {
                  errors.push(`Failed to delete schedule ${schedule.id}`);
                  return { success: false, id: schedule.id };
                }
              })
              .catch(err => {
                console.error(`Error deleting schedule ${schedule.id}:`, err);
                errors.push(`Error deleting schedule ${schedule.id}: ${err.message}`);
                return { success: false, id: schedule.id, error: err };
              })
          )
        );
        
        console.log(`Successfully deleted ${deletedCount}/${allSchedules.length} schedules`);
        console.log(`Deletion results:`, results);
      } catch (batchError) {
        console.error("Error in batch deletion:", batchError);
      }
      // Check if all schedules were successfully deleted
      const allDeleted = deletedCount === allSchedules.length;
      
      if (allDeleted) {
        res.json({ 
          success: true, 
          message: `All ${deletedCount} projects have been moved to the Unassigned section. You can now manually place them as needed.`,
          deletedCount
        });
      } else if (deletedCount > 0) {
        // Some schedules were deleted, but not all
        res.json({
          success: true,
          message: `${deletedCount} out of ${allSchedules.length} projects have been moved to the Unassigned section.`,
          deletedCount,
          totalSchedules: allSchedules.length,
          errors: errors.length > 0 ? errors : undefined
        });
      } else if (allSchedules.length === 0) {
        // No schedules existed to begin with
        res.json({
          success: true,
          message: "No projects to move. All projects are already in the Unassigned section.",
          deletedCount: 0
        });
      } else {
        // Failed to delete any schedules
        res.status(500).json({
          success: false,
          message: "Failed to move any projects to the Unassigned section. Please try again.",
          errors
        });
      }
    } catch (error) {
      console.error("Error clearing manufacturing schedules:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error clearing manufacturing schedules",
        error: String(error)
      });
    }
  });
  app.post("/api/import/delivery-tracking", simpleAuth, importDeliveryTracking);
  app.post("/api/import/bay-scheduling", simpleAuth, importBayScheduling);
  
  // Debug endpoint for the bay scheduling import (temporary - remove in production)
  app.post("/api/debug/bay-scheduling-import", async (req, res) => {
    try {
      console.log("Starting debug bay scheduling import endpoint");
      
      // Sample test data using real project numbers from the database
      const testData = {
        schedules: [
          {
            projectNumber: "804653",
            productionStartDate: "2025-06-01",
            endDate: "2025-07-15",
            teamNumber: 1,
            totalHours: 1200
          },
          {
            projectNumber: "804814",
            productionStartDate: "2025-05-15",
            endDate: "2025-08-01",
            teamNumber: 2,
            totalHours: 850
          },
          {
            projectNumber: "804654",
            productionStartDate: "2025-07-01",
            endDate: "2025-08-15",
            teamNumber: 3,
            totalHours: 1500
          }
        ]
      };
      
      // Mock the request object with our test data
      const mockReq = {
        body: testData
      } as Request;
      
      // Create a mock response object to capture the response
      const mockRes = {
        status: (code: number) => ({
          json: (data: any) => {
            console.log(`Debug response (${code}):`, JSON.stringify(data, null, 2));
            return res.status(code).json(data);
          }
        }),
        json: (data: any) => {
          console.log("Debug response:", JSON.stringify(data, null, 2));
          return res.json(data);
        }
      } as unknown as Response;
      
      // Call the import function directly with our mock objects
      console.log("Calling importBayScheduling with test data");
      await importBayScheduling(mockReq, mockRes);
      
    } catch (error) {
      console.error("Error in debug bay scheduling import:", error);
      res.status(500).json({
        success: false,
        message: "Error in debug import",
        error: error.message
      });
    }
  });
  
  // Delivery Tracking routes 
  app.get("/api/delivery-tracking", getAllDeliveryTracking);
  app.get("/api/delivery-tracking/analytics", getDeliveryAnalytics);
  app.get("/api/projects/:projectId/delivery-tracking", getProjectDeliveryTracking);
  app.post("/api/delivery-tracking", simpleAuth, createDeliveryTracking);
  app.put("/api/delivery-tracking/:id", simpleAuth, updateDeliveryTracking);
  app.delete("/api/delivery-tracking/:id", simpleAuth, deleteDeliveryTracking);
  
  // User Preferences routes
  app.get("/api/user-preferences", simpleAuth, async (req: any, res) => {
    try {
      // Get user ID from the authenticated user
      const userId = req.user.id;
      const preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        return res.status(404).json({ message: "User preferences not found" });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Error fetching user preferences" });
    }
  });
  
  app.post("/api/user-preferences", simpleAuth, validateRequest(insertUserPreferencesSchema), async (req: any, res) => {
    try {
      // Get user ID from the authenticated user
      const userId = req.user.id;
      
      // Check if preferences already exist
      const existingPreferences = await storage.getUserPreferences(userId);
      if (existingPreferences) {
        return res.status(400).json({ message: "User preferences already exist. Use PUT to update." });
      }
      
      // Create new preferences
      const preferencesData = {
        ...req.body,
        userId
      };
      
      const preferences = await storage.createUserPreferences(preferencesData);
      res.status(201).json(preferences);
    } catch (error) {
      console.error("Error creating user preferences:", error);
      res.status(500).json({ message: "Error creating user preferences" });
    }
  });
  
  app.put("/api/user-preferences", simpleAuth, async (req: any, res) => {
    try {
      // Get user ID from the authenticated user
      const userId = req.user.id;
      
      // Check if preferences exist, create if they don't
      const existingPreferences = await storage.getUserPreferences(userId);
      
      if (!existingPreferences) {
        // Create new preferences
        const preferencesData = {
          ...req.body,
          userId
        };
        
        const preferences = await storage.createUserPreferences(preferencesData);
        return res.status(201).json(preferences);
      }
      
      // Update existing preferences
      const updatedPreferences = await storage.updateUserPreferences(userId, req.body);
      if (!updatedPreferences) {
        return res.status(500).json({ message: "Failed to update user preferences" });
      }
      
      res.json(updatedPreferences);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Error updating user preferences" });
    }
  });
  
  // Single login endpoint - proper role-based authentication
  app.post("/api/login", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const loginEmail = email || username; // Support both email and username fields
      
      console.log("🔐 Login attempt:", { email: loginEmail, hasPassword: !!password });

      if (!loginEmail) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(loginEmail);
      if (!user) {
        console.log("❌ User not found:", loginEmail);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      console.log(`👤 User found: ${user.email} | Role: ${user.role} | Approved: ${user.isApproved}`);

      // Check if user is approved by admin
      if (!user.isApproved) {
        console.log("❌ User not approved by admin");
        return res.status(401).json({ message: "Account pending admin approval" });
      }

      // Verify password if provided
      if (password && user.password) {
        let passwordMatch = false;
        
        if (user.password.includes('.')) {
          const parts = user.password.split('.');
          if (parts.length === 2) {
            // Try scrypt-based password verification first (new format)
            const crypto = await import('crypto');
            const { promisify } = await import('util');
            const scryptAsync = promisify(crypto.scrypt);
            
            try {
              const [hashedPassword, salt] = parts;
              const hashedBuf = Buffer.from(hashedPassword, "hex");
              const suppliedBuf = (await scryptAsync(password, salt, 64)) as Buffer;
              passwordMatch = crypto.timingSafeEqual(hashedBuf, suppliedBuf);
              console.log("🔐 Using scrypt password verification:", passwordMatch);
            } catch (scryptError) {
              console.log("❌ Scrypt verification failed, trying SHA-512 fallback");
              // Fall back to SHA-512 for backward compatibility
              try {
                const crypto = await import('crypto');
                const [storedHash, salt] = parts;
                const testHash = crypto.createHash('sha512').update(password + salt).digest('hex');
                passwordMatch = storedHash === testHash;
                console.log("🔐 Using SHA-512 fallback verification:", passwordMatch);
              } catch (sha512Error) {
                console.log("❌ SHA-512 fallback also failed:", sha512Error);
                passwordMatch = false;
              }
            }
          }
        } else if (user.password === password) {
          // Plain text password (should not happen in production)
          console.log("⚠️ Plain text password verification");
          passwordMatch = true;
        }
        
        if (!passwordMatch) {
          console.log("❌ Password verification failed for user:", loginEmail);
          return res.status(401).json({ message: "Invalid email or password" });
        }
        
        console.log("✅ Password verification successful for user:", loginEmail);
      } else if (password && !user.password) {
        console.log("❌ Password provided but user has no password set");
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create session with approved user
      if (req.session) {
        (req.session as any).userId = user.id;
        (req.session as any).user = user;
      }

      console.log(`✅ User logged in: ${user.email} with role ${user.role}`);

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        isApproved: user.isApproved
      });
    } catch (error) {
      console.error("❌ Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Logout endpoint
  app.post("/api/logout", (req: any, res: any) => {
    if (req.session) {
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        console.log("✅ User logged out successfully");
        res.json({ message: "Logged out successfully" });
      });
    } else {
      res.json({ message: "No session to destroy" });
    }
  });
  
  // Registration endpoint - creates pending user for admin approval
  app.post("/api/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Hash password using scrypt (consistent with auth.ts)
      const crypto = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(crypto.scrypt);
      const salt = crypto.randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

      // Create user with pending approval (not approved by default)
      const newUser = await storage.createUser({
        id: crypto.randomUUID(),
        username,
        email,
        password: hashedPassword,
        role: 'pending', // Default role until admin approves
        isApproved: false // Requires admin approval
      });

      console.log(`📝 New user registered: ${email} - pending admin approval`);
      
      // Create notification for admin
      await storage.createNotification({
        title: "New User Registration",
        message: `New user ${username} (${email}) has registered and requires approval.`,
        type: "system",
        priority: "medium",
        userId: null // System-wide notification for admins
      });

      res.status(201).json({ 
        message: "Registration successful. Please wait for admin approval.",
        requiresApproval: true
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // TEMPORARY: Special development-only route to auto-login as the admin user
  // This will be removed in production
  app.get("/api/dev-login", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ message: "Route not found" });
    }
    
    try {
      // Find the admin user by email
      const [adminUser] = await db.select().from(users).where(eq(users.email, "colter.mahlum@nomadgcs.com"));
      
      if (!adminUser) {
        return res.status(404).json({ message: "Admin user not found" });
      }
      
      console.log("DEV-LOGIN: Found admin user:", adminUser.id);
      
      // Log in the user directly
      req.login(adminUser, (err) => {
        if (err) {
          console.error("DEV-LOGIN ERROR:", err);
          return res.status(500).json({ message: "Login failed", error: err.message });
        }
        
        console.log("DEV-LOGIN: Session after login:", req.session);
        console.log("DEV-LOGIN: User in session:", req.user);
        
        // Return user info without sensitive data
        const { password, passwordResetToken, passwordResetExpires, ...userInfo } = adminUser;
        
        // Send session cookie explicitly
        res.cookie('tier4.sid', req.sessionID, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
        });
        
        return res.json({
          ...userInfo,
          message: "Development auto-login successful",
          sessionID: req.sessionID
        });
      });
    } catch (error) {
      console.error("DEV-LOGIN ERROR:", error);
      res.status(500).json({ message: "Failed to auto-login", error: error.message });
    }
  });

  // TEMPORARY ENDPOINT: Delete all projects - This is for cleanup purposes only
  app.delete("/api/reset-all-projects", simpleAuth, async (req, res) => {
    try {
      const projects = await storage.getProjects();
      let deletedCount = 0;
      
      for (const project of projects) {
        try {
          // First remove any associated data
          const billingMilestones = await storage.getProjectBillingMilestones(project.id);
          for (const milestone of billingMilestones) {
            await storage.deleteBillingMilestone(milestone.id);
          }
          
          const tasks = await storage.getTasks(project.id);
          for (const task of tasks) {
            await storage.deleteTask(task.id);
          }
          
          const schedules = await storage.getManufacturingSchedules({ projectId: project.id });
          for (const schedule of schedules) {
            await storage.deleteManufacturingSchedule(schedule.id);
          }
          
          // Then delete the project itself
          await storage.deleteProject(project.id);
          deletedCount++;
          console.log(`Deleted project ${project.id}: ${project.name} (${project.projectNumber})`);
        } catch (error) {
          console.error(`Failed to delete project ${project.id}:`, error);
        }
      }
      
      return res.json({ 
        success: true, 
        message: `Successfully deleted ${deletedCount} projects and their associated data`, 
        totalDeleted: deletedCount 
      });
    } catch (error) {
      console.error("Error deleting projects:", error);
      return res.status(500).json({ success: false, message: "Error deleting projects" });
    }
  });

  // Task API routes
  app.get("/api/projects/:projectId/tasks", simpleAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const tasks = await storage.getTasks(projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Error fetching tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const newTask = await storage.createTask(validatedData);
      res.status(201).json(newTask);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Error creating task" });
    }
  });

  app.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updateData = { ...req.body };
      
      // If task is being marked as completed, track WHO and WHEN
      if (updateData.isCompleted === true) {
        updateData.completedByUserId = req.user.id;
        updateData.completedDate = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
      } else if (updateData.isCompleted === false) {
        // If task is being unmarked as completed, clear completion tracking
        updateData.completedByUserId = null;
        updateData.completedDate = null;
      }
      
      const updatedTask = await storage.updateTask(taskId, updateData);
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Error updating task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const success = await storage.deleteTask(taskId);
      if (success) {
        res.json({ message: "Task deleted successfully" });
      } else {
        res.status(404).json({ message: "Task not found" });
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Error deleting task" });
    }
  });

  // AI analysis routes
  app.get("/api/ai/project-health/:projectId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get related data
      const tasks = await storage.getTasks(projectId);
      const billingMilestones = await storage.getProjectBillingMilestones(projectId);
      const manufacturingSchedules = await storage.getManufacturingSchedules({ projectId });
      
      // Generate AI analysis
      const analysis = await analyzeProjectHealth(project, tasks, billingMilestones, manufacturingSchedules);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing project health:", error);
      res.status(500).json({ message: "Error analyzing project health" });
    }
  });

  app.get("/api/ai/billing-insights", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const billingMilestones = await storage.getBillingMilestones();
      
      // Generate AI insights
      const insights = await generateBillingInsights(projects, billingMilestones);
      
      res.json(insights);
    } catch (error) {
      console.error("Error generating billing insights:", error);
      res.status(500).json({ message: "Error generating billing insights" });
    }
  });

  app.get("/api/ai/manufacturing-insights", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const manufacturingSchedules = await storage.getManufacturingSchedules();
      
      // Generate AI insights
      const insights = await generateManufacturingInsights(projects, manufacturingSchedules);
      
      res.json(insights);
    } catch (error) {
      console.error("Error generating manufacturing insights:", error);
      res.status(500).json({ message: "Error generating manufacturing insights" });
    }
  });

  app.get("/api/ai/timeline-insights", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const allTasks = [];
      
      // For timeline insights, we fetch tasks for all projects
      for (const project of projects) {
        const tasks = await storage.getTasks(project.id);
        allTasks.push(...tasks);
      }
      
      // Generate AI insights
      const insights = await generateTimelineInsights(projects, allTasks);
      
      res.json(insights);
    } catch (error) {
      console.error("Error generating timeline insights:", error);
      res.status(500).json({ message: "Error generating timeline insights" });
    }
  });

  // User Management routes (admin only)
  app.get("/api/users", async (req, res) => {
    try {
      // Get all users
      const users = await storage.getUsers();
      
      // Get preferences for all users to combine with user data
      const enhancedUsers = await Promise.all(users.map(async (user) => {
        try {
          const preferences = await storage.getUserPreferences(user.id);
          // Add department from preferences to user object for frontend display
          return {
            ...user,
            department: preferences?.department || null
          };
        } catch (err) {
          console.error(`Error fetching preferences for user ${user.id}:`, err);
          return user;
        }
      }));
      
      res.json(enhancedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  
  // Add endpoint to get user preferences
  app.get("/api/users/:id/preferences", async (req, res) => {
    try {
      const userId = req.params.id;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences || {});
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Error fetching user preferences" });
    }
  });

  // Add PATCH endpoint for updating user information including department
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      const { firstName, lastName, email, role, department } = req.body;
      
      console.log("Updating user:", userId, "with data:", req.body);
      
      // First update basic user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user basic information
      await storage.updateUser(userId, {
        firstName,
        lastName,
        email,
        role
      });
      
      // Handle department update in user preferences
      if (department) {
        console.log("STORAGE: Updating preferences for user", userId, ":", { department });
        try {
          // Get current user preferences
          const prefs = await storage.getUserPreferences(userId);
          
          if (prefs) {
            // Update existing preferences with new department
            await storage.updateUserPreferences(userId, { department });
          } else {
            // Create new preferences record with department
            await storage.createUserPreferences({
              userId,
              department
            });
          }
        } catch (prefError) {
          console.error("Error updating user preferences:", prefError);
          // Don't fail the whole request if just preferences update fails
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Error updating user" });
    }
  });
  
  app.put("/api/users/:id/role", async (req, res) => {
    try {
      const { role, isApproved, status, preferences } = req.body;
      if (!role || typeof isApproved !== 'boolean') {
        return res.status(400).json({ message: "Role and approval status are required" });
      }
      
      // First update the user role and approval status
      const updatedUser = await storage.updateUserRole(req.params.id, role, isApproved, status);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // If preferences were provided, update them too
      if (preferences) {
        console.log(`Processing preferences for user ${req.params.id}:`, preferences);
        
        // Get existing preferences or create new ones if they don't exist
        const existingPrefs = await storage.getUserPreferences(req.params.id);
        
        if (existingPrefs) {
          // Update existing preferences
          console.log("Updating existing preferences");
          const updatedPrefs = await storage.updateUserPreferences(req.params.id, preferences);
          console.log("Updated preferences:", updatedPrefs);
        } else {
          // Create new preferences
          console.log("Creating new preferences");
          const newPrefs = await storage.createUserPreferences({
            userId: req.params.id,
            ...preferences
          });
          console.log("Created preferences:", newPrefs);
        }
      } else {
        console.log("No preferences provided for update");
      }
      
      // Create an audit log entry for role change
      const performedBy = req.user?.id || "system";
      await storage.createUserAuditLog(
        req.params.id,
        "USER_UPDATE",
        performedBy,
        { role: updatedUser.role, isApproved: updatedUser.isApproved },
        { role, isApproved, preferences },
        `User updated: Role changed to ${role}, approval status set to ${isApproved ? 'approved' : 'pending'}, preferences updated`
      );
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Error updating user role" });
    }
  });
  
  // Route to update user status (active, inactive, archived)
  app.put("/api/users/:id/status", async (req, res) => {
    try {
      const { status, reason } = req.body;
      if (!status || !['active', 'inactive', 'archived'].includes(status)) {
        return res.status(400).json({ message: "Valid status is required (active, inactive, or archived)" });
      }
      
      const performedBy = req.user?.id || "system";
      const updatedUser = await storage.updateUserStatus(req.params.id, status, performedBy, reason || "");
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Error updating user status" });
    }
  });

  // Route to delete a user
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      const performedBy = req.user?.id || "system";
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prevent self-deletion
      if (req.user && req.user.id === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // Create audit log before deletion
      await storage.createUserAuditLog(
        userId,
        "USER_DELETE",
        performedBy,
        { 
          firstName: user.firstName, 
          lastName: user.lastName, 
          email: user.email, 
          role: user.role 
        },
        {},
        `User ${user.firstName} ${user.lastName} (${user.email}) permanently deleted`
      );
      
      // Delete user preferences first (foreign key constraint)
      try {
        await storage.deleteUserPreferences(userId);
      } catch (error) {
        console.log("No preferences to delete for user:", userId);
      }
      
      // Delete the user
      await storage.deleteUser(userId);
      
      res.json({ 
        success: true, 
        message: `User ${user.firstName} ${user.lastName} has been permanently deleted` 
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Error deleting user" });
    }
  });
  
  // Route to approve a user
  app.patch("/api/users/:id/approve", async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user to approved status
      const updatedUser = await storage.updateUser(userId, {
        isApproved: true,
        status: "active",
        updatedAt: new Date()
      });
      
      // Log the user approval in audit logs
      console.log(`Creating audit log for user approval: userId=${userId}, performedBy=${req.user?.id || "system"}`);
      await storage.createUserAuditLog(
        userId,
        "STATUS_CHANGE", 
        req.user?.id || "system",
        undefined,
        undefined,
        "User approved by admin"
      );
      
      // Create notification for user approval
      const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown User';
      console.log(`Creating notification for user approval: userId=${userId}, userName=${userName}`);
      await storage.createNotification({
        title: "User Approved",
        message: `User access approved: ${userName} (${user?.username || 'unknown'}) is now able to access the system`,
        type: "system",
        priority: "medium",
        userId: null // System-wide notification
      });
      
      res.json({ 
        success: true, 
        message: "User approved successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Error approving user" });
    }
  });
  
  // Route to reject a user
  app.patch("/api/users/:id/reject", async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user to rejected status
      const updatedUser = await storage.updateUser(userId, {
        isApproved: false,
        status: "inactive", // Using "inactive" status for rejected users
        role: "pending", // Also set role to "pending" for rejected users
        updatedAt: new Date()
      });
      
      // Log the user rejection in audit logs
      console.log(`Creating audit log for user rejection: userId=${userId}, performedBy=${req.user?.id || "system"}`);
      await storage.createUserAuditLog(
        userId,
        "STATUS_CHANGE", 
        req.user?.id || "system",
        undefined,
        undefined,
        "User rejected by admin"
      );
      
      // Create notification for user rejection
      const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown User';
      console.log(`Creating notification for user rejection: userId=${userId}, userName=${userName}`);
      await storage.createNotification({
        title: "User Access Denied",
        message: `User access denied: ${userName} (${user?.username || 'unknown'}) has been rejected and cannot access the system`,
        type: "system",
        priority: "medium",
        userId: null // System-wide notification
      });
      
      res.json({ 
        success: true, 
        message: "User rejected successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("Error rejecting user:", error);
      res.status(500).json({ message: "Error rejecting user" });
    }
  });

  // Route to update user module visibility
  app.patch("/api/users/:id/module-visibility", simpleAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const { module, is_visible } = req.body;
      
      if (!module || typeof is_visible !== 'boolean') {
        return res.status(400).json({ message: "module and is_visible are required" });
      }
      
      // Update module visibility in database
      await storage.updateUserModuleVisibility(userId, module, is_visible);
      
      // Get user info for audit log
      const user = await storage.getUser(userId);
      const performedByUser = req.user ? await storage.getUser(req.user.id) : null;
      const performedByName = performedByUser ? performedByUser.username || performedByUser.email : "System";
      
      // Create audit log entry
      const performedBy = req.user?.id || "system";
      await storage.createUserAuditLog(
        userId,
        "MODULE_VISIBILITY_UPDATE",
        performedBy,
        { module, is_visible },
        `${performedByName} updated module visibility: ${module} set to ${is_visible ? 'visible' : 'hidden'}`
      );
      
      res.json({ success: true, message: "Module visibility updated" });
    } catch (error) {
      console.error("Error updating module visibility:", error);
      res.status(500).json({ message: "Error updating module visibility" });
    }
  });

  // Route to get user module visibility settings
  app.get("/api/users/:id/module-visibility", simpleAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const visibilitySettings = await storage.getUserModuleVisibility(userId);
      res.json(visibilitySettings);
    } catch (error) {
      console.error("Error fetching user module visibility:", error);
      res.status(500).json({ message: "Error fetching module visibility" });
    }
  });

  // Route to reset user password (admin only)
  app.patch("/api/users/:id/reset-password", simpleAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const { newPassword } = req.body;
      
      // Validate password length
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      
      // Get the user to ensure they exist
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Hash the new password using the same method as the auth system
      const salt = crypto.randomBytes(16).toString("hex");
      const buf = (await promisify(crypto.scrypt)(newPassword, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      // Update the user's password
      const updatedUser = await storage.updateUser(userId, {
        password: hashedPassword,
        updatedAt: new Date()
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      // Log the password reset in audit logs
      console.log(`Creating audit log for password reset: userId=${userId}, performedBy=${req.user?.id || "system"}`);
      await storage.createUserAuditLog(
        userId,
        "PASSWORD_RESET",
        req.user?.id || "system",
        undefined,
        undefined,
        "Password reset by admin"
      );
      
      // Get user information for notification
      const userInfo = await storage.getUser(userId);
      const userName = userInfo ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || userInfo.username : 'Unknown User';
      
      // Create notification for password reset
      console.log(`Creating notification for password reset: userId=${userId}, userName=${userName}`);
      await storage.createNotification({
        title: "Password Reset",
        message: `Password has been reset for user: ${userName} (${userInfo?.username || 'unknown'})`,
        type: "system",
        priority: "medium",
        userId: null // System-wide notification
      });
      
      res.json({ 
        success: true, 
        message: "Password reset successfully"
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Error resetting password" });
    }
  });
  
  // Route to archive a user
  app.put("/api/users/:id/archive", async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ message: "Reason for archiving is required" });
      }
      
      const performedBy = req.user?.id || "system";
      const archivedUser = await storage.archiveUser(req.params.id, performedBy, reason);
      
      if (!archivedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(archivedUser);
    } catch (error) {
      console.error("Error archiving user:", error);
      res.status(500).json({ message: "Error archiving user" });
    }
  });
  
  // Route to get audit logs for a specific user
  app.get("/api/users/:id/audit-logs", async (req, res) => {
    try {
      const auditLogs = await storage.getUserAuditLogs(req.params.id);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching user audit logs:", error);
      res.status(500).json({ message: "Error fetching user audit logs" });
    }
  });
  
  // Route to get all user audit logs
  app.get("/api/user-audit-logs", async (req, res) => {
    try {
      const allAuditLogs = await storage.getAllUserAuditLogs();
      res.json(allAuditLogs);
    } catch (error) {
      console.error("Error fetching all user audit logs:", error);
      res.status(500).json({ message: "Error fetching all user audit logs" });
    }
  });
  
  // Allowed Email patterns for auto-approval (admin only)
  app.get("/api/allowed-emails", async (req, res) => {
    try {
      const patterns = await storage.getAllowedEmails();
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching allowed email patterns:", error);
      res.status(500).json({ message: "Error fetching allowed email patterns" });
    }
  });
  
  app.post("/api/allowed-emails", async (req, res) => {
    try {
      const { emailPattern, autoApprove, defaultRole } = req.body;
      
      if (!emailPattern) {
        return res.status(400).json({ message: "Email pattern is required" });
      }
      
      const newPattern = await storage.createAllowedEmail({
        emailPattern,
        autoApprove: autoApprove === true,
        defaultRole: defaultRole || "viewer",
      });
      
      res.status(201).json(newPattern);
    } catch (error) {
      console.error("Error creating allowed email pattern:", error);
      res.status(500).json({ message: "Error creating allowed email pattern" });
    }
  });
  
  app.put("/api/allowed-emails/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { emailPattern, autoApprove, defaultRole } = req.body;
      
      const updatedPattern = await storage.updateAllowedEmail(id, {
        emailPattern,
        autoApprove,
        defaultRole,
      });
      
      if (!updatedPattern) {
        return res.status(404).json({ message: "Allowed email pattern not found" });
      }
      
      res.json(updatedPattern);
    } catch (error) {
      console.error("Error updating allowed email pattern:", error);
      res.status(500).json({ message: "Error updating allowed email pattern" });
    }
  });
  
  app.delete("/api/allowed-emails/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteAllowedEmail(id);
      res.json({ success: result });
    } catch (error) {
      console.error("Error deleting allowed email pattern:", error);
      res.status(500).json({ message: "Error deleting allowed email pattern" });
    }
  });

  // Notification Routes
  app.get("/api/notifications", getNotifications);
  app.get("/api/notifications/unread/count", simpleAuth, getUnreadNotificationCount);
  app.post("/api/notifications", simpleAuth, validateRequest(insertNotificationSchema), createNotification);
  app.put("/api/notifications/:id/read", simpleAuth, markNotificationAsRead);
  app.put("/api/notifications/read-all", simpleAuth, markAllNotificationsAsRead);
  app.delete("/api/notifications/:id", simpleAuth, deleteNotification);
  
  // Notification generation routes - typically called via cron, but can be manually triggered
  app.post("/api/notifications/generate/billing", simpleAuth, async (req, res) => {
    try {
      const count = await generateBillingNotifications();
      res.json({ success: true, count, message: `Generated ${count} billing notifications` });
    } catch (error) {
      console.error("Error generating billing notifications:", error);
      res.status(500).json({ success: false, message: "Error generating billing notifications" });
    }
  });
  
  app.post("/api/notifications/generate/manufacturing", simpleAuth, async (req, res) => {
    try {
      const count = await generateManufacturingNotifications();
      res.json({ success: true, count, message: `Generated ${count} manufacturing notifications` });
    } catch (error) {
      console.error("Error generating manufacturing notifications:", error);
      res.status(500).json({ success: false, message: "Error generating manufacturing notifications" });
    }
  });

  // Archived Projects Routes
  app.get("/api/archived-projects", async (req, res) => {
    try {
      const archivedProjects = await storage.getArchivedProjects();
      res.json(archivedProjects);
    } catch (error) {
      console.error("Error fetching archived projects:", error);
      res.status(500).json({ message: "Error fetching archived projects" });
    }
  });

  app.get("/api/archived-projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const archivedProject = await storage.getArchivedProject(id);
      
      if (!archivedProject) {
        return res.status(404).json({ message: "Archived project not found" });
      }
      
      res.json(archivedProject);
    } catch (error) {
      console.error(`Error fetching archived project ${req.params.id}:`, error);
      res.status(500).json({ message: "Error fetching archived project" });
    }
  });

  // Route to restore an archived project
  app.put("/api/projects/:id/restore", simpleAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Get user ID safely for both development and production
      let userId = "system-user"; // fallback for production
      if (req.user && typeof req.user === 'object') {
        userId = req.user.id || (req.user.claims && req.user.claims.sub) || "system-user";
      } else if (req.userDetails && typeof req.userDetails === 'object') {
        userId = req.userDetails.id || "system-user";
      }
      
      const restoredProject = await storage.restoreProject(projectId, userId);
      
      if (!restoredProject) {
        return res.status(404).json({ message: "Project not found or could not be restored" });
      }
      
      // Clean up any manufacturing schedules if they exist
      try {
        await storage.removeManufacturingScheduleByProjectId(projectId);
      } catch (cleanupError) {
        console.error(`Warning: Could not clean up manufacturing schedules for project ${projectId}:`, cleanupError);
        // Continue with restoration even if cleanup fails
      }
      
      res.status(200).json({
        success: true, 
        message: `Project ${restoredProject.projectNumber} successfully restored`,
        restoredProject
      });
    } catch (error) {
      console.error(`Error restoring project ${req.params.id}:`, error);
      res.status(500).json({ message: "Error restoring project" });
    }
  });

  // Create an alias for archived-projects at /projects/archived for API consistency
  app.get("/api/projects/archived", async (req, res) => {
    try {
      const archivedProjects = await storage.getArchivedProjects();
      res.json(archivedProjects);
    } catch (error) {
      console.error("Error fetching archived projects:", error);
      res.status(500).json({ message: "Error fetching archived projects" });
    }
  });
  
  // Delivered Projects Routes
  app.get("/api/delivered-projects", async (req, res) => {
    try {
      const deliveredProjects = await storage.getDeliveredProjects();
      res.json(deliveredProjects);
    } catch (error) {
      console.error("Error fetching delivered projects:", error);
      res.status(500).json({ message: "Error fetching delivered projects" });
    }
  });
  
  // Sales Deals Routes
  app.get("/api/sales-deals", async (req, res) => {
    try {
      // Get optional query parameters
      const filters: { isActive?: boolean, ownerId?: string, dealStage?: string, dealType?: string, priority?: string } = {};
      
      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === 'true';
      }
      
      if (req.query.ownerId) {
        filters.ownerId = req.query.ownerId as string;
      }
      
      if (req.query.dealStage) {
        filters.dealStage = req.query.dealStage as string;
      }
      
      if (req.query.dealType) {
        filters.dealType = req.query.dealType as string;
      }
      
      if (req.query.priority) {
        filters.priority = req.query.priority as string;
      }
      
      const salesDeals = await storage.getSalesDeals(filters);
      res.json(salesDeals);
    } catch (error) {
      console.error("Error fetching sales deals:", error);
      res.status(500).json({ message: "Error fetching sales deals" });
    }
  });
  
  app.get("/api/sales-deals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const salesDeal = await storage.getSalesDeal(id);
      
      if (!salesDeal) {
        return res.status(404).json({ message: "Sales deal not found" });
      }
      
      res.json(salesDeal);
    } catch (error) {
      console.error(`Error fetching sales deal ${req.params.id}:`, error);
      res.status(500).json({ message: "Error fetching sales deal" });
    }
  });
  
  app.post("/api/sales-deals", simpleAuth, validateRequest(insertSalesDealSchema), async (req, res) => {
    try {
      const salesDeal = await storage.createSalesDeal(req.body);
      res.status(201).json(salesDeal);
    } catch (error) {
      console.error("Error creating sales deal:", error);
      res.status(500).json({ message: "Error creating sales deal" });
    }
  });
  
  app.put("/api/sales-deals/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const salesDeal = await storage.updateSalesDeal(id, req.body);
      
      if (!salesDeal) {
        return res.status(404).json({ message: "Sales deal not found" });
      }
      
      res.json(salesDeal);
    } catch (error) {
      console.error(`Error updating sales deal ${req.params.id}:`, error);
      res.status(500).json({ message: "Error updating sales deal" });
    }
  });
  
  app.delete("/api/sales-deals/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteSalesDeal(id);
      res.json({ success: result });
    } catch (error) {
      console.error(`Error deleting sales deal ${req.params.id}:`, error);
      res.status(500).json({ message: "Error deleting sales deal" });
    }
  });
  
  app.post("/api/sales-deals/:id/convert", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { projectId } = req.body;
      
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }
      
      const salesDeal = await storage.convertSalesDealToProject(id, projectId);
      
      if (!salesDeal) {
        return res.status(404).json({ message: "Sales deal not found" });
      }
      
      res.json(salesDeal);
    } catch (error) {
      console.error(`Error converting sales deal ${req.params.id} to project:`, error);
      res.status(500).json({ message: "Error converting sales deal to project" });
    }
  });
  
  app.get("/api/user/sales-deals", simpleAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const salesDeals = await storage.getUserSalesDeals(userId);
      res.json(salesDeals);
    } catch (error) {
      console.error(`Error fetching user's sales deals:`, error);
      res.status(500).json({ message: "Error fetching user's sales deals" });
    }
  });

  app.post("/api/projects/:id/archive", simpleAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Get user ID safely for both development and production
      let userId = "system-user"; // fallback for production
      if (req.user && typeof req.user === 'object') {
        userId = req.user.id || (req.user.claims && req.user.claims.sub) || "system-user";
      } else if (req.userDetails && typeof req.userDetails === 'object') {
        userId = req.userDetails.id || "system-user";
      }
      const { reason } = req.body;
      
      const archivedProject = await storage.archiveProject(projectId, userId, reason);
      
      if (!archivedProject) {
        return res.status(404).json({ message: "Project not found or could not be archived" });
      }
      
      res.status(200).json({
        success: true, 
        message: `Project ${archivedProject.projectNumber} successfully archived`,
        archivedProject
      });
    } catch (error) {
      console.error(`Error archiving project ${req.params.id}:`, error);
      res.status(500).json({ message: "Error archiving project" });
    }
  });

  // Financial Goals API routes
  // Get all financial goals
  app.get("/api/financial-goals", simpleAuth, async (req, res) => {
    try {
      const goals = await storage.getFinancialGoals();
      res.json(goals);
    } catch (error) {
      console.error("Error fetching financial goals:", error);
      res.status(500).json({ message: "Error fetching financial goals" });
    }
  });

  // Get a specific financial goal by year and month
  app.get("/api/financial-goals/:year/:month", simpleAuth, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month format" });
      }
      
      const goal = await storage.getFinancialGoalByYearMonth(year, month);
      
      if (!goal) {
        return res.status(404).json({ message: "Financial goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      console.error("Error fetching financial goal:", error);
      res.status(500).json({ message: "Error fetching financial goal" });
    }
  });
  
  // Get weekly financial goals for a specific year and month
  app.get("/api/financial-goals/:year/:month/weeks", simpleAuth, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month format" });
      }
      
      const weeklyGoals = await storage.getWeeklyFinancialGoals(year, month);
      res.json(weeklyGoals);
    } catch (error) {
      console.error("Error fetching weekly financial goals:", error);
      res.status(500).json({ message: "Error fetching weekly financial goals" });
    }
  });
  
  // Get a specific weekly financial goal by year, month, and week
  app.get("/api/financial-goals/:year/:month/week/:week", simpleAuth, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const week = parseInt(req.params.week);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || isNaN(week) || week < 1 || week > 6) {
        return res.status(400).json({ message: "Invalid year, month, or week format" });
      }
      
      const goal = await storage.getFinancialGoalByYearMonth(year, month, week);
      
      if (!goal) {
        return res.status(404).json({ message: "Weekly financial goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      console.error("Error fetching weekly financial goal:", error);
      res.status(500).json({ message: "Error fetching weekly financial goal" });
    }
  });

  // Create a new financial goal
  app.post("/api/financial-goals", async (req, res) => {
    try {
      const { year, month, week, targetAmount, description } = req.body;
      
      if (!year || !month || !targetAmount) {
        return res.status(400).json({ message: "Year, month, and target amount are required" });
      }
      
      const parsedYear = parseInt(year);
      const parsedMonth = parseInt(month);
      const parsedWeek = week ? parseInt(week) : undefined;
      
      // Validate week if provided
      if (parsedWeek !== undefined && (isNaN(parsedWeek) || parsedWeek < 1 || parsedWeek > 6)) {
        return res.status(400).json({ message: "Week must be a number between 1 and 6" });
      }
      
      // Check if goal for this year/month(/week) already exists
      const existingGoal = await storage.getFinancialGoalByYearMonth(parsedYear, parsedMonth, parsedWeek);
      if (existingGoal) {
        const periodType = parsedWeek ? "week" : "month";
        return res.status(409).json({ message: `A financial goal for this ${periodType} already exists` });
      }
      
      const newGoal = await storage.createFinancialGoal({
        year: parsedYear,
        month: parsedMonth,
        week: parsedWeek,
        targetAmount: parseFloat(targetAmount),
        description
      });
      
      res.status(201).json(newGoal);
    } catch (error) {
      console.error("Error creating financial goal:", error);
      res.status(500).json({ message: "Error creating financial goal" });
    }
  });

  // Update a financial goal - monthly goal (no week specified)
  app.put("/api/financial-goals/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month format" });
      }
      
      const { targetAmount, description } = req.body;
      
      if (!targetAmount) {
        return res.status(400).json({ message: "Target amount is required" });
      }
      
      // Check if the monthly goal exists
      const existingGoal = await storage.getFinancialGoalByYearMonth(year, month);
      if (!existingGoal) {
        return res.status(404).json({ message: "Financial goal not found" });
      }
      
      const updatedGoal = await storage.updateFinancialGoal(year, month, {
        targetAmount: parseFloat(targetAmount),
        description
      });
      
      res.json(updatedGoal);
    } catch (error) {
      console.error("Error updating financial goal:", error);
      res.status(500).json({ message: "Error updating financial goal" });
    }
  });
  
  // Update a weekly financial goal
  app.put("/api/financial-goals/:year/:month/week/:week", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const week = parseInt(req.params.week);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || isNaN(week) || week < 1 || week > 6) {
        return res.status(400).json({ message: "Invalid year, month, or week format" });
      }
      
      const { targetAmount, description } = req.body;
      
      if (!targetAmount) {
        return res.status(400).json({ message: "Target amount is required" });
      }
      
      // Check if the weekly goal exists
      const existingGoal = await storage.getFinancialGoalByYearMonth(year, month, week);
      if (!existingGoal) {
        return res.status(404).json({ message: "Weekly financial goal not found" });
      }
      
      const updatedGoal = await storage.updateFinancialGoal(year, month, {
        targetAmount: parseFloat(targetAmount),
        description
      }, week);
      
      res.json(updatedGoal);
    } catch (error) {
      console.error("Error updating weekly financial goal:", error);
      res.status(500).json({ message: "Error updating weekly financial goal" });
    }
  });

  // Delete a monthly financial goal (no week specified)
  app.delete("/api/financial-goals/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month format" });
      }
      
      // Check if the monthly goal exists
      const existingGoal = await storage.getFinancialGoalByYearMonth(year, month);
      if (!existingGoal) {
        return res.status(404).json({ message: "Financial goal not found" });
      }
      
      const result = await storage.deleteFinancialGoal(year, month);
      
      if (result) {
        res.status(200).json({ message: "Financial goal deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete financial goal" });
      }
    } catch (error) {
      console.error("Error deleting financial goal:", error);
      res.status(500).json({ message: "Error deleting financial goal" });
    }
  });
  
  // Delete a weekly financial goal
  app.delete("/api/financial-goals/:year/:month/week/:week", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const week = parseInt(req.params.week);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || isNaN(week) || week < 1 || week > 6) {
        return res.status(400).json({ message: "Invalid year, month, or week format" });
      }
      
      // Check if the weekly goal exists
      const existingGoal = await storage.getFinancialGoalByYearMonth(year, month, week);
      if (!existingGoal) {
        return res.status(404).json({ message: "Weekly financial goal not found" });
      }
      
      const result = await storage.deleteFinancialGoal(year, month, week);
      
      if (result) {
        res.status(200).json({ message: "Weekly financial goal deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete weekly financial goal" });
      }
    } catch (error) {
      console.error("Error deleting weekly financial goal:", error);
      res.status(500).json({ message: "Error deleting weekly financial goal" });
    }
  });

  // Project Costs API routes
  app.get("/api/projects/:projectId/costs", simpleAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const projectCost = await storage.getProjectCost(projectId);
      // Return null if no cost record exists, frontend will handle this
      res.json(projectCost || null);
    } catch (error) {
      console.error("Error fetching project costs:", error);
      res.status(500).json({ message: "Error fetching project costs" });
    }
  });

  app.post("/api/project-costs", validateRequest(insertProjectCostSchema), async (req, res) => {
    try {
      const projectCost = await storage.createProjectCost(req.body);
      res.status(201).json(projectCost);
    } catch (error) {
      console.error("Error creating project cost:", error);
      res.status(500).json({ message: "Error creating project cost" });
    }
  });

  app.put("/api/project-costs/:projectId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const projectCost = await storage.updateProjectCost(projectId, req.body);
      if (!projectCost) {
        return res.status(404).json({ message: "Project cost not found" });
      }
      res.json(projectCost);
    } catch (error) {
      console.error("Error updating project cost:", error);
      res.status(500).json({ message: "Error updating project cost" });
    }
  });

  app.delete("/api/project-costs/:projectId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const result = await storage.deleteProjectCost(projectId);
      if (!result) {
        return res.status(404).json({ message: "Project cost not found" });
      }
      res.json({ message: "Project cost deleted successfully" });
    } catch (error) {
      console.error("Error deleting project cost:", error);
      res.status(500).json({ message: "Error deleting project cost" });
    }
  });

  // Reports API routes
  app.post('/api/reports/export', simpleAuth, exportReport);
  
  // AI Insights API
  app.post('/api/ai/insights', simpleAuth, getAIInsights);
  
  // AI Delay Analysis API - bypassing all middleware
  app.post('/analyze-delays', async (req, res) => {
    console.log('AI Delay Analysis: Direct route accessed');
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const { delays } = req.body;
      
      if (!delays || !Array.isArray(delays) || delays.length === 0) {
        return res.status(400).json({ message: "No delay data provided" });
      }

      // Import OpenAI here to handle the API key check
      const OpenAI = require('openai');
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          message: "OpenAI API key not configured. Please provide your OpenAI API key to enable AI analysis." 
        });
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Format the delay data for analysis
      const delayText = delays.map(d => 
        `Project ${d.projectNumber} (${d.projectName}): ${d.daysLate} days late - ${d.reason} [Responsibility: ${d.responsibility}]`
      ).join('\n');

      const prompt = `Analyze the following project delay data and provide insights in JSON format:

${delayText}

Please analyze these delays and provide:
1. Categories of root causes with descriptions and examples
2. Actionable recommendations with impact and priority levels
3. Trend analysis identifying increasing or improving patterns

Response format:
{
  "categories": [
    {
      "name": "Category Name",
      "description": "Brief description",
      "count": number,
      "examples": ["example1", "example2"]
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation Title",
      "description": "Detailed recommendation",
      "impact": "High/Medium/Low",
      "priority": "High/Medium/Low"
    }
  ],
  "trends": {
    "increasing": ["patterns that are getting worse"],
    "improving": ["patterns that are getting better"]
  }
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert project management analyst specializing in delay analysis and operational improvements. Analyze delay patterns and provide actionable insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      res.json(analysis);
      
    } catch (error) {
      console.error("Error analyzing delays with AI:", error);
      if (error.message?.includes('API key')) {
        res.status(400).json({ 
          message: "Invalid OpenAI API key. Please check your API key configuration." 
        });
      } else {
        res.status(500).json({ 
          message: "Error analyzing delays. Please try again." 
        });
      }
    }
  });

  // Supply Chain Routes
  app.use('/api', supplyChainRoutes);
  
  // Role Permissions API endpoint
  app.post("/api/role-permissions", requireAdmin, async (req, res) => {
    try {
      const { role, category, permission, enabled } = req.body;
      
      if (!role || !category || !permission || typeof enabled !== 'boolean') {
        return res.status(400).json({ message: "Invalid role permission data" });
      }
      
      // Store the permission change in the database
      await storage.updateRolePermission(role, category, permission, enabled);
      
      res.json({ 
        success: true, 
        message: `Role permission updated: ${role} ${category} ${permission} = ${enabled}` 
      });
    } catch (error) {
      console.error("Error updating role permission:", error);
      res.status(500).json({ message: "Error updating role permission" });
    }
  });
  
  // Get role permissions
  app.get("/api/role-permissions", requireAuth, async (req, res) => {
    try {
      const permissions = await storage.getAllRolePermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ message: "Error fetching role permissions" });
    }
  });
  
  // User Permissions Routes
  app.get("/api/user-permissions/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.userId;
      const permissions = await storage.getUserPermissions(userId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "Error fetching user permissions" });
    }
  });

  app.post("/api/user-permissions/bulk-update/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.userId;
      const { permissions } = req.body;
      
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "Permissions must be an array" });
      }
      
      const count = await storage.bulkUpdateUserPermissions(userId, permissions);
      res.json({ success: true, updatedCount: count });
    } catch (error) {
      console.error("Error bulk updating user permissions:", error);
      res.status(500).json({ message: "Error updating user permissions" });
    }
  });

  app.get("/api/user/:userId/module-access/:module", requireAuth, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const module = req.params.module;
      
      // Users can only check their own access unless they're admin
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const hasAccess = await storage.hasModuleAccess(userId, module);
      res.json({ hasAccess });
    } catch (error) {
      console.error("Error checking module access:", error);
      res.status(500).json({ message: "Error checking module access" });
    }
  });
  
  // Project Milestone Icons Routes
  app.get("/api/projects/:projectId/milestone-icons", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const milestoneIcons = await storage.getProjectMilestoneIcons(projectId);
      res.json(milestoneIcons);
    } catch (error) {
      console.error("Error fetching project milestone icons:", error);
      res.status(500).json({ message: "Error fetching project milestone icons" });
    }
  });

  app.get("/api/milestone-icons", async (req, res) => {
    try {
      const allMilestoneIcons = await storage.getAllProjectMilestoneIcons();
      res.json(allMilestoneIcons);
    } catch (error) {
      console.error("Error fetching all milestone icons:", error);
      res.status(500).json({ message: "Error fetching all milestone icons" });
    }
  });

  app.get("/api/milestone-icons/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const milestoneIcon = await storage.getProjectMilestoneIcon(id);
      
      if (!milestoneIcon) {
        return res.status(404).json({ message: "Milestone icon not found" });
      }
      
      res.json(milestoneIcon);
    } catch (error) {
      console.error("Error fetching milestone icon:", error);
      res.status(500).json({ message: "Error fetching milestone icon" });
    }
  });

  app.post("/api/projects/:projectId/milestone-icons", validateRequest(insertProjectMilestoneIconSchema), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const milestoneIconData = { ...req.body, projectId };
      const milestoneIcon = await storage.createProjectMilestoneIcon(milestoneIconData);
      res.status(201).json(milestoneIcon);
    } catch (error) {
      console.error("Error creating project milestone icon:", error);
      res.status(500).json({ message: "Error creating project milestone icon" });
    }
  });

  app.put("/api/milestone-icons/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const milestoneIcon = await storage.updateProjectMilestoneIcon(id, req.body);
      
      if (!milestoneIcon) {
        return res.status(404).json({ message: "Milestone icon not found" });
      }
      
      res.json(milestoneIcon);
    } catch (error) {
      console.error("Error updating milestone icon:", error);
      res.status(500).json({ message: "Error updating milestone icon" });
    }
  });

  app.delete("/api/milestone-icons/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteProjectMilestoneIcon(id);
      res.json({ success: result });
    } catch (error) {
      console.error("Error deleting milestone icon:", error);
      res.status(500).json({ message: "Error deleting milestone icon" });
    }
  });

  // Project Labels Routes
  app.get("/api/project-labels", async (req, res) => {
    try {
      const labels = await storage.getProjectLabels();
      res.json(labels);
    } catch (error) {
      console.error("Error fetching project labels:", error);
      res.status(500).json({ message: "Error fetching project labels" });
    }
  });

  app.get("/api/project-labels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const label = await storage.getProjectLabel(id);
      
      if (!label) {
        return res.status(404).json({ message: "Project label not found" });
      }
      
      res.json(label);
    } catch (error) {
      console.error("Error fetching project label:", error);
      res.status(500).json({ message: "Error fetching project label" });
    }
  });

  app.post("/api/project-labels", validateRequest(insertProjectLabelSchema), async (req, res) => {
    try {
      const label = await storage.createProjectLabel(req.body);
      res.status(201).json(label);
    } catch (error) {
      console.error("Error creating project label:", error);
      res.status(500).json({ message: "Error creating project label" });
    }
  });

  app.put("/api/project-labels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const label = await storage.updateProjectLabel(id, req.body);
      
      if (!label) {
        return res.status(404).json({ message: "Project label not found" });
      }
      
      res.json(label);
    } catch (error) {
      console.error("Error updating project label:", error);
      res.status(500).json({ message: "Error updating project label" });
    }
  });

  app.delete("/api/project-labels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteProjectLabel(id);
      res.json({ success: result });
    } catch (error) {
      console.error("Error deleting project label:", error);
      res.status(500).json({ message: "Error deleting project label" });
    }
  });

  // Project Label Assignments Routes
  app.get("/api/projects/:projectId/labels", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const assignments = await storage.getProjectLabelAssignments(projectId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching project label assignments:", error);
      res.status(500).json({ message: "Error fetching project label assignments" });
    }
  });

  app.post("/api/projects/:projectId/labels/:labelId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const labelId = parseInt(req.params.labelId);
      const assignment = await storage.assignLabelToProject(projectId, labelId);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning label to project:", error);
      res.status(500).json({ message: "Error assigning label to project" });
    }
  });

  app.delete("/api/projects/:projectId/labels/:labelId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const labelId = parseInt(req.params.labelId);
      const result = await storage.removeLabelFromProject(projectId, labelId);
      res.json({ success: result });
    } catch (error) {
      console.error("Error removing label from project:", error);
      res.status(500).json({ message: "Error removing label from project" });
    }
  });

  // Admin password reset endpoint
  app.post("/api/admin/reset-password", requireAdmin, async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      
      if (!userId || !newPassword) {
        return res.status(400).json({ message: "Missing userId or newPassword" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Hash the new password using scrypt
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the user's password in the database
      await storage.updateUserPassword(userId, hashedPassword);
      
      console.log(`🔐 Admin password reset: Password updated for user ${userId} by admin ${req.user?.email}`);
      
      res.json({ 
        success: true, 
        message: "Password reset successfully" 
      });
    } catch (error) {
      console.error("Error resetting user password:", error);
      res.status(500).json({ message: "Error resetting password" });
    }
  });

  // Forgot password endpoint
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists - always return success
        return res.json({ 
          success: true, 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save reset token to database
      await storage.setPasswordResetToken(email, resetToken, resetExpires);

      // Generate reset link
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;

      // Send email using MailPro
      const emailHtml = generatePasswordResetEmail(resetLink, user.firstName);
      await sendEmail({
        to: email,
        subject: "Password Reset Request - NOMAD Manufacturing",
        html: emailHtml
      });

      console.log(`📧 Password reset email sent to: ${email}`);
      
      res.json({ 
        success: true, 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Error processing password reset request" });
    }
  });

  // Reset password with token endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Find user by reset token
      const user = await storage.getUserByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user's password and clear reset token
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.clearPasswordResetToken(user.id);
      
      console.log(`🔐 Password reset completed for user: ${user.email}`);
      
      res.json({ 
        success: true, 
        message: "Password has been reset successfully. You can now log in with your new password." 
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Error resetting password" });
    }
  });

  // System Routes
  app.use('/api/system', systemRoutes);

  // Forensics Routes
  app.get("/api/projects/:id/forensics", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const forensics = await storage.getProjectForensics(projectId, limit, offset);
      res.json(forensics);
    } catch (error) {
      console.error("Error fetching project forensics:", error);
      res.status(500).json({ message: "Error fetching project forensics" });
    }
  });

  app.get("/api/projects/:projectId/forensics/:entityType/:entityId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const entityType = req.params.entityType;
      const entityId = parseInt(req.params.entityId);
      
      const forensics = await storage.getEntityForensics(projectId, entityType, entityId);
      res.json(forensics);
    } catch (error) {
      console.error("Error fetching entity forensics:", error);
      res.status(500).json({ message: "Error fetching entity forensics" });
    }
  });

  // Meetings Module Routes
  
  // Get all meetings
  app.get("/api/meetings", simpleAuth, async (req, res) => {
    try {
      const meetings = await storage.getMeetings();
      res.json(meetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      res.status(500).json({ message: "Error fetching meetings" });
    }
  });

  // Get single meeting
  app.get("/api/meetings/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const meeting = await storage.getMeeting(id);
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      res.json(meeting);
    } catch (error) {
      console.error("Error fetching meeting:", error);
      res.status(500).json({ message: "Error fetching meeting" });
    }
  });

  // Create meeting
  app.post("/api/meetings", simpleAuth, async (req, res) => {
    try {
      console.log("📝 Meeting creation request body:", JSON.stringify(req.body, null, 2));
      
      // Validate the request manually with better error logging
      const validationResult = insertMeetingSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error("❌ Meeting validation failed:", validationResult.error.errors);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationResult.error.errors 
        });
      }
      
      const meetingData = {
        ...validationResult.data,
        organizerId: req.user?.id || "",
        relatedProjects: validationResult.data.relatedProjects || []
      };
      
      console.log("📝 Final meeting data before creation:", JSON.stringify(meetingData, null, 2));
      
      const meeting = await storage.createMeeting(meetingData);
      console.log("✅ Meeting created successfully:", meeting.id);
      
      res.status(201).json(meeting);
    } catch (error) {
      console.error("❌ Error creating meeting:", error);
      res.status(500).json({ message: "Error creating meeting", error: error.message });
    }
  });

  // Update meeting
  app.put("/api/meetings/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const meeting = await storage.updateMeeting(id, req.body);
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      res.json(meeting);
    } catch (error) {
      console.error("Error updating meeting:", error);
      res.status(500).json({ message: "Error updating meeting" });
    }
  });

  // Delete meeting
  app.delete("/api/meetings/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteMeeting(id);
      res.json({ success: result });
    } catch (error) {
      console.error("Error deleting meeting:", error);
      res.status(500).json({ message: "Error deleting meeting" });
    }
  });

  // Meeting Attendees Routes
  app.get("/api/meetings/:id/attendees", simpleAuth, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      const attendees = await storage.getMeetingAttendees(meetingId);
      res.json(attendees);
    } catch (error) {
      console.error("Error fetching meeting attendees:", error);
      res.status(500).json({ message: "Error fetching meeting attendees" });
    }
  });

  app.post("/api/meetings/:id/attendees", simpleAuth, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "Validation error", errors: [{ field: "userId", message: "User ID is required" }] });
      }
      
      const attendeeData = { 
        meetingId, 
        userId,
        attended: false 
      };
      
      // Validate the complete data now that we have meetingId
      const validatedData = insertMeetingAttendeeSchema.parse(attendeeData);
      const attendee = await storage.addMeetingAttendee(validatedData);
      res.status(201).json(attendee);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding meeting attendee:", error);
      res.status(500).json({ message: "Error adding meeting attendee" });
    }
  });

  app.delete("/api/meetings/:id/attendees/:userId", simpleAuth, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      const userId = req.params.userId;
      const result = await storage.removeMeetingAttendee(meetingId, userId);
      res.json({ success: result });
    } catch (error) {
      console.error("Error removing meeting attendee:", error);
      res.status(500).json({ message: "Error removing meeting attendee" });
    }
  });

  app.patch("/api/meetings/:id/attendees/:userId", simpleAuth, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      const userId = req.params.userId;
      const { attended } = req.body;
      const attendee = await storage.updateAttendeeStatus(meetingId, userId, attended);
      
      if (!attendee) {
        return res.status(404).json({ message: "Attendee not found" });
      }
      
      res.json(attendee);
    } catch (error) {
      console.error("Error updating attendee status:", error);
      res.status(500).json({ message: "Error updating attendee status" });
    }
  });

  // Meeting Notes Routes
  app.get("/api/meetings/:id/notes", simpleAuth, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      const notes = await storage.getMeetingNotes(meetingId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching meeting notes:", error);
      res.status(500).json({ message: "Error fetching meeting notes" });
    }
  });

  // Alternative endpoint for meeting notes (used by MeetingView)
  app.get("/api/meeting-notes/:meetingId", simpleAuth, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.meetingId);
      const notes = await storage.getMeetingNotes(meetingId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching meeting notes:", error);
      res.status(500).json({ message: "Error fetching meeting notes" });
    }
  });

  app.post("/api/meetings/:id/notes", simpleAuth, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      const { agendaItem, notes } = req.body;
      
      if (!agendaItem) {
        return res.status(400).json({ message: "Validation error", errors: [{ field: "agendaItem", message: "Agenda item is required" }] });
      }
      
      const noteData = { meetingId, agendaItem, notes };
      
      // Validate the complete data now that we have meetingId
      const validatedData = insertMeetingNoteSchema.parse(noteData);
      const note = await storage.createMeetingNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating meeting note:", error);
      res.status(500).json({ message: "Error creating meeting note" });
    }
  });

  app.put("/api/notes/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const note = await storage.updateMeetingNote(id, req.body);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.json(note);
    } catch (error) {
      console.error("Error updating meeting note:", error);
      res.status(500).json({ message: "Error updating meeting note" });
    }
  });

  app.delete("/api/notes/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteMeetingNote(id);
      res.json({ success: result });
    } catch (error) {
      console.error("Error deleting meeting note:", error);
      res.status(500).json({ message: "Error deleting meeting note" });
    }
  });

  // Meeting Tasks Routes
  app.get("/api/meeting-tasks", simpleAuth, async (req, res) => {
    try {
      const meetingId = req.query.meetingId ? parseInt(req.query.meetingId as string) : undefined;
      const tasks = await storage.getMeetingTasks(meetingId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching meeting tasks:", error);
      res.status(500).json({ message: "Error fetching meeting tasks" });
    }
  });

  app.get("/api/meeting-tasks/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getMeetingTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error fetching meeting task:", error);
      res.status(500).json({ message: "Error fetching meeting task" });
    }
  });

  app.post("/api/meeting-tasks", simpleAuth, async (req, res) => {
    try {
      const { meetingId, description, assignedToId, priority, linkedProjectId, dueDate } = req.body;
      
      if (!meetingId || !description || !assignedToId) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: [
            { field: "meetingId", message: "Meeting ID is required" },
            { field: "description", message: "Description is required" },
            { field: "assignedToId", message: "Assigned user is required" }
          ]
        });
      }
      
      const taskData = {
        meetingId: parseInt(meetingId),
        description,
        assignedToId,
        priority: priority || "medium",
        projectId: linkedProjectId && linkedProjectId !== "none" ? parseInt(linkedProjectId) : null,
        dueDate: dueDate || null,
        status: "pending"
      };
      
      const validatedData = insertMeetingTaskSchema.parse(taskData);
      const task = await storage.createMeetingTask(validatedData);

      // Trigger project sync if meeting task is linked to a project
      if (task.projectId) {
        const { projectMeetingSyncService } = await import('./services/projectMeetingSync');
        await projectMeetingSyncService.syncMeetingTaskToProject(task);
      }
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating meeting task:", error);
      res.status(500).json({ message: "Error creating meeting task" });
    }
  });

  app.put("/api/meeting-tasks/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldTask = await storage.getMeetingTask(id);
      const updateData = { ...req.body };
      
      // If task is being marked as completed, track WHO and WHEN
      if (updateData.status === 'completed' && oldTask?.status !== 'completed') {
        updateData.completedByUserId = req.user.id;
        updateData.completedDate = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
      } else if (updateData.status !== 'completed' && oldTask?.status === 'completed') {
        // If task is being unmarked as completed, clear completion tracking
        updateData.completedByUserId = null;
        updateData.completedDate = null;
      }
      
      const task = await storage.updateMeetingTask(id, updateData);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Trigger project sync if status changed and task is linked to a project
      if (oldTask && task.projectId && oldTask.status !== task.status) {
        const { projectMeetingSyncService } = await import('./services/projectMeetingSync');
        await projectMeetingSyncService.handleMeetingTaskStatusChange(task.id, task.status);
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating meeting task:", error);
      res.status(500).json({ message: "Error updating meeting task" });
    }
  });

  app.delete("/api/meeting-tasks/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteMeetingTask(id);
      res.json({ success: result });
    } catch (error) {
      console.error("Error deleting meeting task:", error);
      res.status(500).json({ message: "Error deleting meeting task" });
    }
  });

  app.get("/api/users/:userId/meeting-tasks", simpleAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const tasks = await storage.getUserMeetingTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching user meeting tasks:", error);
      res.status(500).json({ message: "Error fetching user meeting tasks" });
    }
  });

  // Meeting export route for Word/PDF
  app.post("/api/meetings/:id/export", simpleAuth, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      const { format } = req.body; // 'word' or 'pdf'
      
      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      const attendees = await storage.getMeetingAttendees(meetingId);
      const notes = await storage.getMeetingNotes(meetingId);
      const tasks = await storage.getMeetingTasks(meetingId);
      
      if (format === 'word') {
        // Generate Word document
        const docx = require('docx');
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell } = docx;
        
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                text: meeting.title,
                heading: HeadingLevel.TITLE,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Date: ", bold: true }),
                  new TextRun(new Date(meeting.datetime).toLocaleDateString()),
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Time: ", bold: true }),
                  new TextRun(new Date(meeting.datetime).toLocaleTimeString()),
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Location: ", bold: true }),
                  new TextRun(meeting.location || meeting.virtualLink || "Not specified"),
                ]
              }),
              new Paragraph({ text: "" }), // Empty line
              new Paragraph({
                text: "Agenda & Notes",
                heading: HeadingLevel.HEADING_1,
              }),
              ...notes.map(note => new Paragraph({
                children: [
                  new TextRun({ text: note.agendaItem + ": ", bold: true }),
                  new TextRun(note.notes || "No notes"),
                ]
              })),
              new Paragraph({ text: "" }), // Empty line
              new Paragraph({
                text: "Action Items",
                heading: HeadingLevel.HEADING_1,
              }),
              ...tasks.map(task => new Paragraph({
                children: [
                  new TextRun({ text: "• " + task.description, bold: true }),
                  new TextRun(` (Due: ${task.dueDate || 'No due date'}, Priority: ${task.priority})`),
                ]
              })),
            ],
          }]
        });
        
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="meeting-${meetingId}-${meeting.title.replace(/[^a-zA-Z0-9]/g, '_')}.docx"`);
        res.send(buffer);
        
      } else if (format === 'pdf') {
        // Generate PDF document  
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="meeting-${meetingId}-${meeting.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
        
        doc.pipe(res);
        
        // Title
        doc.fontSize(20).text(meeting.title, { align: 'center' });
        doc.moveDown();
        
        // Meeting info
        doc.fontSize(12);
        doc.text(`Date: ${new Date(meeting.datetime).toLocaleDateString()}`);
        doc.text(`Time: ${new Date(meeting.datetime).toLocaleTimeString()}`);
        doc.text(`Location: ${meeting.location || meeting.virtualLink || "Not specified"}`);
        doc.moveDown();
        
        // Agenda & Notes
        doc.fontSize(16).text('Agenda & Notes', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        notes.forEach(note => {
          doc.text(`${note.agendaItem}: ${note.notes || 'No notes'}`, { indent: 20 });
          doc.moveDown(0.5);
        });
        
        // Action Items
        doc.moveDown();
        doc.fontSize(16).text('Action Items', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        tasks.forEach(task => {
          doc.text(`• ${task.description} (Due: ${task.dueDate || 'No due date'}, Priority: ${task.priority})`, { indent: 20 });
          doc.moveDown(0.5);
        });
        
        doc.end();
      } else {
        res.status(400).json({ message: "Invalid format. Use 'word' or 'pdf'" });
      }
      
    } catch (error) {
      console.error("Error exporting meeting:", error);
      res.status(500).json({ message: "Error exporting meeting" });
    }
  });

  // Meeting Templates Routes
  app.get("/api/meeting-templates", simpleAuth, async (req, res) => {
    try {
      const templates = await storage.getMeetingTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching meeting templates:", error);
      res.status(500).json({ message: "Error fetching meeting templates" });
    }
  });

  app.get("/api/meeting-templates/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getMeetingTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: "Meeting template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching meeting template:", error);
      res.status(500).json({ message: "Error fetching meeting template" });
    }
  });

  app.post("/api/meeting-templates", simpleAuth, validateRequest(insertMeetingTemplateSchema), async (req, res) => {
    try {
      const templateData = req.body;
      const template = await storage.createMeetingTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating meeting template:", error);
      res.status(500).json({ message: "Error creating meeting template" });
    }
  });

  app.patch("/api/meeting-templates/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.updateMeetingTemplate(id, req.body);
      
      if (!template) {
        return res.status(404).json({ message: "Meeting template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error updating meeting template:", error);
      res.status(500).json({ message: "Error updating meeting template" });
    }
  });

  app.delete("/api/meeting-templates/:id", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteMeetingTemplate(id);
      res.json({ success: result });
    } catch (error) {
      console.error("Error deleting meeting template:", error);
      res.status(500).json({ message: "Error deleting meeting template" });
    }
  });

  // Meeting Email Notifications Routes
  app.get("/api/meeting-email-notifications", simpleAuth, async (req, res) => {
    try {
      const meetingId = req.query.meetingId ? parseInt(req.query.meetingId as string) : undefined;
      const notifications = await storage.getMeetingEmailNotifications(meetingId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching meeting email notifications:", error);
      res.status(500).json({ message: "Error fetching meeting email notifications" });
    }
  });

  app.post("/api/meeting-email-notifications", simpleAuth, validateRequest(insertMeetingEmailNotificationSchema), async (req, res) => {
    try {
      const notificationData = req.body;
      const notification = await storage.createMeetingEmailNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating meeting email notification:", error);
      res.status(500).json({ message: "Error creating meeting email notification" });
    }
  });

  app.patch("/api/meeting-email-notifications/:id/status", simpleAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, errorMessage } = req.body;
      const notification = await storage.updateMeetingEmailNotificationStatus(id, status, errorMessage);
      
      if (!notification) {
        return res.status(404).json({ message: "Email notification not found" });
      }
      
      res.json(notification);
    } catch (error) {
      console.error("Error updating email notification status:", error);
      res.status(500).json({ message: "Error updating email notification status" });
    }
  });

  // Project-Meeting Sync Routes
  app.post("/api/meetings/:id/link-projects", simpleAuth, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      const { projectIds } = req.body;
      
      const { projectMeetingSyncService } = await import('./services/projectMeetingSync');
      await projectMeetingSyncService.linkProjectToMeeting(meetingId, projectIds);
      
      res.json({ success: true, message: "Projects linked to meeting successfully" });
    } catch (error) {
      console.error("Error linking projects to meeting:", error);
      res.status(500).json({ message: "Error linking projects to meeting" });
    }
  });

  app.delete("/api/meetings/:meetingId/projects/:projectId", simpleAuth, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.meetingId);
      const projectId = parseInt(req.params.projectId);
      
      const { projectMeetingSyncService } = await import('./services/projectMeetingSync');
      await projectMeetingSyncService.unlinkProjectFromMeeting(meetingId, projectId);
      
      res.json({ success: true, message: "Project unlinked from meeting successfully" });
    } catch (error) {
      console.error("Error unlinking project from meeting:", error);
      res.status(500).json({ message: "Error unlinking project from meeting" });
    }
  });

  app.get("/api/projects/:id/meetings", simpleAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const { projectMeetingSyncService } = await import('./services/projectMeetingSync');
      const meetings = await projectMeetingSyncService.getProjectMeetings(projectId);
      
      res.json(meetings);
    } catch (error) {
      console.error("Error fetching project meetings:", error);
      res.status(500).json({ message: "Error fetching project meetings" });
    }
  });

  app.get("/api/projects/:id/meeting-tasks", simpleAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const { projectMeetingSyncService } = await import('./services/projectMeetingSync');
      const tasks = await projectMeetingSyncService.getProjectMeetingTasks(projectId);
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching project meeting tasks:", error);
      res.status(500).json({ message: "Error fetching project meeting tasks" });
    }
  });

  app.get("/api/projects/:id/activity-summary", simpleAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const { projectMeetingSyncService } = await import('./services/projectMeetingSync');
      const summary = await projectMeetingSyncService.getProjectActivitySummary(projectId);
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching project activity summary:", error);
      res.status(500).json({ message: "Error fetching project activity summary" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}