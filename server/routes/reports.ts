import { Request, Response } from 'express';
import { storage } from '../storage';
import { format } from 'date-fns';

interface ExportRequestData {
  module: string;
  subType: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  format: 'csv' | 'pdf' | 'docx';
  fields: string[];
  templateName?: string;
}

// Function to sanitize a string for use in filenames
const sanitizeFilename = (str: string): string => {
  return str.replace(/[^a-zA-Z0-9-_]/g, '_');
};

// Function to convert field IDs to display headers
const fieldIdToHeader = (fieldId: string): string => {
  // Convert snake_case to Title Case
  return fieldId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export async function exportReport(req: Request, res: Response) {
  try {
    const exportData = req.body as ExportRequestData;
    const { module, subType, dateRange, format, fields } = exportData;
    
    console.log(`Exporting ${module}/${subType} report in ${format} format`);
    console.log('Date range:', dateRange);
    console.log('Selected fields:', fields);
    
    let reportData: any[] = [];
    
    // Based on module and subType, retrieve the appropriate data
    switch (module) {
      case 'financial':
        switch (subType) {
          case 'billing-milestones':
            reportData = await getBillingMilestonesReport(dateRange, fields);
            break;
          case 'invoices':
            reportData = await getInvoicesReport(dateRange, fields);
            break;
          case 'payments':
            reportData = await getPaymentsReport(dateRange, fields);
            break;
          case 'financial-summary':
            reportData = await getFinancialSummaryReport(dateRange, fields);
            break;
          default:
            throw new Error(`Unknown financial report subtype: ${subType}`);
        }
        break;
        
      case 'manufacturing':
        switch (subType) {
          case 'bay-schedules':
            reportData = await getBaySchedulesReport(dateRange, fields);
            break;
          case 'production-metrics':
            reportData = await getProductionMetricsReport(dateRange, fields);
            break;
          case 'utilization':
            reportData = await getUtilizationReport(dateRange, fields);
            break;
          case 'manufacturing-summary':
            reportData = await getManufacturingSummaryReport(dateRange, fields);
            break;
          default:
            throw new Error(`Unknown manufacturing report subtype: ${subType}`);
        }
        break;
        
      case 'project':
        switch (subType) {
          case 'active-projects':
            reportData = await getActiveProjectsReport(dateRange, fields);
            break;
          case 'completed-projects':
            reportData = await getCompletedProjectsReport(dateRange, fields);
            break;
          case 'delayed-projects':
            reportData = await getDelayedProjectsReport(dateRange, fields);
            break;
          case 'project-timelines':
            reportData = await getProjectTimelinesReport(dateRange, fields);
            break;
          default:
            throw new Error(`Unknown project report subtype: ${subType}`);
        }
        break;
        
      case 'delivery':
        switch (subType) {
          case 'delivered-projects':
            reportData = await getDeliveredProjectsReport(dateRange, fields);
            break;
          case 'delivery-tracking':
            reportData = await getDeliveryTrackingReport(dateRange, fields);
            break;
          case 'on-time-delivery':
            reportData = await getOnTimeDeliveryReport(dateRange, fields);
            break;
          case 'shipping-details':
            reportData = await getShippingDetailsReport(dateRange, fields);
            break;
          default:
            throw new Error(`Unknown delivery report subtype: ${subType}`);
        }
        break;
        
      default:
        throw new Error(`Unknown report module: ${module}`);
    }
    
    // If no data found, return an empty report
    if (reportData.length === 0) {
      reportData = [{ message: 'No data found for the selected criteria' }];
    }
    
    // Based on the requested format, generate and return the appropriate file
    switch (format) {
      case 'csv':
        return generateCSV(reportData, fields, res, `${module}-${subType}`);
      case 'pdf':
        return generatePDF(reportData, fields, res, `${module}-${subType}`);
      case 'docx':
        return generateDOCX(reportData, fields, res, `${module}-${subType}`);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    return res.status(500).send(`Error exporting report: ${(error as Error).message || 'Unknown error'}`);
  }
}

// Function to generate CSV output
async function generateCSV(data: any[], fields: string[], res: Response, reportName: string) {
  // Generate headers row
  const headers = fields.map(fieldIdToHeader);
  
  // Generate data rows
  const rows = data.map(item => {
    return fields.map(field => {
      const value = item[field];
      // Handle different data types appropriately for CSV
      if (value === null || value === undefined) return '';
      if (typeof value === 'object' && value instanceof Date) return format(value, 'yyyy-MM-dd');
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value).replace(/"/g, '""'); // Escape quotes in CSV
    });
  });
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  // Set response headers
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${sanitizeFilename(reportName)}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  
  // Send the CSV data
  return res.status(200).send(csvContent);
}

// Function to generate PDF output (placeholder for now)
async function generatePDF(data: any[], fields: string[], res: Response, reportName: string) {
  // For now, return CSV as a fallback since PDF generation requires additional libraries
  console.log('PDF generation requested but not fully implemented, falling back to CSV');
  return generateCSV(data, fields, res, reportName);
}

// Function to generate DOCX output (placeholder for now)
async function generateDOCX(data: any[], fields: string[], res: Response, reportName: string) {
  // For now, return CSV as a fallback since DOCX generation requires additional libraries
  console.log('DOCX generation requested but not fully implemented, falling back to CSV');
  return generateCSV(data, fields, res, reportName);
}

// Data retrieval functions for each report type
// These would normally query the database, but for now we'll use simplified implementations

async function getBillingMilestonesReport(dateRange: any, fields: string[]): Promise<any[]> {
  const billingMilestones = await storage.findBillingMilestones({
    where: {
      targetInvoiceDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    },
    include: {
      project: true
    }
  });
  
  return billingMilestones.map(milestone => {
    const result: Record<string, any> = {};
    
    // Add project fields if requested
    if (fields.includes('project_id')) result.project_id = milestone.projectId;
    if (fields.includes('project_number') && milestone.project) result.project_number = milestone.project.projectNumber;
    if (fields.includes('project_name') && milestone.project) result.project_name = milestone.project.name;
    
    // Add milestone fields
    if (fields.includes('milestone_id')) result.milestone_id = milestone.id;
    if (fields.includes('milestone_name')) result.milestone_name = milestone.name;
    if (fields.includes('amount')) result.amount = milestone.amount;
    if (fields.includes('status')) result.status = milestone.status;
    if (fields.includes('target_date')) result.target_date = milestone.targetInvoiceDate;
    if (fields.includes('actual_date')) result.actual_date = milestone.actualInvoiceDate;
    if (fields.includes('payment_date')) result.payment_date = milestone.paidDate;
    
    return result;
  });
}

async function getInvoicesReport(dateRange: any, fields: string[]): Promise<any[]> {
  // Fetch invoiced and paid billing milestones
  const invoices = await Storage.findBillingMilestones({
    where: {
      actualInvoiceDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      },
      status: {
        in: ['invoiced', 'paid']
      }
    },
    include: {
      project: true
    }
  });
  
  return invoices.map(invoice => {
    const result: Record<string, any> = {};
    
    // Add project fields if requested
    if (fields.includes('project_id')) result.project_id = invoice.projectId;
    if (fields.includes('project_number') && invoice.project) result.project_number = invoice.project.projectNumber;
    if (fields.includes('project_name') && invoice.project) result.project_name = invoice.project.name;
    
    // Add invoice fields
    if (fields.includes('milestone_id')) result.milestone_id = invoice.id;
    if (fields.includes('milestone_name')) result.milestone_name = invoice.name;
    if (fields.includes('amount')) result.amount = invoice.amount;
    if (fields.includes('status')) result.status = invoice.status;
    if (fields.includes('target_date')) result.target_date = invoice.targetInvoiceDate;
    if (fields.includes('actual_date')) result.actual_date = invoice.actualInvoiceDate;
    if (fields.includes('payment_date')) result.payment_date = invoice.paidDate;
    
    return result;
  });
}

async function getPaymentsReport(dateRange: any, fields: string[]): Promise<any[]> {
  // Fetch paid billing milestones
  const payments = await Storage.findBillingMilestones({
    where: {
      paidDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      },
      status: 'paid'
    },
    include: {
      project: true
    }
  });
  
  return payments.map(payment => {
    const result: Record<string, any> = {};
    
    // Add project fields if requested
    if (fields.includes('project_id')) result.project_id = payment.projectId;
    if (fields.includes('project_number') && payment.project) result.project_number = payment.project.projectNumber;
    if (fields.includes('project_name') && payment.project) result.project_name = payment.project.name;
    
    // Add payment fields
    if (fields.includes('milestone_id')) result.milestone_id = payment.id;
    if (fields.includes('milestone_name')) result.milestone_name = payment.name;
    if (fields.includes('amount')) result.amount = payment.amount;
    if (fields.includes('status')) result.status = payment.status;
    if (fields.includes('target_date')) result.target_date = payment.targetInvoiceDate;
    if (fields.includes('actual_date')) result.actual_date = payment.actualInvoiceDate;
    if (fields.includes('payment_date')) result.payment_date = payment.paidDate;
    
    return result;
  });
}

