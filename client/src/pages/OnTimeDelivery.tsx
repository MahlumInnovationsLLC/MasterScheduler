import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Area,
  AreaChart,
  Bar, 
  BarChart, 
  CartesianGrid, 
  Cell, 
  ComposedChart,
  Legend, 
  Line,
  LineChart,
  Pie, 
  PieChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";
import { format, parseISO, parse } from "date-fns";
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  Target,
  FileText,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Zap,
  Users,
  ShieldAlert,
  Award,
  Brain,
  RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Types for delivered projects analytics
interface DeliveredProjectsAnalytics {
  summary: {
    totalProjects: number;
    onTimeCount: number;
    lateCount: number;
    onTimePercentage: number;
    avgDaysLate: number;
    totalDaysLate: number;
  };
  responsibilityBreakdown: {
    nomad_fault: number;
    vendor_fault: number;
    client_fault: number;
    not_applicable: number;
  };
  monthlyTrends: {
    month: string;
    total: number;
    onTime: number;
    late: number;
    onTimePercentage: number;
    avgDaysLate: number;
  }[];
  daysLateDistribution: {
    onTime: number;
    week1: number;
    week2: number;
    month1: number;
    month2: number;
    longTerm: number;
  };
  yearlyComparison: {
    year: string;
    total: number;
    onTime: number;
    late: number;
    onTimePercentage: number;
    avgDaysLate: number;
  }[];
}

type DeliveredProject = {
  id: number;
  projectNumber: string;
  name: string;
  contractDate: string | null;
  deliveryDate: string | null;
  actualDeliveryDate: string | null;
  daysLate: number;
  reason: string | null;
  lateDeliveryReason: string | null;
  delayResponsibility: 'not_applicable' | 'client_fault' | 'nomad_fault' | 'vendor_fault';
  percentComplete: string;
  status: string;
  contractExtensions: number;
};

// Color schemes for charts
const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  muted: "#6b7280",
  chart: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]
};

const RESPONSIBILITY_COLORS = {
  nomad_fault: "#ef4444",
  vendor_fault: "#f59e0b", 
  client_fault: "#3b82f6",
  not_applicable: "#6b7280"
};

// AI Insights Tab Component
interface AIInsightsTabProps {
  filteredProjects: DeliveredProject[];
  selectedTimeframe: string;
}

