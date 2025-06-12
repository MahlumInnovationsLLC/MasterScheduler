import { Request, Response } from 'express';
import { storage } from '../storage';
import { format } from 'date-fns';

interface ExportRequestData {
  reportType: string;
  startDate: string;
  endDate: string;
  projectId?: number;
}

// Function to sanitize a string for use in filenames
const sanitizeFilename = (str: string): string => {
  return str.replace(/[^a-zA-Z0-9-_]/g, '_');
};

// Function to convert field IDs to display headers
const fieldIdToHeader = (fieldId: string): string => {
  return fieldId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export async function getFinancialReport(req: Request, res: Response) {
  try {
    const { startDate, endDate, projectId } = req.query;

    console.log('Financial report request:', { startDate, endDate, projectId });

    // Get current billing milestones
    const allMilestones = await storage.getBillingMilestones();
    const allProjects = await storage.getProjects();

    // Filter milestones by date range and project
    const filteredMilestones = allMilestones.filter(milestone => {
      // Project filter
      if (projectId && milestone.projectId.toString() !== projectId.toString()) {
        return false;
      }

      // Date filter
      if (startDate && endDate && milestone.targetInvoiceDate) {
        const milestoneDate = new Date(milestone.targetInvoiceDate);
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        return milestoneDate >= start && milestoneDate <= end;
      }

      return true;
    });

    // Calculate real-time metrics
    const totalInvoiced = filteredMilestones.reduce((sum, milestone) => {
      const amount = typeof milestone.amount === 'string' ? parseFloat(milestone.amount) : milestone.amount;
      return sum + (amount || 0);
    }, 0);

    const totalPaid = filteredMilestones
      .filter(milestone => milestone.status === 'paid')
      .reduce((sum, milestone) => {
        const amount = typeof milestone.amount === 'string' ? parseFloat(milestone.amount) : milestone.amount;
        return sum + (amount || 0);
      }, 0);

    const totalOutstanding = totalInvoiced - totalPaid;

    // Calculate average payment time (placeholder calculation)
    const paidMilestones = filteredMilestones.filter(m => m.status === 'paid' && m.paidDate && m.actualInvoiceDate);
    const averagePaymentTime = paidMilestones.length > 0 
      ? paidMilestones.reduce((sum, milestone) => {
          const invoiceDate = new Date(milestone.actualInvoiceDate!);
          const paidDate = new Date(milestone.paidDate!);
          const daysDiff = Math.ceil((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
          return sum + daysDiff;
        }, 0) / paidMilestones.length
      : 0;

    // Generate monthly chart data
    const chartData: Record<string, { month: string, invoiced: number, received: number, outstanding: number }> = {};

    // Initialize months
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);

      while (currentMonth <= end) {
        const monthKey = format(currentMonth, 'yyyy-MM');
        chartData[monthKey] = {
          month: format(currentMonth, 'MMM yyyy'),
          invoiced: 0,
          received: 0,
          outstanding: 0
        };
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }
    }

    // Fill in milestone data
    filteredMilestones.forEach(milestone => {
      if (!milestone.targetInvoiceDate) return;

      const invoiceDate = new Date(milestone.targetInvoiceDate);
      const monthKey = format(invoiceDate, 'yyyy-MM');

      if (chartData[monthKey]) {
        const amount = typeof milestone.amount === 'string' ? parseFloat(milestone.amount) : milestone.amount || 0;
        chartData[monthKey].invoiced += amount;

        if (milestone.status === 'paid') {
          chartData[monthKey].received += amount;
        } else {
          chartData[monthKey].outstanding += amount;
        }
      }
    });

    // Get upcoming milestones
    const upcomingMilestones = filteredMilestones
      .filter(milestone => milestone.status === 'upcoming' || milestone.status === 'invoiced')
      .sort((a, b) => new Date(a.targetInvoiceDate).getTime() - new Date(b.targetInvoiceDate).getTime())
      .slice(0, 10)
      .map(milestone => {
        const project = allProjects.find(p => p.id === milestone.projectId);
        return {
          ...milestone,
          project
        };
      });

    const response = {
      metrics: {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        averagePaymentTime: Math.round(averagePaymentTime)
      },
      chartData: Object.values(chartData),
      milestones: filteredMilestones,
      upcomingMilestones,
      generatedAt: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ error: 'Failed to generate financial report' });
  }
}

