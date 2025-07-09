import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import type { Project, ManufacturingSchedule, ManufacturingBay } from '@shared/schema';

interface ScheduleReportProps {
  project: Project;
  manufacturingSchedule?: ManufacturingSchedule;
  bay?: ManufacturingBay;
}

export function ScheduleReport({ project, manufacturingSchedule, bay }: ScheduleReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Set document metadata
      pdf.setProperties({
        title: `${project.projectNumber} - ${project.name} - Schedule Report`,
        subject: 'Manufacturing Schedule Report',
        author: 'TIER IV PRO',
        keywords: 'manufacturing, schedule, project',
        creator: 'TIER IV PRO System'
      });

      // Title page
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${project.projectNumber}: ${project.name}`, pdf.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Manufacturing Schedule Report', pdf.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy')}`, pdf.internal.pageSize.getWidth() / 2, 50, { align: 'center' });

      // Project Information Section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Project Information', 20, 70);
      
      const projectInfo = [
        ['Project Number', project.projectNumber],
        ['Project Name', project.name],
        ['Customer', project.customer || '-'],
        ['Status', project.status || '-'],
        ['Progress', `${project.percentComplete || 0}%`],
        ['Total Hours', project.totalHours?.toString() || '-'],
        ['Bay Assignment', bay?.name || 'Unassigned']
      ];

      autoTable(pdf, {
        startY: 75,
        head: [],
        body: projectInfo,
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 'auto' }
        },
        margin: { left: 20, right: 20 }
      });

      // Timeline Milestones Section
      const timelineY = (pdf as any).lastAutoTable.finalY + 15;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Timeline Milestones', 20, timelineY);

      const milestones = [];
      
      // Gather all timeline dates
      if (project.contractDate) {
        milestones.push(['Contract Date', format(new Date(project.contractDate + 'T00:00:00'), 'MMM dd, yyyy'), '📄']);
      }
      if (project.poDroppedDate || project.startDate) {
        const date = project.poDroppedDate || project.startDate;
        milestones.push(['PO Dropped', format(new Date(date + 'T00:00:00'), 'MMM dd, yyyy'), '📋']);
      }
      if (project.fabricationStart) {
        milestones.push(['Fabrication Start', format(new Date(project.fabricationStart + 'T00:00:00'), 'MMM dd, yyyy'), '🔧']);
      }
      if (project.paintStart) {
        milestones.push(['Paint Start', format(new Date(project.paintStart + 'T00:00:00'), 'MMM dd, yyyy'), '🎨']);
      }
      if (project.assemblyStart) {
        milestones.push(['Production Start', format(new Date(project.assemblyStart + 'T00:00:00'), 'MMM dd, yyyy'), '🏭']);
      }
      if (project.itStart) {
        milestones.push(['IT Start', format(new Date(project.itStart + 'T00:00:00'), 'MMM dd, yyyy'), '💻']);
      }
      if (project.ntcTestingDate) {
        milestones.push(['NTC Testing', format(new Date(project.ntcTestingDate + 'T00:00:00'), 'MMM dd, yyyy'), '🧪']);
      }
      if (project.qcStartDate) {
        milestones.push(['QC Start', format(new Date(project.qcStartDate + 'T00:00:00'), 'MMM dd, yyyy'), '✓']);
      }
      if (project.executiveReviewDate) {
        milestones.push(['Executive Review', format(new Date(project.executiveReviewDate + 'T00:00:00'), 'MMM dd, yyyy'), '👔']);
      }
      if (project.shipDate) {
        milestones.push(['Ship Date', format(new Date(project.shipDate + 'T00:00:00'), 'MMM dd, yyyy'), '🚚']);
      }
      if (project.deliveryDate) {
        milestones.push(['Delivery Date', format(new Date(project.deliveryDate + 'T00:00:00'), 'MMM dd, yyyy'), '📦']);
      }

      if (milestones.length > 0) {
        autoTable(pdf, {
          startY: timelineY + 5,
          head: [['Milestone', 'Date', 'Icon']],
          body: milestones,
          theme: 'striped',
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255
          },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 40 },
            2: { cellWidth: 20, halign: 'center' }
          },
          margin: { left: 20, right: 20 }
        });
      }

      // Manufacturing Schedule Details
      if (manufacturingSchedule) {
        const scheduleY = (pdf as any).lastAutoTable?.finalY + 15 || timelineY + 20;
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Manufacturing Schedule Details', 20, scheduleY);

        const scheduleInfo = [
          ['Bay Assignment', bay?.name || 'Unassigned'],
          ['Start Date', format(new Date(manufacturingSchedule.startDate), 'MMM dd, yyyy')],
          ['End Date', format(new Date(manufacturingSchedule.endDate), 'MMM dd, yyyy')],
          ['Total Hours', manufacturingSchedule.totalHours?.toString() || '-'],
          ['Row Position', `Row ${(manufacturingSchedule.rowIndex || 0) + 1}`]
        ];

        autoTable(pdf, {
          startY: scheduleY + 5,
          head: [],
          body: scheduleInfo,
          theme: 'grid',
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 'auto' }
          },
          margin: { left: 20, right: 20 }
        });
      }

      // Add new page for Bay Schedule visualization
      pdf.addPage();
      
      // Wait for any animations to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to bay scheduling page to ensure we have the bay schedule visible
      const currentPath = window.location.pathname;
      const needsNavigation = !currentPath.includes('/bay-scheduling');
      
      if (needsNavigation && manufacturingSchedule) {
        // Store current location to return later
        sessionStorage.setItem('scheduleReportReturnPath', currentPath);
        
        // Navigate to bay scheduling page
        window.location.href = `/bay-scheduling?projectId=${project.id}`;
        
        // Wait for navigation and page load
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Find the bay schedule element
      const bayScheduleElement = document.querySelector('.resizable-bay-schedule, .bay-schedule-readonly, .schedule-container');
      
      if (bayScheduleElement && manufacturingSchedule) {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Bay Schedule Visualization', pdf.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
        
        // Find the specific project bar in the schedule
        const projectSelectors = [
          `[data-project-id="${project.id}"]`,
          `.project-bar[data-project="${project.id}"]`,
          `.project-${project.id}`,
          `div[title*="${project.projectNumber}"]`
        ];
        
        let projectBar = null;
        for (const selector of projectSelectors) {
          const elements = bayScheduleElement.querySelectorAll(selector);
          if (elements.length > 0) {
            projectBar = elements[0];
            break;
          }
        }
        
        if (projectBar) {
          // Find the parent bay row
          const bayRow = projectBar.closest('.bay-row, .manufacturing-bay, .schedule-row, [data-bay-id]');
          
          if (bayRow) {
            // Create a temporary container to isolate the visualization
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'fixed';
            tempContainer.style.top = '-9999px';
            tempContainer.style.left = '-9999px';
            tempContainer.style.width = '1400px';
            tempContainer.style.padding = '20px';
            tempContainer.style.background = '#ffffff';
            tempContainer.style.fontFamily = 'Arial, sans-serif';
            document.body.appendChild(tempContainer);
            
            // Create a clean visualization of the schedule
            const scheduleViz = document.createElement('div');
            scheduleViz.style.border = '1px solid #e5e7eb';
            scheduleViz.style.borderRadius = '8px';
            scheduleViz.style.padding = '16px';
            scheduleViz.style.background = '#f9fafb';
            
            // Add bay header
            const bayHeader = document.createElement('div');
            bayHeader.style.marginBottom = '12px';
            bayHeader.style.fontWeight = 'bold';
            bayHeader.style.fontSize = '16px';
            bayHeader.style.color = '#1f2937';
            bayHeader.textContent = bay?.name || `Bay ${manufacturingSchedule.bayId}`;
            scheduleViz.appendChild(bayHeader);
            
            // Create timeline representation
            const timeline = document.createElement('div');
            timeline.style.position = 'relative';
            timeline.style.height = '80px';
            timeline.style.background = '#e5e7eb';
            timeline.style.borderRadius = '4px';
            timeline.style.overflow = 'hidden';
            
            // Add the project bar
            const projectViz = document.createElement('div');
            projectViz.style.position = 'absolute';
            projectViz.style.top = '10px';
            projectViz.style.height = '60px';
            projectViz.style.background = '#3b82f6';
            projectViz.style.border = '3px solid #ef4444';
            projectViz.style.borderRadius = '4px';
            projectViz.style.padding = '8px';
            projectViz.style.color = 'white';
            projectViz.style.fontSize = '14px';
            projectViz.style.fontWeight = 'bold';
            projectViz.style.display = 'flex';
            projectViz.style.alignItems = 'center';
            projectViz.style.justifyContent = 'center';
            projectViz.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            
            // Calculate position based on dates
            const startDate = new Date(manufacturingSchedule.startDate);
            const endDate = new Date(manufacturingSchedule.endDate);
            const duration = endDate.getTime() - startDate.getTime();
            const daysInSchedule = Math.ceil(duration / (1000 * 60 * 60 * 24));
            
            projectViz.style.left = '10px';
            projectViz.style.width = `${Math.max(200, Math.min(800, daysInSchedule * 10))}px`;
            projectViz.textContent = `${project.projectNumber}: ${project.name}`;
            
            timeline.appendChild(projectViz);
            scheduleViz.appendChild(timeline);
            
            // Add date labels
            const dateLabels = document.createElement('div');
            dateLabels.style.marginTop = '8px';
            dateLabels.style.display = 'flex';
            dateLabels.style.justifyContent = 'space-between';
            dateLabels.style.fontSize = '12px';
            dateLabels.style.color = '#6b7280';
            
            const startLabel = document.createElement('span');
            startLabel.textContent = format(startDate, 'MMM dd, yyyy');
            dateLabels.appendChild(startLabel);
            
            const endLabel = document.createElement('span');
            endLabel.textContent = format(endDate, 'MMM dd, yyyy');
            dateLabels.appendChild(endLabel);
            
            scheduleViz.appendChild(dateLabels);
            tempContainer.appendChild(scheduleViz);
            
            // Capture the visualization
            const canvas = await html2canvas(tempContainer, {
              scale: 2,
              backgroundColor: '#ffffff',
              logging: false
            });
            
            // Add to PDF
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 257;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 20, 30, imgWidth, Math.min(imgHeight, 100));
            
            // Clean up
            document.body.removeChild(tempContainer);
            
            // Add description
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Project ${project.projectNumber} is scheduled in ${bay?.name || 'the assigned bay'} from ${format(startDate, 'MMM dd')} to ${format(endDate, 'MMM dd, yyyy')}.`, 20, Math.min(imgHeight, 100) + 35);
            pdf.text(`The project is highlighted with a red border in the visualization above.`, 20, Math.min(imgHeight, 100) + 45);
          }
        } else {
          // Create a simple text representation if we can't find the visual
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
          pdf.text('Bay Schedule Information:', 20, 40);
          pdf.text(`• Bay: ${bay?.name || 'Bay ' + manufacturingSchedule.bayId}`, 30, 50);
          pdf.text(`• Start Date: ${format(new Date(manufacturingSchedule.startDate), 'MMMM dd, yyyy')}`, 30, 60);
          pdf.text(`• End Date: ${format(new Date(manufacturingSchedule.endDate), 'MMMM dd, yyyy')}`, 30, 70);
          pdf.text(`• Duration: ${Math.ceil((new Date(manufacturingSchedule.endDate).getTime() - new Date(manufacturingSchedule.startDate).getTime()) / (1000 * 60 * 60 * 24))} days`, 30, 80);
          pdf.text(`• Total Hours: ${manufacturingSchedule.totalHours || project.totalHours || 'Not specified'}`, 30, 90);
          
          pdf.setFont('helvetica', 'italic');
          pdf.text('Note: Visual schedule representation is available when viewing from the Bay Scheduling page.', 20, 110);
        }
      } else if (!manufacturingSchedule) {
        // No manufacturing schedule assigned
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No Manufacturing Schedule Assigned', pdf.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
        pdf.setFontSize(12);
        pdf.text('This project has not been scheduled in a manufacturing bay yet.', pdf.internal.pageSize.getWidth() / 2, 55, { align: 'center' });
      }
      
      // Return to original page if we navigated away
      if (needsNavigation) {
        const returnPath = sessionStorage.getItem('scheduleReportReturnPath');
        if (returnPath) {
          window.location.href = returnPath;
          sessionStorage.removeItem('scheduleReportReturnPath');
        }
      }

      // Save the PDF
      pdf.save(`${project.projectNumber}_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Schedule_Report.pdf`);
      
      toast({
        title: 'Report Generated',
        description: 'The schedule report has been downloaded successfully.'
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate the schedule report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePDF}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-2" />
          Schedule Report
        </>
      )}
    </Button>
  );
}