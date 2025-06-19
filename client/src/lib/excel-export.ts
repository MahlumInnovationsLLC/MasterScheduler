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

    // Define date columns to include
    const dateColumns = [
      'contractDate',
      'startDate', 
      'estimatedCompletionDate',
      'actualCompletionDate',
      'deliveryDate',
      'shipDate',
      'chassisETA',
      'mechShop',
      'qcStartDate',
      'executiveReviewDate'
    ];

    // Prepare data for export - only date columns plus key identifiers and notes
    const exportData = projects.map((project, index) => {
      console.log(`Processing project ${index + 1}:`, project.projectNumber);
      
      const row: Record<string, any> = {
        'Project Number': project.projectNumber || '',
        'Project Name': project.name || '',
        'Location': project.location || '',
        'PM Owner': project.pmOwner || '',
        'Progress %': project.percentComplete || 0,
      };

      // Add date columns
      dateColumns.forEach(dateCol => {
        const value = project[dateCol as keyof ProjectForExport];
        const columnName = dateCol
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();
        
        // Format date or leave empty
        if (value) {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              row[columnName] = date.toLocaleDateString();
            } else {
              row[columnName] = value;
            }
          } catch {
            row[columnName] = value;
          }
        } else {
          row[columnName] = '';
        }
      });

      // Add notes at the end
      row['Notes'] = project.notes || '';

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