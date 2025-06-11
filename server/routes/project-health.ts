import { Express } from 'express';
import { storage } from '../storage';

export function setupProjectHealthRoutes(app: Express) {
  // Get comprehensive project health data
  app.get("/api/projects/:id/health", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Get project data
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Get related data
      const [allTasks, allMilestones, manufacturingSchedules, manufacturingBays] = await Promise.all([
        storage.getTasks(),
        storage.getBillingMilestones(),
        storage.getManufacturingSchedules(),
        storage.getManufacturingBays()
      ]);

      const tasks = allTasks?.filter((t: any) => t.projectId === projectId) || [];
      const billingMilestones = allMilestones?.filter((m: any) => m.projectId === projectId) || [];

      // Calculate comprehensive health metrics
      const healthData = calculateProjectHealth(
        project,
        tasks,
        billingMilestones,
        manufacturingSchedules?.filter(s => s.projectId === projectId) || [],
        manufacturingBays
      );

      res.json(healthData);
    } catch (error) {
      console.error('Error calculating project health:', error);
      res.status(500).json({ error: "Failed to calculate project health" });
    }
  });

  // Get real-time project metrics summary
  app.get("/api/projects/:id/metrics", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const [allTasks, allMilestones, manufacturingSchedules] = await Promise.all([
        storage.getTasks(),
        storage.getBillingMilestones(),
        storage.getManufacturingSchedules()
      ]);

      const tasks = allTasks?.filter((t: any) => t.projectId === projectId) || [];
      const billingMilestones = allMilestones?.filter((m: any) => m.projectId === projectId) || [];

      const projectSchedules = manufacturingSchedules?.filter(s => s.projectId === projectId) || [];
      const today = new Date();

      // Calculate real-time metrics
      const metrics = {
        // Task metrics
        totalTasks: tasks?.length || 0,
        completedTasks: tasks?.filter(t => t.isCompleted).length || 0,
        taskCompletionRate: tasks?.length ? Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100) : 0,
        
        // Billing metrics
        totalBillingValue: billingMilestones?.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0) || 0,
        paidBillingValue: billingMilestones?.filter(m => m.status === 'paid').reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0) || 0,
        billingCompletionRate: billingMilestones?.length ? 
          Math.round((billingMilestones.filter(m => m.status === 'paid').length / billingMilestones.length) * 100) : 0,
        
        // Manufacturing metrics
        manufacturingStatus: getManufacturingStatus(projectSchedules, today),
        isInManufacturing: projectSchedules.some(s => {
          const start = new Date(s.startDate);
          const end = new Date(s.endDate);
          return start <= today && today <= end;
        }),
        
        // Timeline metrics
        timelineStatus: calculateTimelineStatus(project, tasks),
        daysRemaining: project.estimatedCompletionDate ? 
          Math.ceil((new Date(project.estimatedCompletionDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null,
        
        // Progress metrics
        overallProgress: calculateOverallProgress(project, tasks),
        isOnTrack: isProjectOnTrack(project, tasks),
        
        // Last updated
        lastUpdated: new Date().toISOString()
      };

      res.json(metrics);
    } catch (error) {
      console.error('Error calculating project metrics:', error);
      res.status(500).json({ error: "Failed to calculate project metrics" });
    }
  });
}