async function getFinancialSummaryReport(dateRange: any, fields: string[]): Promise<any[]> {
  // Fetch all billing milestones in the date range
  const milestones = await Storage.findBillingMilestones({
    where: {
      OR: [
        {
          targetInvoiceDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        },
        {
          actualInvoiceDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        },
        {
          paidDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        }
      ]
    },
    include: {
      project: true
    }
  });
  
  return milestones.map(milestone => {
    const result: Record<string, any> = {};
    
    // Add project fields if requested
    if (fields.includes('project_id')) result.project_id = milestone.projectId;
    if (fields.includes('project_number') && milestone.project) result.project_number = milestone.project.projectNumber;
    if (fields.includes('project_name') && milestone.project) result.project_name = milestone.project.name;
    
    // Add milestone fields
    if (fields.includes('milestone_id')) result.milestone_id = milestone.id;
    if (fields.includes('milestone_name')) result.milestone_name = milestone.name;
    if (fields.includes('amount')) result.amount = milestone.amount;
    if (fields.includes('status')) result.status = milestone.status;
    if (fields.includes('target_date')) result.target_date = milestone.targetInvoiceDate;
    if (fields.includes('actual_date')) result.actual_date = milestone.actualInvoiceDate;
    if (fields.includes('payment_date')) result.payment_date = milestone.paidDate;
    
    return result;
  });
}

