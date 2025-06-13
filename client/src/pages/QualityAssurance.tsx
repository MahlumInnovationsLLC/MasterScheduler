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
  Award
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

  // Fetch real data from API
  const { data: ncrs = [] } = useQuery({
    queryKey: ["/api/ncrs"],
    enabled: true
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/qa/analytics"],
    enabled: true
  });

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
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Document Control</CardTitle>
                <CardDescription>
                  Manage SOPs, work instructions, and quality documents
                </CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No documents found. Upload your first quality document.</p>
              </div>
            </CardContent>
          </Card>
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Critical</span>
                    </div>
                    <span className="text-sm font-medium">2 (16%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm">High</span>
                    </div>
                    <span className="text-sm font-medium">4 (34%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Medium</span>
                    </div>
                    <span className="text-sm font-medium">4 (34%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Low</span>
                    </div>
                    <span className="text-sm font-medium">2 (16%)</span>
                  </div>
                </div>
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
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">Project 804487</p>
                      <p className="text-xs text-gray-500">2 NCRs, 1 CAPA</p>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">Project 805517</p>
                      <p className="text-xs text-gray-500">1 NCR, 0 CAPAs</p>
                    </div>
                    <Badge variant="secondary">Resolved</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">Project 805642</p>
                      <p className="text-xs text-gray-500">0 NCRs</p>
                    </div>
                    <Badge variant="default">Clean</Badge>
                  </div>
                </div>
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