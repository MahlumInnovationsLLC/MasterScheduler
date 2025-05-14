import { Request, Response } from "express";
import { db } from "../db";
import { eq, and, gte, lte, sql, desc, count, sum, isNull } from "drizzle-orm";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { 
  projects, 
  billingMilestones, 
  manufacturingBays, 
  manufacturingSchedules,
  billingStatusEnum,
  projectStatusEnum,
  manufacturingStatusEnum,
  deliveryTracking
} from "@shared/schema";

/**
 * Get financial reports and metrics
 */
export async function getFinancialReports(req: Request, res: Response) {
  try {
    const { startDate, endDate, projectId } = req.query;
    const start = startDate ? parseISO(startDate as string) : subMonths(new Date(), 6);
    const end = endDate ? parseISO(endDate as string) : new Date();
    
    // Base query filters
    const dateFilter = and(
      gte(billingMilestones.targetInvoiceDate, start.toISOString().split('T')[0]),
      lte(billingMilestones.targetInvoiceDate, end.toISOString().split('T')[0])
    );
    
    // Add project filter if provided
    const projectFilter = projectId ? 
      and(eq(billingMilestones.projectId, parseInt(projectId as string)), dateFilter) : 
      dateFilter;
    
    // Get all billing milestones in the date range
    const milestones = await db
      .select()
      .from(billingMilestones)
      .where(projectFilter)
      .orderBy(billingMilestones.targetInvoiceDate);
    
    // Get all projects referenced in these milestones
    const projectIds = [...new Set(milestones.map(m => m.projectId))];
    const relatedProjects = await db
      .select()
      .from(projects)
      .where(projectIds.length > 0 ? sql`${projects.id} IN (${projectIds.join(',')})` : sql`FALSE`);
    
    // Calculate financial metrics
    const totalInvoiced = milestones.reduce((sum, m) => sum + Number(m.amount), 0);
    const totalPaid = milestones
      .filter(m => m.status === 'paid')
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const totalOutstanding = totalInvoiced - totalPaid;
    
    // Organize data by month for the chart
    const monthlyData: Record<string, { month: string, invoiced: number, received: number, outstanding: number }> = {};
    
    // Initialize all months in the range
    let currentMonth = startOfMonth(start);
    const endMonth = endOfMonth(end);
    
    while (!isAfter(currentMonth, endMonth)) {
      const monthKey = format(currentMonth, 'yyyy-MM');
      monthlyData[monthKey] = {
        month: format(currentMonth, 'MMM yyyy'),
        invoiced: 0,
        received: 0,
        outstanding: 0
      };
      currentMonth = startOfMonth(addDays(endOfMonth(currentMonth), 1));
    }
    
    // Fill in milestone data
    milestones.forEach(milestone => {
      const date = new Date(milestone.targetInvoiceDate);
      const monthKey = format(date, 'yyyy-MM');
      
      if (monthlyData[monthKey]) {
        const amount = Number(milestone.amount);
        monthlyData[monthKey].invoiced += amount;
        
        if (milestone.status === 'paid') {
          monthlyData[monthKey].received += amount;
        } else {
          monthlyData[monthKey].outstanding += amount;
        }
      }
    });
    
    // Get upcoming milestones
    const upcomingMilestones = milestones
      .filter(m => m.status === 'upcoming' || m.status === 'invoiced')
      .sort((a, b) => new Date(a.targetInvoiceDate).getTime() - new Date(b.targetInvoiceDate).getTime());
    
    // Enhance with project info
    const upcomingMilestonesWithProjects = upcomingMilestones.map(milestone => {
      const project = relatedProjects.find(p => p.id === milestone.projectId);
      return {
        ...milestone,
        projectNumber: project?.projectNumber || 'Unknown',
        projectName: project?.name || 'Unknown Project'
      };
    });
    
    // Return the compiled financial report data
    res.json({
      metrics: {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        paymentRate: totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0
      },
      chartData: Object.values(monthlyData),
      upcomingMilestones: upcomingMilestonesWithProjects,
      milestones
    });
    
  } catch (error) {
    console.error('Error generating financial reports:', error);
    res.status(500).json({ error: 'Failed to generate financial reports' });
  }
}

/**
 * Get project status reports and metrics
 */