export async function getProjectStatusReport(req: Request, res: Response) {
  try {
    const { startDate, endDate, projectId } = req.query;

    console.log('Project status report request:', { startDate, endDate, projectId });

    // Get current projects and related data
    const allProjects = await storage.getProjects();
    const allSchedules = await storage.getManufacturingSchedules();
    const deliveredProjects = await storage.getDeliveredProjects();

    // Filter projects
    const filteredProjects = allProjects.filter(project => {
      // Project filter
      if (projectId && project.id.toString() !== projectId.toString()) {
        return false;
      }

      // Date filter - include projects with activity in date range
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const projectDate = new Date(project.createdAt || 0);

        // Also check if project has schedules in the date range
        const hasScheduleInRange = allSchedules.some(schedule => {
          if (schedule.projectId !== project.id) return false;
          const scheduleStart = new Date(schedule.startDate);
          const scheduleEnd = new Date(schedule.endDate);
          return (scheduleStart <= end && scheduleEnd >= start);
        });

        return (projectDate >= start && projectDate <= end) || hasScheduleInRange;
      }

      return true;
    });

    // Categorize projects by schedule and delivery status
    const projectCategories = {
      delivered: 0,
      inProgress: 0,
      scheduled: 0,
      unscheduled: 0
    };

    const deliveryMetrics = {
      totalDelivered: 0,
      onTimeDeliveries: 0,
      lateDeliveries: 0,
      averageDaysLate: 0,
      totalDaysLate: 0
    };

    const monthlyDeliveries: Record<string, { month: string, delivered: number, onTime: number, late: number }> = {};

    // Initialize monthly tracking if date range provided
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);

      while (currentMonth <= end) {
        const monthKey = format(currentMonth, 'yyyy-MM');
        monthlyDeliveries[monthKey] = {
          month: format(currentMonth, 'MMM yyyy'),
          delivered: 0,
          onTime: 0,
          late: 0
        };
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }
    }

    // Process delivered projects for metrics
    deliveredProjects.forEach(project => {
      if (projectId && project.id.toString() !== projectId.toString()) return;

      deliveryMetrics.totalDelivered++;
      let daysLate = 0;

      if (project.deliveryDate && project.contractDate) {
        const deliveryDate = new Date(project.deliveryDate);
        const contractDate = new Date(project.contractDate);
        daysLate = Math.ceil((deliveryDate.getTime() - contractDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (daysLate <= 0) {
        deliveryMetrics.onTimeDeliveries++;
      } else {
        deliveryMetrics.lateDeliveries++;
        deliveryMetrics.totalDaysLate += daysLate;
      }

      // Track monthly deliveries
      if (project.deliveryDate && monthlyDeliveries) {
        const deliveryDate = new Date(project.deliveryDate);
        const monthKey = format(deliveryDate, 'yyyy-MM');
        
        if (monthlyDeliveries[monthKey]) {
          monthlyDeliveries[monthKey].delivered++;
          if (daysLate <= 0) {
            monthlyDeliveries[monthKey].onTime++;
          } else {
            monthlyDeliveries[monthKey].late++;
          }
        }
      }
    });

    // Calculate average days late
    if (deliveryMetrics.lateDeliveries > 0) {
      deliveryMetrics.averageDaysLate = Math.round(deliveryMetrics.totalDaysLate / deliveryMetrics.lateDeliveries);
    }

    // Categorize non-delivered projects
    filteredProjects.forEach(project => {
      // Skip delivered projects as they're counted separately
      if (project.status === 'delivered') {
        projectCategories.delivered++;
        return;
      }

      const projectSchedules = allSchedules.filter(s => s.projectId === project.id);
      
      if (projectSchedules.length === 0) {
        projectCategories.unscheduled++;
      } else {
        // Check if any schedule is currently active
        const now = new Date();
        const hasActiveSchedule = projectSchedules.some(schedule => {
          const startDate = new Date(schedule.startDate);
          const endDate = new Date(schedule.endDate);
          return startDate <= now && endDate >= now;
        });

        if (hasActiveSchedule) {
          projectCategories.inProgress++;
        } else {
          projectCategories.scheduled++;
        }
      }
    });

    // Calculate status distribution for active projects
    const statusCounts = {
      active: 0,
      'on-track': 0,
      'at-risk': 0,
      delayed: 0,
      completed: 0,
      archived: 0
    };

    filteredProjects.filter(p => p.status !== 'delivered').forEach(project => {
      const status = project.status?.toLowerCase() || 'active';
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status as keyof typeof statusCounts]++;
      } else {
        statusCounts.active++;
      }
    });

    const statusDistribution = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));

    // Get project details with schedules and delivery info
    const projectsWithDetails = filteredProjects.map(project => {
      const projectSchedules = allSchedules.filter(s => s.projectId === project.id);
      const isDelivered = project.status === 'delivered';
      
      let scheduleStatus = 'unscheduled';
      if (projectSchedules.length > 0) {
        const now = new Date();
        const hasActiveSchedule = projectSchedules.some(schedule => {
          const startDate = new Date(schedule.startDate);
          const endDate = new Date(schedule.endDate);
          return startDate <= now && endDate >= now;
        });
        scheduleStatus = hasActiveSchedule ? 'in-progress' : 'scheduled';
      }

      return {
        ...project,
        schedules: projectSchedules,
        totalHours: projectSchedules.reduce((sum, s) => sum + (s.totalHours || 0), 0),
        scheduleStatus: isDelivered ? 'delivered' : scheduleStatus
      };
    });

    // Calculate on-time delivery rate
    const onTimeDeliveryRate = deliveryMetrics.totalDelivered > 0 
      ? Math.round((deliveryMetrics.onTimeDeliveries / deliveryMetrics.totalDelivered) * 100)
      : 0;

    const response = {
      metrics: {
        totalProjects: filteredProjects.length,
        delivered: projectCategories.delivered,
        inProgress: projectCategories.inProgress,
        scheduled: projectCategories.scheduled,
        unscheduled: projectCategories.unscheduled,
        onTimeDeliveryRate,
        averageDaysLate: deliveryMetrics.averageDaysLate
      },
      deliveryMetrics: {
        totalDelivered: deliveryMetrics.totalDelivered,
        onTimeDeliveries: deliveryMetrics.onTimeDeliveries,
        lateDeliveries: deliveryMetrics.lateDeliveries,
        onTimePercentage: onTimeDeliveryRate,
        averageDaysLate: deliveryMetrics.averageDaysLate
      },
      statusDistribution,
      monthlyDeliveries: Object.values(monthlyDeliveries),
      projects: projectsWithDetails,
      generatedAt: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating project status report:', error);
    res.status(500).json({ error: 'Failed to generate project status report' });
  }
}

