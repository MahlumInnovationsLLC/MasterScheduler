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
  manufacturingPhases: boolean;
  departmentBreakdown: boolean;
  
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
    manufacturingPhases: true,
    departmentBreakdown: true,
    
    // New sections
    billingMilestones: false,
    customText: ''
  });

  // Fetch billing milestones for this project
  const { data: billingMilestones = [] } = useQuery({
    queryKey: ['/api/billing-milestones', project.id],
    queryFn: async () => {
      const response = await fetch('/api/billing-milestones');
      const allMilestones = await response.json();
      return allMilestones.filter((m: any) => m.projectId === project.id);
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

      // Manufacturing Schedule Section (if enabled)
      if (reportConfig.manufacturingPhases && manufacturingSchedule && bay) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Manufacturing Schedule', 20, currentY);
        
        const scheduleInfo = [
          ['Bay Assignment', bay.name || `Bay ${bay.bayNumber}`],
          ['Start Date', format(new Date(manufacturingSchedule.startDate), 'MMM dd, yyyy')],
          ['End Date', format(new Date(manufacturingSchedule.endDate), 'MMM dd, yyyy')],
          ['Total Hours', manufacturingSchedule.totalHours?.toString() || '-'],
          ['Status', 'Scheduled']
        ];

        autoTable(pdf, {
          startY: currentY + 5,
          head: [],
          body: scheduleInfo,
          theme: 'grid',
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 'auto' }
          },
          margin: { left: 20, right: 20 }
        });
        currentY = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Billing Milestones Section (if enabled)
      if (reportConfig.billingMilestones && billingMilestones.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Billing Milestones', 20, currentY);

        const milestoneRows = billingMilestones.map((milestone: any) => [
          milestone.milestoneName || '-',
          milestone.scheduledDate ? format(new Date(milestone.scheduledDate), 'MMM dd, yyyy') : 'TBD',
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
              <Label htmlFor="manufacturing-phases" className="text-sm">Manufacturing Schedule</Label>
              <Switch
                id="manufacturing-phases"
                checked={reportConfig.manufacturingPhases}
                onCheckedChange={(checked) => 
                  setReportConfig(prev => ({ ...prev, manufacturingPhases: checked }))
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