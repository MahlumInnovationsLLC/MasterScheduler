import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatDate } from './utils';

interface ProjectForExport {
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
  // Filter out delivered projects
  const nonDeliveredProjects = projects.filter(project => {
    // Check if project has delivered status in rawData or other indicators
    return !project.rawData?.status?.toLowerCase().includes('delivered');
  });

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
  const exportData = nonDeliveredProjects.map(project => {
    const row: any = {
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
      
      row[columnName] = value ? formatDate(value as string) : '';
    });

    // Add notes at the end
    row['Notes'] = project.notes || '';

    return row;
  });

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = [
    { wch: 15 }, // Project Number
    { wch: 40 }, // Project Name
    { wch: 12 }, // Location
    { wch: 15 }, // PM Owner
    { wch: 10 }, // Progress %
    ...dateColumns.map(() => ({ wch: 15 })), // Date columns
    { wch: 50 }, // Notes
  ];
  ws['!cols'] = colWidths;

  // Apply formatting
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  // Header row formatting
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellRef]) continue;
    
    ws[cellRef].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "366092" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
  }

  // Data row formatting with alternating colors
  for (let row = 1; row <= range.e.r; row++) {
    const isEvenRow = row % 2 === 0;
    const fillColor = isEvenRow ? "F8F9FA" : "FFFFFF";
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellRef]) continue;
      
      ws[cellRef].s = {
        fill: { fgColor: { rgb: fillColor } },
        border: {
          top: { style: "thin", color: { rgb: "E0E0E0" } },
          bottom: { style: "thin", color: { rgb: "E0E0E0" } },
          left: { style: "thin", color: { rgb: "E0E0E0" } },
          right: { style: "thin", color: { rgb: "E0E0E0" } }
        },
        alignment: { vertical: "center" }
      };

      // Special formatting for progress column
      const colHeader = exportData[0] ? Object.keys(exportData[0])[col] : '';
      if (colHeader === 'Progress %') {
        const cellValue = ws[cellRef].v;
        if (typeof cellValue === 'number') {
          if (cellValue >= 80) {
            ws[cellRef].s.fill = { fgColor: { rgb: "C8E6C9" } }; // Green
          } else if (cellValue >= 50) {
            ws[cellRef].s.fill = { fgColor: { rgb: "FFF9C4" } }; // Yellow
          } else {
            ws[cellRef].s.fill = { fgColor: { rgb: "FFCDD2" } }; // Red
          }
        }
      }
    }
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Projects');

  // Generate Excel file and download
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const timestamp = new Date().toISOString().split('T')[0];
  saveAs(data, `${filename}-${timestamp}.xlsx`);
}