export async function getManufacturingReport(req: Request, res: Response) {
  try {
    const { startDate, endDate, projectId } = req.query;

    console.log('Manufacturing report request:', { startDate, endDate, projectId });

    // Get current data
    const allSchedules = await storage.getManufacturingSchedules();
    const allBays = await storage.getManufacturingBays();
    const allProjects = await storage.getProjects();

    // Filter schedules by date range and project
    const filteredSchedules = allSchedules.filter(schedule => {
      // Project filter
      if (projectId && schedule.projectId.toString() !== projectId.toString()) {
        return false;
      }

      // Date filter
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const scheduleStart = new Date(schedule.startDate);
        const scheduleEnd = new Date(schedule.endDate);
        return (scheduleStart <= end && scheduleEnd >= start);
      }

      return true;
    });

    // Calculate bay utilization
    const bayUtilization = allBays.map(bay => {
      const baySchedules = filteredSchedules.filter(s => s.bayId === bay.id);
      const totalHours = baySchedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);

      // Calculate available hours in the date range
      let availableHours = 0;
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const workDays = Math.ceil(totalDays * 5 / 7); // Approximate work days
        availableHours = workDays * 8; // 8 hours per day
      }

      const utilization = availableHours > 0 ? Math.min(100, (totalHours / availableHours) * 100) : 0;

      return {
        bay: bay.name,
        bayId: bay.id,
        scheduled: totalHours,
        completed: baySchedules.filter(s => {
          const project = allProjects.find(p => p.id === s.projectId);
          return project?.status === 'completed';
        }).reduce((sum, s) => sum + (s.totalHours || 0), 0),
        utilization: Math.round(utilization)
      };
    });

    // Calculate overall metrics
    const totalSchedules = filteredSchedules.length;
    const totalHours = filteredSchedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);
    const avgBayUtilization = bayUtilization.length > 0 
      ? bayUtilization.reduce((sum, b) => sum + b.utilization, 0) / bayUtilization.length 
      : 0;

    // Calculate average project duration
    const projectDurations = filteredSchedules.map(schedule => {
      const startDate = new Date(schedule.startDate);
      const endDate = new Date(schedule.endDate);
      return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    });
    const avgProjectDuration = projectDurations.length > 0
      ? projectDurations.reduce((sum, d) => sum + d, 0) / projectDurations.length
      : 0;

    // Calculate on-time delivery rate
    const completedProjects = allProjects.filter(p => p.status === 'completed');
    const onTimeDeliveries = completedProjects.filter(project => {
      const projectSchedules = allSchedules.filter(s => s.projectId === project.id);
      if (projectSchedules.length === 0) return false;

      const latestScheduleEnd = Math.max(...projectSchedules.map(s => new Date(s.endDate).getTime()));
      const shipDate = project.shipDate ? new Date(project.shipDate).getTime() : Date.now();

      return shipDate <= latestScheduleEnd;
    }).length;

    const onTimeDeliveryRate = completedProjects.length > 0 
      ? (onTimeDeliveries / completedProjects.length) * 100 
      : 0;

    // Get schedules with project details
    const schedulesWithDetails = filteredSchedules.map(schedule => {
      const project = allProjects.find(p => p.id === schedule.projectId);
      const bay = allBays.find(b => b.id === schedule.bayId);

      return {
        ...schedule,
        project,
        bay
      };
    });

    const response = {
      metrics: {
        bayUtilization: Math.round(avgBayUtilization),
        averageProjectDuration: Math.round(avgProjectDuration),
        onTimeDelivery: Math.round(onTimeDeliveryRate),
        averageTeamSize: 4 // This would need to be calculated from actual team data
      },
      bayUtilization,
      schedules: schedulesWithDetails,
      totalSchedules,
      totalHours,
      generatedAt: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating manufacturing report:', error);
    res.status(500).json({ error: 'Failed to generate manufacturing report' });
  }
}

