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
  const exportData = projects.map(project => {
    const row: Record<string, any> = {
      'Project Number': project.projectNumber,
      'Project Name': project.name,
      'Location': project.location,
      'PM Owner': project.pmOwner,
      'Progress %': project.percentComplete,
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
          row[columnName] = date.toLocaleDateString();
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

  // Create CSV content
  const headers = Object.keys(exportData[0] || {});
  const csvContent = [
    headers.join(','),
    ...exportData.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');

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
}