const AIInsightsTab: React.FC<AIInsightsTabProps> = ({ filteredProjects, selectedTimeframe }) => {
  const [insights, setInsights] = useState<any>(null);

  const analyzeDelaysMutation = useMutation({
    mutationFn: async () => {
      const projectsWithDelays = filteredProjects.filter(p => 
        p.daysLate > 0 && (p.lateDeliveryReason || p.reason)
      );

      if (projectsWithDelays.length === 0) {
        throw new Error("No delayed projects with reasons found in the selected timeframe");
      }

      const delayDescriptions = projectsWithDelays.map(p => ({
        projectNumber: p.projectNumber,
        projectName: p.name,
        daysLate: p.daysLate,
        reason: p.lateDeliveryReason || p.reason || "",
        responsibility: p.delayResponsibility
      }));

      return apiRequest("/api/ai/analyze-delays", {
        method: "POST",
        body: { delays: delayDescriptions }
      });
    },
    onSuccess: (data) => {
      setInsights(data);
    }
  });

  const projectsWithDelays = filteredProjects.filter(p => 
    p.daysLate > 0 && (p.lateDeliveryReason || p.reason)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Delay Analysis
          </CardTitle>
          <CardDescription>
            Intelligent analysis of project delay patterns and root causes
            {selectedTimeframe !== "all" && ` (Last ${selectedTimeframe} months)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Found {projectsWithDelays.length} delayed projects with documented reasons
                </p>
                <p className="text-xs text-muted-foreground">
                  AI will analyze delay descriptions to identify patterns and categorize root causes
                </p>
              </div>
              <Button 
                onClick={() => analyzeDelaysMutation.mutate()}
                disabled={analyzeDelaysMutation.isPending || projectsWithDelays.length === 0}
                className="flex items-center gap-2"
              >
                {analyzeDelaysMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Analyze Delays
                  </>
                )}
              </Button>
            </div>

            {analyzeDelaysMutation.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">
                  {analyzeDelaysMutation.error.message}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {insights && (
        <>
          {/* AI Analysis Results */}
          <Card>
            <CardHeader>
              <CardTitle>Delay Pattern Analysis</CardTitle>
              <CardDescription>AI-identified categories and patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {insights.categories && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Root Cause Categories</h4>
                    {insights.categories.map((category: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">{category.name}</h5>
                          <Badge variant="outline">{category.count} projects</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {category.description}
                        </p>
                        <div className="space-y-1">
                          <p className="text-xs font-medium">Examples:</p>
                          {category.examples.slice(0, 3).map((example: string, i: number) => (
                            <p key={i} className="text-xs text-muted-foreground">
                              • {example}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {insights.recommendations && (
                  <div className="space-y-4">
                    <h4 className="font-medium">AI Recommendations</h4>
                    {insights.recommendations.map((rec: any, index: number) => (
                      <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h5 className="font-medium text-blue-900 mb-2">{rec.title}</h5>
                        <p className="text-sm text-blue-800 mb-2">{rec.description}</p>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            Impact: {rec.impact}
                          </Badge>
                          <Badge variant="outline">
                            Priority: {rec.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Trend Analysis */}
          {insights.trends && (
            <Card>
              <CardHeader>
                <CardTitle>Delay Trend Analysis</CardTitle>
                <CardDescription>AI-identified patterns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.trends.increasing && insights.trends.increasing.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h5 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Increasing Delay Patterns
                      </h5>
                      {insights.trends.increasing.map((trend: string, index: number) => (
                        <p key={index} className="text-sm text-red-800">• {trend}</p>
                      ))}
                    </div>
                  )}

                  {insights.trends.improving && insights.trends.improving.length > 0 && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h5 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Improving Areas
                      </h5>
                      {insights.trends.improving.map((trend: string, index: number) => (
                        <p key={index} className="text-sm text-green-800">• {trend}</p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Recent Delayed Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Delayed Projects</CardTitle>
          <CardDescription>Projects with documented delay reasons</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projectsWithDelays.slice(0, 10).map((project) => (
              <div key={project.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{project.projectNumber}</Badge>
                    <span className="font-medium">{project.name}</span>
                    <Badge variant="destructive">{project.daysLate} days late</Badge>
                  </div>
                  {project.delayResponsibility && (
                    <Badge className={
                      project.delayResponsibility === 'nomad_fault' ? 'bg-red-500' :
                      project.delayResponsibility === 'vendor_fault' ? 'bg-amber-500' :
                      project.delayResponsibility === 'client_fault' ? 'bg-blue-500' : 'bg-gray-500'
                    }>
                      {project.delayResponsibility.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {project.lateDeliveryReason || project.reason}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const OnTimeDeliveryPage: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("all");
  const [selectedResponsibility, setSelectedResponsibility] = useState<string>("all");

  // Fetch delivered projects analytics
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["/api/delivered-projects/analytics"],
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch delivered projects list
  const { data: deliveredProjects, isLoading: isLoadingProjects } = useQuery<DeliveredProject[]>({
    queryKey: ["/api/delivered-projects"],
    staleTime: 0,
    gcTime: 0,
  });

  // Helper functions
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      const [year, month, day] = dateStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return format(date, 'MMM d, yyyy');
    } catch {
      return "N/A";
    }
  };

  const getResponsibilityColor = (responsibility: string) => {
    switch (responsibility) {
      case "nomad_fault": return "#ef4444";
      case "vendor_fault": return "#f59e0b";
      case "client_fault": return "#3b82f6";
      case "not_applicable": return "#6b7280";
      default: return "#9ca3af";
    }
  };

  // Filter projects based on selected responsibility and timeframe
  const filteredProjects = useMemo(() => {
    if (!deliveredProjects) return [];
    
    return deliveredProjects.filter(project => {
      // Filter by responsibility
      if (selectedResponsibility !== "all" && project.delayResponsibility !== selectedResponsibility) {
        return false;
      }
      
      // Filter by timeframe - ensure current month is included
      if (selectedTimeframe !== "all" && project.deliveryDate) {
        const deliveryDate = new Date(project.deliveryDate);
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(selectedTimeframe));
        cutoffDate.setDate(1); // Start of month to include full months
        
        if (deliveryDate < cutoffDate) {
          return false;
        }
      }
      
      return true;
    });
  }, [deliveredProjects, selectedResponsibility, selectedTimeframe]);

  // Enhanced data processing for charts using filtered projects
  const processedData = useMemo(() => {
    if (!filteredProjects) return null;

    // Calculate statistics from filtered projects
    const totalProjects = filteredProjects.length;
    const onTimeProjects = filteredProjects.filter(p => p.daysLate <= 0).length;
    const lateProjects = totalProjects - onTimeProjects;

    // Responsibility breakdown from filtered projects - exclude not_applicable
    const responsibilityBreakdown = filteredProjects.reduce((acc, project) => {
      // Skip not_applicable entries
      if (project.delayResponsibility && project.delayResponsibility !== 'not_applicable') {
        acc[project.delayResponsibility] = (acc[project.delayResponsibility] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Responsibility breakdown for pie chart - only show meaningful categories
    const responsibilityData = Object.entries(responsibilityBreakdown)
      .filter(([key, count]) => count > 0 && key !== 'not_applicable')
      .map(([key, count]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: count as number,
        percentage: totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0,
        color: getResponsibilityColor(key)
      }));

    // Days late distribution from filtered projects
    const daysLateDistribution = filteredProjects.reduce((acc, project) => {
      if (project.daysLate <= 0) acc.onTime++;
      else if (project.daysLate <= 7) acc.week1++;
      else if (project.daysLate <= 14) acc.week2++;
      else if (project.daysLate <= 30) acc.month1++;
      else if (project.daysLate <= 60) acc.month2++;
      else acc.longTerm++;
      return acc;
    }, { onTime: 0, week1: 0, week2: 0, month1: 0, month2: 0, longTerm: 0 });

    // Days late distribution for bar chart
    const distributionData = [
      { category: 'On Time', count: daysLateDistribution.onTime, color: '#22c55e', range: '0 days' },
      { category: '1-7 Days', count: daysLateDistribution.week1, color: '#facc15', range: '1-7 days' },
      { category: '8-14 Days', count: daysLateDistribution.week2, color: '#f97316', range: '8-14 days' },
      { category: '15-30 Days', count: daysLateDistribution.month1, color: '#ef4444', range: '15-30 days' },
      { category: '31-60 Days', count: daysLateDistribution.month2, color: '#dc2626', range: '31-60 days' },
      { category: '60+ Days', count: daysLateDistribution.longTerm, color: '#991b1b', range: '60+ days' }
    ];

    // Delay responsibility bar chart data - exclude not_applicable
    const responsibilityBarData = [
      { name: 'Nomad Fault', count: responsibilityBreakdown.nomad_fault || 0, color: '#ef4444' },
      { name: 'Vendor Fault', count: responsibilityBreakdown.vendor_fault || 0, color: '#f59e0b' },
      { name: 'Client Fault', count: responsibilityBreakdown.client_fault || 0, color: '#3b82f6' }
    ];

    // Monthly trends for responsibility over time - exclude not_applicable
    const monthlyResponsibilityTrends = filteredProjects.reduce((acc, project) => {
      if (!project.deliveryDate) return acc;
      
      const month = format(new Date(project.deliveryDate), 'yyyy-MM');
      if (!acc[month]) {
        acc[month] = { nomad_fault: 0, vendor_fault: 0, client_fault: 0 };
      }
      // Only count meaningful responsibility assignments
      if (project.delayResponsibility && project.delayResponsibility !== 'not_applicable') {
        acc[month][project.delayResponsibility]++;
      }
      return acc;
    }, {} as Record<string, Record<string, number>>);

    const monthlyTrendsData = Object.entries(monthlyResponsibilityTrends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: format(new Date(month + '-01'), 'MMM yyyy'),
        nomadFault: data.nomad_fault,
        vendorFault: data.vendor_fault,
        clientFault: data.client_fault,
        total: Object.values(data).reduce((sum, count) => sum + count, 0)
      }));

    return {
      summary: {
        totalProjects,
        onTimeProjects,
        lateProjects,
        onTimePercentage: totalProjects > 0 ? Math.round((onTimeProjects / totalProjects) * 100) : 0
      },
      responsibilityData,
      distributionData,
      responsibilityBarData,
      monthlyTrendsData
    };
  }, [filteredProjects]);

  const getResponsibilityBadge = (responsibility: string | null) => {
    switch (responsibility) {
      case "nomad_fault":
        return <Badge variant="destructive">Nomad Fault</Badge>;
      case "vendor_fault":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Vendor Fault</Badge>;
      case "client_fault":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Client Fault</Badge>;
      case "not_applicable":
        return <Badge variant="outline">Not Applicable</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getDaysLateBadge = (daysLate: number) => {
    if (daysLate <= 0) return <Badge className="bg-green-500 hover:bg-green-600 text-white">On Time</Badge>;
    if (daysLate <= 7) return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">{daysLate} Days Late</Badge>;
    return <Badge variant="destructive">{daysLate} Days Late</Badge>;
  };

  console.log("🔍 Analytics data:", analytics);
  console.log("🔍 Loading state:", isLoadingAnalytics);

  // Custom tooltip component with proper styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-foreground">
          <p className="text-sm font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm">
              <span style={{ color: entry.color }}>●</span> {entry.name}: {entry.value}
              {entry.name.includes('%') ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get current month data
  const getCurrentMonthData = () => {
    if (!analytics || !analytics.monthlyTrends || analytics.monthlyTrends.length === 0) {
      return { percentage: 0, total: 0, onTime: 0, late: 0, month: 'Current Month' };
    }
    const currentMonth = analytics.monthlyTrends[analytics.monthlyTrends.length - 1];
    
    // Fix the date parsing issue like we did for monthly trends
    const [year, monthNum] = currentMonth.month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    
    return {
      percentage: currentMonth.onTimePercentage || 0,
      total: currentMonth.total || 0,
      onTime: currentMonth.onTime || 0,
      late: currentMonth.late || 0,
      month: format(date, 'MMMM yyyy')
    };
  };

  // Prepare quarterly data
  const prepareQuarterlyData = () => {
    if (!analytics || !analytics.monthlyTrends) return [];
    
    const quarterlyData = new Map();
    
    analytics.monthlyTrends.forEach((month: any) => {
      // Fix the date parsing issue like we did for monthly trends
      const [year, monthNum] = month.month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const quarterNum = Math.ceil((date.getMonth() + 1) / 3);
      const key = `Q${quarterNum} ${year}`;
      
      if (!quarterlyData.has(key)) {
        quarterlyData.set(key, {
          quarter: key,
          total: 0,
          onTime: 0,
          late: 0,
          totalDaysLate: 0
        });
      }
      
      const quarterStats = quarterlyData.get(key);
      quarterStats.total += month.total || 0;
      quarterStats.onTime += month.onTime || 0;
      quarterStats.late += month.late || 0;
      quarterStats.totalDaysLate += month.totalDaysLate || 0;
    });
    
    return Array.from(quarterlyData.values()).map(quarter => ({
      ...quarter,
      onTimePercentage: quarter.total > 0 ? Math.round((quarter.onTime / quarter.total) * 100) : 0,
      avgDaysLate: quarter.late > 0 ? Math.round((quarter.totalDaysLate / quarter.late) * 10) / 10 : 0
    })).sort((a, b) => {
      // Sort chronologically: older quarters on the left, newer on the right
      const [aQ, aY] = a.quarter.split(' ');
      const [bQ, bY] = b.quarter.split(' ');
      if (aY !== bY) return parseInt(aY) - parseInt(bY);
      return parseInt(aQ.replace('Q', '')) - parseInt(bQ.replace('Q', ''));
    }).slice(-8); // Last 8 quarters
  };

  // Prepare chart data - exclude not_applicable values and use filtered data
  const prepareResponsibilityPieData = () => {
    if (!filteredProjects) return [];
    
    // Calculate responsibility breakdown from filtered projects
    const counts = filteredProjects.reduce((acc: any, project: any) => {
      const resp = project.delayResponsibility;
      if (resp && resp !== 'not_applicable') {
        acc[resp] = (acc[resp] || 0) + 1;
      }
      return acc;
    }, { nomad_fault: 0, vendor_fault: 0, client_fault: 0 });
    
    return [
      { name: "Nomad Fault", value: counts.nomad_fault || 0, color: "#ef4444" },
      { name: "Vendor Fault", value: counts.vendor_fault || 0, color: "#f59e0b" },
      { name: "Client Fault", value: counts.client_fault || 0, color: "#3b82f6" },
      // Removed "Not Applicable" to match updated UI consistency
    ].filter(item => item.value > 0);
  };

  const prepareDaysLateDistribution = () => {
    if (!analytics) return [];
    
    return [
      { name: "On Time", value: analytics.daysLateDistribution.onTime, color: "#22c55e" },
      { name: "1-7 Days", value: analytics.daysLateDistribution.week1, color: "#facc15" },
      { name: "8-14 Days", value: analytics.daysLateDistribution.week2, color: "#f97316" },
      { name: "15-30 Days", value: analytics.daysLateDistribution.month1, color: "#ef4444" },
      { name: "31-60 Days", value: analytics.daysLateDistribution.month2, color: "#dc2626" },
      { name: "60+ Days", value: analytics.daysLateDistribution.longTerm, color: "#991b1b" },
    ].filter(item => item.value > 0);
  };

  // Prepare monthly responsibility trends data using filtered projects
  const prepareMonthlyResponsibilityTrendsData = () => {
    if (!filteredProjects) return [];
    
    // Group filtered projects by month
    const monthlyData: { [key: string]: any } = {};
    
    filteredProjects.forEach((project: any) => {
      if (project.delayResponsibility === 'not_applicable') return;
      
      const projectDate = project.actualDeliveryDate || project.deliveryDate;
      if (!projectDate) return;
      
      const date = new Date(projectDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          date,
          nomad_fault: 0,
          vendor_fault: 0,
          client_fault: 0
        };
      }
      
      const resp = project.delayResponsibility;
      if (resp && resp !== 'not_applicable') {
        monthlyData[monthKey][resp]++;
      }
    });
    
    // Convert to array and sort by date
    return Object.entries(monthlyData)
      .map(([monthKey, data]: [string, any]) => ({
        month: format(data.date, 'MMM yy'),
        nomadFault: data.nomad_fault,
        vendorFault: data.vendor_fault,
        clientFault: data.client_fault
      }))
      .sort((a, b) => {
        const aDate = parse(a.month, 'MMM yy', new Date());
        const bDate = parse(b.month, 'MMM yy', new Date());
        return aDate.getTime() - bDate.getTime();
      });
  };

  const prepareMonthlyTrendsData = () => {
    if (!analytics) return [];
    
    let filteredData = analytics.monthlyTrends;
    
    // Apply timeframe filtering if not "all"
    if (selectedTimeframe !== "all") {
      const monthsToShow = parseInt(selectedTimeframe);
      filteredData = analytics.monthlyTrends.slice(-monthsToShow);
    }
    
    const processedData = filteredData.map((trend: any) => {
      // Parse the YYYY-MM format correctly
      const [year, month] = trend.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1); // month - 1 because JS months are 0-indexed
      return {
        month: format(date, 'MMM yyyy'),
        "On Time": trend.onTime,
        "Late": trend.late,
        "On Time %": trend.onTimePercentage,
        total: trend.total
      };
    });
    
    return processedData;
  };

  if (isLoadingAnalytics || isLoadingProjects) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading delivery analytics...</p>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log("🔍 Analytics data:", analytics);
  console.log("🔍 Loading state:", isLoadingAnalytics);
  
  if (isLoadingAnalytics) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading delivery analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics || !analytics.summary || analytics.summary.totalProjects === 0) {
    return (
      <div className="container p-6 mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">On Time Delivery Analytics</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">No Delivered Projects Found</h3>
          <p className="text-muted-foreground max-w-md">
            There are no delivered projects in the system yet. Once projects are marked as delivered, 
            comprehensive analytics and charts will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container p-6 mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">On Time Delivery Analytics</h1>
        <div className="flex gap-4">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last Quarter</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
              <SelectItem value="24">Last 24 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="projects">Projects List</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.summary.totalProjects}</div>
                <p className="text-xs text-muted-foreground">Delivered projects</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Time Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analytics.summary.onTimePercentage}%</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.summary.onTimeCount} of {analytics.summary.totalProjects} projects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{getCurrentMonthData().percentage}%</div>
                <p className="text-xs text-muted-foreground">
                  {getCurrentMonthData().month}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getCurrentMonthData().onTime} on time, {getCurrentMonthData().late} late
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late Projects</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{analytics.summary.lateCount}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((analytics.summary.lateCount / analytics.summary.totalProjects) * 100)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Days Late</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{analytics.summary.avgDaysLate}</div>
                <p className="text-xs text-muted-foreground">For late projects only</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contract Extensions</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {deliveredProjects?.reduce((sum, project) => sum + (project.contractExtensions || 0), 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {deliveredProjects?.filter(p => (p.contractExtensions || 0) > 0).length || 0} projects with extensions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* On Time Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>On Time Performance</CardTitle>
                <CardDescription>Distribution of delivery performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "On Time", value: analytics.summary.onTimeCount, color: COLORS.success },
                            { name: "Late", value: analytics.summary.lateCount, color: COLORS.danger }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            { name: "On Time", value: analytics.summary.onTimeCount, color: COLORS.success },
                            { name: "Late", value: analytics.summary.lateCount, color: COLORS.danger }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{analytics.summary.onTimePercentage}%</div>
                        <div className="text-xs text-muted-foreground">On Time</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm">On Time ({analytics.summary.onTimeCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm">Late ({analytics.summary.lateCount})</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Days Late Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Days Late Distribution</CardTitle>
                <CardDescription>How late were the delayed projects</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={prepareDaysLateDistribution()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {prepareDaysLateDistribution().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Delivery Trends</CardTitle>
              <CardDescription>On-time delivery performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={prepareMonthlyTrendsData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="On Time" stackId="a" fill="#22c55e" />
                  <Bar yAxisId="left" dataKey="Late" stackId="a" fill="#ef4444" />
                  <Line yAxisId="right" type="monotone" dataKey="On Time %" stroke="#3b82f6" strokeWidth={3} dot={{ fill: "#3b82f6" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quarterly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Quarterly Performance</CardTitle>
              <CardDescription>Quarterly on-time delivery trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={prepareQuarterlyData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="onTime" fill="#22c55e" name="On Time" />
                  <Bar yAxisId="left" dataKey="late" fill="#ef4444" name="Late" />
                  <Line yAxisId="right" type="monotone" dataKey="onTimePercentage" stroke="#3b82f6" strokeWidth={3} dot={{ fill: "#3b82f6" }} name="On Time %" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {analytics.yearlyComparison.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Yearly Comparison</CardTitle>
                <CardDescription>Year-over-year performance comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={analytics.yearlyComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="onTime" fill="#22c55e" name="On Time" />
                    <Bar yAxisId="left" dataKey="late" fill="#ef4444" name="Late" />
                    <Line yAxisId="right" type="monotone" dataKey="onTimePercentage" stroke="#3b82f6" strokeWidth={3} dot={{ fill: "#3b82f6" }} name="On Time %" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delay Responsibility Breakdown</CardTitle>
              <CardDescription>
                Who was responsible for project delays 
                {selectedTimeframe !== "all" && ` (Last ${selectedTimeframe} months)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={prepareResponsibilityPieData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {prepareResponsibilityPieData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} projects`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {processedData?.responsibilityBarData?.find(d => d.name === 'Nomad Fault')?.count || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Nomad Fault</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-amber-600">
                        {processedData?.responsibilityBarData?.find(d => d.name === 'Vendor Fault')?.count || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Vendor Fault</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {processedData?.responsibilityBarData?.find(d => d.name === 'Client Fault')?.count || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Client Fault</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delay Responsibility Bar Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Delay Responsibility Distribution</CardTitle>
                <CardDescription>Number of projects by responsibility type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processedData?.responsibilityBarData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(processedData?.responsibilityBarData || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Responsibility Trends</CardTitle>
                <CardDescription>Delay responsibility patterns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={prepareMonthlyResponsibilityTrendsData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="nomadFault" stackId="1" stroke="#ef4444" fill="#ef4444" name="Nomad Fault" />
                    <Area type="monotone" dataKey="vendorFault" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Vendor Fault" />
                    <Area type="monotone" dataKey="clientFault" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Client Fault" />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Projects List Tab */}
        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivered Projects List</CardTitle>
              <CardDescription>
                All delivered projects with delivery performance details
              </CardDescription>
              <div className="flex gap-4">
                <Select value={selectedResponsibility} onValueChange={setSelectedResponsibility}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by responsibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Responsibilities</SelectItem>
                    <SelectItem value="nomad_fault">Nomad Fault</SelectItem>
                    <SelectItem value="vendor_fault">Vendor Fault</SelectItem>
                    <SelectItem value="client_fault">Client Fault</SelectItem>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Contract Date</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Responsibility</TableHead>
                      <TableHead>Extensions</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-medium">{project.projectNumber}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-48">
                              {project.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(project.contractDate)}</TableCell>
                        <TableCell>{formatDate(project.deliveryDate || project.actualDeliveryDate)}</TableCell>
                        <TableCell>{getDaysLateBadge(project.daysLate)}</TableCell>
                        <TableCell>{getResponsibilityBadge(project.delayResponsibility)}</TableCell>
                        <TableCell>
                          <Badge variant={project.contractExtensions > 0 ? "destructive" : "secondary"}>
                            {project.contractExtensions || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-48 truncate">
                          {project.lateDeliveryReason || project.reason || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          <AIInsightsTab filteredProjects={filteredProjects} selectedTimeframe={selectedTimeframe} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OnTimeDeliveryPage;