export async function getProjectStatusReports(req: Request, res: Response) {
  try {
    const { startDate, endDate, projectId } = req.query;
    const start = startDate ? parseISO(startDate as string) : subMonths(new Date(), 6);
    const end = endDate ? parseISO(endDate as string) : new Date();
    
    // Base query - filter by date range on the startDate
    const dateFilter = and(
      gte(projects.startDate, start.toISOString().split('T')[0]),
      lte(projects.startDate, end.toISOString().split('T')[0])
    );
    
    // Add project filter if provided
    const projectFilter = projectId ? 
      eq(projects.id, parseInt(projectId as string)) : 
      dateFilter;
    
    // Get all projects matching the filter
    const projectList = await db
      .select()
      .from(projects)
      .where(projectFilter);
    
    // Get project milestones
    const projectIds = projectList.map(p => p.id);
    
    // Get manufacturing schedules for these projects
    const schedules = await db
      .select()
      .from(manufacturingSchedules)
      .where(sql`${manufacturingSchedules.projectId} IN (${projectIds.join(',')})`)
      .orderBy(manufacturingSchedules.startDate);
    
    // Calculate status distribution
    const statusCounts: Record<string, number> = {
      'active': 0,
      'delayed': 0,
      'completed': 0,
      'archived': 0,
      'critical': 0
    };
    
    projectList.forEach(project => {
      if (statusCounts.hasOwnProperty(project.status)) {
        statusCounts[project.status]++;
      }
    });
    
    // Calculate percent complete averages by status
    const statusProgress: Record<string, { count: number, totalPercent: number }> = {};
    projectList.forEach(project => {
      if (!statusProgress[project.status]) {
        statusProgress[project.status] = { count: 0, totalPercent: 0 };
      }
      statusProgress[project.status].count++;
      statusProgress[project.status].totalPercent += Number(project.percentComplete || 0);
    });
    
    const progressByStatus = Object.entries(statusProgress).map(([status, data]) => ({
      status,
      averageProgress: data.count > 0 ? data.totalPercent / data.count : 0
    }));
    
    // Get on-time vs delayed projects
    const onTimeProjects = projectList.filter(p => p.status !== 'delayed' && p.status !== 'critical').length;
    
    // Calculate risk distribution
    const riskCounts: Record<string, number> = {
      'low': 0,
      'medium': 0,
      'high': 0
    };
    
    projectList.forEach(project => {
      if (project.riskLevel && riskCounts.hasOwnProperty(project.riskLevel)) {
        riskCounts[project.riskLevel]++;
      }
    });
    
    // Return the compiled project status report data
    res.json({
      metrics: {
        totalProjects: projectList.length,
        activeProjects: statusCounts['active'],
        delayedProjects: statusCounts['delayed'] + statusCounts['critical'],
        completedProjects: statusCounts['completed'],
        onTimePercentage: projectList.length > 0 ? (onTimeProjects / projectList.length) * 100 : 0,
      },
      statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({ name: status, value: count })),
      progressByStatus,
      riskDistribution: Object.entries(riskCounts).map(([level, count]) => ({ name: level, value: count })),
      projects: projectList,
      schedules
    });
    
  } catch (error) {
    console.error('Error generating project status reports:', error);
    res.status(500).json({ error: 'Failed to generate project status reports' });
  }
}

/**
 * Get manufacturing reports and metrics
 */
