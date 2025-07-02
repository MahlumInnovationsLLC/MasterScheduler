
import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subMonths, startOfYear, startOfMonth } from 'date-fns';
import { ArrowLeft, Download, FileType, Save, PlusCircle, Calendar, File, FileSpreadsheet, FileText, Settings, Columns, Edit, Trash, FileOutput, Clock, RefreshCw, BarChart3 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { Project, BillingMilestone, ManufacturingSchedule } from '@shared/schema';
import { ModuleHelpButton } from '@/components/ModuleHelpButton';
import { exportDataHelpContent } from '@/data/moduleHelpContent';

// Define template types
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  module: string;
  subType: string;
  format: 'csv' | 'pdf' | 'docx';
  dateRange: string;
  fields: string[];
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;
}

// Define available modules and their subtypes
const REPORT_MODULES = [
  {
    id: 'financial',
    name: 'Financial',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    subTypes: [
      { id: 'billing-milestones', name: 'Billing Milestones' },
      { id: 'invoices', name: 'Invoices' },
      { id: 'payments', name: 'Payments' },
      { id: 'financial-summary', name: 'Financial Summary' }
    ],
    availableFields: [
      { id: 'milestone_id', name: 'Milestone ID' },
      { id: 'project_id', name: 'Project ID' },
      { id: 'project_number', name: 'Project Number' },
      { id: 'project_name', name: 'Project Name' },
      { id: 'milestone_name', name: 'Milestone Name' },
      { id: 'amount', name: 'Amount' },
      { id: 'status', name: 'Status' },
      { id: 'target_date', name: 'Target Date' },
      { id: 'actual_date', name: 'Actual Date' },
      { id: 'payment_date', name: 'Payment Date' }
    ]
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    icon: <Settings className="h-5 w-5" />,
    subTypes: [
      { id: 'bay-schedules', name: 'Bay Schedules' },
      { id: 'production-metrics', name: 'Production Metrics' },
      { id: 'utilization', name: 'Bay Utilization' },
      { id: 'manufacturing-summary', name: 'Manufacturing Summary' }
    ],
    availableFields: [
      { id: 'bay_id', name: 'Bay ID' },
      { id: 'bay_name', name: 'Bay Name' },
      { id: 'project_id', name: 'Project ID' },
      { id: 'project_name', name: 'Project Name' },
      { id: 'start_date', name: 'Start Date' },
      { id: 'end_date', name: 'End Date' },
      { id: 'duration', name: 'Duration (Days)' },
      { id: 'total_hours', name: 'Total Hours' },
      { id: 'utilization_rate', name: 'Utilization Rate' },
      { id: 'status', name: 'Status' }
    ]
  },
  {
    id: 'project',
    name: 'Project Status',
    icon: <File className="h-5 w-5" />,
    subTypes: [
      { id: 'active-projects', name: 'Active Projects' },
      { id: 'completed-projects', name: 'Completed Projects' },
      { id: 'delayed-projects', name: 'Delayed Projects' },
      { id: 'project-timelines', name: 'Project Timelines' }
    ],
    availableFields: [
      { id: 'project_id', name: 'Project ID' },
      { id: 'project_number', name: 'Project Number' },
      { id: 'project_name', name: 'Project Name' },
      { id: 'status', name: 'Status' },
      { id: 'risk_level', name: 'Risk Level' },
      { id: 'start_date', name: 'Start Date' },
      { id: 'estimated_completion', name: 'Est. Completion' },
      { id: 'percent_complete', name: 'Percent Complete' },
      { id: 'ship_date', name: 'Ship Date' },
      { id: 'total_hours', name: 'Total Hours' }
    ]
  },
  {
    id: 'delivery',
    name: 'Delivery & OTD',
    icon: <FileText className="h-5 w-5" />,
    subTypes: [
      { id: 'delivered-projects', name: 'Delivered Projects' },
      { id: 'delivery-tracking', name: 'Delivery Tracking' },
      { id: 'on-time-delivery', name: 'On-Time Delivery Metrics' },
      { id: 'shipping-details', name: 'Shipping Details' }
    ],
    availableFields: [
      { id: 'tracking_id', name: 'Tracking ID' },
      { id: 'project_id', name: 'Project ID' },
      { id: 'project_name', name: 'Project Name' },
      { id: 'scheduled_date', name: 'Scheduled Date' },
      { id: 'actual_date', name: 'Actual Date' },
      { id: 'carrier', name: 'Carrier' },
      { id: 'tracking_number', name: 'Tracking Number' },
      { id: 'status', name: 'Status' },
      { id: 'notes', name: 'Notes' }
    ]
  },
  {
    id: 'mech-shop',
    name: 'Mech Shop',
    icon: <Settings className="h-5 w-5" />,
    subTypes: [
      { id: 'mech-shop-schedule', name: 'Mech Shop Schedule' },
      { id: 'mech-shop-utilization', name: 'Mech Shop Utilization' },
      { id: 'mech-shop-summary', name: 'Mech Shop Summary' }
    ],
    availableFields: [
      { id: 'project_id', name: 'Project ID' },
      { id: 'project_number', name: 'Project Number' },
      { id: 'project_name', name: 'Project Name' },
      { id: 'mech_shop_date', name: 'Mech Shop Date' },
      { id: 'production_start', name: 'Production Start' },
      { id: 'days_before_production', name: 'Days Before Production' },
      { id: 'status', name: 'Status' }
    ]
  },
  {
    id: 'nomad-gcs-analytics',
    name: 'Nomad GCS Analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    subTypes: [
      { id: 'phase-handoffs', name: 'Phase Handoff Performance' },
      { id: 'schedule-changes', name: 'Schedule Change Control' },
      { id: 'delivery-variance', name: 'Delivery vs Original Plan' },
      { id: 'timeline-recovery', name: 'Timeline Recovery Analysis' }
    ],
    availableFields: [
      { id: 'project_id', name: 'Project ID' },
      { id: 'project_number', name: 'Project Number' },
      { id: 'project_name', name: 'Project Name' },
      { id: 'phase_type', name: 'Phase Type' },
      { id: 'original_date', name: 'Original Planned Date' },
      { id: 'actual_date', name: 'Actual Date' },
      { id: 'variance_days', name: 'Variance (Days)' },
      { id: 'recovery_status', name: 'Recovery Status' }
    ]
  }
];

