import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  FileText, 
  Download, 
  Calendar, 
  DollarSign,
  Users,
  Wrench,
  Palette,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Bot,
  Loader2
} from 'lucide-react';
import { Project } from '@shared/schema';
import { formatDate } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ImpactAssessmentDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DateVariance {
  field: string;
  displayName: string;
  currentDate: string | null;
  opDate: string | null;
  daysDifference: number;
  isDelayed: boolean;
}

interface DepartmentImpact {
  department: string;
  icon: React.ReactNode;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  specificImpacts: string[];
  mitigationActions: string[];
  estimatedCost?: string;
  timelineImpact?: string;
}

interface AIInsightData {
  insights: {
    severity: 'danger' | 'warning' | 'success';
    text: string;
    detail?: string;
  }[];
  confidence: number;
  summary: string;
}

const ImpactAssessmentDialog: React.FC<ImpactAssessmentDialogProps> = ({
  project,
  open,
  onOpenChange,
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [dateVariances, setDateVariances] = useState<DateVariance[]>([]);
  const [departmentImpacts, setDepartmentImpacts] = useState<DepartmentImpact[]>([]);
  const [aiInsights, setAIInsights] = useState<AIInsightData | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Calculate date variances when project changes
  useEffect(() => {
    if (!project) return;

    const variances: DateVariance[] = [];

    // Define all date fields to check
    const dateFields = [
      { field: 'contractDate', display: 'Contract Date', op: 'opContractDate' },
      { field: 'chassisETA', display: 'Chassis ETA', op: 'opChassisETA' },
      { field: 'mechShop', display: 'MECH Shop', op: 'opMechShop' },
      { field: 'fabricationStart', display: 'Fabrication Start', op: 'opFabricationStart' },
      { field: 'paintStart', display: 'PAINT Start', op: 'opPaintStart' },
      { field: 'productionStart', display: 'Production Start', op: 'opProductionStart' },
      { field: 'itStart', display: 'IT Start', op: 'opItStart' },
      { field: 'wrapDate', display: 'Wrap Date', op: 'opWrapDate' },
      { field: 'ntcTestingDate', display: 'NTC Testing', op: 'opNtcTestingDate' },
      { field: 'qcStartDate', display: 'QC Start', op: 'opQcStartDate' },
      { field: 'executiveReviewDate', display: 'Executive Review', op: 'opExecutiveReviewDate' },
      { field: 'shipDate', display: 'Ship Date', op: 'opShipDate' },
      { field: 'deliveryDate', display: 'Delivery Date', op: 'opDeliveryDate' },
    ];

    dateFields.forEach(({ field, display, op }) => {
      const currentDate = (project as any)[field];
      const opDate = (project as any)[op];

      if (currentDate && opDate && 
          currentDate !== 'N/A' && opDate !== 'N/A' && 
          currentDate !== 'PENDING' && opDate !== 'PENDING' &&
          currentDate !== 'TBD' && opDate !== 'TBD') {
        try {
          const current = new Date(currentDate);
          const original = new Date(opDate);
          const timeDiff = current.getTime() - original.getTime();
          const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));

          if (daysDiff !== 0) {
            variances.push({
              field,
              displayName: display,
              currentDate,
              opDate,
              daysDifference: daysDiff,
              isDelayed: daysDiff > 0,
            });
          }
        } catch (error) {
          console.error(`Error calculating variance for ${field}:`, error);
        }
      }
    });

    setDateVariances(variances);
  }, [project]);

  // Generate department impacts based on date variances
  useEffect(() => {
    if (dateVariances.length === 0) {
      setDepartmentImpacts([]);
      return;
    }

    const impacts: DepartmentImpact[] = [];

    // Sales Department Impact
    const contractDelays = dateVariances.filter(v => 
      v.field === 'contractDate' && v.isDelayed
    );
    if (contractDelays.length > 0 || dateVariances.some(v => v.isDelayed)) {
      impacts.push({
        department: 'Sales',
        icon: <DollarSign className="h-5 w-5" />,
        impactLevel: contractDelays.length > 0 ? 'high' : 'medium',
        description: 'Customer communication and expectation management required',
        specificImpacts: [
          'Customer notification of schedule changes required',
          'Potential penalty clauses may be triggered',
          'Revenue recognition timeline affected',
          'Customer satisfaction risk'
        ],
        mitigationActions: [
          'Schedule immediate customer meeting',
          'Prepare detailed explanation with recovery plan',
          'Review contract for penalty implications',
          'Implement enhanced communication protocol'
        ],
        estimatedCost: contractDelays.length > 0 ? '$10,000 - $50,000' : '$2,000 - $10,000',
        timelineImpact: `${Math.max(...dateVariances.map(v => v.daysDifference))} days`
      });
    }

    // Engineering Department Impact
    const engineeringDelays = dateVariances.filter(v => 
      ['chassisETA', 'fabricationStart'].includes(v.field) && v.isDelayed
    );
    if (engineeringDelays.length > 0) {
      impacts.push({
        department: 'Engineering',
        icon: <Settings className="h-5 w-5" />,
        impactLevel: 'medium',
        description: 'Design and documentation timeline adjustments needed',
        specificImpacts: [
          'Design review schedules need adjustment',
          'Drawing approval timeline affected',
          'Engineering resource reallocation required',
          'Vendor coordination timing changed'
        ],
        mitigationActions: [
          'Expedite design review process',
          'Parallel processing where possible',
          'Additional engineering resources if needed',
          'Fast-track vendor approvals'
        ],
        timelineImpact: `${Math.max(...engineeringDelays.map(v => v.daysDifference))} days`
      });
    }

    // Supply Chain Impact
    const supplyChainDelays = dateVariances.filter(v => 
      ['chassisETA', 'mechShop'].includes(v.field)
    );
    if (supplyChainDelays.length > 0) {
      impacts.push({
        department: 'Supply Chain',
        icon: <Users className="h-5 w-5" />,
        impactLevel: 'high',
        description: 'Material procurement and vendor coordination affected',
        specificImpacts: [
          'Chassis delivery schedule impacted',
          'Component ordering timeline adjusted',
          'Vendor coordination required',
          'Inventory planning affected'
        ],
        mitigationActions: [
          'Expedite chassis delivery if possible',
          'Review component lead times',
          'Alternative vendor evaluation',
          'Inventory optimization'
        ],
        estimatedCost: '$5,000 - $25,000',
        timelineImpact: `${Math.max(...supplyChainDelays.map(v => v.daysDifference))} days`
      });
    }

    // Finance Department Impact
    if (dateVariances.some(v => v.isDelayed)) {
      impacts.push({
        department: 'Finance',
        icon: <DollarSign className="h-5 w-5" />,
        impactLevel: 'medium',
        description: 'Cash flow and billing milestone timing affected',
        specificImpacts: [
          'Billing milestone dates need adjustment',
          'Cash flow projections require update',
          'Revenue recognition timing changed',
          'Budget variance analysis needed'
        ],
        mitigationActions: [
          'Update financial projections',
          'Adjust billing milestone schedule',
          'Communicate with accounting team',
          'Review payment terms with customer'
        ],
        timelineImpact: `${Math.max(...dateVariances.map(v => v.daysDifference))} days`
      });
    }

    // Manufacturing Departments
    const fabricationDelays = dateVariances.filter(v => 
      v.field === 'fabricationStart' && v.isDelayed
    );
    if (fabricationDelays.length > 0) {
      impacts.push({
        department: 'Fabrication',
        icon: <Wrench className="h-5 w-5" />,
        impactLevel: 'critical',
        description: 'Bay scheduling and resource allocation requires immediate attention',
        specificImpacts: [
          'Manufacturing bay schedule disrupted',
          'Team resource reallocation needed',
          'Overtime requirements potential',
          'Downstream schedule cascading impact'
        ],
        mitigationActions: [
          'Immediate bay schedule revision',
          'Resource reallocation planning',
          'Overtime authorization if needed',
          'Parallel processing opportunities'
        ],
        estimatedCost: '$15,000 - $75,000',
        timelineImpact: `${Math.max(...fabricationDelays.map(v => v.daysDifference))} days`
      });
    }

    const paintDelays = dateVariances.filter(v => 
      v.field === 'paintStart' && v.isDelayed
    );
    if (paintDelays.length > 0) {
      impacts.push({
        department: 'Paint',
        icon: <Palette className="h-5 w-5" />,
        impactLevel: 'high',
        description: 'Paint booth scheduling and prep work timing affected',
        specificImpacts: [
          'Paint booth reservation changes required',
          'Surface preparation timeline adjusted',
          'Paint material ordering affected',
          'Quality control schedule impacted'
        ],
        mitigationActions: [
          'Reschedule paint booth availability',
          'Expedite surface preparation',
          'Ensure paint material availability',
          'Coordinate with QC team'
        ],
        timelineImpact: `${Math.max(...paintDelays.map(v => v.daysDifference))} days`
      });
    }

    const productionDelays = dateVariances.filter(v => 
      v.field === 'productionStart' && v.isDelayed
    );
    if (productionDelays.length > 0) {
      impacts.push({
        department: 'Production',
        icon: <Settings className="h-5 w-5" />,
        impactLevel: 'critical',
        description: 'Final assembly and production timeline requires immediate revision',
        specificImpacts: [
          'Assembly line schedule disrupted',
          'Component availability timing affected',
          'Team scheduling changes required',
          'Quality checkpoints need adjustment'
        ],
        mitigationActions: [
          'Immediate production schedule revision',
          'Component availability verification',
          'Team schedule optimization',
          'Quality checkpoint realignment'
        ],
        estimatedCost: '$20,000 - $100,000',
        timelineImpact: `${Math.max(...productionDelays.map(v => v.daysDifference))} days`
      });
    }

    const itDelays = dateVariances.filter(v => 
      v.field === 'itStart' && v.isDelayed
    );
    if (itDelays.length > 0) {
      impacts.push({
        department: 'IT',
        icon: <Settings className="h-5 w-5" />,
        impactLevel: 'medium',
        description: 'IT system integration and testing timeline affected',
        specificImpacts: [
          'System integration schedule needs adjustment',
          'Software testing timeline affected',
          'Hardware configuration timing changed',
          'User acceptance testing delayed'
        ],
        mitigationActions: [
          'Parallel IT system setup where possible',
          'Expedite software configuration',
          'Pre-stage hardware components',
          'Coordinate with testing team'
        ],
        timelineImpact: `${Math.max(...itDelays.map(v => v.daysDifference))} days`
      });
    }

    const ntcDelays = dateVariances.filter(v => 
      v.field === 'ntcTestingDate' && v.isDelayed
    );
    if (ntcDelays.length > 0) {
      impacts.push({
        department: 'NTC',
        icon: <CheckCircle className="h-5 w-5" />,
        impactLevel: 'high',
        description: 'Network testing and certification timeline requires adjustment',
        specificImpacts: [
          'Network testing schedule affected',
          'Certification timeline delayed',
          'Documentation review timing changed',
          'Customer acceptance testing impacted'
        ],
        mitigationActions: [
          'Expedite network testing preparation',
          'Parallel certification processes',
          'Documentation fast-track review',
          'Customer coordination for testing'
        ],
        timelineImpact: `${Math.max(...ntcDelays.map(v => v.daysDifference))} days`
      });
    }

    const qcDelays = dateVariances.filter(v => 
      v.field === 'qcStartDate' && v.isDelayed
    );
    if (qcDelays.length > 0) {
      impacts.push({
        department: 'QC',
        icon: <CheckCircle className="h-5 w-5" />,
        impactLevel: 'high',
        description: 'Quality control testing and inspection schedule affected',
        specificImpacts: [
          'Quality inspection timeline delayed',
          'Testing protocol schedule affected',
          'Documentation review timing changed',
          'Final approval process impacted'
        ],
        mitigationActions: [
          'Expedite quality inspection setup',
          'Parallel testing where possible',
          'Fast-track documentation review',
          'Coordinate final approvals'
        ],
        timelineImpact: `${Math.max(...qcDelays.map(v => v.daysDifference))} days`
      });
    }

    const fswDelays = dateVariances.filter(v => 
      ['executiveReviewDate', 'shipDate', 'deliveryDate'].includes(v.field) && v.isDelayed
    );
    if (fswDelays.length > 0) {
      impacts.push({
        department: 'FSW',
        icon: <Users className="h-5 w-5" />,
        impactLevel: 'critical',
        description: 'Field service and delivery coordination significantly impacted',
        specificImpacts: [
          'Customer delivery expectations affected',
          'Field service scheduling disrupted',
          'Installation timeline delayed',
          'Customer training schedule impacted'
        ],
        mitigationActions: [
          'Immediate customer communication',
          'Field service team notification',
          'Installation schedule revision',
          'Customer training rescheduling'
        ],
        estimatedCost: '$25,000 - $150,000',
        timelineImpact: `${Math.max(...fswDelays.map(v => v.daysDifference))} days`
      });
    }

    setDepartmentImpacts(impacts);
  }, [dateVariances]);

  // Generate AI insights
  useEffect(() => {
    if (!project || dateVariances.length === 0 || !open) return;

    const generateAIInsights = async () => {
      setIsLoadingAI(true);
      try {
        const response = await apiRequest('POST', '/api/ai/impact-assessment', {
          project: {
            id: project.id,
            name: project.name,
            projectNumber: project.projectNumber,
            percentComplete: project.percentComplete,
            status: project.status
          },
          dateVariances,
          departmentImpacts: departmentImpacts.map(d => ({
            department: d.department,
            impactLevel: d.impactLevel,
            description: d.description,
            estimatedCost: d.estimatedCost
          }))
        });

        if (response.ok) {
          const data = await response.json();
          setAIInsights(data);
        }
      } catch (error) {
        console.error('Error generating AI insights:', error);
        // Provide fallback insights
        setAIInsights({
          insights: [
            {
              severity: 'warning',
              text: 'Multiple schedule variances detected requiring immediate attention',
              detail: 'The cumulative impact of date changes may cause significant project delays'
            },
            {
              severity: 'danger',
              text: 'Critical path analysis needed for downstream activities',
              detail: 'Manufacturing and delivery phases are at risk of cascading delays'
            }
          ],
          confidence: 0.8,
          summary: 'AI analysis suggests immediate intervention required to minimize project impact'
        });
      } finally {
        setIsLoadingAI(false);
      }
    };

    generateAIInsights();
  }, [project, dateVariances, departmentImpacts, open]);

  const generatePDFReport = async () => {
    if (!project) return;

    setIsGeneratingPDF(true);
    
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = margin;

      // Title
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('Project Impact Assessment Report', margin, yPosition);
      yPosition += 15;

      // Project Info
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Project: ${project.name}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Project Number: ${project.projectNumber}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Assessment Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
      yPosition += 15;

      // Executive Summary
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('Executive Summary', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      const summaryText = `This impact assessment identifies ${dateVariances.length} schedule variance(s) affecting ${departmentImpacts.length} department(s). Immediate action is required to mitigate project risks and maintain delivery commitments.`;
      const splitSummary = pdf.splitTextToSize(summaryText, pageWidth - 2 * margin);
      pdf.text(splitSummary, margin, yPosition);
      yPosition += splitSummary.length * 6 + 10;

      // Date Variances Table
      if (dateVariances.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Schedule Variances', margin, yPosition);
        yPosition += 10;

        const tableData = dateVariances.map(variance => [
          variance.displayName,
          variance.opDate ? formatDate(variance.opDate) : 'N/A',
          variance.currentDate ? formatDate(variance.currentDate) : 'N/A',
          `${variance.daysDifference > 0 ? '+' : ''}${variance.daysDifference} days`,
          variance.isDelayed ? 'Delayed' : 'Advanced'
        ]);

        (pdf as any).autoTable({
          head: [['Phase', 'Original Plan', 'Current Date', 'Variance', 'Status']],
          body: tableData,
          startY: yPosition,
          margin: { top: margin, right: margin, bottom: margin, left: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 66, 66] },
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Department Impacts
      if (departmentImpacts.length > 0) {
        // Check if we need a new page
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Department Impact Analysis', margin, yPosition);
        yPosition += 15;

        departmentImpacts.forEach((impact, index) => {
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = margin;
          }

          pdf.setFontSize(12);
          pdf.setFont(undefined, 'bold');
          pdf.text(`${impact.department} Department`, margin, yPosition);
          yPosition += 8;

          pdf.setFontSize(10);
          pdf.setFont(undefined, 'normal');
          pdf.text(`Impact Level: ${impact.impactLevel.toUpperCase()}`, margin, yPosition);
          yPosition += 6;

          const descText = pdf.splitTextToSize(impact.description, pageWidth - 2 * margin);
          pdf.text(descText, margin, yPosition);
          yPosition += descText.length * 6 + 5;

          // Specific Impacts
          pdf.setFont(undefined, 'bold');
          pdf.text('Specific Impacts:', margin, yPosition);
          yPosition += 6;
          pdf.setFont(undefined, 'normal');
          impact.specificImpacts.forEach(item => {
            const itemText = pdf.splitTextToSize(`• ${item}`, pageWidth - 2 * margin - 10);
            pdf.text(itemText, margin + 10, yPosition);
            yPosition += itemText.length * 5;
          });
          yPosition += 5;

          // Mitigation Actions
          pdf.setFont(undefined, 'bold');
          pdf.text('Mitigation Actions:', margin, yPosition);
          yPosition += 6;
          pdf.setFont(undefined, 'normal');
          impact.mitigationActions.forEach(action => {
            const actionText = pdf.splitTextToSize(`• ${action}`, pageWidth - 2 * margin - 10);
            pdf.text(actionText, margin + 10, yPosition);
            yPosition += actionText.length * 5;
          });

          if (impact.estimatedCost) {
            yPosition += 3;
            pdf.text(`Estimated Cost Impact: ${impact.estimatedCost}`, margin, yPosition);
            yPosition += 6;
          }

          if (impact.timelineImpact) {
            pdf.text(`Timeline Impact: ${impact.timelineImpact}`, margin, yPosition);
            yPosition += 6;
          }

          yPosition += 10;
        });
      }

      // AI Insights
      if (aiInsights && aiInsights.insights.length > 0) {
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('AI-Generated Insights', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setFont(undefined, 'italic');
        const summaryText = pdf.splitTextToSize(aiInsights.summary, pageWidth - 2 * margin);
        pdf.text(summaryText, margin, yPosition);
        yPosition += summaryText.length * 6 + 10;

        aiInsights.insights.forEach(insight => {
          pdf.setFont(undefined, 'bold');
          pdf.text(`• ${insight.text}`, margin, yPosition);
          yPosition += 6;
          if (insight.detail) {
            pdf.setFont(undefined, 'normal');
            const detailText = pdf.splitTextToSize(`  ${insight.detail}`, pageWidth - 2 * margin - 20);
            pdf.text(detailText, margin + 20, yPosition);
            yPosition += detailText.length * 5 + 3;
          }
        });

        yPosition += 10;
        pdf.setFont(undefined, 'italic');
        pdf.text(`AI Confidence Level: ${Math.round((aiInsights.confidence || 0) * 100)}%`, margin, yPosition);
      }

      // Save the PDF
      pdf.save(`Impact-Assessment-${project.projectNumber}-${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getImpactLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'danger': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'success': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            Project Impact Assessment
          </DialogTitle>
          <DialogDescription>
            Comprehensive analysis of schedule changes for <strong>{project.name}</strong> (#{project.projectNumber})
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateVariances.length} Schedule Variance{dateVariances.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {departmentImpacts.length} Department{departmentImpacts.length !== 1 ? 's' : ''} Affected
            </Badge>
          </div>
          
          <Button 
            onClick={generatePDFReport}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2"
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isGeneratingPDF ? 'Generating...' : 'Generate PDF Report'}
          </Button>
        </div>

        <Tabs defaultValue="overview" className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="departments">Department Impact</TabsTrigger>
            <TabsTrigger value="timeline">Timeline Analysis</TabsTrigger>
            <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Executive Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This impact assessment has identified <strong>{dateVariances.length}</strong> schedule 
                    variance{dateVariances.length !== 1 ? 's' : ''} that will affect <strong>{departmentImpacts.length}</strong> 
                    department{departmentImpacts.length !== 1 ? 's' : ''} across the organization. 
                    The total cumulative delay impact is <strong>
                      {Math.max(...dateVariances.map(v => v.daysDifference), 0)} days
                    </strong> based on the most critical timeline variance.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Critical Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Delayed Phases:</span>
                          <Badge variant="destructive">
                            {dateVariances.filter(v => v.isDelayed).length}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Advanced Phases:</span>
                          <Badge variant="default">
                            {dateVariances.filter(v => !v.isDelayed).length}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Critical Departments:</span>
                          <Badge variant="destructive">
                            {departmentImpacts.filter(d => d.impactLevel === 'critical').length}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>High Impact Departments:</span>
                          <Badge variant="secondary">
                            {departmentImpacts.filter(d => d.impactLevel === 'high').length}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Immediate Actions Required</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Customer notification and expectation management</li>
                        <li>• Resource reallocation and schedule optimization</li>
                        <li>• Vendor and supplier coordination</li>
                        <li>• Financial impact assessment and mitigation</li>
                        <li>• Cross-departmental communication protocol</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {dateVariances.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Schedule Variances</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dateVariances.map((variance, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{variance.displayName}</h4>
                            <p className="text-sm text-muted-foreground">
                              Original: {variance.opDate ? formatDate(variance.opDate) : 'N/A'} → 
                              Current: {variance.currentDate ? formatDate(variance.currentDate) : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={variance.isDelayed ? "destructive" : "default"}
                              className="mb-1"
                            >
                              {variance.isDelayed ? 'Delayed' : 'Advanced'}
                            </Badge>
                            <p className="text-sm font-medium">
                              {variance.daysDifference > 0 ? '+' : ''}{variance.daysDifference} days
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="departments" className="space-y-4">
              {departmentImpacts.map((impact, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {impact.icon}
                        {impact.department} Department
                      </div>
                      <Badge className={`${getImpactLevelColor(impact.impactLevel)} text-white`}>
                        {impact.impactLevel.toUpperCase()} IMPACT
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{impact.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-1">
                          <XCircle className="h-4 w-4 text-red-500" />
                          Specific Impacts
                        </h4>
                        <ul className="text-sm space-y-1">
                          {impact.specificImpacts.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-red-500 mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Mitigation Actions
                        </h4>
                        <ul className="text-sm space-y-1">
                          {impact.mitigationActions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {(impact.estimatedCost || impact.timelineImpact) && (
                      <Separator className="my-4" />
                    )}

                    <div className="flex gap-4">
                      {impact.estimatedCost && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-sm">
                            <strong>Cost Impact:</strong> {impact.estimatedCost}
                          </span>
                        </div>
                      )}
                      {impact.timelineImpact && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">
                            <strong>Timeline Impact:</strong> {impact.timelineImpact}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Timeline Impact Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {dateVariances.length > 0 ? (
                      <>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-red-500">
                              {dateVariances.filter(v => v.isDelayed).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Delayed Phases</div>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-blue-500">
                              {Math.max(...dateVariances.map(v => Math.abs(v.daysDifference)), 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Max Variance (Days)</div>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-orange-500">
                              {Math.round(dateVariances.reduce((sum, v) => sum + Math.abs(v.daysDifference), 0) / dateVariances.length)}
                            </div>
                            <div className="text-sm text-muted-foreground">Avg Variance (Days)</div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Critical Path Analysis</h4>
                          <div className="space-y-2">
                            {dateVariances
                              .sort((a, b) => Math.abs(b.daysDifference) - Math.abs(a.daysDifference))
                              .map((variance, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20">
                                <div>
                                  <span className="font-medium">{variance.displayName}</span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    ({variance.opDate ? formatDate(variance.opDate) : 'N/A'} → {variance.currentDate ? formatDate(variance.currentDate) : 'N/A'})
                                  </span>
                                </div>
                                <Badge variant={variance.isDelayed ? "destructive" : "default"}>
                                  {variance.daysDifference > 0 ? '+' : ''}{variance.daysDifference} days
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Cascading Impact Assessment</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            The following phases may experience additional delays due to upstream schedule changes:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 border rounded-lg">
                              <h5 className="font-medium text-sm mb-2">Manufacturing Chain</h5>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div>MECH Shop → Fabrication → Paint → Production</div>
                                <div className="text-red-500">Risk: High cascading delays</div>
                              </div>
                            </div>
                            <div className="p-3 border rounded-lg">
                              <h5 className="font-medium text-sm mb-2">Testing & Delivery</h5>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div>IT → NTC → QC → Exec Review → Ship → Delivery</div>
                                <div className="text-orange-500">Risk: Customer impact potential</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No timeline variances detected for this project.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI-Generated Insights & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAI ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Generating AI insights...</span>
                    </div>
                  ) : aiInsights ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h4 className="font-semibold mb-2">AI Analysis Summary</h4>
                        <p className="text-sm">{aiInsights.summary}</p>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Confidence Level: {Math.round((aiInsights.confidence || 0) * 100)}%
                        </div>
                      </div>

                      <div className="space-y-3">
                        {aiInsights.insights.map((insight, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className={`h-4 w-4 mt-0.5 ${getSeverityColor(insight.severity)}`} />
                              <div className="flex-1">
                                <p className="font-medium text-sm">{insight.text}</p>
                                {insight.detail && (
                                  <p className="text-xs text-muted-foreground mt-1">{insight.detail}</p>
                                )}
                              </div>
                              <Badge 
                                variant={insight.severity === 'danger' ? 'destructive' : 
                                        insight.severity === 'warning' ? 'secondary' : 'default'}
                              >
                                {insight.severity.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Recommended Next Steps
                        </h4>
                        <ul className="text-sm space-y-1">
                          <li>• Schedule immediate cross-departmental coordination meeting</li>
                          <li>• Update customer communication with revised timeline</li>
                          <li>• Implement resource reallocation strategies</li>
                          <li>• Monitor critical path phases for further delays</li>
                          <li>• Establish enhanced project tracking protocols</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>AI insights are currently unavailable.</p>
                      <p className="text-xs">Analysis will be provided based on schedule variance data.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ImpactAssessmentDialog;