async function getBaySchedulesReport(dateRange: any, fields: string[]): Promise<any[]> {
  // Fetch manufacturing schedules in the date range
  const schedules = await Storage.findManufacturingSchedules({
    where: {
      OR: [
        {
          startDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        },
        {
          endDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        }
      ]
    },
    include: {
      project: true,
      bay: true
    }
  });
  
  return schedules.map(schedule => {
    const result: Record<string, any> = {};
    
    // Add bay fields if requested
    if (fields.includes('bay_id')) result.bay_id = schedule.bayId;
    if (fields.includes('bay_name') && schedule.bay) result.bay_name = schedule.bay.name;
    
    // Add project fields if requested
    if (fields.includes('project_id')) result.project_id = schedule.projectId;
    if (fields.includes('project_name') && schedule.project) result.project_name = schedule.project.name;
    
    // Add schedule fields
    if (fields.includes('start_date')) result.start_date = schedule.startDate;
    if (fields.includes('end_date')) result.end_date = schedule.endDate;
    if (fields.includes('total_hours')) result.total_hours = schedule.totalHours;
    
    // Calculate duration in days
    if (fields.includes('duration')) {
      const startDate = new Date(schedule.startDate);
      const endDate = new Date(schedule.endDate);
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
      result.duration = durationDays;
    }
    
    // Add status field
    if (fields.includes('status')) {
      const today = new Date();
      const startDate = new Date(schedule.startDate);
      const endDate = new Date(schedule.endDate);
      
      if (today < startDate) {
        result.status = 'Upcoming';
      } else if (today > endDate) {
        result.status = 'Completed';
      } else {
        result.status = 'In Progress';
      }
    }
    
    return result;
  });
}