export async function getMechShopReport(req: Request, res: Response) {
  try {
    const { startDate, endDate, projectId } = req.query;

    console.log('Mech Shop report request:', { startDate, endDate, projectId });

    // Get current data
    const allProjects = await storage.getProjects();
    const allSchedules = await storage.getManufacturingSchedules();

    // Filter projects
    const filteredProjects = allProjects.filter(project => {
      // Project filter
      if (projectId && project.id.toString() !== projectId.toString()) {
        return false;
      }

      // Date filter
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        
        // Include projects with mech shop dates in range or production dates in range
        if (project.mechShop) {
          const mechDate = new Date(project.mechShop);
          if (mechDate >= start && mechDate <= end) {
            return true;
          }
        }

        // Also check production schedules
        const hasScheduleInRange = allSchedules.some(schedule => {
          if (schedule.projectId !== project.id) return false;
          const scheduleStart = new Date(schedule.startDate);
          const scheduleEnd = new Date(schedule.endDate);
          return (scheduleStart <= end && scheduleEnd >= start);
        });

        return hasScheduleInRange;
      }

      return true;
    });

    // Calculate mech shop metrics and prepare project data
    const projectsWithMechShop = filteredProjects.map(project => {
      const projectSchedules = allSchedules.filter(s => s.projectId === project.id);
      
      // Find the earliest production start date
      let earliestProductionStart = null;
      if (projectSchedules.length > 0) {
        const productionDates = projectSchedules.map(s => new Date(s.startDate));
        earliestProductionStart = new Date(Math.min(...productionDates.map(d => d.getTime())));
      }

      // Calculate days before production
      let daysBeforeProduction = null;
      if (project.mechShop && earliestProductionStart) {
        const mechDate = new Date(project.mechShop);
        const timeDiff = earliestProductionStart.getTime() - mechDate.getTime();
        daysBeforeProduction = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      }

      // Determine status based on dates
      let status = 'No Mech Shop Date';
      if (project.mechShop) {
        const today = new Date();
        const mechDate = new Date(project.mechShop);
        
        if (mechDate < today) {
          status = 'Completed';
        } else if (mechDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
          status = 'Due This Week';
        } else {
          status = 'Scheduled';
        }
      }

      return {
        ...project,
        schedules: projectSchedules,
        earliestProductionStart,
        daysBeforeProduction,
        mechShopStatus: status
      };
    });

    // Calculate summary metrics
    const totalProjects = projectsWithMechShop.length;
    const projectsWithMechShopDate = projectsWithMechShop.filter(p => p.mechShop).length;
    const projectsWithoutMechShopDate = totalProjects - projectsWithMechShopDate;
    
    const completedMechShop = projectsWithMechShop.filter(p => p.mechShopStatus === 'Completed').length;
    const dueThisWeek = projectsWithMechShop.filter(p => p.mechShopStatus === 'Due This Week').length;
    
    // Calculate average days before production (excluding null values)
    const validDaysBeforeProduction = projectsWithMechShop
      .filter(p => p.daysBeforeProduction !== null)
      .map(p => p.daysBeforeProduction);
    
    const averageDaysBeforeProduction = validDaysBeforeProduction.length > 0
      ? Math.round(validDaysBeforeProduction.reduce((sum, days) => sum + days, 0) / validDaysBeforeProduction.length)
      : 0;

    // Group by month for chart data
    const monthlyData: Record<string, { month: string, scheduled: number, completed: number }> = {};

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);

      while (currentMonth <= end) {
        const monthKey = format(currentMonth, 'yyyy-MM');
        monthlyData[monthKey] = {
          month: format(currentMonth, 'MMM yyyy'),
          scheduled: 0,
          completed: 0
        };
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }
    }

    // Fill in monthly data
    projectsWithMechShop.forEach(project => {
      if (!project.mechShop) return;

      const mechDate = new Date(project.mechShop);
      const monthKey = format(mechDate, 'yyyy-MM');

      if (monthlyData[monthKey]) {
        monthlyData[monthKey].scheduled++;
        if (project.mechShopStatus === 'Completed') {
          monthlyData[monthKey].completed++;
        }
      }
    });

    const response = {
      metrics: {
        totalProjects,
        projectsWithMechShopDate,
        projectsWithoutMechShopDate,
        completedMechShop,
        dueThisWeek,
        averageDaysBeforeProduction
      },
      projects: projectsWithMechShop,
      monthlyData: Object.values(monthlyData),
      generatedAt: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating mech shop report:', error);
    res.status(500).json({ error: 'Failed to generate mech shop report' });
  }
}

