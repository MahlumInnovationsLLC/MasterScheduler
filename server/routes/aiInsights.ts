import { Request, Response } from 'express';
import { db } from '../db';
import { projects, manufacturingSchedules, billingMilestones, manufacturingBays } from '@shared/schema';
import { eq, lt, gt, and, or, sql } from 'drizzle-orm';
import { addDays, format, differenceInWeekdays, compareAsc } from 'date-fns';

/**
 * Generate real-time AI insights based on project and manufacturing data
 */
export async function getAIInsights(req: Request, res: Response) {
  try {
    const { insightType } = req.body;
    
    if (!insightType) {
      return res.status(400).json({ error: 'Missing insight type' });
    }
    
    // Get data needed for insights
    const allProjects = await db.select().from(projects);
    const allSchedules = await db.select().from(manufacturingSchedules);
    const allMilestones = await db.select().from(billingMilestones);
    const allBays = await db.select().from(manufacturingBays);
    
    const today = new Date();
    const formattedDate = format(today, 'yyyy-MM-dd');
    
    let insights: string[] = [];
    
    // Calculate bay utilization
    const bayUtilization = allBays.map(bay => {
      const baySchedules = allSchedules.filter(s => s.bayId === bay.id);
      return {
        bayId: bay.id,
        bayName: bay.name,
        utilization: baySchedules.length > 0 ? 
          Math.min(100, Math.round((baySchedules.length / 3) * 100)) : 0
      };
    });
    
    const totalUtilization = bayUtilization.reduce((sum, bay) => sum + bay.utilization, 0) / 
      (bayUtilization.length || 1);
    
    // Calculate delayed milestones
    const delayedMilestones = allMilestones.filter(m => 
      m.status === 'delayed' || 
      (m.status === 'upcoming' && new Date(m.targetInvoiceDate) < today)
    );
    
    // Projects close to shipping
    const projectsShippingSoon = allProjects.filter(project => {
      if (!project.shipDate) return false;
      const shipDate = new Date(project.shipDate);
      const daysTillShipping = Math.max(0, 
        differenceInWeekdays(shipDate, today));
      return daysTillShipping <= 7 && daysTillShipping > 0;
    });
    
    // Projects with low QC days
    const projectsWithLowQCDays = allProjects.filter(project => {
      if (!project.qcStartDate || !project.shipDate) return false;
      const qcStart = new Date(project.qcStartDate);
      const shipDate = new Date(project.shipDate);
      const qcDays = differenceInWeekdays(shipDate, qcStart);
      return qcDays < 5 && compareAsc(qcStart, today) >= 0;
    });
    
    if (insightType === 'risk') {
      // Risk insights are focused on project delays, bottlenecks and tight deadlines
      insights = [
        projectsWithLowQCDays.length > 0 
          ? `${projectsWithLowQCDays.length} project${projectsWithLowQCDays.length > 1 ? 's have' : ' has'} less than 5 QC days scheduled, which may impact quality assurance.`
          : 'All projects have adequate QC timelines scheduled.',
        
        delayedMilestones.length > 0
          ? `There are ${delayedMilestones.length} delayed billing milestone${delayedMilestones.length > 1 ? 's' : ''} that require attention.`
          : 'All billing milestones are on track or completed.',
        
        `Manufacturing bay capacity is currently at ${Math.round(totalUtilization)}% utilization across all teams${
          bayUtilization.some(b => b.utilization >= 90) 
            ? `, with ${bayUtilization.filter(b => b.utilization >= 90).length} bay${bayUtilization.filter(b => b.utilization >= 90).length > 1 ? 's' : ''} at or near full capacity.`
            : '.'
        }`,
        
        projectsShippingSoon.length > 0
          ? `${projectsShippingSoon.length} project${projectsShippingSoon.length > 1 ? 's are' : ' is'} scheduled to ship within the next 7 business days. Ensure final inspections are planned.`
          : 'No projects are scheduled to ship in the next 7 business days.'
      ];
    } else if (insightType === 'schedule') {
      // Schedule insights are focused on timeline optimization and resource allocation
      const highUtilBays = bayUtilization.filter(b => b.utilization >= 80);
      const lowUtilBays = bayUtilization.filter(b => b.utilization <= 30);
      
      insights = [
        highUtilBays.length > 0
          ? `High utilization detected in ${highUtilBays.map(b => b.bayName).join(', ')}. Consider load balancing to optimize throughput.`
          : 'Manufacturing bay utilization is balanced across all teams.',
        
        lowUtilBays.length > 0
          ? `${lowUtilBays.map(b => b.bayName).join(', ')} ${lowUtilBays.length > 1 ? 'have' : 'has'} capacity for additional work (below 30% utilization).`
          : 'All manufacturing bays are operating at efficient capacity levels.',
        
        projectsShippingSoon.length > 0
          ? `${projectsShippingSoon.length} project${projectsShippingSoon.length > 1 ? 's' : ''} shipping soon: ${projectsShippingSoon.slice(0, 3).map(p => p.projectNumber).join(', ')}${projectsShippingSoon.length > 3 ? '...' : ''}`
          : 'No projects are scheduled to ship in the next 7 business days.',
        
        projectsWithLowQCDays.length > 0
          ? `QC scheduling opportunity: ${projectsWithLowQCDays.length} project${projectsWithLowQCDays.length > 1 ? 's have' : ' has'} compressed QC timelines that could benefit from rescheduling.`
          : 'QC scheduling is optimized across all current projects.'
      ];
    } else {
      // Performance insights are focused on trends and metrics
      // Count projects completed in the last 30 days
      const thirtyDaysAgo = addDays(today, -30);
      const sixtyDaysAgo = addDays(today, -60);
      
      const completedLast30Days = allProjects.filter(p => 
        p.actualCompletionDate && 
        new Date(p.actualCompletionDate) >= thirtyDaysAgo &&
        new Date(p.actualCompletionDate) <= today
      );
      
      const completedPrevious30Days = allProjects.filter(p => 
        p.actualCompletionDate && 
        new Date(p.actualCompletionDate) >= sixtyDaysAgo &&
        new Date(p.actualCompletionDate) < thirtyDaysAgo
      );
      
      const completionRateChange = completedPrevious30Days.length > 0 
        ? Math.round(((completedLast30Days.length - completedPrevious30Days.length) / completedPrevious30Days.length) * 100)
        : 0;
      
      // Get on-time delivery rate
      const recentDeliveries = allProjects.filter(p => 
        p.actualCompletionDate && 
        new Date(p.actualCompletionDate) >= thirtyDaysAgo
      );
      
      const onTimeDeliveries = recentDeliveries.filter(p => 
        p.actualCompletionDate && 
        p.estimatedCompletionDate && 
        new Date(p.actualCompletionDate) <= new Date(p.estimatedCompletionDate)
      );
      
      const onTimeRate = recentDeliveries.length > 0 
        ? Math.round((onTimeDeliveries.length / recentDeliveries.length) * 100)
        : 0;
      
      insights = [
        completedLast30Days.length > 0
          ? `Project completion rate is ${completionRateChange > 0 ? 'up' : 'down'} by ${Math.abs(completionRateChange)}% compared to the previous 30-day period.`
          : 'No projects were completed in the last 30 days.',
        
        recentDeliveries.length > 0
          ? `On-time delivery performance is at ${onTimeRate}% for projects completed in the last 30 days.`
          : 'No recent deliveries to analyze for on-time performance.',
        
        `Average manufacturing bay utilization is ${Math.round(totalUtilization)}%, indicating ${
          totalUtilization > 80 ? 'high demand on resources'
          : totalUtilization < 40 ? 'potential capacity for additional projects'
          : 'balanced workload across teams'
        }.`,
        
        delayedMilestones.length > 0
          ? `${delayedMilestones.length} delayed billing milestone${delayedMilestones.length > 1 ? 's' : ''} may impact financial performance metrics.`
          : 'All billing milestones are on track, supporting positive financial performance.'
      ];
    }
    
    // Add timestamp to response
    return res.json({
      insights,
      lastUpdated: formattedDate
    });
    
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return res.status(500).json({ error: 'Failed to generate insights' });
  }
}