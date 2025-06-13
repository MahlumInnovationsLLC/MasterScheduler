import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Users, 
  Shield, 
  Search,
  Plus,
  Filter,
  Download,
  Calendar,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  Award,
  Upload,
  Eye,
  Edit,
  Trash2,
  Star,
  History,
  User,
  Building,
  Tag,
  Archive,
  CheckCircle2,
  UserCheck,
  PlayCircle,
  GraduationCap,
  BarChart3,
  RefreshCw,
  ExternalLink,
  PlusCircle,
  MoreVertical,
  FolderOpen,
  FilePlus,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  FileCode,
  Copy,
  Share2,
  Lock,
  Unlock,
  RotateCcw,
  Settings,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Clock3,
  UserX,
  Globe,
  ShieldCheck,
  AlertOctagon,
  Target,
  Zap,
  TrendingDown,
  Maximize2,
  Bell,
  BellOff
} from "lucide-react";

interface QAMetrics {
  openNCRs: number;
  overdueCAPAs: number;
  pendingSCARs: number;
  upcomingAudits: number;
  documentsExpiringSoon: number;
  trainingCompletionRate: number;
  auditReadinessScore: number;
}

interface NCRSummary {
  id: number;
  ncrNumber: string;
  issueTitle: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "under_review" | "resolved" | "closed";
  projectNumber: string;
  dateIdentified: string;
  identifiedBy: string;
}

interface CAPASummary {
  id: number;
  capaNumber: string;
  title: string;
  status: "draft" | "in_progress" | "complete" | "verified";
  ownerId: string;
  dueDate: string;
  linkedNCR?: string;
}

interface QualityDocument {
  id: number;
  documentNumber: string;
  title: string;
  description?: string;
  category: "sop" | "work_instruction" | "form" | "calibration_record" | "quality_plan" | "specification";
  department?: string;
  version: string;
  status: "draft" | "pending_review" | "under_review" | "approved" | "archived";
  effectiveDate?: string;
  expiryDate?: string;
  authorId: string;
  authorName: string;
  reviewerId?: string;
  reviewerName?: string;
  approverId?: string;
  approverName?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  tags?: string[];
  complianceCategory?: string;
  submittedDate?: string;
  reviewedDate?: string;
  approvedDate?: string;
  acknowledgedCount: number;
  totalRequiredAcknowledgments: number;
  isExpiringSoon: boolean;
}

interface TrainingModule {
  id: number;
  title: string;
  description?: string;
  type: "onboarding" | "equipment_certification" | "sop_familiarization" | "safety" | "quality_system";
  department?: string;
  estimatedDuration: number; // in minutes
  content?: string;
  isActive: boolean;
  createdById: string;
  createdByName: string;
  lastUpdatedById?: string;
  lastUpdatedByName?: string;
  createdAt: string;
  updatedAt: string;
  assignmentCount: number;
  completionRate: number;
}

interface TrainingAssignment {
  id: number;
  moduleId: number;
  moduleTitle: string;
  userId: string;
  userName: string;
  status: "not_started" | "in_progress" | "completed" | "expired";
  assignedById: string;
  assignedByName: string;
  assignedDate: string;
  dueDate?: string;
  startedDate?: string;
  completedDate?: string;
  score?: number;
  notes?: string;
}

interface DocumentAcknowledgment {
  id: number;
  documentId: number;
  userId: string;
  userName: string;
  acknowledgedDate: string;
  comments?: string;
}

const mockMetrics: QAMetrics = {
  openNCRs: 12,
  overdueCAPAs: 3,
  pendingSCARs: 7,
  upcomingAudits: 2,
  documentsExpiringSoon: 5,
  trainingCompletionRate: 78,
  auditReadinessScore: 85
};

const mockNCRs: NCRSummary[] = [
  {
    id: 1,
    ncrNumber: "NCR-2025-001",
    issueTitle: "Electrical wiring non-conformance",
    severity: "high",
    status: "open",
    projectNumber: "804487",
    dateIdentified: "2025-06-10",
    identifiedBy: "John Smith"
  },
  {
    id: 2,
    ncrNumber: "NCR-2025-002",
    issueTitle: "Paint finish quality issue",
    severity: "medium",
    status: "under_review",
    projectNumber: "804916",
    dateIdentified: "2025-06-08",
    identifiedBy: "Sarah Johnson"
  }
];