export async function getDeliveryReport(req: Request, res: Response) {
  try {
    const { startDate, endDate, projectId } = req.query;

    console.log('Delivery report request:', { startDate, endDate, projectId });

    // Get current projects
    const allProjects = await storage.getProjects();

    // Filter projects with delivery information
    const filteredProjects = allProjects.filter(project => {
      // Project filter
      if (projectId && project.id.toString() !== projectId.toString()) {
        return false;
      }

      // Date filter based on ship date
      if (startDate && endDate && project.shipDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const shipDate = new Date(project.shipDate);
        return shipDate >= start && shipDate <= end;
      }

      // Include projects with ship dates if no date filter
      return !!project.shipDate;
    });

    // Calculate delivery metrics
    const totalDeliveries = filteredProjects.length;
    const onTimeDeliveries = filteredProjects.filter(project => {
      // This would need more sophisticated logic to determine if delivery was on time
      // For now, assume projects shipped are on time
      return project.status === 'completed';
    }).length;

    const averageDelay = 0; // This would need to be calculated from actual schedule vs delivery data

    // Group deliveries by month for chart data
    const deliveriesByMonth: Record<string, { month: string, deliveries: number, onTime: number }> = {};

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);

      while (currentMonth <= end) {
        const monthKey = format(currentMonth, 'yyyy-MM');
        deliveriesByMonth[monthKey] = {
          month: format(currentMonth, 'MMM yyyy'),
          deliveries: 0,
          onTime: 0
        };
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }
    }

    // Fill in delivery data
    filteredProjects.forEach(project => {
      if (!project.shipDate) return;

      const shipDate = new Date(project.shipDate);
      const monthKey = format(shipDate, 'yyyy-MM');

      if (deliveriesByMonth[monthKey]) {
        deliveriesByMonth[monthKey].deliveries++;
        if (project.status === 'completed') {
          deliveriesByMonth[monthKey].onTime++;
        }
      }
    });

    const response = {
      metrics: {
        totalDeliveries,
        onTimeDeliveries,
        averageDelay
      },
      deliveries: filteredProjects,
      deliveriesByMonth: Object.values(deliveriesByMonth),
      generatedAt: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating delivery report:', error);
    res.status(500).json({ error: 'Failed to generate delivery report' });
  }
}