export async function getManufacturingReports(req: Request, res: Response) {
  try {
    const { startDate, endDate, bayId } = req.query;
    const start = startDate ? parseISO(startDate as string) : subMonths(new Date(), 6);
    const end = endDate ? parseISO(endDate as string) : new Date();
    
    // Base query - filter by date range on schedules
    const dateFilter = and(
      gte(manufacturingSchedules.startDate, start.toISOString().split('T')[0]),
      lte(manufacturingSchedules.endDate, end.toISOString().split('T')[0])
    );
    
    // Add bay filter if provided
    const bayFilter = bayId ? 
      and(eq(manufacturingSchedules.bayId, parseInt(bayId as string)), dateFilter) : 
      dateFilter;
    
    // Get manufacturing bays
    const bays = await db
      .select()
      .from(manufacturingBays);
    
    // Get schedules for these bays
    const schedules = await db
      .select({
        ...manufacturingSchedules,
        projectNumber: projects.projectNumber,
        projectName: projects.name
      })
      .from(manufacturingSchedules)
      .leftJoin(projects, eq(manufacturingSchedules.projectId, projects.id))
      .where(bayFilter)
      .orderBy(manufacturingSchedules.startDate);
    
    // Calculate utilization for each bay
    const bayIds = bays.map(bay => bay.id);
    const utilization: Record<number, {
      bay: string,
      bayNumber: number,
      scheduledDays: number,
      scheduledProjects: number,
      utilizationRate: number,
      statusCounts: Record<string, number>
    }> = {};
    
    // Initialize utilization data
    bays.forEach(bay => {
      utilization[bay.id] = {
        bay: bay.name,
        bayNumber: bay.bayNumber,
        scheduledDays: 0,
        scheduledProjects: 0,
        utilizationRate: 0,
        statusCounts: {
          'scheduled': 0,
          'in_progress': 0,
          'complete': 0,
          'maintenance': 0
        }
      };
    });
    
    // Calculate date range duration in days
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Populate with schedule data
    schedules.forEach(schedule => {
      if (utilization[schedule.bayId]) {
        // Calculate duration of this schedule
        const scheduleStart = new Date(schedule.startDate);
        const scheduleEnd = new Date(schedule.endDate);
        const days = Math.ceil((scheduleEnd.getTime() - scheduleStart.getTime()) / (1000 * 60 * 60 * 24));
        
        utilization[schedule.bayId].scheduledDays += days;
        utilization[schedule.bayId].scheduledProjects++;
        
        // Count by status
        if (utilization[schedule.bayId].statusCounts.hasOwnProperty(schedule.status)) {
          utilization[schedule.bayId].statusCounts[schedule.status]++;
        }
      }
    });
    
    // Calculate utilization rate
    Object.keys(utilization).forEach(bayId => {
      const bay = utilization[Number(bayId)];
      bay.utilizationRate = totalDays > 0 ? (bay.scheduledDays / totalDays) * 100 : 0;
    });
    
    // Get project IDs from the schedules
    const projectIds = [...new Set(schedules.map(s => s.projectId))];
    
    // Get completion rate for these projects
    const projectCompletionRates = await db
      .select({
        projectId: projects.id,
        percentComplete: projects.percentComplete,
        status: projects.status
      })
      .from(projects)
      .where(sql`${projects.id} IN (${projectIds.join(',')})`)
      .orderBy(projects.id);
    
    // Calculate average completion rate by bay
    const completionRatesByBay: Record<number, { totalPercent: number, count: number }> = {};
    schedules.forEach(schedule => {
      const projectCompletion = projectCompletionRates.find(p => p.projectId === schedule.projectId);
      if (projectCompletion) {
        if (!completionRatesByBay[schedule.bayId]) {
          completionRatesByBay[schedule.bayId] = { totalPercent: 0, count: 0 };
        }
        completionRatesByBay[schedule.bayId].totalPercent += Number(projectCompletion.percentComplete || 0);
        completionRatesByBay[schedule.bayId].count++;
      }
    });
    
    // Calculate averages
    const averageCompletionByBay = Object.entries(completionRatesByBay).map(([bayId, data]) => ({
      bayId: Number(bayId),
      bayName: bays.find(b => b.id === Number(bayId))?.name || `Bay ${bayId}`,
      averageCompletion: data.count > 0 ? data.totalPercent / data.count : 0
    }));
    
    // Return the compiled manufacturing report data
    res.json({
      metrics: {
        totalBays: bays.length,
        totalScheduledProjects: schedules.length,
        averageUtilization: Object.values(utilization).reduce((sum, bay) => sum + bay.utilizationRate, 0) / Object.keys(utilization).length
      },
      bayUtilization: Object.values(utilization),
      completionRatesByBay: averageCompletionByBay,
      bays,
      schedules
    });
    
  } catch (error) {
    console.error('Error generating manufacturing reports:', error);
    res.status(500).json({ error: 'Failed to generate manufacturing reports' });
  }
}

/**
 * Get delivery analytics reports
 */