async function getProductionMetricsReport(dateRange: any, fields: string[]): Promise<any[]> {
  // This is a placeholder implementation
  // In a real application, this would analyze manufacturing data to provide metrics
  
  // Get all schedules for the period
  const schedules = await Storage.findManufacturingSchedules({
    where: {
      OR: [
        {
          startDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        },
        {
          endDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        }
      ]
    },
    include: {
      project: true,
      bay: true
    }
  });
  
  // Group schedules by bay to calculate metrics
  const bayMetrics: Record<number, any> = {};
  
  schedules.forEach(schedule => {
    if (!bayMetrics[schedule.bayId]) {
      bayMetrics[schedule.bayId] = {
        bay_id: schedule.bayId,
        bay_name: schedule.bay?.name || `Bay ${schedule.bayId}`,
        project_count: 0,
        total_hours: 0,
        avg_project_duration: 0,
        projects: []
      };
    }
    
    // Add this schedule's data to the bay metrics
    bayMetrics[schedule.bayId].project_count++;
    bayMetrics[schedule.bayId].total_hours += schedule.totalHours || 0;
    
    // Calculate duration in days
    const startDate = new Date(schedule.startDate);
    const endDate = new Date(schedule.endDate);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    
    bayMetrics[schedule.bayId].projects.push({
      project_id: schedule.projectId,
      project_name: schedule.project?.name || `Project ${schedule.projectId}`,
      duration_days: durationDays,
      total_hours: schedule.totalHours
    });
  });
  
  // Calculate averages and format results
  return Object.values(bayMetrics).map(bayMetric => {
    const result: Record<string, any> = {};
    
    if (fields.includes('bay_id')) result.bay_id = bayMetric.bay_id;
    if (fields.includes('bay_name')) result.bay_name = bayMetric.bay_name;
    if (fields.includes('project_count')) result.project_count = bayMetric.project_count;
    if (fields.includes('total_hours')) result.total_hours = bayMetric.total_hours;
    
    if (fields.includes('avg_project_duration') && bayMetric.projects.length > 0) {
      const totalDays = bayMetric.projects.reduce((sum: number, proj: any) => sum + proj.duration_days, 0);
      result.avg_project_duration = Math.round(totalDays / bayMetric.projects.length);
    }
    
    if (fields.includes('utilization_rate')) {
      // Simple utilization calculation (more sophisticated in real implementation)
      // Assume 8 hours per day, 5 days per week
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const totalDaysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const workDaysInPeriod = Math.ceil(totalDaysInPeriod * 5 / 7); // Approximation of work days
      const availableHours = workDaysInPeriod * 8;
      
      if (availableHours > 0) {
        result.utilization_rate = Math.min(100, Math.round((bayMetric.total_hours / availableHours) * 100)) + '%';
      } else {
        result.utilization_rate = '0%';
      }
    }
    
    return result;
  });
}

