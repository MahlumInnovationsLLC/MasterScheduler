import { Request, Response } from 'express';
import { format } from 'date-fns';
import { DatabaseStorage } from '../storage';
import { db } from '../db';

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

// Initialize database storage
const storage = new DatabaseStorage();

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
    const requestData = req.body as ExportRequestData;
    const { module, subType, dateRange, format, fields } = requestData;
    
    console.log(`Exporting ${module}/${subType} report in ${format} format`);
    console.log('Date range:', dateRange);
    console.log('Selected fields:', fields);
    
    // Get real data from database based on module and subtype
    const data = await fetchRealData(module, subType, dateRange, fields);
    
    // Based on the requested format, generate and return the appropriate file
    switch (format) {
      case 'csv':
        return generateCSV(data, fields, res, `${module}-${subType}`);
      case 'pdf':
        return generatePDF(data, fields, res, `${module}-${subType}`);
      case 'docx':
        return generateDOCX(data, fields, res, `${module}-${subType}`);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    return res.status(500).send(`Error exporting report: ${(error as Error).message || 'Unknown error'}`);
  }
}

// Function to fetch real data from the database based on module and subtype
async function fetchRealData(module: string, subType: string, dateRange: { startDate: string, endDate: string }, fields: string[]): Promise<any[]> {
  // Parse date range
  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);
  
  console.log(`Fetching real data for ${module}/${subType} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  // Fetch data based on module type
  try {
    switch (module) {
      case 'financial':
        return await fetchFinancialData(subType, startDate, endDate, fields);
      case 'manufacturing':
        return await fetchManufacturingData(subType, startDate, endDate, fields);
      case 'project':
        return await fetchProjectData(subType, startDate, endDate, fields);
      case 'delivery':
        return await fetchDeliveryData(subType, startDate, endDate, fields);
      default:
        return [{
          message: 'No data available for the selected module'
        }];
    }
  } catch (error) {
    console.error(`Error fetching ${module}/${subType} data:`, error);
    throw new Error(`Failed to fetch data for ${module}/${subType}: ${(error as Error).message}`);
  }
}

// Function to fetch real financial data from the database
async function fetchFinancialData(subType: string, startDate: Date, endDate: Date, fields: string[]): Promise<any[]> {
  console.log(`Fetching financial data for ${subType}, fields:`, fields);
  
  switch (subType) {
    case 'billing-milestones':
      // Fetch billing milestones
      const milestones = await storage.getBillingMilestones();
      
      return milestones
        .filter((milestone: any) => {
          // Apply date filter if target invoice date exists
          if (milestone.targetInvoiceDate) {
            const milestoneDate = new Date(milestone.targetInvoiceDate);
            return milestoneDate >= startDate && milestoneDate <= endDate;
          }
          return true; // Include milestones without dates
        })
        .map((milestone: any) => {
          const result: Record<string, any> = {};
          
          // Map database fields to requested export fields
          fields.forEach(field => {
            switch(field) {
              case 'project_number':
                result[field] = milestone.project?.projectNumber || 'N/A';
                break;
              case 'project_name':
                result[field] = milestone.project?.name || 'N/A';
                break;
              case 'milestone_name':
                result[field] = milestone.name || 'N/A';
                break;
              case 'invoice_date':
                result[field] = milestone.targetInvoiceDate ? new Date(milestone.targetInvoiceDate) : null;
                break;
              case 'amount':
                result[field] = milestone.amount || 'N/A';
                break;
              case 'status':
                result[field] = milestone.status || 'N/A';
                break;
              case 'notes':
                result[field] = milestone.notes || '';
                break;
              default:
                // Try to get the value directly from the milestone object
                result[field] = milestone[field] !== undefined ? milestone[field] : 'N/A';
            }
          });
          
          return result;
        });
    
    case 'invoices':
      // Fetch billing milestones that are invoiced
      // Fetch all billing milestones and filter for 'invoiced' status
      const allMilestones = await storage.getBillingMilestones();
      const invoices = allMilestones.filter(milestone => milestone.status === 'invoiced');
      
      return invoices
        .filter((invoice: any) => {
          // Apply date filter if target invoice date exists
          if (invoice.targetInvoiceDate) {
            const invoiceDate = new Date(invoice.targetInvoiceDate);
            return invoiceDate >= startDate && invoiceDate <= endDate;
          }
          return true; // Include invoices without dates
        })
        .map((invoice: any) => {
          const result: Record<string, any> = {};
          
          // Map database fields to requested export fields
          fields.forEach(field => {
            switch(field) {
              case 'project_number':
                result[field] = invoice.project?.projectNumber || 'N/A';
                break;
              case 'project_name':
                result[field] = invoice.project?.name || 'N/A';
                break;
              case 'milestone_name':
                result[field] = invoice.name || 'N/A';
                break;
              case 'invoice_date':
                result[field] = invoice.targetInvoiceDate ? new Date(invoice.targetInvoiceDate) : null;
                break;
              case 'amount':
                result[field] = invoice.amount || 'N/A';
                break;
              case 'status':
                result[field] = invoice.status || 'N/A';
                break;
              case 'notes':
                result[field] = invoice.notes || '';
                break;
              default:
                // Try to get the value directly from the invoice object
                result[field] = invoice[field] !== undefined ? invoice[field] : 'N/A';
            }
          });
          
          return result;
        });
      
    case 'payments':
      // Fetch billing milestones that are paid
      // Fetch all billing milestones and filter for 'paid' status
      const allMilestonesForPayment = await storage.getBillingMilestones();
      const payments = allMilestonesForPayment.filter(milestone => milestone.status === 'paid');
      
      return payments
        .filter((payment: any) => {
          // Apply date filter if target invoice date exists
          if (payment.targetInvoiceDate) {
            const paymentDate = new Date(payment.targetInvoiceDate);
            return paymentDate >= startDate && paymentDate <= endDate;
          }
          return true; // Include payments without dates
        })
        .map((payment: any) => {
          const result: Record<string, any> = {};
          
          // Map database fields to requested export fields
          fields.forEach(field => {
            switch(field) {
              case 'project_number':
                result[field] = payment.project?.projectNumber || 'N/A';
                break;
              case 'project_name':
                result[field] = payment.project?.name || 'N/A';
                break;
              case 'milestone_name':
                result[field] = payment.name || 'N/A';
                break;
              case 'invoice_date':
              case 'payment_date':
                result[field] = payment.targetInvoiceDate ? new Date(payment.targetInvoiceDate) : null;
                break;
              case 'amount':
                result[field] = payment.amount || 'N/A';
                break;
              case 'status':
                result[field] = payment.status || 'N/A';
                break;
              case 'notes':
                result[field] = payment.notes || '';
                break;
              default:
                // Try to get the value directly from the payment object
                result[field] = payment[field] !== undefined ? payment[field] : 'N/A';
            }
          });
          
          return result;
        });
      
    default:
      return [{
        message: `No data available for financial ${subType}`
      }];
  }
}

// Function to fetch real manufacturing data from the database
async function fetchManufacturingData(subType: string, startDate: Date, endDate: Date, fields: string[]): Promise<any[]> {
  console.log(`Fetching manufacturing data for ${subType}, fields:`, fields);
  
  switch (subType) {
    case 'bay-schedules':
      // Fetch manufacturing schedules
      const schedules = await storage.getManufacturingSchedules();
      const bays = await storage.getManufacturingBays();
      const projects = await storage.getProjects();
      
      return schedules
        .filter(schedule => {
          // Apply date filter
          const scheduleStartDate = new Date(schedule.startDate);
          const scheduleEndDate = new Date(schedule.endDate);
          
          // Include schedules that overlap with the date range
          return (scheduleStartDate <= endDate && scheduleEndDate >= startDate);
        })
        .map(schedule => {
          const result: Record<string, any> = {};
          const bay = bays.find(b => b.id === schedule.bayId);
          const project = projects.find(p => p.id === schedule.projectId);
          
          // Calculate duration in days
          const scheduleStartDate = new Date(schedule.startDate);
          const scheduleEndDate = new Date(schedule.endDate);
          const durationDays = Math.ceil((scheduleEndDate.getTime() - scheduleStartDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Map database fields to requested export fields
          fields.forEach(field => {
            switch(field) {
              case 'bay_name':
                result[field] = bay?.name || 'N/A';
                break;
              case 'bay_team':
                result[field] = bay?.team || 'N/A';
                break;  
              case 'project_name':
                result[field] = project?.name || 'N/A';
                break;
              case 'project_number':
                result[field] = project?.projectNumber || 'N/A';
                break;
              case 'start_date':
                result[field] = scheduleStartDate;
                break;
              case 'end_date':
                result[field] = scheduleEndDate;
                break;
              case 'duration':
                result[field] = durationDays;
                break;
              case 'total_hours':
                result[field] = schedule.totalHours || 'N/A';
                break;
              case 'status':
                result[field] = project?.status || 'N/A';
                break;
              default:
                // Try to get the value directly from the schedule object
                result[field] = schedule[field] !== undefined ? schedule[field] : 'N/A';
            }
          });
          
          return result;
        });
    
    case 'bay-utilization':
      // Fetch manufacturing bays
      const allBays = await storage.getManufacturingBays();
      const allSchedules = await storage.getManufacturingSchedules();
      
      return allBays.map(bay => {
        const result: Record<string, any> = {};
        
        // Get all schedules for this bay
        const baySchedules = allSchedules.filter(s => s.bayId === bay.id);
        
        // Calculate utilization based on schedules in the date range
        const relevantSchedules = baySchedules.filter(schedule => {
          const scheduleStartDate = new Date(schedule.startDate);
          const scheduleEndDate = new Date(schedule.endDate);
          return (scheduleStartDate <= endDate && scheduleEndDate >= startDate);
        });
        
        // Calculate total scheduled hours within the date range
        const totalScheduledHours = relevantSchedules.reduce((sum, schedule) => {
          return sum + (schedule.totalHours || 0);
        }, 0);
        
        // Calculate available hours (assuming 40-hour weeks)
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalWeeks = totalDays / 7;
        const availableHours = totalWeeks * 40;
        
        // Calculate utilization percentage
        const utilization = availableHours > 0 ? (totalScheduledHours / availableHours) * 100 : 0;
        
        // Map fields to the result
        fields.forEach(field => {
          switch(field) {
            case 'bay_name':
              result[field] = bay.name || 'N/A';
              break;
            case 'team':
              result[field] = bay.team || 'N/A';
              break;
            case 'total_projects':
              result[field] = relevantSchedules.length;
              break;
            case 'scheduled_hours':
              result[field] = totalScheduledHours;
              break;
            case 'available_hours':
              result[field] = availableHours;
              break;
            case 'utilization_percentage':
              result[field] = `${utilization.toFixed(2)}%`;
              break;
            default:
              // Try to get the value directly from the bay object
              result[field] = bay[field] !== undefined ? bay[field] : 'N/A';
          }
        });
        
        return result;
      });
    
    default:
      return [{
        message: `No data available for manufacturing ${subType}`
      }];
  }
}

// Function to fetch real project data from the database
async function fetchProjectData(subType: string, startDate: Date, endDate: Date, fields: string[]): Promise<any[]> {
  console.log(`Fetching project data for ${subType}, fields:`, fields);
  
  switch (subType) {
    case 'overview':
      // Fetch all projects
      const projects = await storage.getProjects();
      const schedules = await storage.getManufacturingSchedules();
      
      return projects
        .filter(project => {
          // Include projects that have schedules in the date range or projects
          // created within the date range
          const projectSchedules = schedules.filter(s => s.projectId === project.id);
          const hasScheduleInRange = projectSchedules.some(s => {
            const sStartDate = new Date(s.startDate);
            const sEndDate = new Date(s.endDate);
            return (sStartDate <= endDate && sEndDate >= startDate);
          });
          
          const projectCreatedDate = new Date(project.createdAt || 0);
          const createdInRange = projectCreatedDate >= startDate && projectCreatedDate <= endDate;
          
          return hasScheduleInRange || createdInRange;
        })
        .map(project => {
          const result: Record<string, any> = {};
          
          // Get project schedules
          const projectSchedules = schedules.filter(s => s.projectId === project.id);
          
          // Calculate total hours from schedules
          const totalHours = projectSchedules.reduce((sum, schedule) => {
            return sum + (schedule.totalHours || 0);
          }, 0);
          
          // Map fields to the result
          fields.forEach(field => {
            switch(field) {
              case 'project_number':
                result[field] = project.projectNumber || 'N/A';
                break;
              case 'project_name':
                result[field] = project.name || 'N/A';
                break;
              case 'customer':
                result[field] = project.customer || 'N/A';
                break;
              case 'status':
                result[field] = project.status || 'N/A';
                break;
              case 'start_date':
                // Find earliest schedule start date
                const startDates = projectSchedules.map(s => new Date(s.startDate));
                result[field] = startDates.length > 0 ? new Date(Math.min(...startDates.map(d => d.getTime()))) : null;
                break;
              case 'end_date':
              case 'deadline':
                // Find latest schedule end date
                const endDates = projectSchedules.map(s => new Date(s.endDate));
                result[field] = endDates.length > 0 ? new Date(Math.max(...endDates.map(d => d.getTime()))) : null;
                break;
              case 'ship_date':
                result[field] = project.shipDate ? new Date(project.shipDate) : null;
                break;
              case 'total_hours':
                result[field] = totalHours;
                break;
              case 'budget':
                result[field] = project.budget || 'N/A';
                break;
              case 'manager':
                result[field] = project.projectManager || 'N/A';
                break;
              default:
                // Try to get the value directly from the project object
                result[field] = project[field] !== undefined ? project[field] : 'N/A';
            }
          });
          
          return result;
        });
    
    case 'status':
      // Fetch all projects
      const statusProjects = await storage.getProjects();
      const projectSchedules = await storage.getManufacturingSchedules();
      
      return statusProjects
        .filter(project => {
          // Include projects that have schedules in the date range
          const schedules = projectSchedules.filter(s => s.projectId === project.id);
          return schedules.some(s => {
            const sStartDate = new Date(s.startDate);
            const sEndDate = new Date(s.endDate);
            return (sStartDate <= endDate && sEndDate >= startDate);
          });
        })
        .map(project => {
          const result: Record<string, any> = {};
          
          // Get all schedules for this project
          const schedules = projectSchedules.filter(s => s.projectId === project.id);
          
          // Calculate overall progress based on date ranges
          let progress = 0;
          if (schedules.length > 0) {
            const sortedStartDates = schedules.map(s => new Date(s.startDate)).sort((a, b) => a.getTime() - b.getTime());
            const sortedEndDates = schedules.map(s => new Date(s.endDate)).sort((a, b) => b.getTime() - a.getTime());
            
            const projectStartDate = sortedStartDates[0];
            const projectEndDate = sortedEndDates[0];
            
            const totalDuration = projectEndDate.getTime() - projectStartDate.getTime();
            if (totalDuration > 0) {
              const elapsed = Math.min(Date.now() - projectStartDate.getTime(), totalDuration);
              progress = (elapsed / totalDuration) * 100;
            }
          }
          
          // Map fields to the result
          fields.forEach(field => {
            switch(field) {
              case 'project_number':
                result[field] = project.projectNumber || 'N/A';
                break;
              case 'project_name':
                result[field] = project.name || 'N/A';
                break;
              case 'status':
                result[field] = project.status || 'N/A';
                break;
              case 'progress':
                result[field] = `${progress.toFixed(2)}%`;
                break;
              case 'days_remaining':
                // Calculate days remaining based on project schedules
                const latestEndDate = schedules.reduce((latest, s) => {
                  const endDate = new Date(s.endDate);
                  return endDate > latest ? endDate : latest;
                }, new Date(0));
                
                const daysRemaining = Math.ceil((latestEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                result[field] = daysRemaining > 0 ? daysRemaining : 0;
                break;
              case 'milestones_complete':
                // Calculate from billing milestones
                result[field] = 'N/A';
                break;
              default:
                // Try to get the value directly from the project object
                result[field] = project[field] !== undefined ? project[field] : 'N/A';
            }
          });
          
          return result;
        });
      
    case 'timeline':
      // Fetch all projects
      const timelineProjects = await storage.getProjects();
      const timelineSchedules = await storage.getManufacturingSchedules();
      
      return timelineProjects
        .filter(project => {
          // Include projects with relevant schedules or with a ship date in range
          const schedules = timelineSchedules.filter(s => s.projectId === project.id);
          const hasScheduleInRange = schedules.some(s => {
            const sStartDate = new Date(s.startDate);
            const sEndDate = new Date(s.endDate);
            return (sStartDate <= endDate && sEndDate >= startDate);
          });
          
          const shipDate = project.shipDate ? new Date(project.shipDate) : null;
          const shipDateInRange = shipDate && shipDate >= startDate && shipDate <= endDate;
          
          return hasScheduleInRange || shipDateInRange;
        })
        .map(project => {
          const result: Record<string, any> = {};
          
          // Get project schedules
          const schedules = timelineSchedules.filter(s => s.projectId === project.id);
          
          // Get the earliest start date and latest end date from schedules
          const sortedStartDates = schedules.map(s => new Date(s.startDate)).sort((a, b) => a.getTime() - b.getTime());
          const sortedEndDates = schedules.map(s => new Date(s.endDate)).sort((a, b) => b.getTime() - a.getTime());
          
          const projectStartDate = sortedStartDates.length > 0 ? sortedStartDates[0] : null;
          const projectEndDate = sortedEndDates.length > 0 ? sortedEndDates[0] : null;
          
          // Map fields to the result
          fields.forEach(field => {
            switch(field) {
              case 'project_number':
                result[field] = project.projectNumber || 'N/A';
                break;
              case 'project_name':
                result[field] = project.name || 'N/A';
                break;
              case 'start_date':
                result[field] = projectStartDate;
                break;
              case 'fab_start_date':
                result[field] = projectStartDate; // Actual phase dates not stored separately
                break;
              case 'paint_start_date':
                // Estimate paint start date (assumption: after fab)
                result[field] = projectStartDate ? new Date(projectStartDate.getTime() + (86400000 * 7)) : null;
                break;
              case 'production_start_date':
                result[field] = project.productionStartDate ? new Date(project.productionStartDate) : null;
                break;
              case 'ntc_testing_date':
                result[field] = project.ntcTestingDate ? new Date(project.ntcTestingDate) : null;
                break;
              case 'qc_date':
                result[field] = project.qcDate ? new Date(project.qcDate) : null;
                break;
              case 'ship_date':
                result[field] = project.shipDate ? new Date(project.shipDate) : null;
                break;
              case 'status':
                result[field] = project.status || 'N/A';
                break;
              default:
                // Try to get the value directly from the project object
                result[field] = project[field] !== undefined ? project[field] : 'N/A';
            }
          });
          
          return result;
        });
      
    default:
      return [{
        message: `No data available for project ${subType}`
      }];
  }
}

// Function to fetch real delivery data from the database
async function fetchDeliveryData(subType: string, startDate: Date, endDate: Date, fields: string[]): Promise<any[]> {
  console.log(`Fetching delivery data for ${subType}, fields:`, fields);
  
  switch (subType) {
    case 'shipments':
      // Fetch projects with shipment data
      const projects = await storage.getProjects();
      
      return projects
        .filter(project => {
          // Filter projects with ship dates within the range
          const shipDate = project.shipDate ? new Date(project.shipDate) : null;
          return shipDate && shipDate >= startDate && shipDate <= endDate;
        })
        .map(project => {
          const result: Record<string, any> = {};
          
          // Map fields to the result
          fields.forEach(field => {
            switch(field) {
              case 'project_number':
                result[field] = project.projectNumber || 'N/A';
                break;
              case 'project_name':
                result[field] = project.name || 'N/A';
                break;
              case 'ship_date':
                result[field] = project.shipDate ? new Date(project.shipDate) : null;
                break;
              case 'carrier':
                result[field] = project.carrier || 'N/A';
                break;
              case 'tracking_number':
                result[field] = project.trackingNumber || 'N/A';
                break;
              case 'destination':
                result[field] = project.shipDestination || project.location || 'N/A';
                break;
              case 'status':
                result[field] = project.shipmentStatus || project.status || 'N/A';
                break;
              case 'customer':
                result[field] = project.customer || 'N/A';
                break;
              default:
                // Try to get the value directly from the project object
                if (project.hasOwnProperty(field)) {
                  result[field] = project[field];
                } else {
                  result[field] = 'N/A';
                }
            }
          });
          
          return result;
        });
    
    default:
      return [{
        message: `No data available for delivery ${subType}`
      }];
  }
}

// Clean up - we no longer need these sample data functions since we're using real data
function generateFinancialSampleData(subType: string, fields: string[]): any[] {
  const sampleData = [];
  
  // Generate 10 sample records
  for (let i = 1; i <= 10; i++) {
    const record: Record<string, any> = {};
    
    if (fields.includes('project_id')) record.project_id = 100 + i;
    if (fields.includes('project_number')) record.project_number = `PRJ-${1000 + i}`;
    if (fields.includes('project_name')) record.project_name = `Sample Project ${i}`;
    if (fields.includes('milestone_id')) record.milestone_id = 200 + i;
    if (fields.includes('milestone_name')) record.milestone_name = `Milestone ${i}`;
    if (fields.includes('amount')) record.amount = `$${(Math.random() * 100000).toFixed(2)}`;
    if (fields.includes('status')) {
      const statuses = ['upcoming', 'invoiced', 'paid', 'delayed'];
      record.status = statuses[Math.floor(Math.random() * statuses.length)];
    }
    if (fields.includes('target_date')) {
      const date = new Date();
      date.setDate(date.getDate() + (i * 7));
      record.target_date = format(date, 'yyyy-MM-dd');
    }
    if (fields.includes('actual_date')) {
      const date = new Date();
      date.setDate(date.getDate() + (i * 7) - 2);
      record.actual_date = format(date, 'yyyy-MM-dd');
    }
    if (fields.includes('payment_date')) {
      const date = new Date();
      date.setDate(date.getDate() + (i * 7) + 10);
      record.payment_date = format(date, 'yyyy-MM-dd');
    }
    
    sampleData.push(record);
  }
  
  return sampleData;
}

// Generate sample manufacturing data
function generateManufacturingSampleData(subType: string, fields: string[]): any[] {
  const sampleData = [];
  
  // Generate 10 sample records
  for (let i = 1; i <= 10; i++) {
    const record: Record<string, any> = {};
    
    if (fields.includes('bay_id')) record.bay_id = i;
    if (fields.includes('bay_name')) record.bay_name = `Bay ${i}`;
    if (fields.includes('project_id')) record.project_id = 100 + i;
    if (fields.includes('project_name')) record.project_name = `Sample Project ${i}`;
    if (fields.includes('start_date')) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 5));
      record.start_date = format(date, 'yyyy-MM-dd');
    }
    if (fields.includes('end_date')) {
      const date = new Date();
      date.setDate(date.getDate() + (i * 10));
      record.end_date = format(date, 'yyyy-MM-dd');
    }
    if (fields.includes('duration')) record.duration = Math.floor(Math.random() * 30) + 5;
    if (fields.includes('total_hours')) record.total_hours = Math.floor(Math.random() * 200) + 20;
    if (fields.includes('utilization_rate')) record.utilization_rate = `${Math.floor(Math.random() * 100)}%`;
    if (fields.includes('status')) {
      const statuses = ['Active', 'Complete', 'Scheduled', 'In Progress'];
      record.status = statuses[Math.floor(Math.random() * statuses.length)];
    }
    
    sampleData.push(record);
  }
  
  return sampleData;
}

// Generate sample project data
function generateProjectSampleData(subType: string, fields: string[]): any[] {
  const sampleData = [];
  
  // Generate 10 sample records
  for (let i = 1; i <= 10; i++) {
    const record: Record<string, any> = {};
    
    if (fields.includes('project_id')) record.project_id = 100 + i;
    if (fields.includes('project_number')) record.project_number = `PRJ-${1000 + i}`;
    if (fields.includes('project_name')) record.project_name = `Sample Project ${i}`;
    if (fields.includes('status')) {
      const statuses = ['Active', 'On Hold', 'Completed', 'Delayed'];
      record.status = statuses[Math.floor(Math.random() * statuses.length)];
    }
    if (fields.includes('risk_level')) {
      const riskLevels = ['Low', 'Medium', 'High'];
      record.risk_level = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    }
    if (fields.includes('start_date')) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 15));
      record.start_date = format(date, 'yyyy-MM-dd');
    }
    if (fields.includes('estimated_completion')) {
      const date = new Date();
      date.setDate(date.getDate() + (i * 15));
      record.estimated_completion = format(date, 'yyyy-MM-dd');
    }
    if (fields.includes('percent_complete')) record.percent_complete = `${Math.floor(Math.random() * 100)}%`;
    if (fields.includes('ship_date')) {
      const date = new Date();
      date.setDate(date.getDate() + (i * 20));
      record.ship_date = format(date, 'yyyy-MM-dd');
    }
    if (fields.includes('total_hours')) record.total_hours = Math.floor(Math.random() * 500) + 50;
    
    sampleData.push(record);
  }
  
  return sampleData;
}

// Generate sample delivery data
function generateDeliverySampleData(subType: string, fields: string[]): any[] {
  const sampleData = [];
  
  // Generate 10 sample records
  for (let i = 1; i <= 10; i++) {
    const record: Record<string, any> = {};
    
    if (fields.includes('tracking_id')) record.tracking_id = `TRK-${2000 + i}`;
    if (fields.includes('project_id')) record.project_id = 100 + i;
    if (fields.includes('project_name')) record.project_name = `Sample Project ${i}`;
    if (fields.includes('scheduled_date')) {
      const date = new Date();
      date.setDate(date.getDate() + (i * 5));
      record.scheduled_date = format(date, 'yyyy-MM-dd');
    }
    if (fields.includes('actual_date')) {
      const date = new Date();
      date.setDate(date.getDate() + (i * 5) + (Math.random() > 0.7 ? 2 : 0));
      record.actual_date = format(date, 'yyyy-MM-dd');
    }
    if (fields.includes('carrier')) {
      const carriers = ['Company Truck', 'FedEx', 'UPS', 'DHL', 'Customer Pickup'];
      record.carrier = carriers[Math.floor(Math.random() * carriers.length)];
    }
    if (fields.includes('tracking_number')) record.tracking_number = `SHIP-${Math.floor(Math.random() * 1000000)}`;
    if (fields.includes('status')) {
      const statuses = ['Scheduled', 'In Transit', 'Delivered', 'Delayed'];
      record.status = statuses[Math.floor(Math.random() * statuses.length)];
    }
    if (fields.includes('notes')) record.notes = `Delivery notes for project ${i}`;
    
    sampleData.push(record);
  }
  
  return sampleData;
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
  
  // Set response headers for proper file download
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(reportName)}-${format(new Date(), 'yyyy-MM-dd')}.csv"`);
  res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
  res.setHeader('Cache-Control', 'no-cache');
  
  // Send the CSV data
  return res.status(200).send(csvContent);
}

// Function to generate PDF output (placeholder for now)
async function generatePDF(data: any[], fields: string[], res: Response, reportName: string) {
  // For now, return CSV but with PDF headers to trigger download
  console.log('PDF generation requested but not fully implemented, sending CSV with PDF headers');
  
  // Generate CSV content (same as CSV function)
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
  
  // Set response headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(reportName)}-${format(new Date(), 'yyyy-MM-dd')}.pdf"`);
  res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
  res.setHeader('Cache-Control', 'no-cache');
  
  return res.status(200).send(csvContent);
}

// Function to generate DOCX output (placeholder for now)
async function generateDOCX(data: any[], fields: string[], res: Response, reportName: string) {
  // For now, return CSV but with DOCX headers to trigger download
  console.log('DOCX generation requested but not fully implemented, sending CSV with DOCX headers');
  
  // Generate CSV content (same as CSV function)
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
  
  // Set response headers for DOCX download
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(reportName)}-${format(new Date(), 'yyyy-MM-dd')}.docx"`);
  res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
  res.setHeader('Cache-Control', 'no-cache');
  
  return res.status(200).send(csvContent);
}