const mockCAPAs: CAPASummary[] = [
  {
    id: 1,
    capaNumber: "CAPA-2025-001",
    title: "Electrical Process Improvement",
    status: "in_progress",
    ownerId: "john.smith",
    dueDate: "2025-06-20",
    linkedNCR: "NCR-2025-001"
  }
];

const mockDocuments: QualityDocument[] = [
  {
    id: 1,
    documentNumber: "DOC-2025-001",
    title: "Electrical Assembly SOP",
    description: "Standard operating procedure for electrical assembly processes",
    category: "sop",
    department: "production",
    version: "2.1",
    status: "approved",
    effectiveDate: "2025-01-15",
    expiryDate: "2026-01-15",
    authorId: "john.smith",
    authorName: "John Smith",
    reviewerId: "sarah.johnson",
    reviewerName: "Sarah Johnson",
    approverId: "mike.wilson",
    approverName: "Mike Wilson",
    fileUrl: "/documents/electrical-assembly-sop-v2.1.pdf",
    fileName: "electrical-assembly-sop-v2.1.pdf",
    fileSize: 2048000,
    mimeType: "application/pdf",
    tags: ["electrical", "assembly", "production"],
    complianceCategory: "ISO 9001",
    submittedDate: "2025-01-01",
    reviewedDate: "2025-01-10",
    approvedDate: "2025-01-15",
    acknowledgedCount: 8,
    totalRequiredAcknowledgments: 12,
    isExpiringSoon: false
  },
  {
    id: 2,
    documentNumber: "DOC-2025-002",
    title: "Quality Inspection Checklist",
    description: "Daily quality inspection checklist for manufacturing processes",
    category: "form",
    department: "quality",
    version: "1.3",
    status: "approved",
    effectiveDate: "2025-02-01",
    expiryDate: "2025-08-01",
    authorId: "sarah.johnson",
    authorName: "Sarah Johnson",
    reviewerId: "mike.wilson",
    reviewerName: "Mike Wilson",
    approverId: "jane.doe",
    approverName: "Jane Doe",
    fileUrl: "/documents/quality-inspection-checklist-v1.3.pdf",
    fileName: "quality-inspection-checklist-v1.3.pdf",
    fileSize: 512000,
    mimeType: "application/pdf",
    tags: ["quality", "inspection", "checklist"],
    complianceCategory: "Customer Requirements",
    submittedDate: "2025-01-20",
    reviewedDate: "2025-01-28",
    approvedDate: "2025-02-01",
    acknowledgedCount: 15,
    totalRequiredAcknowledgments: 15,
    isExpiringSoon: true
  },
  {
    id: 3,
    documentNumber: "DOC-2025-003",
    title: "Paint Booth Calibration Procedure",
    description: "Calibration procedure for paint booth equipment",
    category: "calibration_record",
    department: "paint",
    version: "1.0",
    status: "under_review",
    effectiveDate: undefined,
    expiryDate: undefined,
    authorId: "tom.brown",
    authorName: "Tom Brown",
    reviewerId: "sarah.johnson",
    reviewerName: "Sarah Johnson",
    approverId: undefined,
    approverName: undefined,
    fileUrl: "/documents/paint-booth-calibration-v1.0.pdf",
    fileName: "paint-booth-calibration-v1.0.pdf",
    fileSize: 1024000,
    mimeType: "application/pdf",
    tags: ["paint", "calibration", "equipment"],
    complianceCategory: "DOT Requirements",
    submittedDate: "2025-06-01",
    reviewedDate: undefined,
    approvedDate: undefined,
    acknowledgedCount: 0,
    totalRequiredAcknowledgments: 8,
    isExpiringSoon: false
  }
];