async function getUtilizationReport(dateRange: any, fields: string[]): Promise<any[]> {
  // This is similar to production metrics but focused specifically on utilization
  
  // Get all manufacturing bays
  const bays = await Storage.findManufacturingBays({
    include: {
      schedules: {
        where: {
          OR: [
            {
              startDate: {
                gte: dateRange.startDate,
                lte: dateRange.endDate
              }
            },
            {
              endDate: {
                gte: dateRange.startDate,
                lte: dateRange.endDate
              }
            }
          ]
        },
        include: {
          project: true
        }
      }
    }
  });
  
  return bays.map(bay => {
    const result: Record<string, any> = {};
    
    if (fields.includes('bay_id')) result.bay_id = bay.id;
    if (fields.includes('bay_name')) result.bay_name = bay.name;
    
    // Calculate total scheduled hours
    const totalScheduledHours = bay.schedules?.reduce((sum, schedule) => {
      return sum + (schedule.totalHours || 0);
    }, 0) || 0;
    
    if (fields.includes('total_hours')) result.total_hours = totalScheduledHours;
    if (fields.includes('project_count')) result.project_count = bay.schedules?.length || 0;
    
    // Calculate utilization rate
    if (fields.includes('utilization_rate')) {
      // Calculate available hours (8 hours per day, 5 days per week)
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const totalDaysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const workDaysInPeriod = Math.ceil(totalDaysInPeriod * 5 / 7); // Approximation of work days
      const availableHours = workDaysInPeriod * 8;
      
      if (availableHours > 0) {
        result.utilization_rate = Math.min(100, Math.round((totalScheduledHours / availableHours) * 100)) + '%';
      } else {
        result.utilization_rate = '0%';
      }
    }
    
    // Current status
    if (fields.includes('status')) {
      const today = new Date();
      const hasActiveProject = bay.schedules?.some(schedule => {
        const startDate = new Date(schedule.startDate);
        const endDate = new Date(schedule.endDate);
        return today >= startDate && today <= endDate;
      });
      
      result.status = hasActiveProject ? 'Active' : 'Available';
    }
    
    return result;
  });
}

async function getManufacturingSummaryReport(dateRange: any, fields: string[]): Promise<any[]> {
  // This is a combined report of schedules and utilization
  
  // Combine data from bay schedules and utilization reports
  const schedules = await getBaySchedulesReport(dateRange, fields);
  const utilization = await getUtilizationReport(dateRange, fields);
  
  // Return combined results
  return [...schedules, ...utilization];
}

async function getActiveProjectsReport(dateRange: any, fields: string[]): Promise<any[]> {
  // Get all active projects
  const today = new Date();
  
  const projects = await Storage.findProjects({
    where: {
      isCompleted: false,
      createdAt: {
        lte: dateRange.endDate
      }
    },
    include: {
      schedules: true
    }
  });
  
  return projects.map(project => {
    const result: Record<string, any> = {};
    
    if (fields.includes('project_id')) result.project_id = project.id;
    if (fields.includes('project_number')) result.project_number = project.projectNumber;
    if (fields.includes('project_name')) result.project_name = project.name;
    if (fields.includes('status')) result.status = project.status;
    if (fields.includes('risk_level')) result.risk_level = project.riskLevel;
    
    // Calculate project dates
    if (fields.includes('start_date')) {
      // Find earliest schedule start date
      if (project.schedules && project.schedules.length > 0) {
        const startDates = project.schedules.map(s => new Date(s.startDate).getTime());
        result.start_date = new Date(Math.min(...startDates));
      } else {
        result.start_date = null;
      }
    }
    
    if (fields.includes('estimated_completion')) {
      // Find latest schedule end date
      if (project.schedules && project.schedules.length > 0) {
        const endDates = project.schedules.map(s => new Date(s.endDate).getTime());
        result.estimated_completion = new Date(Math.max(...endDates));
      } else {
        result.estimated_completion = null;
      }
    }
    
    if (fields.includes('ship_date')) result.ship_date = project.shipDate;
    if (fields.includes('total_hours')) {
      // Sum of all schedule hours
      result.total_hours = project.schedules?.reduce((sum, schedule) => {
        return sum + (schedule.totalHours || 0);
      }, 0) || 0;
    }
    
    // Calculate percent complete (simplified)
    if (fields.includes('percent_complete')) {
      if (project.schedules && project.schedules.length > 0 && project.schedules.some(s => new Date(s.startDate) <= today)) {
        // If project has started
        if (project.isCompleted) {
          result.percent_complete = '100%';
        } else {
          // Simple calculation based on elapsed time
          const startDate = new Date(Math.min(...project.schedules.map(s => new Date(s.startDate).getTime())));
          const endDate = new Date(Math.max(...project.schedules.map(s => new Date(s.endDate).getTime())));
          
          const totalDuration = endDate.getTime() - startDate.getTime();
          const elapsedDuration = today.getTime() - startDate.getTime();
          
          if (totalDuration > 0) {
            const percent = Math.min(100, Math.round((elapsedDuration / totalDuration) * 100));
            result.percent_complete = `${percent}%`;
          } else {
            result.percent_complete = '0%';
          }
        }
      } else {
        result.percent_complete = '0%';
      }
    }
    
    return result;
  });
}

