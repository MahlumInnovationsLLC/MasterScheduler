export interface ProjectForExport {
  id: number;
  projectNumber: string;
  name: string;
  location: string;
  pmOwner: string;
  percentComplete: number;
  contractDate: string | null;
  startDate: string | null;
  estimatedCompletionDate: string | null;
  actualCompletionDate: string | null;
  deliveryDate: string | null;
  shipDate: string | null;
  chassisETA: string | null;
  mechShop: string | null;
  qcStartDate: string | null;
  executiveReviewDate: string | null;
  notes: string | null;
  rawData?: Record<string, any>;
}

export function exportProjectsToExcel(projects: ProjectForExport[], filename: string = 'projects-export') {
  try {
    console.log('Export function called with projects:', projects.length);
    
    if (!projects || projects.length === 0) {
      throw new Error('No projects provided for export');
    }

    // Define columns to include based on currently visible columns
    // Only including the visible columns from the table
    const visibleColumns = [
      { key: 'projectNumber', label: 'Project Number' },
      { key: 'name', label: 'Project Name' },
      { key: 'pmOwner', label: 'PM Owner' },
      { key: 'percentComplete', label: 'Progress %' },
      { key: 'contractDate', label: 'Contract Date' },
      { key: 'chassisETA', label: 'Chassis ETA' },
      { key: 'mechShop', label: 'Mech Shop' },
      { key: 'qcStartDate', label: 'QC Start Date' },
      { key: 'shipDate', label: 'Ship Date' },
      { key: 'deliveryDate', label: 'Delivery Date' },
      { key: 'executiveReviewDate', label: 'Executive Review Date' },
      { key: 'location', label: 'Location' },
      { key: 'notes', label: 'Notes' }
    ];

    // Prepare data for export - only visible columns
    const exportData = projects.map((project, index) => {
      console.log(`Processing project ${index + 1}:`, project.projectNumber);
      
      const row: Record<string, any> = {};

      // Add each visible column
      visibleColumns.forEach(col => {
        const value = project[col.key as keyof ProjectForExport];
        
        if (col.key === 'percentComplete') {
          row[col.label] = value || 0;
        } else if (col.key === 'contractDate' || col.key === 'chassisETA' || col.key === 'qcStartDate' || 
                   col.key === 'shipDate' || col.key === 'deliveryDate' || col.key === 'executiveReviewDate') {
          // Format date columns
          if (value) {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                row[col.label] = date.toLocaleDateString();
              } else {
                row[col.label] = value;
              }
            } catch {
              row[col.label] = value;
            }
          } else {
            row[col.label] = '';
          }
        } else {
          row[col.label] = value || '';
        }
      });

      return row;
    });

    console.log('Export data prepared:', exportData.length, 'rows');

    if (exportData.length === 0) {
      throw new Error('No data to export after processing');
    }

    // Create CSV content
    const headers = Object.keys(exportData[0] || {});
    if (headers.length === 0) {
      throw new Error('No headers found in export data');
    }

    console.log('Headers:', headers);

    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value !== null && value !== undefined ? value : '';
        }).join(',')
      )
    ].join('\n');

    console.log('CSV content length:', csvContent.length);

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `${filename}-${timestamp}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    console.log('Export completed successfully');
  } catch (error) {
    console.error('Export function error:', error);
    throw error;
  }
}