export async function exportReport(req: Request, res: Response) {
  try {
    const exportData = req.body as ExportRequestData;
    const { reportType, startDate, endDate, projectId } = exportData;

    console.log(`Exporting ${reportType} report`);
    console.log('Export parameters:', { startDate, endDate, projectId });

    let data: any[] = [];
    let fields: string[] = [];

    // Get the appropriate data based on report type
    switch (reportType) {
      case 'financial':
        const milestones = await storage.getBillingMilestones();
        const projects = await storage.getProjects();

        // Filter milestones
        const filteredMilestones = milestones.filter(milestone => {
          if (projectId && milestone.projectId.toString() !== projectId.toString()) return false;

          if (milestone.targetInvoiceDate) {
            const milestoneDate = new Date(milestone.targetInvoiceDate);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return milestoneDate >= start && milestoneDate <= end;
          }
          return true;
        });

        fields = ['project_number', 'project_name', 'milestone_name', 'amount', 'status', 'target_date', 'actual_date'];
        data = filteredMilestones.map(milestone => {
          const project = projects.find(p => p.id === milestone.projectId);
          return {
            project_number: project?.projectNumber || 'N/A',
            project_name: project?.name || 'N/A',
            milestone_name: milestone.name,
            amount: milestone.amount,
            status: milestone.status,
            target_date: milestone.targetInvoiceDate,
            actual_date: milestone.actualInvoiceDate
          };
        });
        break;

      case 'project':
        const allProjects = await storage.getProjects();
        const allSchedules = await storage.getManufacturingSchedules();

        const filteredProjects = allProjects.filter(project => {
          if (projectId && project.id.toString() !== projectId.toString()) return false;
          return true;
        });

        fields = ['project_number', 'project_name', 'status', 'customer', 'start_date', 'ship_date'];
        data = filteredProjects.map(project => {
          const projectSchedules = allSchedules.filter(s => s.projectId === project.id);
          const startDate = projectSchedules.length > 0 
            ? new Date(Math.min(...projectSchedules.map(s => new Date(s.startDate).getTime())))
            : null;

          return {
            project_number: project.projectNumber,
            project_name: project.name,
            status: project.status || 'Active',
            customer: project.customer || 'N/A',
            start_date: startDate ? format(startDate, 'yyyy-MM-dd') : 'N/A',
            ship_date: project.shipDate || 'N/A'
          };
        });
        break;

      case 'manufacturing':
        const schedules = await storage.getManufacturingSchedules();
        const bays = await storage.getManufacturingBays();
        const projectsForMfg = await storage.getProjects();

        const filteredSchedules = schedules.filter(schedule => {
          if (projectId && schedule.projectId.toString() !== projectId.toString()) return false;

          const scheduleStart = new Date(schedule.startDate);
          const scheduleEnd = new Date(schedule.endDate);
          const rangeStart = new Date(startDate);
          const rangeEnd = new Date(endDate);

          return (scheduleStart <= rangeEnd && scheduleEnd >= rangeStart);
        });

        fields = ['bay_name', 'project_number', 'project_name', 'start_date', 'end_date', 'total_hours', 'status'];
        data = filteredSchedules.map(schedule => {
          const bay = bays.find(b => b.id === schedule.bayId);
          const project = projectsForMfg.find(p => p.id === schedule.projectId);

          return {
            bay_name: bay?.name || `Bay ${schedule.bayId}`,
            project_number: project?.projectNumber || 'N/A',
            project_name: project?.name || 'N/A',
            start_date: schedule.startDate,
            end_date: schedule.endDate,
            total_hours: schedule.totalHours || 0,
            status: project?.status || 'Active'
          };
        });
        break;

      case 'mech-shop':
        const allProjectsForMech = await storage.getProjects();
        const allSchedulesForMech = await storage.getManufacturingSchedules();

        const filteredProjectsForMech = allProjectsForMech.filter(project => {
          if (projectId && project.id.toString() !== projectId.toString()) return false;
          return true;
        });

        fields = ['project_number', 'project_name', 'mech_shop_date', 'production_start_date', 'days_before_production', 'mech_shop_status'];
        data = filteredProjectsForMech.map(project => {
          const projectSchedules = allSchedulesForMech.filter(s => s.projectId === project.id);
          
          // Find earliest production start
          let earliestProductionStart = null;
          if (projectSchedules.length > 0) {
            const productionDates = projectSchedules.map(s => new Date(s.startDate));
            earliestProductionStart = new Date(Math.min(...productionDates.map(d => d.getTime())));
          }

          // Calculate days before production
          let daysBeforeProduction = 'N/A';
          if (project.mechShop && earliestProductionStart) {
            const mechDate = new Date(project.mechShop);
            const timeDiff = earliestProductionStart.getTime() - mechDate.getTime();
            daysBeforeProduction = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)).toString();
          }

          // Determine status
          let status = 'No Mech Shop Date';
          if (project.mechShop) {
            const today = new Date();
            const mechDate = new Date(project.mechShop);
            
            if (mechDate < today) {
              status = 'Completed';
            } else if (mechDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
              status = 'Due This Week';
            } else {
              status = 'Scheduled';
            }
          }

          return {
            project_number: project.projectNumber || 'N/A',
            project_name: project.name || 'N/A',
            mech_shop_date: project.mechShop || 'Not Set',
            production_start_date: earliestProductionStart ? format(earliestProductionStart, 'yyyy-MM-dd') : 'Not Scheduled',
            days_before_production: daysBeforeProduction,
            mech_shop_status: status
          };
        });
        break;

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    // Generate CSV
    const headers = fields.map(fieldIdToHeader);
    const rows = data.map(item => {
      return fields.map(field => {
        const value = item[field];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object' && value instanceof Date) return format(value, 'yyyy-MM-dd');
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/"/g, '""');
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Set response headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(reportType)}-report-${format(new Date(), 'yyyy-MM-dd')}.csv"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting report:', error);
    return res.status(500).send(`Error exporting report: ${(error as Error).message || 'Unknown error'}`);
  }
}