async function getCompletedProjectsReport(dateRange: any, fields: string[]): Promise<any[]> {
  // Get all completed projects
  const projects = await Storage.findProjects({
    where: {
      isCompleted: true,
      completedAt: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    },
    include: {
      schedules: true
    }
  });
  
  return projects.map(project => {
    const result: Record<string, any> = {};
    
    if (fields.includes('project_id')) result.project_id = project.id;
    if (fields.includes('project_number')) result.project_number = project.projectNumber;
    if (fields.includes('project_name')) result.project_name = project.name;
    if (fields.includes('status')) result.status = 'Completed';
    if (fields.includes('risk_level')) result.risk_level = project.riskLevel;
    
    // Project dates
    if (fields.includes('start_date')) {
      // Find earliest schedule start date
      if (project.schedules && project.schedules.length > 0) {
        const startDates = project.schedules.map(s => new Date(s.startDate).getTime());
        result.start_date = new Date(Math.min(...startDates));
      } else {
        result.start_date = null;
      }
    }
    
    if (fields.includes('ship_date')) result.ship_date = project.shipDate;
    if (fields.includes('completed_date')) result.completed_date = project.completedAt;
    
    if (fields.includes('total_hours')) {
      // Sum of all schedule hours
      result.total_hours = project.schedules?.reduce((sum, schedule) => {
        return sum + (schedule.totalHours || 0);
      }, 0) || 0;
    }
    
    // For completed projects, percent_complete is always 100%
    if (fields.includes('percent_complete')) {
      result.percent_complete = '100%';
    }
    
    return result;
  });
}

async function getDelayedProjectsReport(dateRange: any, fields: string[]): Promise<any[]> {
  // Get projects with delayed status or past their estimated completion date
  const today = new Date();
  
  const projects = await Storage.findProjects({
    where: {
      OR: [
        {
          status: 'delayed'
        },
        {
          // Projects with schedules that ended but aren't marked complete
          isCompleted: false,
          schedules: {
            some: {
              endDate: {
                lt: format(today, 'yyyy-MM-dd')
              }
            }
          }
        }
      ],
      // Within the date range
      updatedAt: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    },
    include: {
      schedules: true
    }
  });
  
  return projects.map(project => {
    const result: Record<string, any> = {};
    
    if (fields.includes('project_id')) result.project_id = project.id;
    if (fields.includes('project_number')) result.project_number = project.projectNumber;
    if (fields.includes('project_name')) result.project_name = project.name;
    if (fields.includes('status')) result.status = 'Delayed';
    if (fields.includes('risk_level')) result.risk_level = project.riskLevel;
    
    // Calculate project dates
    if (fields.includes('start_date')) {
      // Find earliest schedule start date
      if (project.schedules && project.schedules.length > 0) {
        const startDates = project.schedules.map(s => new Date(s.startDate).getTime());
        result.start_date = new Date(Math.min(...startDates));
      } else {
        result.start_date = null;
      }
    }
    
    if (fields.includes('estimated_completion')) {
      // Find latest schedule end date
      if (project.schedules && project.schedules.length > 0) {
        const endDates = project.schedules.map(s => new Date(s.endDate).getTime());
        result.estimated_completion = new Date(Math.max(...endDates));
      } else {
        result.estimated_completion = null;
      }
    }
    
    if (fields.includes('ship_date')) result.ship_date = project.shipDate;
    
    // Calculate days delayed
    if (fields.includes('days_delayed')) {
      if (project.schedules && project.schedules.length > 0) {
        const latestEndDate = new Date(Math.max(...project.schedules.map(s => new Date(s.endDate).getTime())));
        if (latestEndDate < today) {
          const delayMs = today.getTime() - latestEndDate.getTime();
          const delayDays = Math.ceil(delayMs / (1000 * 60 * 60 * 24));
          result.days_delayed = delayDays;
        } else {
          result.days_delayed = 0;
        }
      } else {
        result.days_delayed = 0;
      }
    }
    
    // Calculate percent complete
    if (fields.includes('percent_complete')) {
      if (project.schedules && project.schedules.length > 0) {
        // Simple calculation based on elapsed time
        const startDate = new Date(Math.min(...project.schedules.map(s => new Date(s.startDate).getTime())));
        const endDate = new Date(Math.max(...project.schedules.map(s => new Date(s.endDate).getTime())));
        
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsedDuration = Math.min(today.getTime() - startDate.getTime(), totalDuration);
        
        if (totalDuration > 0) {
          const percent = Math.min(100, Math.round((elapsedDuration / totalDuration) * 100));
          result.percent_complete = `${percent}%`;
        } else {
          result.percent_complete = '0%';
        }
      } else {
        result.percent_complete = '0%';
      }
    }
    
    return result;
  });
}