function calculateProjectHealth(project: any, tasks: any[], billingMilestones: any[], manufacturingSchedules: any[], manufacturingBays: any[]) {
  const today = new Date();
  
  // 1. Task Completion Score (0-100)
  let taskScore = 0;
  if (tasks && tasks.length > 0) {
    const completedTasks = tasks.filter(t => t.isCompleted).length;
    taskScore = (completedTasks / tasks.length) * 100;
  } else if (project.percentComplete) {
    taskScore = parseFloat(project.percentComplete);
  }
  
  // 2. Timeline Adherence Score (0-100)
  let timelineScore = 100;
  if (project.startDate && project.estimatedCompletionDate) {
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.estimatedCompletionDate);
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = today.getTime() - startDate.getTime();
    
    if (totalDuration > 0) {
      const expectedProgress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
      const actualProgress = taskScore;
      const progressDifference = actualProgress - expectedProgress;
      
      if (progressDifference >= 0) {
        timelineScore = Math.min(100, 100 + (progressDifference * 0.5));
      } else {
        timelineScore = Math.max(0, 100 + (progressDifference * 1.5));
      }
    }
  }
  
  // 3. Billing Progress Score (0-100)
  let billingScore = 50;
  if (billingMilestones && billingMilestones.length > 0) {
    const totalValue = billingMilestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
    const paidValue = billingMilestones.filter(m => m.status === 'paid').reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
    
    if (totalValue > 0) {
      billingScore = (paidValue / totalValue) * 100;
    }
  }
  
  // 4. Manufacturing Status Score (0-100)
  let manufacturingScore = 50;
  if (manufacturingSchedules && manufacturingSchedules.length > 0) {
    const activeSchedule = manufacturingSchedules.find(s => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      return start <= today && today <= end;
    });
    
    if (activeSchedule) {
      manufacturingScore = 80;
    } else {
      const futureSchedule = manufacturingSchedules.find(s => new Date(s.startDate) > today);
      if (futureSchedule) {
        manufacturingScore = 70;
      } else {
        const completedSchedule = manufacturingSchedules.find(s => new Date(s.endDate) < today);
        if (completedSchedule) {
          manufacturingScore = 90;
        }
      }
    }
  } else {
    manufacturingScore = 30;
  }
  
  // 5. Calculate Overall Health Score
  const weights = { task: 0.35, timeline: 0.30, billing: 0.20, manufacturing: 0.15 };
  const overallScore = (
    taskScore * weights.task +
    timelineScore * weights.timeline +
    billingScore * weights.billing +
    manufacturingScore * weights.manufacturing
  );
  
  // 6. Determine Risk Level
  let riskLevel = 'Low';
  if (overallScore < 30) riskLevel = 'Critical';
  else if (overallScore < 50) riskLevel = 'High';
  else if (overallScore < 70) riskLevel = 'Medium';
  
  // 7. Calculate trend
  let trendChange = 0;
  if (timelineScore > 80) trendChange = 3;
  else if (timelineScore < 50) trendChange = -5;
  else trendChange = 1;
  
  return {
    score: Math.round(overallScore),
    change: trendChange,
    breakdown: {
      taskCompletion: Math.round(taskScore),
      timelineAdherence: Math.round(timelineScore),
      billingProgress: Math.round(billingScore),
      manufacturingStatus: Math.round(manufacturingScore),
      overallRisk: riskLevel
    },
    lastCalculated: new Date().toISOString()
  };
}

function getManufacturingStatus(schedules: any[], today: Date) {
  if (!schedules || schedules.length === 0) {
    return 'Not Scheduled';
  }
  
  const activeSchedule = schedules.find(s => {
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    return start <= today && today <= end;
  });
  
  if (activeSchedule) {
    return 'In Progress';
  }
  
  const futureSchedule = schedules.find(s => new Date(s.startDate) > today);
  if (futureSchedule) {
    return 'Scheduled';
  }
  
  const completedSchedule = schedules.find(s => new Date(s.endDate) < today);
  if (completedSchedule) {
    return 'Complete';
  }
  
  return 'Not Scheduled';
}

function calculateTimelineStatus(project: any, tasks: any[]) {
  if (!project.estimatedCompletionDate) {
    return 'Unknown';
  }
  
  const today = new Date();
  const endDate = new Date(project.estimatedCompletionDate);
  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) {
    return 'Overdue';
  } else if (daysRemaining < 7) {
    return 'Due Soon';
  } else if (daysRemaining < 30) {
    return 'On Track';
  } else {
    return 'Ahead';
  }
}

function calculateOverallProgress(project: any, tasks: any[]) {
  if (tasks && tasks.length > 0) {
    const completedTasks = tasks.filter(t => t.isCompleted).length;
    return Math.round((completedTasks / tasks.length) * 100);
  } else if (project.percentComplete) {
    return Math.round(parseFloat(project.percentComplete));
  }
  return 0;
}

function isProjectOnTrack(project: any, tasks: any[]) {
  if (!project.startDate || !project.estimatedCompletionDate) {
    return true; // Can't determine, assume on track
  }
  
  const today = new Date();
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.estimatedCompletionDate);
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsedDuration = today.getTime() - startDate.getTime();
  
  if (totalDuration <= 0 || elapsedDuration < 0) {
    return true;
  }
  
  const expectedProgress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
  const actualProgress = calculateOverallProgress(project, tasks);
  
  return actualProgress >= (expectedProgress - 10); // 10% tolerance
}