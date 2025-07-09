import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
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
      
      // Project Information (using simple text)
      let yPos = 80;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Project Number:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(project.projectNumber, 90, yPos);
      
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Project Name:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(project.name, 90, yPos);
      
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Customer:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(project.customer || '-', 90, yPos);
      
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Status:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(project.status || '-', 90, yPos);
      
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Progress:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${project.percentComplete || 0}%`, 90, yPos);
      
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total Hours:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(project.totalHours?.toString() || '-', 90, yPos);
      
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Bay Assignment:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(bay?.name || 'Unassigned', 90, yPos);

      // Timeline Milestones Section
      const timelineY = yPos + 20;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Timeline Milestones', 20, timelineY);

      const milestones = [];
      
      // Gather all timeline dates
      if (project.poDroppedDate || project.startDate) {
        const date = project.poDroppedDate || project.startDate;
        milestones.push(['PO Dropped', format(new Date(date + 'T00:00:00'), 'MMM dd, yyyy')]);
      }
      if (project.fabricationStart) {
        milestones.push(['Fabrication Start', format(new Date(project.fabricationStart + 'T00:00:00'), 'MMM dd, yyyy')]);
      }
      if (project.paintStart) {
        milestones.push(['Paint Start', format(new Date(project.paintStart + 'T00:00:00'), 'MMM dd, yyyy')]);
      }
      if (project.assemblyStart) {
        milestones.push(['Production Start', format(new Date(project.assemblyStart + 'T00:00:00'), 'MMM dd, yyyy')]);
      }
      if (project.itStart) {
        milestones.push(['IT Start', format(new Date(project.itStart + 'T00:00:00'), 'MMM dd, yyyy')]);
      }
      if (project.ntcTestingDate) {
        milestones.push(['NTC Testing', format(new Date(project.ntcTestingDate + 'T00:00:00'), 'MMM dd, yyyy')]);
      }
      if (project.qcStartDate) {
        milestones.push(['QC Start', format(new Date(project.qcStartDate + 'T00:00:00'), 'MMM dd, yyyy')]);
      }
      if (project.executiveReviewDate) {
        milestones.push(['Executive Review', format(new Date(project.executiveReviewDate + 'T00:00:00'), 'MMM dd, yyyy')]);
      }
      if (project.shipDate) {
        milestones.push(['Ship Date', format(new Date(project.shipDate + 'T00:00:00'), 'MMM dd, yyyy')]);
      }
      if (project.deliveryDate) {
        milestones.push(['Delivery Date', format(new Date(project.deliveryDate + 'T00:00:00'), 'MMM dd, yyyy')]);
      }

      if (milestones.length > 0) {
        let milestoneY = timelineY + 10;
        pdf.setFontSize(12);
        milestones.forEach(([milestone, date]) => {
          pdf.setFont('helvetica', 'bold');
          pdf.text(milestone + ':', 20, milestoneY);
          pdf.setFont('helvetica', 'normal');
          pdf.text(date, 90, milestoneY);
          milestoneY += 10;
        });
      }

      // Manufacturing Schedule Details
      if (manufacturingSchedule) {
        const scheduleY = timelineY + (milestones.length * 10) + 25;
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Manufacturing Schedule Details', 20, scheduleY);

        let scheduleInfoY = scheduleY + 10;
        pdf.setFontSize(12);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Bay Assignment:', 20, scheduleInfoY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(bay?.name || 'Unassigned', 90, scheduleInfoY);
        
        scheduleInfoY += 10;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Start Date:', 20, scheduleInfoY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(format(new Date(manufacturingSchedule.startDate), 'MMM dd, yyyy'), 90, scheduleInfoY);
        
        scheduleInfoY += 10;
        pdf.setFont('helvetica', 'bold');
        pdf.text('End Date:', 20, scheduleInfoY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(format(new Date(manufacturingSchedule.endDate), 'MMM dd, yyyy'), 90, scheduleInfoY);
        
        scheduleInfoY += 10;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Total Hours:', 20, scheduleInfoY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(manufacturingSchedule.totalHours?.toString() || '-', 90, scheduleInfoY);
        
        scheduleInfoY += 10;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Row Position:', 20, scheduleInfoY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Row ${(manufacturingSchedule.rowIndex || 0) + 1}`, 90, scheduleInfoY);
      }

      // Add new page for Bay Schedule information
      pdf.addPage();
      
      if (manufacturingSchedule && bay) {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Bay Schedule Information', pdf.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
        
        // Add bay schedule information
        const startDate = new Date(manufacturingSchedule.startDate);
        const endDate = new Date(manufacturingSchedule.endDate);
        
        let scheduleVisualizationY = 40;
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Schedule Overview', 20, scheduleVisualizationY);
        
        scheduleVisualizationY += 20;
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Bay: ${bay.name}`, 20, scheduleVisualizationY);
        
        scheduleVisualizationY += 10;
        pdf.text(`Schedule Duration: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 20, scheduleVisualizationY);
        
        scheduleVisualizationY += 10;
        pdf.text(`Project: ${project.projectNumber} - ${project.name}`, 20, scheduleVisualizationY);
        
        scheduleVisualizationY += 20;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Manufacturing Phases:', 20, scheduleVisualizationY);
        
        scheduleVisualizationY += 15;
        pdf.setFont('helvetica', 'normal');
        pdf.text('• FAB (Fabrication): 27% of total project duration', 30, scheduleVisualizationY);
        
        scheduleVisualizationY += 10;
        pdf.text('• PAINT (Paint): 7% of total project duration', 30, scheduleVisualizationY);
        
        scheduleVisualizationY += 10;
        pdf.text('• PRODUCTION (Assembly): 60% of total project duration', 30, scheduleVisualizationY);
        
        scheduleVisualizationY += 10;
        pdf.text('• IT (Integration Testing): 7% of total project duration', 30, scheduleVisualizationY);
        
        scheduleVisualizationY += 10;
        pdf.text('• NTC (Non-Conformance Testing): 7% of total project duration', 30, scheduleVisualizationY);
        
        scheduleVisualizationY += 10;
        pdf.text('• QC (Quality Control): 7% of total project duration', 30, scheduleVisualizationY);
        
        scheduleVisualizationY += 20;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Notes:', 20, scheduleVisualizationY);
        
        scheduleVisualizationY += 10;
        pdf.setFont('helvetica', 'normal');
        pdf.text('This schedule represents the planned manufacturing timeline for this project.', 20, scheduleVisualizationY);
        
        scheduleVisualizationY += 10;
        pdf.text('Phase percentages are industry standard distributions across the project timeline.', 20, scheduleVisualizationY);
      } else {
        // No manufacturing schedule assigned
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No Manufacturing Schedule Assigned', pdf.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
        pdf.setFontSize(12);
        pdf.text('This project has not been scheduled in a manufacturing bay yet.', pdf.internal.pageSize.getWidth() / 2, 55, { align: 'center' });
      }

      // Save the PDF
      const fileName = `${project.projectNumber}_${project.name.replace(/[^a-zA-Z0-9\s]/g, '_')}_Schedule_Report.pdf`;
      pdf.save(fileName);
      
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