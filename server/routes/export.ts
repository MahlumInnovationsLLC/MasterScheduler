import { Request, Response } from 'express';
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
    
    // For the initial implementation, we'll generate sample data based on the requested module and fields
    const sampleData = generateSampleData(module, subType, fields);
    
    // Based on the requested format, generate and return the appropriate file
    switch (format) {
      case 'csv':
        return generateCSV(sampleData, fields, res, `${module}-${subType}`);
      case 'pdf':
        return generatePDF(sampleData, fields, res, `${module}-${subType}`);
      case 'docx':
        return generateDOCX(sampleData, fields, res, `${module}-${subType}`);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    return res.status(500).send(`Error exporting report: ${(error as Error).message || 'Unknown error'}`);
  }
}

// Function to generate sample data based on the requested module and fields
function generateSampleData(module: string, subType: string, fields: string[]): any[] {
  // Sample data based on module
  switch (module) {
    case 'financial':
      return generateFinancialSampleData(subType, fields);
    case 'manufacturing':
      return generateManufacturingSampleData(subType, fields);
    case 'project':
      return generateProjectSampleData(subType, fields);
    case 'delivery':
      return generateDeliverySampleData(subType, fields);
    default:
      return [{
        message: 'No data available for the selected module'
      }];
  }
}

// Generate sample financial data
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