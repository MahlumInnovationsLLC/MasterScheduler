import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Loader2, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
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

interface ReportConfig {
  // Existing sections (default ON)
  projectOverview: boolean;
  timeline: boolean;
  departmentBreakdown: boolean;
  bayScheduleChart: boolean;
  
  // New sections
  billingMilestones: boolean;
  customText: string;
}

export function ScheduleReport({ project, manufacturingSchedule, bay }: ScheduleReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Report configuration state with defaults
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    // All existing sections default to ON
    projectOverview: true,
    timeline: true,
    departmentBreakdown: true,
    bayScheduleChart: true,
    
    // New sections
    billingMilestones: false,
    customText: ''
  });

  // Fetch billing milestones for this project
  const { data: billingMilestones = [] } = useQuery({
    queryKey: ['/api/projects', project.id, 'billing-milestones'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${project.id}/billing-milestones`);
      return await response.json();
    },
    enabled: reportConfig.billingMilestones
  });

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

      // Add custom text if provided
      let currentY = 60;
      if (reportConfig.customText.trim()) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const customTextLines = pdf.splitTextToSize(reportConfig.customText, pdf.internal.pageSize.getWidth() - 40);
        pdf.text(customTextLines, pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
        currentY += customTextLines.length * 5 + 10;
      }

      // Project Information Section (if enabled)
      if (reportConfig.projectOverview) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Project Information', 20, currentY + 10);
        
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
          startY: currentY + 15,
          head: [],
          body: projectInfo,
          theme: 'grid',
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 'auto' }
          },
          margin: { left: 20, right: 20 }
        });
        currentY = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Timeline Milestones Section (if enabled)
      if (reportConfig.timeline) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Timeline Milestones', 20, currentY);

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
          autoTable(pdf, {
            startY: currentY + 5,
            head: [['Milestone', 'Date']],
            body: milestones,
            theme: 'striped',
            headStyles: {
              fillColor: [66, 139, 202],
              textColor: 255
            },
            columnStyles: {
              0: { cellWidth: 80 },
              1: { cellWidth: 60 }
            },
            margin: { left: 20, right: 20 }
          });
          currentY = (pdf as any).lastAutoTable.finalY + 15;
        }
      }



      // Billing Milestones Section (if enabled)
      if (reportConfig.billingMilestones && billingMilestones.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Billing Milestones', 20, currentY);

        const milestoneRows = billingMilestones.map((milestone: any) => [
          milestone.name || milestone.milestoneName || '-',
          milestone.dueDate ? format(new Date(milestone.dueDate), 'MMM dd, yyyy') : (milestone.scheduledDate ? format(new Date(milestone.scheduledDate), 'MMM dd, yyyy') : 'TBD'),
          milestone.amount ? `$${milestone.amount.toLocaleString()}` : '-',
          milestone.status || 'Pending'
        ]);

        autoTable(pdf, {
          startY: currentY + 5,
          head: [['Milestone', 'Date', 'Amount', 'Status']],
          body: milestoneRows,
          theme: 'striped',
          headStyles: {
            fillColor: [46, 125, 50],
            textColor: 255
          },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 40 },
            2: { cellWidth: 40 },
            3: { cellWidth: 30 }
          },
          margin: { left: 20, right: 20 }
        });
        currentY = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Department Breakdown Section (if enabled)
      if (reportConfig.departmentBreakdown) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Department Breakdown', 20, currentY);

        const departmentInfo = [
          ['Fabrication', `${project.fabPercentage || 27}%`],
          ['Paint', `${project.paintPercentage || 7}%`],
          ['Production', `${project.productionPercentage || 60}%`],
          ['IT', `${project.itPercentage || 7}%`],
          ['NTC', `${project.ntcPercentage || 7}%`],
          ['QC', `${project.qcPercentage || 7}%`]
        ];

        autoTable(pdf, {
          startY: currentY + 5,
          head: [['Department', 'Percentage']],
          body: departmentInfo,
          theme: 'striped',
          headStyles: {
            fillColor: [156, 163, 175],
            textColor: 255
          },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 30 }
          },
          margin: { left: 20, right: 20 }
        });
        currentY = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Bay Schedule Chart Section (if enabled)
      if (reportConfig.bayScheduleChart && manufacturingSchedule && bay) {
        // Add the visual bay schedule chart
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        const visualizationY = currentY;
        pdf.text('Bay Schedule Visualization', 20, visualizationY);
        
        // Create a temporary container for the visualization
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.style.width = '800px';
        tempContainer.style.background = 'white';
        document.body.appendChild(tempContainer);
        
        // Create the schedule container
        const scheduleContainer = document.createElement('div');
        scheduleContainer.style.width = '100%';
        scheduleContainer.style.background = 'white';
        scheduleContainer.style.border = '1px solid #d1d5db';
        scheduleContainer.style.borderRadius = '8px';
        scheduleContainer.style.overflow = 'hidden';
        
        // Bay header
        const bayHeader = document.createElement('div');
        bayHeader.style.background = '#f3f4f6';
        bayHeader.style.padding = '12px 16px';
        bayHeader.style.borderBottom = '1px solid #d1d5db';
        bayHeader.style.fontWeight = 'bold';
        bayHeader.style.fontSize = '16px';
        bayHeader.style.color = '#1f2937';
        bayHeader.textContent = bay.name || `Bay ${bay.bayNumber}`;
        
        // Timeline header
        const timelineHeader = document.createElement('div');
        timelineHeader.style.display = 'flex';
        timelineHeader.style.background = '#f9fafb';
        timelineHeader.style.borderBottom = '1px solid #d1d5db';
        timelineHeader.style.fontSize = '12px';
        timelineHeader.style.color = '#6b7280';
        
        const startDate = new Date(manufacturingSchedule.startDate);
        const endDate = new Date(manufacturingSchedule.endDate);
        const weeks = [];
        
        // Generate week labels
        let currentDate = new Date(startDate);
        currentDate.setHours(0, 0, 0, 0);
        
        if (currentDate.getDay() !== 1) {
          const daysToSubtract = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
          currentDate.setDate(currentDate.getDate() - daysToSubtract);
        }
        
        while (currentDate <= endDate && weeks.length < 20) {
          weeks.push(format(currentDate, 'MM/dd'));
          currentDate.setDate(currentDate.getDate() + 7);
        }
        
        weeks.forEach(week => {
          const weekLabel = document.createElement('div');
          weekLabel.style.flex = '1';
          weekLabel.style.textAlign = 'center';
          weekLabel.style.fontSize = '12px';
          weekLabel.style.color = '#6b7280';
          weekLabel.style.borderRight = '1px solid #d1d5db';
          weekLabel.style.padding = '4px';
          weekLabel.textContent = week;
          timelineHeader.appendChild(weekLabel);
        });
        
        // Project bar container
        const projectBarContainer = document.createElement('div');
        projectBarContainer.style.position = 'relative';
        projectBarContainer.style.height = '80px';
        projectBarContainer.style.background = 'white';
        projectBarContainer.style.padding = '16px';
        
        // Create the project bar with phases
        const projectBar = document.createElement('div');
        projectBar.style.position = 'relative';
        projectBar.style.height = '48px';
        projectBar.style.display = 'flex';
        projectBar.style.borderRadius = '4px';
        projectBar.style.overflow = 'hidden';
        projectBar.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        
        // Create phases with proper colors and proportions
        const phases = [
          { name: 'FAB', color: '#6b7280', width: '27%' },
          { name: 'PAINT', color: '#10b981', width: '7%' },
          { name: 'PROD', color: '#3b82f6', width: '60%' },
          { name: 'IT', color: '#8b5cf6', width: '7%' },
          { name: 'NTC', color: '#f59e0b', width: '7%' },
          { name: 'QC', color: '#ec4899', width: '7%' }
        ];
        
        phases.forEach(phase => {
          const phaseDiv = document.createElement('div');
          phaseDiv.style.width = phase.width;
          phaseDiv.style.background = phase.color;
          phaseDiv.style.display = 'flex';
          phaseDiv.style.alignItems = 'center';
          phaseDiv.style.justifyContent = 'center';
          phaseDiv.style.color = 'white';
          phaseDiv.style.fontSize = '12px';
          phaseDiv.style.fontWeight = 'bold';
          phaseDiv.textContent = phase.name;
          projectBar.appendChild(phaseDiv);
        });
        
        // Add project info overlay
        const projectInfo = document.createElement('div');
        projectInfo.style.position = 'absolute';
        projectInfo.style.top = '50%';
        projectInfo.style.left = '50%';
        projectInfo.style.transform = 'translate(-50%, -50%)';
        projectInfo.style.background = 'rgba(255, 255, 255, 0.95)';
        projectInfo.style.padding = '4px 12px';
        projectInfo.style.borderRadius = '4px';
        projectInfo.style.border = '2px solid #ef4444';
        projectInfo.style.fontWeight = 'bold';
        projectInfo.style.fontSize = '14px';
        projectInfo.style.color = '#1f2937';
        projectInfo.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        projectInfo.textContent = `${project.projectNumber}_${project.name}`;
        
        projectBar.appendChild(projectInfo);
        projectBarContainer.appendChild(projectBar);
        
        // Assemble the visualization
        scheduleContainer.appendChild(bayHeader);
        scheduleContainer.appendChild(timelineHeader);
        scheduleContainer.appendChild(projectBarContainer);
        tempContainer.appendChild(scheduleContainer);
        
        try {
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
          
          const imgY = visualizationY + 10;
          pdf.addImage(imgData, 'PNG', 20, imgY, imgWidth, Math.min(imgHeight, 120));
          
          // Clean up
          document.body.removeChild(tempContainer);
          
          // Add description
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
          const descY = imgY + Math.min(imgHeight, 120) + 5;
          pdf.text(`Manufacturing Schedule: ${bay.name}`, 20, descY);
          pdf.text(`Duration: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 20, descY + 10);
          pdf.text(`Project phases: FAB (27%), PAINT (7%), PRODUCTION (60%), IT (7%), NTC (7%), QC (7%)`, 20, descY + 20);
          
          currentY = descY + 30;
        } catch (error) {
          // Clean up on error
          document.body.removeChild(tempContainer);
          console.error('Error generating bay schedule chart:', error);
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

  const handleConfigurationSubmit = () => {
    setDialogOpen(false);
    generatePDF();
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Settings2 className="h-4 w-4 mr-2" />
              Configure Report
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Schedule Report</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Report Sections</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="project-overview" className="text-sm">Project Overview</Label>
              <Switch
                id="project-overview"
                checked={reportConfig.projectOverview}
                onCheckedChange={(checked) => 
                  setReportConfig(prev => ({ ...prev, projectOverview: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="timeline" className="text-sm">Timeline Milestones</Label>
              <Switch
                id="timeline"
                checked={reportConfig.timeline}
                onCheckedChange={(checked) => 
                  setReportConfig(prev => ({ ...prev, timeline: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="bay-schedule-chart" className="text-sm">Bay Schedule Chart</Label>
              <Switch
                id="bay-schedule-chart"
                checked={reportConfig.bayScheduleChart}
                onCheckedChange={(checked) => 
                  setReportConfig(prev => ({ ...prev, bayScheduleChart: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="department-breakdown" className="text-sm">Department Breakdown</Label>
              <Switch
                id="department-breakdown"
                checked={reportConfig.departmentBreakdown}
                onCheckedChange={(checked) => 
                  setReportConfig(prev => ({ ...prev, departmentBreakdown: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="billing-milestones" className="text-sm">Billing Milestones</Label>
              <Switch
                id="billing-milestones"
                checked={reportConfig.billingMilestones}
                onCheckedChange={(checked) => 
                  setReportConfig(prev => ({ ...prev, billingMilestones: checked }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-text" className="text-sm font-medium">Custom Text (appears under page title)</Label>
            <Textarea
              id="custom-text"
              placeholder="Add custom text to appear under the report title..."
              value={reportConfig.customText}
              onChange={(e) => 
                setReportConfig(prev => ({ ...prev, customText: e.target.value }))
              }
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfigurationSubmit}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}