export async function getDeliveryReports(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? parseISO(startDate as string) : subMonths(new Date(), 6);
    const end = endDate ? parseISO(endDate as string) : new Date();

    // Base query - filter by date range on tracking
    const dateFilter = and(
      gte(deliveryTracking.actualDeliveryDate, start.toISOString().split('T')[0]),
      lte(deliveryTracking.actualDeliveryDate, end.toISOString().split('T')[0])
    );

    // Get all delivery tracking records
    const trackingRecords = await db
      .select({
        ...deliveryTracking,
        projectNumber: projects.projectNumber,
        projectName: projects.name
      })
      .from(deliveryTracking)
      .leftJoin(projects, eq(deliveryTracking.projectId, projects.id))
      .where(dateFilter)
      .orderBy(deliveryTracking.actualDeliveryDate);

    // Calculate on-time vs delayed deliveries
    const onTimeCount = trackingRecords.filter(r => r.wasOnTime).length;
    const delayedCount = trackingRecords.filter(r => !r.wasOnTime).length;
    const totalTracked = trackingRecords.length;

    // Calculate avg days early/late
    let totalDaysDeviation = 0;
    let earliestDelivery = 0;
    let latestDelivery = 0;

    trackingRecords.forEach(record => {
      if (record.daysEarlyOrLate) {
        totalDaysDeviation += record.daysEarlyOrLate;
        earliestDelivery = Math.min(earliestDelivery, record.daysEarlyOrLate);
        latestDelivery = Math.max(latestDelivery, record.daysEarlyOrLate);
      }
    });

    // Group by fault type
    const delayByFault: Record<string, number> = {
      'nomad_fault': 0,
      'vendor_fault': 0,
      'client_fault': 0,
      'not_applicable': 0
    };

    trackingRecords
      .filter(r => !r.wasOnTime)
      .forEach(record => {
        if (record.delayResponsibility && delayByFault.hasOwnProperty(record.delayResponsibility)) {
          delayByFault[record.delayResponsibility]++;
        }
      });

    // Group by month
    const deliveriesByMonth: Record<string, { 
      month: string, 
      total: number, 
      onTime: number, 
      delayed: number, 
      onTimeRate: number 
    }> = {};

    // Initialize months
    let currentMonth = startOfMonth(start);
    while (!isAfter(currentMonth, end)) {
      const monthKey = format(currentMonth, 'yyyy-MM');
      deliveriesByMonth[monthKey] = {
        month: format(currentMonth, 'MMM yyyy'),
        total: 0,
        onTime: 0,
        delayed: 0,
        onTimeRate: 0
      };
      currentMonth = startOfMonth(addDays(endOfMonth(currentMonth), 1));
    }

    // Fill in data
    trackingRecords.forEach(record => {
      const date = new Date(record.actualDeliveryDate);
      const monthKey = format(date, 'yyyy-MM');
      
      if (deliveriesByMonth[monthKey]) {
        deliveriesByMonth[monthKey].total++;
        
        if (record.wasOnTime) {
          deliveriesByMonth[monthKey].onTime++;
        } else {
          deliveriesByMonth[monthKey].delayed++;
        }
      }
    });

    // Calculate rates
    Object.values(deliveriesByMonth).forEach(month => {
      month.onTimeRate = month.total > 0 ? (month.onTime / month.total) * 100 : 0;
    });

    // Return the compiled delivery report data
    res.json({
      metrics: {
        totalTracked,
        onTimeCount,
        delayedCount,
        onTimeRate: totalTracked > 0 ? (onTimeCount / totalTracked) * 100 : 0,
        avgDeviationDays: totalTracked > 0 ? totalDaysDeviation / totalTracked : 0,
        earliestDelivery: Math.abs(earliestDelivery),
        latestDelivery
      },
      delayByFault: Object.entries(delayByFault).map(([fault, count]) => ({ name: fault, value: count })),
      deliveriesByMonth: Object.values(deliveriesByMonth),
      trackingRecords
    });
    
  } catch (error) {
    console.error('Error generating delivery reports:', error);
    res.status(500).json({ error: 'Failed to generate delivery reports' });
  }
}

/**
 * Export report data to CSV
 */
export async function exportReportData(req: Request, res: Response) {
  try {
    const { reportType, startDate, endDate, format = 'csv' } = req.body;
    
    let data;
    
    // Get the data based on report type
    switch (reportType) {
      case 'financial':
        const financialData = await getFinancialReportExport(startDate, endDate);
        data = financialData;
        break;
      case 'project':
        const projectData = await getProjectStatusReportExport(startDate, endDate);
        data = projectData;
        break;
      case 'manufacturing':
        const manufacturingData = await getManufacturingReportExport(startDate, endDate);
        data = manufacturingData;
        break;
      case 'delivery':
        const deliveryData = await getDeliveryReportExport(startDate, endDate);
        data = deliveryData;
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }
    
    // Formatting is handled client-side
    res.json({ data });
    
  } catch (error) {
    console.error('Error exporting report data:', error);
    res.status(500).json({ error: 'Failed to export report data' });
  }
}