async function getProjectTimelinesReport(dateRange: any, fields: string[]): Promise<any[]> {
  // Get all projects active during the date range
  const projects = await Storage.findProjects({
    where: {
      OR: [
        {
          // Projects created during date range
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        },
        {
          // Projects with schedules during date range
          schedules: {
            some: {
              OR: [
                {
                  startDate: {
                    gte: dateRange.startDate,
                    lte: dateRange.endDate
                  }
                },
                {
                  endDate: {
                    gte: dateRange.startDate,
                    lte: dateRange.endDate
                  }
                }
              ]
            }
          }
        }
      ]
    },
    include: {
      schedules: {
        include: {
          bay: true
        }
      }
    }
  });
  
  return projects.map(project => {
    const result: Record<string, any> = {};
    
    if (fields.includes('project_id')) result.project_id = project.id;
    if (fields.includes('project_number')) result.project_number = project.projectNumber;
    if (fields.includes('project_name')) result.project_name = project.name;
    if (fields.includes('status')) result.status = project.status;
    
    // Calculate project timeline
    if (fields.includes('start_date')) {
      // Find earliest schedule start date
      if (project.schedules && project.schedules.length > 0) {
        const startDates = project.schedules.map(s => new Date(s.startDate).getTime());
        result.start_date = new Date(Math.min(...startDates));
      } else {
        result.start_date = null;
      }
    }
    
    if (fields.includes('estimated_completion')) {
      // Find latest schedule end date
      if (project.schedules && project.schedules.length > 0) {
        const endDates = project.schedules.map(s => new Date(s.endDate).getTime());
        result.estimated_completion = new Date(Math.max(...endDates));
      } else {
        result.estimated_completion = null;
      }
    }
    
    if (fields.includes('ship_date')) result.ship_date = project.shipDate;
    
    // Calculate project duration
    if (fields.includes('duration') && project.schedules && project.schedules.length > 0) {
      const startDate = new Date(Math.min(...project.schedules.map(s => new Date(s.startDate).getTime())));
      const endDate = new Date(Math.max(...project.schedules.map(s => new Date(s.endDate).getTime())));
      
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
      result.duration = durationDays;
    }
    
    // List of bays used
    if (fields.includes('bays')) {
      const bayList = project.schedules?.map(s => s.bay?.name || `Bay ${s.bayId}`).filter((v, i, a) => a.indexOf(v) === i);
      result.bays = bayList?.join(', ') || '';
    }
    
    return result;
  });
}