const mockTrainingModules: TrainingModule[] = [
  {
    id: 1,
    title: "Electrical Safety Fundamentals",
    description: "Basic electrical safety procedures and protocols for manufacturing environments",
    type: "safety",
    department: "production",
    estimatedDuration: 45,
    content: "This module covers basic electrical safety principles...",
    isActive: true,
    createdById: "admin",
    createdByName: "System Administrator",
    lastUpdatedById: "john.smith",
    lastUpdatedByName: "John Smith",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-05-15T10:30:00Z",
    assignmentCount: 25,
    completionRate: 88
  },
  {
    id: 2,
    title: "Quality System Overview",
    description: "Introduction to our quality management system and procedures",
    type: "quality_system",
    department: undefined,
    estimatedDuration: 60,
    content: "This comprehensive module introduces new employees...",
    isActive: true,
    createdById: "sarah.johnson",
    createdByName: "Sarah Johnson",
    lastUpdatedById: "sarah.johnson",
    lastUpdatedByName: "Sarah Johnson",
    createdAt: "2025-02-01T00:00:00Z",
    updatedAt: "2025-02-01T00:00:00Z",
    assignmentCount: 35,
    completionRate: 71
  },
  {
    id: 3,
    title: "Paint Booth Equipment Certification",
    description: "Certification training for paint booth equipment operation",
    type: "equipment_certification",
    department: "paint",
    estimatedDuration: 120,
    content: "This hands-on certification module covers...",
    isActive: true,
    createdById: "tom.brown",
    createdByName: "Tom Brown",
    lastUpdatedById: "tom.brown",
    lastUpdatedByName: "Tom Brown",
    createdAt: "2025-03-01T00:00:00Z",
    updatedAt: "2025-03-15T14:20:00Z",
    assignmentCount: 8,
    completionRate: 100
  }
];

const mockTrainingAssignments: TrainingAssignment[] = [
  {
    id: 1,
    moduleId: 1,
    moduleTitle: "Electrical Safety Fundamentals",
    userId: "new.employee",
    userName: "New Employee",
    status: "in_progress",
    assignedById: "john.smith",
    assignedByName: "John Smith",
    assignedDate: "2025-06-01",
    dueDate: "2025-06-15",
    startedDate: "2025-06-03",
    completedDate: undefined,
    score: undefined,
    notes: "Started training on schedule"
  },
  {
    id: 2,
    moduleId: 2,
    moduleTitle: "Quality System Overview",
    userId: "new.employee",
    userName: "New Employee",
    status: "not_started",
    assignedById: "sarah.johnson",
    assignedByName: "Sarah Johnson",
    assignedDate: "2025-06-01",
    dueDate: "2025-06-20",
    startedDate: undefined,
    completedDate: undefined,
    score: undefined,
    notes: "Pending completion of safety training"
  }
];