// Helper functions for report exports
async function getFinancialReportExport(startDate?: string, endDate?: string) {
  const start = startDate ? parseISO(startDate) : subMonths(new Date(), 6);
  const end = endDate ? parseISO(endDate) : new Date();
  
  const dateFilter = and(
    gte(billingMilestones.targetInvoiceDate, start.toISOString().split('T')[0]),
    lte(billingMilestones.targetInvoiceDate, end.toISOString().split('T')[0])
  );
  
  // Get all billing milestones with project info
  const data = await db
    .select({
      milestone_id: billingMilestones.id,
      project_id: billingMilestones.projectId,
      project_number: projects.projectNumber,
      project_name: projects.name,
      milestone_name: billingMilestones.name,
      amount: billingMilestones.amount,
      target_date: billingMilestones.targetInvoiceDate,
      status: billingMilestones.status,
      invoice_date: billingMilestones.actualInvoiceDate,
      payment_date: billingMilestones.paymentReceivedDate,
      notes: billingMilestones.notes
    })
    .from(billingMilestones)
    .leftJoin(projects, eq(billingMilestones.projectId, projects.id))
    .where(dateFilter)
    .orderBy(billingMilestones.targetInvoiceDate);
  
  return data;
}

async function getProjectStatusReportExport(startDate?: string, endDate?: string) {
  const start = startDate ? parseISO(startDate) : subMonths(new Date(), 6);
  const end = endDate ? parseISO(endDate) : new Date();
  
  const dateFilter = and(
    gte(projects.startDate, start.toISOString().split('T')[0]),
    lte(projects.startDate, end.toISOString().split('T')[0])
  );
  
  // Get all projects with status info
  const data = await db
    .select({
      project_id: projects.id,
      project_number: projects.projectNumber,
      project_name: projects.name,
      status: projects.status,
      risk_level: projects.riskLevel,
      start_date: projects.startDate,
      estimated_completion: projects.estimatedCompletionDate,
      actual_completion: projects.actualCompletionDate,
      percent_complete: projects.percentComplete,
      pm_owner: projects.pmOwner,
      team: projects.team,
      location: projects.location
    })
    .from(projects)
    .where(dateFilter)
    .orderBy(projects.startDate);
  
  return data;
}

async function getManufacturingReportExport(startDate?: string, endDate?: string) {
  const start = startDate ? parseISO(startDate) : subMonths(new Date(), 6);
  const end = endDate ? parseISO(endDate) : new Date();
  
  const dateFilter = and(
    gte(manufacturingSchedules.startDate, start.toISOString().split('T')[0]),
    lte(manufacturingSchedules.endDate, end.toISOString().split('T')[0])
  );
  
  // Get all manufacturing schedules with project and bay info
  const data = await db
    .select({
      schedule_id: manufacturingSchedules.id,
      bay_id: manufacturingSchedules.bayId,
      bay_name: manufacturingBays.name,
      project_id: manufacturingSchedules.projectId,
      project_number: projects.projectNumber,
      project_name: projects.name,
      start_date: manufacturingSchedules.startDate,
      end_date: manufacturingSchedules.endDate,
      status: manufacturingSchedules.status,
      row: manufacturingSchedules.row,
      production_days: manufacturingSchedules.productionDays
    })
    .from(manufacturingSchedules)
    .leftJoin(projects, eq(manufacturingSchedules.projectId, projects.id))
    .leftJoin(manufacturingBays, eq(manufacturingSchedules.bayId, manufacturingBays.id))
    .where(dateFilter)
    .orderBy(manufacturingSchedules.startDate);
  
  return data;
}

async function getDeliveryReportExport(startDate?: string, endDate?: string) {
  const start = startDate ? parseISO(startDate) : subMonths(new Date(), 6);
  const end = endDate ? parseISO(endDate) : new Date();
  
  const dateFilter = and(
    gte(deliveryTracking.actualDeliveryDate, start.toISOString().split('T')[0]),
    lte(deliveryTracking.actualDeliveryDate, end.toISOString().split('T')[0])
  );
  
  // Get all delivery tracking records with project info
  const data = await db
    .select({
      tracking_id: deliveryTracking.id,
      project_id: deliveryTracking.projectId,
      project_number: projects.projectNumber,
      project_name: projects.name,
      was_on_time: deliveryTracking.wasOnTime,
      scheduled_date: deliveryTracking.scheduledDeliveryDate,
      actual_date: deliveryTracking.actualDeliveryDate,
      days_deviation: deliveryTracking.daysEarlyOrLate,
      delay_responsibility: deliveryTracking.delayResponsibility,
      delay_reason: deliveryTracking.delayReason,
      created_at: deliveryTracking.createdAt
    })
    .from(deliveryTracking)
    .leftJoin(projects, eq(deliveryTracking.projectId, projects.id))
    .where(dateFilter)
    .orderBy(deliveryTracking.actualDeliveryDate);
  
  return data;
}