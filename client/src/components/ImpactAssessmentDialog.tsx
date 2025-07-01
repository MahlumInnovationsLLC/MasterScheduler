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

// Safe version of formatDate that handles undefined values
const safeFormatDate = (date: string | null | undefined): string => {
  if (!date || date === 'N/A' || date === 'PENDING' || date === 'TBD') {
    return date || 'N/A';
  }
  return formatDate(date);
};
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ImpactAssessmentDialogProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
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
  onClose,
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [dateVariances, setDateVariances] = useState<DateVariance[]>([]);
  const [departmentImpacts, setDepartmentImpacts] = useState<DepartmentImpact[]>([]);
  const [aiInsights, setAIInsights] = useState<AIInsightData | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [futureProjectInsights, setFutureProjectInsights] = useState<AIInsightData | null>(null);
  const [isLoadingFutureInsights, setIsLoadingFutureInsights] = useState(false);

  // Fetch all projects to analyze team impacts
  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: open && !!project
  });

  // Fetch manufacturing schedules to understand team assignments
  const { data: manufacturingSchedules = [] } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
    enabled: open && !!project
  });

  // Fetch manufacturing bays/teams
  const { data: manufacturingBays = [] } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
    enabled: open && !!project
  });

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
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Color palette for professional PDF styling
      const colors = {
        primary: [34, 139, 34],     // Forest Green for headers
        secondary: [70, 130, 180],   // Steel Blue for sub-headers
        danger: [220, 53, 69],       // Red for critical/delayed items
        warning: [255, 193, 7],      // Amber for warnings
        success: [40, 167, 69],      // Green for success/advanced
        info: [23, 162, 184],        // Teal for info
        gray: [108, 117, 125],       // Gray for normal text
        lightGray: [248, 249, 250],  // Light gray for backgrounds
        white: [255, 255, 255]       // White
      };

      // Helper functions for styling
      const setHeaderColor = () => pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      const setSubHeaderColor = () => pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      const setNormalColor = () => pdf.setTextColor(0, 0, 0);
      const setDangerColor = () => pdf.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
      const setWarningColor = () => pdf.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
      const setSuccessColor = () => pdf.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
      const setInfoColor = () => pdf.setTextColor(colors.info[0], colors.info[1], colors.info[2]);

      const drawColoredBox = (x: number, y: number, width: number, height: number, color: number[]) => {
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.rect(x, y, width, height, 'F');
      };

      const checkPageBreak = (requiredSpace: number = 20) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // ==================== TITLE PAGE ====================
      // Header banner
      drawColoredBox(0, 0, pageWidth, 40, colors.primary);
      
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('PROJECT IMPACT ASSESSMENT', pageWidth / 2, 25, { align: 'center' });
      
      yPosition = 60;

      // Project Information Box
      drawColoredBox(margin, yPosition, pageWidth - 2 * margin, 50, colors.lightGray);
      pdf.setFontSize(16);
      setHeaderColor();
      pdf.setFont('helvetica', 'bold');
      pdf.text('PROJECT DETAILS', margin + 10, yPosition + 15);
      
      pdf.setFontSize(12);
      setNormalColor();
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Project: ${project.name || 'N/A'}`, margin + 10, yPosition + 25);
      pdf.text(`Project Number: ${project.projectNumber || 'N/A'}`, margin + 10, yPosition + 35);
      pdf.text(`Assessment Date: ${new Date().toLocaleDateString()}`, margin + 10, yPosition + 45);
      
      yPosition += 70;

      // Calculate key metrics
      const totalDelayedPhases = dateVariances.filter(v => v.isDelayed).length;
      const totalAdvancedPhases = dateVariances.length - totalDelayedPhases;
      const maxDelay = dateVariances.length > 0 ? Math.max(...dateVariances.map(v => Math.abs(v.daysDifference))) : 0;
      const criticalDepartments = departmentImpacts.filter(d => d.impactLevel === 'critical').length;
      const highImpactDepartments = departmentImpacts.filter(d => d.impactLevel === 'high').length;

      // Metrics boxes
      const boxWidth = (pageWidth - 4 * margin) / 3;
      const boxHeight = 25;
      
      // Schedule Variances Box
      if (totalDelayedPhases > 0) {
        drawColoredBox(margin, yPosition, boxWidth, boxHeight, colors.danger);
        pdf.setTextColor(255, 255, 255);
      } else {
        drawColoredBox(margin, yPosition, boxWidth, boxHeight, colors.success);
        pdf.setTextColor(255, 255, 255);
      }
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${dateVariances.length} Schedule Variances`, margin + 5, yPosition + 8);
      pdf.setFontSize(10);
      pdf.text(`${totalDelayedPhases} Delayed | ${totalAdvancedPhases} Advanced`, margin + 5, yPosition + 18);

      // Department Impact Box
      const deptBoxX = margin + boxWidth + 10;
      if (criticalDepartments > 0) {
        drawColoredBox(deptBoxX, yPosition, boxWidth, boxHeight, colors.danger);
      } else if (highImpactDepartments > 0) {
        drawColoredBox(deptBoxX, yPosition, boxWidth, boxHeight, colors.warning);
      } else {
        drawColoredBox(deptBoxX, yPosition, boxWidth, boxHeight, colors.info);
      }
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${departmentImpacts.length} Departments Affected`, deptBoxX + 5, yPosition + 8);
      pdf.setFontSize(10);
      pdf.text(`${criticalDepartments} Critical | ${highImpactDepartments} High Impact`, deptBoxX + 5, yPosition + 18);

      // Max Delay Box
      const delayBoxX = margin + 2 * boxWidth + 20;
      if (maxDelay > 10) {
        drawColoredBox(delayBoxX, yPosition, boxWidth, boxHeight, colors.danger);
      } else if (maxDelay > 5) {
        drawColoredBox(delayBoxX, yPosition, boxWidth, boxHeight, colors.warning);
      } else {
        drawColoredBox(delayBoxX, yPosition, boxWidth, boxHeight, colors.success);
      }
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${maxDelay} Max Delay Days`, delayBoxX + 5, yPosition + 8);
      pdf.setFontSize(10);
      pdf.text('Critical Timeline Impact', delayBoxX + 5, yPosition + 18);

      yPosition += 40;

      // Executive Summary
      checkPageBreak(40);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Executive Summary', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Use previously calculated metrics
      
      const summaryText = `This impact assessment has identified ${dateVariances.length} schedule variance(s) that will affect ${departmentImpacts.length} department(s) across the organization. The total cumulative delay impact is ${maxDelay} days based on the most critical timeline variance.

Critical Metrics:
• Total Delayed Phases: ${totalDelayedPhases}
• Advanced Phases: ${dateVariances.length - totalDelayedPhases}
• Critical Departments: ${criticalDepartments}
• High Impact Departments: ${highImpactDepartments}

Immediate Actions Required:
• Customer notification and expectation management
• Resource reallocation and schedule optimization
• Vendor and supplier coordination
• Financial impact assessment and mitigation
• Cross-departmental communication protocol`;

      const splitSummary = pdf.splitTextToSize(summaryText, pageWidth - 2 * margin);
      pdf.text(splitSummary, margin, yPosition);
      yPosition += splitSummary.length * 5 + 15;

      // Date Variances Table
      if (dateVariances.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Schedule Variances', margin, yPosition);
        yPosition += 10;

        const tableData = dateVariances.map(variance => [
          variance.displayName,
          safeFormatDate(variance.opDate),
          safeFormatDate(variance.currentDate),
          `${variance.daysDifference > 0 ? '+' : ''}${variance.daysDifference} days`,
          variance.isDelayed ? 'Delayed' : 'Advanced'
        ]);

        // Create table manually to avoid autoTable issues
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        
        // Table headers
        const colWidths = [40, 35, 35, 25, 25];
        const headers = ['Phase', 'Original Plan', 'Current Date', 'Variance', 'Status'];
        let xPos = margin;
        
        headers.forEach((header, i) => {
          pdf.text(header, xPos, yPosition);
          xPos += colWidths[i];
        });
        yPosition += 8;

        // Draw header line
        pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
        yPosition += 5;

        // Table data
        pdf.setFont('helvetica', 'normal');
        dateVariances.forEach(variance => {
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          xPos = margin;
          
          const rowData = [
            variance.displayName || 'N/A',
            safeFormatDate(variance.opDate),
            safeFormatDate(variance.currentDate),
            `${variance.daysDifference > 0 ? '+' : ''}${variance.daysDifference} days`,
            variance.isDelayed ? 'Delayed' : 'Advanced'
          ];

          rowData.forEach((data, i) => {
            const wrappedText = pdf.splitTextToSize(data, colWidths[i] - 2);
            pdf.text(wrappedText, xPos, yPosition);
            xPos += colWidths[i];
          });
          yPosition += 12;
        });
        yPosition += 15;
      }

      // Department Impacts
      if (departmentImpacts.length > 0) {
        // Check if we need a new page
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Department Impact Analysis', margin, yPosition);
        yPosition += 15;

        departmentImpacts.forEach((impact, index) => {
          checkPageBreak(60);

          // Department header
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}. ${impact.department} Department`, margin, yPosition);
          yPosition += 8;

          // Impact level badge
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Impact Level: ${impact.impactLevel.toUpperCase()}`, margin, yPosition);
          yPosition += 6;

          // Description
          const descText = pdf.splitTextToSize(impact.description, pageWidth - 2 * margin);
          pdf.text(descText, margin, yPosition);
          yPosition += descText.length * 5 + 5;

          // Specific Impacts
          pdf.setFont('helvetica', 'bold');
          pdf.text('Specific Impacts:', margin, yPosition);
          yPosition += 6;
          pdf.setFont('helvetica', 'normal');
          
          impact.specificImpacts.forEach(item => {
            checkPageBreak(10);
            const itemText = pdf.splitTextToSize(`• ${item}`, pageWidth - 2 * margin - 10);
            pdf.text(itemText, margin + 10, yPosition);
            yPosition += itemText.length * 5;
          });
          yPosition += 5;

          // Mitigation Actions
          checkPageBreak(20);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Mitigation Actions:', margin, yPosition);
          yPosition += 6;
          pdf.setFont('helvetica', 'normal');
          
          impact.mitigationActions.forEach(action => {
            checkPageBreak(10);
            const actionText = pdf.splitTextToSize(`• ${action}`, pageWidth - 2 * margin - 10);
            pdf.text(actionText, margin + 10, yPosition);
            yPosition += actionText.length * 5;
          });

          // Additional impact details
          if (impact.estimatedCost) {
            yPosition += 3;
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Estimated Cost Impact: ${impact.estimatedCost}`, margin, yPosition);
            yPosition += 6;
          }

          if (impact.timelineImpact) {
            pdf.text(`Timeline Impact: ${impact.timelineImpact}`, margin, yPosition);
            yPosition += 6;
          }

          yPosition += 15;
        });
      }

      // AI Insights Section
      if (aiInsights && aiInsights.insights && aiInsights.insights.length > 0) {
        checkPageBreak(40);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('AI-Generated Insights', margin, yPosition);
        yPosition += 10;

        if (aiInsights.summary) {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'italic');
          const summaryText = pdf.splitTextToSize(aiInsights.summary, pageWidth - 2 * margin);
          pdf.text(summaryText, margin, yPosition);
          yPosition += summaryText.length * 5 + 10;
        }

        pdf.setFont('helvetica', 'normal');
        aiInsights.insights.forEach((insight, index) => {
          checkPageBreak(15);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}. ${insight.text}`, margin, yPosition);
          yPosition += 6;
          
          if (insight.detail) {
            pdf.setFont('helvetica', 'normal');
            const detailText = pdf.splitTextToSize(insight.detail, pageWidth - 2 * margin - 10);
            pdf.text(detailText, margin + 10, yPosition);
            yPosition += detailText.length * 5 + 5;
          }
        });

        if (aiInsights.confidence !== undefined) {
          yPosition += 10;
          pdf.setFont('helvetica', 'italic');
          pdf.text(`AI Confidence Level: ${Math.round(aiInsights.confidence * 100)}%`, margin, yPosition);
        }
      }

      // Future Projects Impact (if available)
      if (futureProjectInsights && futureProjectInsights.insights && futureProjectInsights.insights.length > 0) {
        checkPageBreak(40);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Future Scheduled Projects Impact', margin, yPosition);
        yPosition += 15;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        futureProjectInsights.insights.forEach((insight, index) => {
          checkPageBreak(15);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}. ${insight.text}`, margin, yPosition);
          yPosition += 6;
          
          if (insight.detail) {
            pdf.setFont('helvetica', 'normal');
            const detailText = pdf.splitTextToSize(insight.detail, pageWidth - 2 * margin - 10);
            pdf.text(detailText, margin + 10, yPosition);
            yPosition += detailText.length * 5 + 5;
          }
        });
      }

      // ==================== SECTION 4: FUTURE PROJECTS ====================
      if (futureProjectInsights && futureProjectInsights.insights.length > 0) {
        checkPageBreak(40);
        setHeaderColor();
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('4. FUTURE PROJECT ANALYSIS', margin, yPosition);
        yPosition += 15;

        setNormalColor();
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        
        futureProjectInsights.insights.forEach((insight, index) => {
          checkPageBreak(20);
          
          // Insight with severity indicator
          let severityColor = colors.info;
          if (insight.severity === 'danger') severityColor = colors.danger;
          else if (insight.severity === 'warning') severityColor = colors.warning;
          else if (insight.severity === 'success') severityColor = colors.success;
          
          // Severity indicator
          drawColoredBox(margin, yPosition - 2, 3, 10, severityColor);
          
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}. ${insight.text}`, margin + 8, yPosition + 3);
          yPosition += 12;
          
          if (insight.detail) {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            const detailText = pdf.splitTextToSize(insight.detail, pageWidth - 2 * margin - 10);
            pdf.text(detailText, margin + 8, yPosition);
            yPosition += detailText.length * 5 + 8;
          }
        });
        
        yPosition += 15;
      }

      // ==================== SECTION 5: AI INSIGHTS ====================
      if (aiInsights && aiInsights.insights.length > 0) {
        checkPageBreak(40);
        setHeaderColor();
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('5. AI-POWERED INSIGHTS', margin, yPosition);
        yPosition += 15;

        // AI Summary
        setSubHeaderColor();
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Executive Summary', margin, yPosition);
        yPosition += 10;

        setNormalColor();
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const summaryText = pdf.splitTextToSize(aiInsights.summary, pageWidth - 2 * margin);
        pdf.text(summaryText, margin, yPosition);
        yPosition += summaryText.length * 5 + 15;

        // Confidence indicator
        const confidence = Math.round((aiInsights.confidence || 0.8) * 100);
        setInfoColor();
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`AI Confidence Level: ${confidence}%`, margin, yPosition);
        yPosition += 15;

        // AI Insights
        setSubHeaderColor();
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Detailed Analysis', margin, yPosition);
        yPosition += 10;

        aiInsights.insights.forEach((insight, index) => {
          checkPageBreak(25);
          
          // Insight severity indicator
          let severityColor = colors.info;
          if (insight.severity === 'danger') severityColor = colors.danger;
          else if (insight.severity === 'warning') severityColor = colors.warning;
          else if (insight.severity === 'success') severityColor = colors.success;
          
          drawColoredBox(margin, yPosition - 2, 4, 12, severityColor);
          
          setNormalColor();
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}. ${insight.text}`, margin + 8, yPosition + 3);
          yPosition += 12;
          
          if (insight.detail) {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            const detailText = pdf.splitTextToSize(insight.detail, pageWidth - 2 * margin - 10);
            pdf.text(detailText, margin + 8, yPosition);
            yPosition += detailText.length * 5 + 8;
          }
        });
      }

      // ==================== FOOTER ====================
      const finalTotalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= finalTotalPages; i++) {
        pdf.setPage(i);
        
        // Footer line
        pdf.setDrawColor(colors.gray[0], colors.gray[1], colors.gray[2]);
        pdf.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);
        
        // Footer text
        setNormalColor();
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`TIER IV PRO - Impact Assessment Report`, margin, pageHeight - 15);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, pageHeight - 10);
        pdf.text(`Page ${i} of ${finalTotalPages}`, pageWidth - margin - 30, pageHeight - 10);
      }

      // Save the PDF with enhanced filename
      const timestamp = new Date().toISOString().split('T')[0];
      const finalFileName = `Impact-Assessment-${project.projectNumber}-${timestamp}.pdf`;
      pdf.save(finalFileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again or contact support if the issue persists.');
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="departments">Department Impact</TabsTrigger>
            <TabsTrigger value="timeline">Timeline Analysis</TabsTrigger>
            <TabsTrigger value="future-projects">Future Projects</TabsTrigger>
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
                              Original: {safeFormatDate(variance.opDate)} → 
                              Current: {safeFormatDate(variance.currentDate)}
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
                                    ({safeFormatDate(variance.opDate)} → {safeFormatDate(variance.currentDate)})
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

            <TabsContent value="future-projects" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Future Scheduled Projects Impact
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Analysis of how schedule changes may affect other projects in the same manufacturing teams
                  </p>
                </CardHeader>
                <CardContent>
                  {isLoadingFutureInsights ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Analyzing team project impacts...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Team Impact Analysis */}
                      <div className="space-y-4">
                        <h4 className="font-semibold">Team Project Analysis</h4>
                        <div className="grid gap-4">
                          {(() => {
                            // Find manufacturing schedules for current project
                            const currentSchedules = manufacturingSchedules.filter((schedule: any) => 
                              schedule.projectId === project.id
                            );
                            
                            // Get team assignments for affected bays
                            const affectedTeamIds = currentSchedules.map((schedule: any) => schedule.bayId);
                            const affectedTeams = manufacturingBays.filter((bay: any) => 
                              affectedTeamIds.includes(bay.id)
                            );
                            
                            // Find other projects in same teams
                            const teamProjectsMap = new Map();
                            
                            affectedTeams.forEach((team: any) => {
                              const teamSchedules = manufacturingSchedules.filter((schedule: any) => 
                                schedule.bayId === team.id && schedule.projectId !== project.id
                              );
                              
                              const teamProjects = teamSchedules.map((schedule: any) => {
                                const proj = allProjects.find(p => p.id === schedule.projectId);
                                return proj ? { ...proj, schedule } : null;
                              }).filter(Boolean);
                              
                              if (teamProjects.length > 0) {
                                teamProjectsMap.set(team.name, {
                                  team,
                                  projects: teamProjects
                                });
                              }
                            });

                            if (teamProjectsMap.size === 0) {
                              return (
                                <div className="text-center py-8 text-muted-foreground">
                                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                  <p>No other projects found in affected manufacturing teams.</p>
                                </div>
                              );
                            }

                            return Array.from(teamProjectsMap.entries()).map(([teamName, data]: [string, any]) => (
                              <Card key={teamName} className="border-l-4 border-l-orange-400">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Wrench className="h-4 w-4" />
                                    {teamName} Team
                                  </CardTitle>
                                  <p className="text-sm text-muted-foreground">
                                    {data.projects.length} project{data.projects.length !== 1 ? 's' : ''} potentially affected
                                  </p>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    {data.projects.map((proj: any) => (
                                      <div key={proj.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                          <div>
                                            <h5 className="font-medium">{proj.name}</h5>
                                            <p className="text-sm text-muted-foreground">#{proj.projectNumber}</p>
                                          </div>
                                          <Badge variant="outline">{proj.status}</Badge>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                          <div>
                                            <span className="text-muted-foreground">Production Start:</span>
                                            <p className="font-medium">{safeFormatDate(proj.productionStart)}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Ship Date:</span>
                                            <p className="font-medium">{safeFormatDate(proj.shipDate)}</p>
                                          </div>
                                        </div>
                                        
                                        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                                          ⚠️ May be impacted by schedule changes to {project.projectNumber}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* AI Insights for Future Projects */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Bot className="h-5 w-5" />
                          <h4 className="font-semibold">AI Insights - Team Impact Analysis</h4>
                        </div>
                        
                        {futureProjectInsights ? (
                          <div className="space-y-3">
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <h5 className="font-semibold mb-2">Team Impact Summary</h5>
                              <p className="text-sm">{futureProjectInsights.summary}</p>
                              <div className="mt-2 text-xs text-muted-foreground">
                                Analysis Confidence: {Math.round((futureProjectInsights.confidence || 0) * 100)}%
                              </div>
                            </div>

                            <div className="space-y-3">
                              {futureProjectInsights.insights.map((insight, index) => (
                                <div key={index} className="p-3 border rounded-lg">
                                  <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                      insight.severity === 'danger' ? 'bg-red-500' : 
                                      insight.severity === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                                    }`} />
                                    <div className="flex-1">
                                      <p className="font-medium">{insight.text}</p>
                                      {insight.detail && (
                                        <p className="text-sm text-muted-foreground mt-1">{insight.detail}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => {
                              setIsLoadingFutureInsights(true);
                              
                              // Find affected teams for context
                              const currentSchedules = manufacturingSchedules.filter((schedule: any) => 
                                schedule.projectId === project.id
                              );
                              const affectedTeamIds = currentSchedules.map((schedule: any) => schedule.bayId);
                              const affectedTeams = manufacturingBays.filter((bay: any) => 
                                affectedTeamIds.includes(bay.id)
                              );

                              // Generate AI insights for future project impacts
                              apiRequest('POST', '/api/ai/impact-assessment', {
                                project: {
                                  id: project.id,
                                  name: project.name,
                                  projectNumber: project.projectNumber,
                                  status: project.status
                                },
                                dateVariances,
                                analysisType: 'future-projects',
                                affectedTeams: affectedTeams.map((team: any) => team.name),
                                teamProjects: affectedTeams.reduce((acc: any, team: any) => {
                                  const teamSchedules = manufacturingSchedules.filter((schedule: any) => 
                                    schedule.bayId === team.id && schedule.projectId !== project.id
                                  );
                                  
                                  const teamProjects = teamSchedules.map((schedule: any) => {
                                    const proj = allProjects.find(p => p.id === schedule.projectId);
                                    return proj ? {
                                      id: proj.id,
                                      name: proj.name,
                                      projectNumber: proj.projectNumber,
                                      status: proj.status,
                                      productionStart: proj.productionStart,
                                      shipDate: proj.shipDate
                                    } : null;
                                  }).filter(Boolean);
                                  
                                  acc[team.name] = teamProjects;
                                  return acc;
                                }, {})
                              }).then(response => {
                                if (response.ok) {
                                  return response.json();
                                }
                                throw new Error('Failed to generate insights');
                              }).then(data => {
                                setFutureProjectInsights(data);
                              }).catch(error => {
                                console.error('Error generating future project insights:', error);
                                setFutureProjectInsights({
                                  insights: [
                                    {
                                      severity: 'warning',
                                      text: 'Unable to generate detailed team impact analysis',
                                      detail: 'Please review affected teams manually to assess potential impacts'
                                    }
                                  ],
                                  confidence: 0.5,
                                  summary: 'Manual review recommended for comprehensive team impact assessment'
                                });
                              }).finally(() => {
                                setIsLoadingFutureInsights(false);
                              });
                            }}
                            className="w-full"
                            disabled={isLoadingFutureInsights}
                          >
                            <Bot className="h-4 w-4 mr-2" />
                            Generate Team Impact AI Analysis
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
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