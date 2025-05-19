import { Request, Response } from 'express';
import { db } from '../db';
import { eq, and, or, gte, lte } from 'drizzle-orm';
import { format, subMonths, parseISO } from 'date-fns';
import { 
  projects,
  billingMilestones,
  manufacturingSchedules,
  manufacturingBays,
  deliveryTracking
} from '@shared/schema';

/**
 * Handles export requests for various report types
 */
export async function handleExportReport(req: Request, res: Response) {
  try {
    const { reportType, startDate, endDate, projectId } = req.body;
    
    if (!reportType) {
      return res.status(400).json({ error: 'Report type is required' });
    }
    
    // Parse dates or use defaults
    const start = startDate ? parseISO(startDate) : subMonths(new Date(), 6);
    const end = endDate ? parseISO(endDate) : new Date();
    
    // Get data based on report type
    let data: any[] = [];
    let filename = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    switch (reportType) {
      case 'financial':
        data = await getFinancialData(start, end, projectId);
        break;
      case 'project':
        data = await getProjectData(start, end, projectId);
        break;
      case 'manufacturing':
        data = await getManufacturingData(start, end, projectId);
        break;
      case 'delivery':
        data = await getDeliveryData(start, end, projectId);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data found for the given criteria' });
    }
    
    // Convert data to CSV
    const csvRows: string[] = [];
    
    // Add headers
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '';
        }
        
        // Format dates
        if (value instanceof Date) {
          return format(value, 'yyyy-MM-dd');
        }
        
        // Escape values with quotes if needed
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      });
      
      csvRows.push(values.join(','));
    }
    
    // Join rows with newlines
    const csvContent = csvRows.join('\n');
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send CSV data
    res.send(csvContent);
    
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
}

// Helper functions to get data for each report type
async function getFinancialData(start: Date, end: Date, projectId?: number) {
  const dateFilter = and(
    gte(billingMilestones.targetInvoiceDate, start.toISOString().split('T')[0]),
    lte(billingMilestones.targetInvoiceDate, end.toISOString().split('T')[0])
  );
  
  const filter = projectId ? 
    and(eq(billingMilestones.projectId, projectId), dateFilter) : 
    dateFilter;
  
  return db
    .select({
      milestone_id: billingMilestones.id,
      project_id: billingMilestones.projectId,
      project_number: projects.projectNumber,
      project_name: projects.name,
      milestone_name: billingMilestones.name,
      amount: billingMilestones.amount,
      status: billingMilestones.status,
      target_date: billingMilestones.targetInvoiceDate,
      actual_date: billingMilestones.actualInvoiceDate,
      payment_date: billingMilestones.paymentReceivedDate,
    })
    .from(billingMilestones)
    .leftJoin(projects, eq(billingMilestones.projectId, projects.id))
    .where(filter)
    .orderBy(billingMilestones.targetInvoiceDate);
}

async function getProjectData(start: Date, end: Date, projectId?: number) {
  const dateFilter = and(
    gte(projects.startDate, start.toISOString().split('T')[0]),
    lte(projects.startDate, end.toISOString().split('T')[0])
  );
  
  const filter = projectId ? 
    eq(projects.id, projectId) : 
    dateFilter;
  
  return db
    .select({
      project_id: projects.id,
      project_number: projects.projectNumber,
      project_name: projects.name,
      status: projects.status,
      risk_level: projects.riskLevel,
      start_date: projects.startDate,
      estimated_completion: projects.estimatedCompletionDate,
      percent_complete: projects.percentComplete,
      ship_date: projects.shipDate,
      total_hours: projects.totalHours,
    })
    .from(projects)
    .where(filter)
    .orderBy(projects.startDate);
}

async function getManufacturingData(start: Date, end: Date, bayId?: number) {
  const dateFilter = and(
    gte(manufacturingSchedules.startDate, start.toISOString().split('T')[0]),
    lte(manufacturingSchedules.endDate, end.toISOString().split('T')[0])
  );
  
  const filter = bayId ? 
    and(eq(manufacturingSchedules.bayId, bayId), dateFilter) : 
    dateFilter;
  
  return db
    .select({
      schedule_id: manufacturingSchedules.id,
      project_id: manufacturingSchedules.projectId,
      project_number: projects.projectNumber,
      project_name: projects.name,
      bay_id: manufacturingSchedules.bayId,
      bay_name: manufacturingBays.name,
      start_date: manufacturingSchedules.startDate,
      end_date: manufacturingSchedules.endDate,
      status: manufacturingSchedules.status,
      total_hours: manufacturingSchedules.totalHours,
    })
    .from(manufacturingSchedules)
    .leftJoin(projects, eq(manufacturingSchedules.projectId, projects.id))
    .leftJoin(manufacturingBays, eq(manufacturingSchedules.bayId, manufacturingBays.id))
    .where(filter)
    .orderBy(manufacturingSchedules.startDate);
}

async function getDeliveryData(start: Date, end: Date, projectId?: number) {
  const dateFilter = and(
    gte(deliveryTracking.scheduledDate, start.toISOString().split('T')[0]),
    lte(deliveryTracking.scheduledDate, end.toISOString().split('T')[0])
  );
  
  const filter = projectId ? 
    and(eq(deliveryTracking.projectId, projectId), dateFilter) : 
    dateFilter;
  
  return db
    .select({
      tracking_id: deliveryTracking.id,
      project_id: deliveryTracking.projectId,
      project_number: projects.projectNumber,
      project_name: projects.name,
      scheduled_date: deliveryTracking.scheduledDate,
      actual_date: deliveryTracking.actualDeliveryDate,
      notes: deliveryTracking.notes,
      status: deliveryTracking.status,
      carrier: deliveryTracking.carrier,
      tracking_number: deliveryTracking.trackingNumber,
    })
    .from(deliveryTracking)
    .leftJoin(projects, eq(deliveryTracking.projectId, projects.id))
    .where(filter)
    .orderBy(deliveryTracking.scheduledDate);
}