function MetricCard({ title, value, icon: Icon, status, description }: {
  title: string;
  value: number | string;
  icon: any;
  status?: "good" | "warning" | "critical";
  description?: string;
}) {
  const getStatusColor = () => {
    switch (status) {
      case "good": return "text-green-600";
      case "warning": return "text-yellow-600";
      case "critical": return "text-red-600";
      default: return "text-blue-600";
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${getStatusColor()}`}>{value}</p>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
          </div>
          <Icon className={`h-8 w-8 ${getStatusColor()}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const getVariant = () => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "outline";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  return <Badge variant={getVariant()}>{severity.toUpperCase()}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const getVariant = () => {
    switch (status) {
      case "open": return "destructive";
      case "under_review": return "outline";
      case "in_progress": return "outline";
      case "resolved": return "secondary";
      case "complete": return "secondary";
      case "verified": return "default";
      case "closed": return "default";
      default: return "outline";
    }
  };

  return <Badge variant={getVariant()}>{status.replace('_', ' ').toUpperCase()}</Badge>;
}

export default function QualityAssurance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Document management state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "date" | "status" | "category">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("approved");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [documentSearchTerm, setDocumentSearchTerm] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<QualityDocument | null>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Training state
  const [trainingSearchTerm, setTrainingSearchTerm] = useState("");
  const [trainingTypeFilter, setTrainingTypeFilter] = useState<string>("all");
  const [selectedTrainingModule, setSelectedTrainingModule] = useState<TrainingModule | null>(null);
  
  // NCR state
  const [showCreateNCR, setShowCreateNCR] = useState(false);
  const [selectedNCR, setSelectedNCR] = useState<any>(null);
  const [showNCRDetails, setShowNCRDetails] = useState(false);

  // Fetch real data from API
  const { data: ncrs = [] } = useQuery({
    queryKey: ["/api/ncrs"],
    enabled: true
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/qa/analytics"],
    enabled: true
  });

  // Helper functions for document management
  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes('image')) return FileImage;
    if (mimeType?.includes('video')) return FileVideo;
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return FileSpreadsheet;
    if (mimeType?.includes('code')) return FileCode;
    return FileText;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800 border-green-200";
      case "under_review": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "pending_review": return "bg-blue-100 text-blue-800 border-blue-200";
      case "draft": return "bg-gray-100 text-gray-800 border-gray-200";
      case "archived": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "sop": return BookOpen;
      case "work_instruction": return Settings;
      case "form": return FileText;
      case "calibration_record": return Target;
      case "quality_plan": return ShieldCheck;
      case "specification": return FileCode;
      default: return FileText;
    }
  };

  const filterAndSortDocuments = (documents: QualityDocument[]) => {
    let filtered = documents.filter(doc => {
      const matchesSearch = documentSearchTerm === "" || 
        doc.title.toLowerCase().includes(documentSearchTerm.toLowerCase()) ||
        doc.documentNumber.toLowerCase().includes(documentSearchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(documentSearchTerm.toLowerCase()) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(documentSearchTerm.toLowerCase()));
      
      const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
      const matchesDepartment = departmentFilter === "all" || doc.department === departmentFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesDepartment;
    });

    // Sort documents
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.title.localeCompare(b.title);
          break;
        case "date":
          const dateA = new Date(a.effectiveDate || a.submittedDate || 0);
          const dateB = new Date(b.effectiveDate || b.submittedDate || 0);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  const filteredDocuments = filterAndSortDocuments(mockDocuments);

  const handleDocumentView = (doc: QualityDocument) => {
    setSelectedDocument(doc);
    setShowDocumentPreview(true);
  };

  const handleDocumentDownload = (doc: QualityDocument) => {
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName;
    link.click();
  };

  const handleDocumentPreviewClose = () => {
    setShowDocumentPreview(false);
    setSelectedDocument(null);
  };

  // Calculate metrics from real data
  const metrics: QAMetrics = {
    openNCRs: analytics?.summary?.openNcrs || 0,
    overdueCAPAs: 3, // This would come from CAPA data when implemented
    pendingSCARs: 7, // This would come from SCAR data when implemented
    upcomingAudits: 2, // This would come from audit data when implemented
    documentsExpiringSoon: 5, // This would come from document data when implemented
    trainingCompletionRate: 78, // This would come from training data when implemented
    auditReadinessScore: analytics?.summary?.averageQualityScore || 85
  };

  const capas = mockCAPAs; // Will be replaced with real API call when CAPA endpoints are implemented

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quality Assurance Center</h1>
          <p className="text-gray-600 mt-1">
            Manage non-conformances, corrective actions, audits, and training
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create NCR
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ncr">NCRs</TabsTrigger>
          <TabsTrigger value="capa">CAPA</TabsTrigger>
          <TabsTrigger value="scar">SCAR</TabsTrigger>
          <TabsTrigger value="audits">Audits</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Open NCRs"
              value={metrics.openNCRs}
              icon={AlertCircle}
              status={metrics.openNCRs > 10 ? "warning" : "good"}
              description="Non-conformance reports"
            />
            <MetricCard
              title="Overdue CAPAs"
              value={metrics.overdueCAPAs}
              icon={Clock}
              status={metrics.overdueCAPAs > 0 ? "critical" : "good"}
              description="Corrective actions"
            />
            <MetricCard
              title="Pending SCARs"
              value={metrics.pendingSCARs}
              icon={AlertTriangle}
              status={metrics.pendingSCARs > 5 ? "warning" : "good"}
              description="Supplier requests"
            />
            <MetricCard
              title="Training Rate"
              value={`${metrics.trainingCompletionRate}%`}
              icon={BookOpen}
              status={metrics.trainingCompletionRate < 80 ? "warning" : "good"}
              description="Completion rate"
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Upcoming Audits"
              value={metrics.upcomingAudits}
              icon={Calendar}
              description="Next 30 days"
            />
            <MetricCard
              title="Documents Expiring"
              value={metrics.documentsExpiringSoon}
              icon={FileText}
              status={metrics.documentsExpiringSoon > 3 ? "warning" : "good"}
              description="Next 60 days"
            />
            <MetricCard
              title="Audit Readiness"
              value={`${metrics.auditReadinessScore}%`}
              icon={Shield}
              status={metrics.auditReadinessScore < 85 ? "warning" : "good"}
              description="Overall score"
            />
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent NCRs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">Recent NCRs</CardTitle>
                <Button variant="ghost" size="sm">View All</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ncrs.map((ncr) => (
                    <div key={ncr.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{ncr.ncrNumber}</span>
                          <SeverityBadge severity={ncr.severity} />
                          <StatusBadge status={ncr.status} />
                        </div>
                        <p className="text-sm text-gray-600">{ncr.issueTitle}</p>
                        <p className="text-xs text-gray-500">
                          Project: {ncr.projectNumber} • {ncr.dateIdentified}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active CAPAs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">Active CAPAs</CardTitle>
                <Button variant="ghost" size="sm">View All</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {capas.map((capa) => (
                    <div key={capa.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{capa.capaNumber}</span>
                          <StatusBadge status={capa.status} />
                        </div>
                        <p className="text-sm text-gray-600">{capa.title}</p>
                        <p className="text-xs text-gray-500">
                          Due: {capa.dueDate} • Owner: {capa.ownerId}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* NCR Management Tab */}
        <TabsContent value="ncr" className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search NCRs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create NCR
            </Button>
          </div>

          {/* NCR List */}
          <Card>
            <CardHeader>
              <CardTitle>Non-Conformance Reports</CardTitle>
              <CardDescription>
                Track and manage quality non-conformances across all projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ncrs.map((ncr) => (
                  <div key={ncr.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium">{ncr.ncrNumber}</span>
                        <SeverityBadge severity={ncr.severity} />
                        <StatusBadge status={ncr.status} />
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{ncr.issueTitle}</h3>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>Project: {ncr.projectNumber}</span>
                        <span>Identified: {ncr.dateIdentified}</span>
                        <span>By: {ncr.identifiedBy}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">View</Button>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAPA Tab */}
        <TabsContent value="capa" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Corrective & Preventive Actions</CardTitle>
                <CardDescription>
                  Manage corrective actions and preventive measures
                </CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create CAPA
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {capas.map((capa) => (
                  <div key={capa.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium">{capa.capaNumber}</span>
                        <StatusBadge status={capa.status} />
                        {capa.linkedNCR && (
                          <Badge variant="outline">Linked: {capa.linkedNCR}</Badge>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{capa.title}</h3>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>Owner: {capa.ownerId}</span>
                        <span>Due: {capa.dueDate}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">View</Button>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCAR Tab */}
        <TabsContent value="scar" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Supplier Corrective Action Requests</CardTitle>
                <CardDescription>
                  Track supplier quality issues and responses
                </CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create SCAR
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No SCARs found. Create your first supplier corrective action request.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audits Tab */}
        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Audit Management</CardTitle>
                <CardDescription>
                  Schedule and track internal and external audits
                </CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Audit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No audits scheduled. Schedule your first audit.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          {/* Document Management Header */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Document Management & Training Center</h2>
              <p className="text-sm text-muted-foreground">
                Manage quality documents, SOPs, training modules, and track completion
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Reports
              </Button>
              <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Content
              </Button>
            </div>
          </div>

          {/* Sub-navigation for Documents */}
          <Tabs defaultValue="documents-list" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="documents-list" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="training-modules" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Training
              </TabsTrigger>
              <TabsTrigger value="my-assignments" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                My Tasks
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Documents List */}
            <TabsContent value="documents-list" className="space-y-4">
              {/* Advanced Document Controls */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search documents by title, number, description, or tags..."
                        className="pl-10"
                        value={documentSearchTerm}
                        onChange={(e) => setDocumentSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    >
                      {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
                      {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                    </Button>
                    <Button onClick={() => setShowUploadDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="sop">SOPs</SelectItem>
                      <SelectItem value="work_instruction">Work Instructions</SelectItem>
                      <SelectItem value="form">Forms</SelectItem>
                      <SelectItem value="calibration_record">Calibration Records</SelectItem>
                      <SelectItem value="quality_plan">Quality Plans</SelectItem>
                      <SelectItem value="specification">Specifications</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="Production">Production</SelectItem>
                      <SelectItem value="Quality">Quality</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Safety">Safety</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="text-sm text-gray-600 flex items-center">
                    Showing {filteredDocuments.length} of {mockDocuments.length} documents
                  </div>
                </div>
              </div>

              {/* Document Display */}
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredDocuments.map((doc) => {
                    const IconComponent = getCategoryIcon(doc.category);
                    const FileIcon = getFileIcon(doc.mimeType || '');
                    
                    return (
                      <Card key={doc.id} className="hover:shadow-lg transition-all duration-200 group">
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                <IconComponent className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm truncate" title={doc.title}>{doc.title}</h4>
                                <p className="text-xs text-gray-500">{doc.documentNumber}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
                                {doc.status.replace('_', ' ').toUpperCase()}
                              </div>
                              {doc.isExpiringSoon && (
                                <div className="flex items-center gap-1 text-xs text-amber-600">
                                  <Clock3 className="h-3 w-3" />
                                  Expiring
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <Badge variant="secondary" className="text-xs mb-2">
                              {doc.category.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {doc.department && (
                              <Badge variant="outline" className="text-xs ml-2">
                                {doc.department}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2" title={doc.description}>
                            {doc.description || "No description available"}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                            <div className="flex items-center gap-2">
                              <FileIcon className="h-3 w-3" />
                              <span>v{doc.version}</span>
                              <span>•</span>
                              <span>{formatFileSize(doc.fileSize)}</span>
                            </div>
                            <span>{doc.effectiveDate || doc.submittedDate}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <UserCheck className="h-3 w-3" />
                              <span>{doc.acknowledgedCount}/{doc.totalRequiredAcknowledgments}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDocumentView(doc)}
                                className="h-8 w-8 p-0 hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDocumentDownload(doc)}
                                className="h-8 w-8 p-0 hover:bg-green-50"
                              >
                                <Download className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-50"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-500" />
                              </Button>
                            </div>
                          </div>
                          
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex flex-wrap gap-1">
                                {doc.tags.slice(0, 3).map((tag, index) => (
                                  <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                    <Tag className="h-2 w-2 mr-1" />
                                    {tag}
                                  </span>
                                ))}
                                {doc.tags.length > 3 && (
                                  <span className="text-xs text-gray-500">+{doc.tags.length - 3} more</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acknowledgments</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredDocuments.map((doc) => {
                          const IconComponent = getCategoryIcon(doc.category);
                          const FileIcon = getFileIcon(doc.mimeType || '');
                          
                          return (
                            <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="p-2 bg-blue-50 rounded-lg mr-3">
                                    <IconComponent className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                                    <div className="text-sm text-gray-500">{doc.documentNumber}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant="secondary" className="text-xs">
                                  {doc.category.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
                                  {doc.status.replace('_', ' ').toUpperCase()}
                                </div>
                                {doc.isExpiringSoon && (
                                  <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                                    <Clock3 className="h-3 w-3" />
                                    Expiring Soon
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {doc.department || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2 text-sm text-gray-900">
                                  <FileIcon className="h-4 w-4" />
                                  v{doc.version}
                                </div>
                                <div className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {doc.effectiveDate || doc.submittedDate}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full" 
                                      style={{ width: `${(doc.acknowledgedCount / doc.totalRequiredAcknowledgments) * 100}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-600 whitespace-nowrap">
                                    {doc.acknowledgedCount}/{doc.totalRequiredAcknowledgments}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDocumentView(doc)}
                                    className="h-8 w-8 p-0 hover:bg-blue-50"
                                  >
                                    <Eye className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDocumentDownload(doc)}
                                    className="h-8 w-8 p-0 hover:bg-green-50"
                                  >
                                    <Download className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-gray-50"
                                  >
                                    <MoreVertical className="h-4 w-4 text-gray-500" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Training Modules */}
            <TabsContent value="training-modules" className="space-y-4">
              {/* Training Controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search training modules..."
                      className="pl-8"
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="safety">Safety</SelectItem>
                      <SelectItem value="equipment_certification">Equipment</SelectItem>
                      <SelectItem value="quality_system">Quality System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Module
                </Button>
              </div>

              {/* Training Modules Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {mockTrainingModules.map((module) => (
                  <Card key={module.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{module.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {module.description}
                          </CardDescription>
                        </div>
                        <div className="ml-4 text-right">
                          <Badge 
                            variant={module.isActive ? "default" : "secondary"}
                            className="mb-2"
                          >
                            {module.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {module.estimatedDuration} min
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Module Type and Department */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                          <span className="capitalize">{module.type.replace('_', ' ')}</span>
                        </div>
                        {module.department && (
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4 text-gray-500" />
                            <span className="capitalize">{module.department}</span>
                          </div>
                        )}
                      </div>

                      {/* Progress Statistics */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{module.assignmentCount}</div>
                          <div className="text-xs text-muted-foreground">Assigned</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">{module.completionRate}%</div>
                          <div className="text-xs text-muted-foreground">Complete</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-amber-600">
                            {Math.round((module.assignmentCount * module.completionRate) / 100)}
                          </div>
                          <div className="text-xs text-muted-foreground">Completed</div>
                        </div>
                      </div>

                      {/* Completion Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Completion Rate</span>
                          <span>{module.completionRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${module.completionRate}%` }}
                          />
                        </div>
                      </div>

                      {/* Module Info */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Created by {module.createdByName}</div>
                        <div>Last updated: {new Date(module.updatedAt).toLocaleDateString()}</div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Users className="h-4 w-4 mr-2" />
                          Assign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* My Assignments */}
            <TabsContent value="my-assignments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>My Training Assignments</CardTitle>
                  <CardDescription>
                    Track your assigned training modules and document acknowledgments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockTrainingAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{assignment.moduleTitle}</h3>
                          <Badge 
                            variant={
                              assignment.status === "completed" ? "default" : 
                              assignment.status === "in_progress" ? "secondary" : 
                              assignment.status === "expired" ? "destructive" :
                              "outline"
                            }
                          >
                            {assignment.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Assigned: {new Date(assignment.assignedDate).toLocaleDateString()}</span>
                          {assignment.dueDate && (
                            <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                          )}
                          <span>Assigned by: {assignment.assignedByName}</span>
                        </div>
                        {assignment.notes && (
                          <p className="text-sm text-gray-600 mt-1">{assignment.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {assignment.status === "not_started" && (
                          <Button size="sm">
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Start
                          </Button>
                        )}
                        {assignment.status === "in_progress" && (
                          <Button size="sm" variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Continue
                          </Button>
                        )}
                        {assignment.status === "completed" && (
                          <Button size="sm" variant="outline">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Document Acknowledgments Needed */}
              <Card>
                <CardHeader>
                  <CardTitle>Documents Requiring Acknowledgment</CardTitle>
                  <CardDescription>
                    Review and acknowledge the following documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockDocuments
                    .filter(doc => doc.status === "approved" && doc.acknowledgedCount < doc.totalRequiredAcknowledgments)
                    .map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{doc.title}</span>
                            <Badge variant="outline" className="text-xs">
                              v{doc.version}
                            </Badge>
                            {doc.isExpiringSoon && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Expires Soon
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {doc.documentNumber} • {doc.category.replace('_', ' ').toUpperCase()}
                          </p>
                          {doc.effectiveDate && (
                            <p className="text-xs text-muted-foreground">
                              Effective: {new Date(doc.effectiveDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                          <Button size="sm">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Acknowledge
                          </Button>
                        </div>
                      </div>
                    ))}
                  {mockDocuments.filter(doc => doc.status === "approved" && doc.acknowledgedCount < doc.totalRequiredAcknowledgments).length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>All documents are acknowledged. Great work!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Quick Stats */}
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{mockDocuments.length}</div>
                      <div className="text-sm text-muted-foreground">Total Documents</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {mockDocuments.filter(d => d.status === "approved").length}
                      </div>
                      <div className="text-sm text-muted-foreground">Approved</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">
                        {mockDocuments.filter(d => d.isExpiringSoon).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Expiring Soon</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{mockTrainingModules.length}</div>
                      <div className="text-sm text-muted-foreground">Training Modules</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Training Completion Rates */}
              <Card>
                <CardHeader>
                  <CardTitle>Training Completion Overview</CardTitle>
                  <CardDescription>
                    Completion rates across all training modules
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockTrainingModules.map((module) => (
                    <div key={module.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{module.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {Math.round((module.assignmentCount * module.completionRate) / 100)}/{module.assignmentCount} completed
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${module.completionRate}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {module.completionRate}% completion rate
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Document Acknowledgment Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Document Acknowledgment Status</CardTitle>
                  <CardDescription>
                    Track document acknowledgment progress
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockDocuments
                    .filter(doc => doc.status === "approved")
                    .map((doc) => (
                      <div key={doc.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{doc.title}</span>
                          <span className="text-sm text-muted-foreground">
                            {doc.acknowledgedCount}/{doc.totalRequiredAcknowledgments} acknowledged
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(doc.acknowledgedCount / doc.totalRequiredAcknowledgments) * 100}%` 
                            }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round((doc.acknowledgedCount / doc.totalRequiredAcknowledgments) * 100)}% acknowledged
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* NCR Trend Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>NCR Trend Analysis</CardTitle>
                <CardDescription>
                  Non-conformance reports over time by severity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>NCR trend data will be displayed here</p>
                </div>
              </CardContent>
            </Card>

            {/* CAPA Effectiveness */}
            <Card>
              <CardHeader>
                <CardTitle>CAPA Effectiveness</CardTitle>
                <CardDescription>
                  Corrective action completion rates and timelines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">On-time Completion</span>
                    <span className="text-2xl font-bold text-green-600">87%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '87%' }}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">24</p>
                      <p className="text-xs text-gray-500">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">4</p>
                      <p className="text-xs text-gray-500">Overdue</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Severity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Issue Severity Distribution</CardTitle>
                <CardDescription>
                  Breakdown of NCRs by severity level
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.ncrs ? (
                  <div className="space-y-3">
                    {['critical', 'high', 'medium', 'low'].map((severity) => {
                      const count = analytics.ncrs.bySeverity[severity] || 0;
                      const total = analytics.ncrs.total || 0;
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      const colors = {
                        critical: 'bg-red-500',
                        high: 'bg-orange-500',
                        medium: 'bg-yellow-500',
                        low: 'bg-green-500'
                      };
                      
                      return (
                        <div key={severity} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 ${colors[severity]} rounded-full`}></div>
                            <span className="text-sm capitalize">{severity}</span>
                          </div>
                          <span className="text-sm font-medium">{count} ({percentage}%)</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Loading severity data...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Project Quality Metrics</CardTitle>
                <CardDescription>
                  Quality performance by project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.projectQuality ? (
                  <div className="space-y-4">
                    {analytics.projectQuality.slice(0, 5).map((project) => {
                      const getStatusVariant = (score: number) => {
                        if (score >= 90) return "default";
                        if (score >= 70) return "secondary";
                        if (score >= 50) return "outline";
                        return "destructive";
                      };
                      
                      const getStatusText = (score: number) => {
                        if (score >= 90) return "Excellent";
                        if (score >= 70) return "Good";
                        if (score >= 50) return "Fair";
                        return "Needs Attention";
                      };
                      
                      return (
                        <div key={project.projectNumber} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-sm">Project {project.projectNumber}</p>
                            <p className="text-xs text-gray-500">
                              {project.ncrCount} NCRs • Quality Score: {project.qualityScore}
                            </p>
                          </div>
                          <Badge variant={getStatusVariant(project.qualityScore)}>
                            {getStatusText(project.qualityScore)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Loading project quality data...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Audit Performance */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Audit Performance Dashboard</CardTitle>
                <CardDescription>
                  Comprehensive audit metrics and compliance tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Award className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold text-blue-600">95%</p>
                    <p className="text-sm text-gray-600">Compliance Score</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-green-600">8</p>
                    <p className="text-sm text-gray-600">Audits Completed</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <p className="text-2xl font-bold text-orange-600">2</p>
                    <p className="text-sm text-gray-600">Pending Audits</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold text-purple-600">87%</p>
                    <p className="text-sm text-gray-600">Training Complete</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}