// Default templates
const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'financial-default',
    name: 'Financial Summary',
    description: 'Default financial report with billing milestones and payment status',
    module: 'financial',
    subType: 'financial-summary',
    format: 'csv',
    dateRange: '6months',
    fields: ['project_number', 'project_name', 'milestone_name', 'amount', 'status', 'target_date', 'actual_date', 'payment_date'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: 'manufacturing-default',
    name: 'Manufacturing Schedule',
    description: 'Default manufacturing schedule report with bay utilization',
    module: 'manufacturing',
    subType: 'bay-schedules',
    format: 'csv',
    dateRange: '6months',
    fields: ['bay_name', 'project_name', 'start_date', 'end_date', 'duration', 'total_hours', 'status'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: 'project-default',
    name: 'Project Status Report',
    description: 'Default project status report with completion percentages',
    module: 'project',
    subType: 'active-projects',
    format: 'csv',
    dateRange: '6months',
    fields: ['project_number', 'project_name', 'status', 'risk_level', 'start_date', 'estimated_completion', 'percent_complete'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: 'delivery-default',
    name: 'Delivery Tracking Report',
    description: 'Default delivery tracking report with shipping details',
    module: 'delivery',
    subType: 'delivery-tracking',
    format: 'csv',
    dateRange: '6months',
    fields: ['project_name', 'scheduled_date', 'actual_date', 'carrier', 'tracking_number', 'status'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: 'mech-shop-default',
    name: 'Mech Shop Schedule Report',
    description: 'Default mech shop schedule with production timing',
    module: 'mech-shop',
    subType: 'mech-shop-schedule',
    format: 'csv',
    dateRange: '6months',
    fields: ['project_number', 'project_name', 'mech_shop_date', 'production_start', 'days_before_production', 'status'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: 'nomad-gcs-default',
    name: 'Nomad GCS Performance Report',
    description: 'Default Nomad GCS analytics with phase performance',
    module: 'nomad-gcs-analytics',
    subType: 'phase-handoffs',
    format: 'csv',
    dateRange: '6months',
    fields: ['project_number', 'project_name', 'phase_type', 'original_date', 'actual_date', 'variance_days', 'recovery_status'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  }
];

const ExportReportsPage = () => {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Main states
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedModule, setSelectedModule] = useState('financial');
  const [selectedSubType, setSelectedSubType] = useState('billing-milestones');
  const [timeRange, setTimeRange] = useState('6months');
  const [projectFilter, setProjectFilter] = useState('all');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'docx'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  
  // Template management states
  const [templates, setTemplates] = useState<ReportTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateDialogMode, setTemplateDialogMode] = useState<'create' | 'edit'>('create');
  
  // Get available fields based on selected module
  const currentModule = REPORT_MODULES.find(m => m.id === selectedModule);
  const availableFields = currentModule?.availableFields || [];
  const availableSubTypes = currentModule?.subTypes || [];

  // Get current date range for filtering
  const getDateRange = () => {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '3months':
        startDate = startOfMonth(subMonths(now, 3));
        break;
      case '6months':
        startDate = startOfMonth(subMonths(now, 6));
        break;
      case '12months':
        startDate = startOfMonth(subMonths(now, 12));
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = startOfMonth(subMonths(now, 6));
    }

    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(now, 'yyyy-MM-dd')
    };
  };

  const dateRange = getDateRange();

  // Fetch live data from API endpoints with auto-refresh
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: () => fetch('/api/projects').then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: billingMilestones = [], isLoading: milestonesLoading, refetch: refetchMilestones } = useQuery<BillingMilestone[]>({
    queryKey: ['/api/billing-milestones'],
    queryFn: () => fetch('/api/billing-milestones').then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: manufacturingSchedules = [], isLoading: schedulesLoading, refetch: refetchSchedules } = useQuery<ManufacturingSchedule[]>({
    queryKey: ['/api/manufacturing-schedules'],
    queryFn: () => fetch('/api/manufacturing-schedules').then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: deliveredProjectsData = [], isLoading: deliveredProjectsLoading, refetch: refetchDeliveredProjects } = useQuery({
    queryKey: ['/api/delivered-projects'],
    queryFn: () => fetch('/api/delivered-projects').then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Manual refresh function
  const handleRefresh = () => {
    refetchProjects();
    refetchMilestones();
    refetchSchedules();
    refetchDeliveredProjects();
    toast({
      title: "Data refreshed",
      description: "All export data has been updated with the latest information",
    });
  };

  // Filter data based on selected criteria
  const filteredProjects = projects.filter(project => {
    if (projectFilter !== 'all' && project.id.toString() !== projectFilter) return false;

    // Filter by date range - check if project has activity in the date range
    const projectDate = new Date(project.createdAt || 0);
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    return projectDate >= startDate || projectDate <= endDate;
  });

  const filteredMilestones = billingMilestones.filter(milestone => {
    if (projectFilter !== 'all' && milestone.projectId.toString() !== projectFilter) return false;

    if (milestone.targetInvoiceDate) {
      const milestoneDate = new Date(milestone.targetInvoiceDate);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      return milestoneDate >= startDate && milestoneDate <= endDate;
    }
    return true;
  });

  const filteredSchedules = manufacturingSchedules.filter(schedule => {
    if (projectFilter !== 'all' && schedule.projectId.toString() !== projectFilter) return false;

    const scheduleStart = new Date(schedule.startDate);
    const scheduleEnd = new Date(schedule.endDate);
    const rangeStart = new Date(dateRange.startDate);
    const rangeEnd = new Date(dateRange.endDate);

    return (scheduleStart <= rangeEnd && scheduleEnd >= rangeStart);
  });

  // Initialize selectedFields with default fields when module changes
  useEffect(() => {
    if (currentModule && currentModule.availableFields) {
      // Select first 5 fields by default or all if less than 5
      const defaultFields = currentModule.availableFields
        .slice(0, Math.min(5, currentModule.availableFields.length))
        .map(field => field.id);
      setSelectedFields(defaultFields);
    }
    
    // Select first subType by default if available
    if (availableSubTypes.length > 0) {
      setSelectedSubType(availableSubTypes[0].id);
    }
  }, [selectedModule]);

  // Calculate date range based on selected time range
  const getDateRangeStrings = (range = timeRange) => {
    let startDate = '';
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    
    switch (range) {
      case '3months':
        startDate = format(subMonths(now, 3), 'yyyy-MM-dd');
        break;
      case '6months':
        startDate = format(subMonths(now, 6), 'yyyy-MM-dd');
        break;
      case '12months':
        startDate = format(subMonths(now, 12), 'yyyy-MM-dd');
        break;
      case 'ytd':
        startDate = format(startOfYear(now), 'yyyy-MM-dd');
        break;
      case 'mtd':
        startDate = format(startOfMonth(now), 'yyyy-MM-dd');
        break;
      default:
        startDate = format(subMonths(now, 6), 'yyyy-MM-dd');
    }
    
    return { startDate, endDate };
  };

  // Function to handle template creation
  const handleCreateTemplate = () => {
    if (!newTemplateName) {
      toast({
        title: "Template name required",
        description: "Please provide a name for your template",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedFields.length === 0) {
      toast({
        title: "Fields required",
        description: "Please select at least one field for your template",
        variant: "destructive",
      });
      return;
    }
    
    const newTemplate: ReportTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplateName,
      description: newTemplateDesc || `Custom template for ${currentModule?.name} reports`,
      module: selectedModule,
      subType: selectedSubType,
      format: exportFormat,
      dateRange: timeRange,
      fields: selectedFields,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: false
    };
    
    // Add to templates list
    setTemplates([...templates, newTemplate]);
    
    // Reset form
    setNewTemplateName('');
    setNewTemplateDesc('');
    setShowTemplateDialog(false);
    
    toast({
      title: "Template created",
      description: "Your report template has been saved",
      variant: "default",
    });
  };

  // Function to handle template update
  const handleUpdateTemplate = () => {
    if (!selectedTemplate) return;
    
    const updatedTemplates = templates.map(template => {
      if (template.id === selectedTemplate.id) {
        return {
          ...template,
          name: newTemplateName || template.name,
          description: newTemplateDesc || template.description,
          module: selectedModule,
          subType: selectedSubType,
          format: exportFormat,
          dateRange: timeRange,
          fields: selectedFields,
          updatedAt: new Date()
        };
      }
      return template;
    });
    
    setTemplates(updatedTemplates);
    setShowTemplateDialog(false);
    
    toast({
      title: "Template updated",
      description: "Your report template has been updated",
      variant: "default",
    });
  };

  // Function to delete a template
  const handleDeleteTemplate = (id: string) => {
    const updatedTemplates = templates.filter(t => t.id !== id);
    setTemplates(updatedTemplates);
    
    toast({
      title: "Template deleted",
      description: "The report template has been removed",
      variant: "default",
    });
  };

  // Function to load a template for editing
  const handleEditTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setSelectedModule(template.module);
    setSelectedSubType(template.subType);
    setTimeRange(template.dateRange);
    setExportFormat(template.format);
    setSelectedFields(template.fields);
    setNewTemplateName(template.name);
    setNewTemplateDesc(template.description);
    setTemplateDialogMode('edit');
    setShowTemplateDialog(true);
  };

  // Function to export a report based on template or manual selection
  const handleExport = async (template?: ReportTemplate) => {
    try {
      setIsExporting(true);
      
      // If template provided, use its values, otherwise use selected values
      const moduleType = template ? template.module : selectedModule;
      const subType = template ? template.subType : selectedSubType;
      const selectedDateRange = template ? template.dateRange : timeRange;
      const exportFileFormat = template ? template.format : exportFormat;
      const fieldList = template ? template.fields : selectedFields;
      
      // Get date range
      const dateRange = getDateRangeStrings(selectedDateRange);
      
      // Prepare the export request data
      const exportData = {
        module: moduleType,
        subType: subType,
        dateRange: dateRange,
        format: exportFileFormat, // This is the file format (csv, pdf, docx)
        fields: fieldList,
        templateName: template?.name || 'Custom Export',
        projectId: projectFilter !== 'all' ? parseInt(projectFilter) : undefined
      };
      
      console.log('Exporting report with data:', exportData);
      
      // Fetch the data from the API
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export error response:', errorText);
        throw new Error(`Failed to export report: ${response.status} ${response.statusText}`);
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link and trigger the download
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      // Determine file extension based on export format
      const fileExtension = exportFileFormat === 'csv' ? 'csv' : 
                           exportFileFormat === 'pdf' ? 'pdf' : 'docx';
      
      // Get current date formatted as string using date-fns
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      
      // Set download filename
      a.download = `${moduleType}-${subType}-report-${dateStr}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: `Report has been exported as ${fileExtension.toUpperCase()}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Could not export report data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Function to open create template dialog
  const openCreateTemplateDialog = () => {
    setSelectedTemplate(null);
    setNewTemplateName('');
    setNewTemplateDesc('');
    setTemplateDialogMode('create');
    setShowTemplateDialog(true);
  };

  // Function to toggle field selection
  const toggleFieldSelection = (fieldId: string) => {
    if (selectedFields.includes(fieldId)) {
      setSelectedFields(selectedFields.filter(id => id !== fieldId));
    } else {
      setSelectedFields([...selectedFields, fieldId]);
    }
  };

  // Get module-specific templates
  const getModuleTemplates = (moduleId: string) => {
    return templates.filter(t => t.module === moduleId);
  };

  const isLoading = projectsLoading || milestonesLoading || schedulesLoading || deliveredProjectsLoading;

  return (
    <div className="container mx-auto py-6 max-w-7xl px-4 sm:px-6">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            className="mr-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold">Export Reports</h1>
              <p className="text-muted-foreground">Create and export custom reports with live data</p>
            </div>
            <ModuleHelpButton moduleId="export" helpContent={exportDataHelpContent} />
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
              <SelectItem value="ytd">Year-to-Date</SelectItem>
              <SelectItem value="mtd">Month-to-Date</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => handleExport()} disabled={isExporting || selectedFields.length === 0}>
            {isExporting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin inline-block border-2 border-current border-t-transparent text-primary rounded-full" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-4 mb-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-3"></div>
          <span className="text-blue-700">Loading latest data...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Tabs 
            defaultValue="templates" 
            className="w-full" 
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="mb-4">
              <TabsTrigger value="templates">Saved Templates</TabsTrigger>
              <TabsTrigger value="custom">Custom Report</TabsTrigger>
            </TabsList>
            
            {/* Saved Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Report Templates</h2>
                <Button onClick={openCreateTemplateDialog}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
              
              {REPORT_MODULES.map(module => {
                const moduleTemplates = getModuleTemplates(module.id);
                if (moduleTemplates.length === 0) return null;
                
                return (
                  <div key={module.id} className="mb-6">
                    <div className="flex items-center mb-3">
                      {module.icon}
                      <h3 className="text-lg font-medium ml-2">{module.name} Reports</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {moduleTemplates.map(template => (
                        <Card key={template.id} className={template.isDefault ? "border-primary border-2" : ""}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              {template.isDefault && (
                                <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">Default</span>
                              )}
                            </div>
                            <CardDescription className="text-xs line-clamp-2">{template.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div className="flex items-center">
                                <FileType className="h-3 w-3 mr-1" />
                                <span>Format: {template.format.toUpperCase()}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>Time Range: {
                                  template.dateRange === '3months' ? 'Last 3 Months' :
                                  template.dateRange === '6months' ? 'Last 6 Months' :
                                  template.dateRange === '12months' ? 'Last 12 Months' :
                                  template.dateRange === 'ytd' ? 'Year to Date' :
                                  template.dateRange === 'mtd' ? 'Month to Date' : template.dateRange
                                }</span>
                              </div>
                              <div className="flex items-center">
                                <Columns className="h-3 w-3 mr-1" />
                                <span>Fields: {template.fields.length}</span>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter className="flex justify-between pt-2">
                            <Button variant="outline" size="sm" onClick={() => handleExport(template)} disabled={isExporting}>
                              <Download className="h-3 w-3 mr-1" />
                              Export
                            </Button>
                            {!template.isDefault && (
                              <div className="flex">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditTemplate(template)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteTemplate(template.id)}>
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
            
            {/* Custom Report Tab */}
            <TabsContent value="custom" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create Custom Report</CardTitle>
                  <CardDescription>Configure a one-time custom report export</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>Module</Label>
                        <Select value={selectedModule} onValueChange={setSelectedModule}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Module" />
                          </SelectTrigger>
                          <SelectContent>
                            {REPORT_MODULES.map(module => (
                              <SelectItem key={module.id} value={module.id}>
                                <div className="flex items-center">
                                  {module.icon}
                                  <span className="ml-2">{module.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Report Type</Label>
                        <Select 
                          value={selectedSubType} 
                          onValueChange={setSelectedSubType}
                          disabled={availableSubTypes.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Report Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSubTypes.map(subType => (
                              <SelectItem key={subType.id} value={subType.id}>
                                {subType.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Time Range</Label>
                        <Select value={timeRange} onValueChange={setTimeRange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Time Range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3months">Last 3 Months</SelectItem>
                            <SelectItem value="6months">Last 6 Months</SelectItem>
                            <SelectItem value="12months">Last 12 Months</SelectItem>
                            <SelectItem value="ytd">Year to Date</SelectItem>
                            <SelectItem value="mtd">Month to Date</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Export Format</Label>
                        <RadioGroup 
                          value={exportFormat} 
                          onValueChange={(value) => setExportFormat(value as 'csv' | 'pdf' | 'docx')}
                          className="flex space-x-4 mt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="csv" id="csv" />
                            <Label htmlFor="csv" className="flex items-center">
                              <FileSpreadsheet className="h-4 w-4 mr-1" />
                              CSV
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pdf" id="pdf" />
                            <Label htmlFor="pdf" className="flex items-center">
                              <FileOutput className="h-4 w-4 mr-1" />
                              PDF
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="docx" id="docx" />
                            <Label htmlFor="docx" className="flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              Word
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="mb-2 block">Select Fields to Include</Label>
                      <ScrollArea className="h-[300px] border rounded-md p-4">
                        <div className="space-y-2">
                          {availableFields.map(field => (
                            <div key={field.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`field-${field.id}`} 
                                checked={selectedFields.includes(field.id)}
                                onCheckedChange={() => toggleFieldSelection(field.id)}
                              />
                              <Label htmlFor={`field-${field.id}`} className="cursor-pointer">
                                {field.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Selected {selectedFields.length} of {availableFields.length} fields
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={openCreateTemplateDialog}>
                      <Save className="h-4 w-4 mr-2" />
                      Save as Template
                    </Button>
                    <Button onClick={() => handleExport()} disabled={isExporting || selectedFields.length === 0}>
                      {isExporting ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin inline-block border-2 border-current border-t-transparent text-primary rounded-full" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Export Report
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Report Filters and Live Data Status */}
        <div className="space-y-6">
          {/* Report Filters Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Filters</CardTitle>
              <CardDescription>Configure your report parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Report Type</Label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_MODULES.map(module => (
                      <SelectItem key={module.id} value={module.id}>
                        <div className="flex items-center">
                          {module.icon}
                          <span className="ml-2">{module.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Time Range</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="12months">Last 12 Months</SelectItem>
                    <SelectItem value="ytd">Year-to-Date</SelectItem>
                    <SelectItem value="mtd">Month-to-Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Filter by Project</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="pt-2 space-y-2">
                <Button variant="outline" className="w-full">
                  <FileText className="mr-2 h-4 w-4" /> 
                  Generate PDF Report
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleExport()} disabled={isExporting}>
                  <Download className="mr-2 h-4 w-4" /> 
                  Export to CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live Data Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Data Status</CardTitle>
              <CardDescription>
                {dateRange.startDate} to {dateRange.endDate}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4 space-y-2">
                <div className="flex justify-between">
                  <span>Total Projects:</span>
                  <Badge variant="outline">{filteredProjects.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total Milestones:</span>
                  <Badge variant="outline">{filteredMilestones.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Active Schedules:</span>
                  <Badge variant="outline">{filteredSchedules.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Delivered Projects:</span>
                  <Badge variant="outline">{deliveredProjectsData.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <Badge variant="secondary">{format(new Date(), 'HH:mm:ss')}</Badge>
                </div>
              </div>

              <div className="border border-border p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Data Refresh</span>
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  Reports automatically refresh every 30 seconds
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`mr-2 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Template creation/edit dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {templateDialogMode === 'create' ? 'Create Report Template' : 'Edit Report Template'}
            </DialogTitle>
            <DialogDescription>
              {templateDialogMode === 'create' 
                ? 'Save your current settings as a reusable template' 
                : 'Update your existing template with new settings'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input 
                id="template-name" 
                placeholder="My Custom Report" 
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template-desc">Description (optional)</Label>
              <Input 
                id="template-desc" 
                placeholder="Brief description of the report" 
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>This template will include:</p>
              <ul className="list-disc list-inside mt-2">
                <li>Module: {currentModule?.name}</li>
                <li>Report Type: {availableSubTypes.find(s => s.id === selectedSubType)?.name}</li>
                <li>Format: {exportFormat.toUpperCase()}</li>
                <li>Time Range: {
                  timeRange === '3months' ? 'Last 3 Months' :
                  timeRange === '6months' ? 'Last 6 Months' :
                  timeRange === '12months' ? 'Last 12 Months' :
                  timeRange === 'ytd' ? 'Year to Date' :
                  timeRange === 'mtd' ? 'Month to Date' : timeRange
                }</li>
                <li>{selectedFields.length} selected fields</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={templateDialogMode === 'create' ? handleCreateTemplate : handleUpdateTemplate}>
              <Save className="h-4 w-4 mr-2" />
              {templateDialogMode === 'create' ? 'Save Template' : 'Update Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExportReportsPage;