async function getDeliveredProjectsReport(dateRange: any, fields: string[]): Promise<any[]> {
  // Get projects delivered/shipped during the date range
  const projects = await Storage.findProjects({
    where: {
      shipDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      },
      // Only include projects with a ship date
      NOT: {
        shipDate: null
      }
    },
    include: {
      schedules: true
    }
  });
  
  return projects.map(project => {
    const result: Record<string, any> = {};
    
    if (fields.includes('project_id')) result.project_id = project.id;
    if (fields.includes('project_number')) result.project_number = project.projectNumber;
    if (fields.includes('project_name')) result.project_name = project.name;
    if (fields.includes('ship_date')) result.ship_date = project.shipDate;
    
    // Calculate on-time delivery status
    if (fields.includes('status')) {
      if (project.schedules && project.schedules.length > 0) {
        // Check if ship date was after latest scheduled end date
        const latestEndDate = new Date(Math.max(...project.schedules.map(s => new Date(s.endDate).getTime())));
        const shipDate = new Date(project.shipDate || '');
        
        if (shipDate > latestEndDate) {
          result.status = 'Delayed Delivery';
        } else {
          result.status = 'On-Time Delivery';
        }
      } else {
        result.status = 'Delivered';
      }
    }
    
    return result;
  });
}

async function getDeliveryTrackingReport(dateRange: any, fields: string[]): Promise<any[]> {
  // This would normally fetch actual delivery tracking data
  // As a placeholder, we'll create a report based on projects with ship dates
  
  const projects = await Storage.findProjects({
    where: {
      // Projects with delivery date in range
      shipDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    }
  });
  
  return projects.map(project => {
    const result: Record<string, any> = {};
    
    if (fields.includes('project_id')) result.project_id = project.id;
    if (fields.includes('project_name')) result.project_name = project.name;
    if (fields.includes('project_number')) result.project_number = project.projectNumber;
    
    // Delivery dates
    if (fields.includes('scheduled_date')) result.scheduled_date = project.shipDate;
    if (fields.includes('actual_date')) result.actual_date = project.actualShipDate || project.shipDate;
    
    // Mock delivery tracking data
    if (fields.includes('carrier')) result.carrier = 'Company Truck';
    if (fields.includes('tracking_number')) result.tracking_number = `TRK-${project.id}-${Date.now().toString().slice(-6)}`;
    if (fields.includes('status')) {
      const shipDate = new Date(project.shipDate || '');
      const today = new Date();
      
      if (shipDate > today) {
        result.status = 'Scheduled';
      } else {
        result.status = 'Delivered';
      }
    }
    
    if (fields.includes('notes')) result.notes = project.deliveryNotes || '';
    
    return result;
  });
}

async function getOnTimeDeliveryReport(dateRange: any, fields: string[]): Promise<any[]> {
  // Generate metrics about on-time delivery performance
  
  // Get all projects delivered in date range
  const deliveredProjects = await getDeliveredProjectsReport(dateRange, ['project_id', 'project_name', 'ship_date', 'status']);
  
  // Count on-time vs delayed deliveries
  let onTimeCount = 0;
  let delayedCount = 0;
  
  deliveredProjects.forEach(project => {
    if (project.status === 'On-Time Delivery') {
      onTimeCount++;
    } else if (project.status === 'Delayed Delivery') {
      delayedCount++;
    }
  });
  
  const totalDeliveries = deliveredProjects.length;
  const onTimeRate = totalDeliveries > 0 ? (onTimeCount / totalDeliveries) * 100 : 0;
  
  // Return a summary report
  return [{
    metric: 'On-Time Delivery Rate',
    value: `${Math.round(onTimeRate)}%`,
    total_deliveries: totalDeliveries,
    on_time_deliveries: onTimeCount,
    delayed_deliveries: delayedCount,
    date_range_start: dateRange.startDate,
    date_range_end: dateRange.endDate
  }];
}

async function getShippingDetailsReport(dateRange: any, fields: string[]): Promise<any[]> {
  // Similar to delivery tracking but with more shipping details
  return getDeliveryTrackingReport(dateRange, fields);
}