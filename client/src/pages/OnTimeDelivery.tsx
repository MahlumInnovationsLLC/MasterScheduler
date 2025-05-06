import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Cell, 
  Legend, 
  Pie, 
  PieChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";
import { DeliveryTracking, type Project } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { Loader2, AlertTriangle, Calendar, Check, Clock, XCircle, ArrowUpDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { DeliveryTrackingForm } from "@/components/DeliveryTrackingForm";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Define the colors for the responsibility categories
const responsibilityColors = {
  nomad_fault: "#ef4444", // red-500
  vendor_fault: "#f97316", // orange-500
  client_fault: "#3b82f6", // blue-500
  not_applicable: "#9ca3af", // gray-400
};

// Helper function to format dates
const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "N/A";
  return format(parseISO(dateStr), "MMM d, yyyy");
};

// Helper to get badge variant based on delay responsibility
const getResponsibilityBadge = (responsibility: string) => {
  switch (responsibility) {
    case "nomad_fault":
      return <Badge variant="destructive">Nomad Fault</Badge>;
    case "vendor_fault":
      return <Badge className="bg-amber-500 hover:bg-amber-600">Vendor Fault</Badge>;
    case "client_fault":
      return <Badge variant="default">Client Fault</Badge>;
    default:
      return <Badge variant="outline">Not Applicable</Badge>;
  }
};

// Helper to get badge for days late
const getDaysLateBadge = (daysLate: number | null) => {
  if (daysLate === null) return <Badge variant="outline">Not Set</Badge>;
  if (daysLate <= 0) return <Badge className="bg-green-500 hover:bg-green-600">On Time</Badge>;
  if (daysLate <= 7) return <Badge className="bg-amber-500 hover:bg-amber-600">{daysLate} Days Late</Badge>;
  return <Badge variant="destructive">{daysLate} Days Late</Badge>;
};

// Interface for the combined delivery tracking data with project info
interface DeliveryTrackingWithProject {
  tracking: DeliveryTracking;
  project: {
    id: number;
    projectNumber: string;
    name: string;
    status: string;
  };
  createdBy: {
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
}

// Interface for analytics data
interface DeliveryAnalytics {
  summary: {
    totalProjects: number;
    totalTracked: number;
    onTimeCount: number;
    lateCount: number;
    onTimePercentage: number;
    avgDaysLate: number;
  };
  countByResponsibility: {
    nomad_fault: number;
    vendor_fault: number;
    client_fault: number;
    not_applicable: number;
  };
  monthlyTrends: {
    yearMonth: string;
    total: number;
    onTime: number;
    late: number;
    onTimePercentage: number;
  }[];
}

const OnTimeDeliveryPage: React.FC = () => {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [filterResponsibility, setFilterResponsibility] = useState<string>("");
  const [daysLateMin, setDaysLateMin] = useState<string>("");
  const [daysLateMax, setDaysLateMax] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("all-records");

  // Query for all delivery tracking records with optional filtering
  const { 
    data: deliveryRecords, 
    isLoading: isLoadingRecords,
    refetch: refetchRecords
  } = useQuery<DeliveryTrackingWithProject[]>({
    queryKey: [
      "/api/delivery-tracking",
      filterResponsibility,
      daysLateMin,
      daysLateMax,
    ],
    queryFn: async () => {
      let url = "/api/delivery-tracking";
      const params = new URLSearchParams();
      
      if (filterResponsibility) {
        params.append("responsibility", filterResponsibility);
      }
      
      if (daysLateMin) {
        params.append("daysLateMin", daysLateMin);
      }
      
      if (daysLateMax) {
        params.append("daysLateMax", daysLateMax);
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch delivery tracking records");
      }
      return response.json();
    },
  });

  // Query for projects (for the record creation form)
  const { data: projects, isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Query for delivery tracking analytics
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery<DeliveryAnalytics>({
    queryKey: ["/api/delivery-tracking/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/delivery-tracking/analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch delivery analytics");
      }
      return response.json();
    },
  });

  // Query for project-specific delivery tracking data if a project is selected
  const { data: projectDeliveryData, isLoading: isLoadingProjectData } = useQuery<DeliveryTracking[]>({
    queryKey: ["/api/projects", selectedProject, "delivery-tracking"],
    enabled: !!selectedProject,
    queryFn: async () => {
      const response = await fetch(`/api/projects/${selectedProject}/delivery-tracking`);
      if (!response.ok) {
        throw new Error("Failed to fetch project delivery tracking data");
      }
      return response.json();
    },
  });

  // Reset filters
  const resetFilters = () => {
    setFilterResponsibility("");
    setDaysLateMin("");
    setDaysLateMax("");
  };

  // Handle form submission success
  const handleFormSuccess = () => {
    toast({
      title: "Success",
      description: "Delivery tracking record saved successfully",
      variant: "default",
    });
    refetchRecords();
  };

  // Prepare data for pie chart
  const prepareResponsibilityPieData = () => {
    if (!analytics) return [];
    
    return [
      {
        name: "Nomad Fault",
        value: analytics.countByResponsibility.nomad_fault,
        color: responsibilityColors.nomad_fault,
      },
      {
        name: "Vendor Fault",
        value: analytics.countByResponsibility.vendor_fault,
        color: responsibilityColors.vendor_fault,
      },
      {
        name: "Client Fault",
        value: analytics.countByResponsibility.client_fault,
        color: responsibilityColors.client_fault,
      },
      {
        name: "Not Applicable",
        value: analytics.countByResponsibility.not_applicable,
        color: responsibilityColors.not_applicable,
      },
    ];
  };

  // Prepare data for monthly trends bar chart
  const prepareMonthlyTrendsData = () => {
    if (!analytics) return [];
    
    return analytics.monthlyTrends.map(monthly => ({
      month: monthly.yearMonth,
      onTime: monthly.onTime,
      late: monthly.late,
      percentage: Math.round(monthly.onTimePercentage),
    }));
  };

  return (
    <div className="container p-4 mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">On Time Delivery Tracking</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="all-records">Records</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          {isAuthenticated && user?.role && ["admin", "editor"].includes(user.role) && (
            <TabsTrigger value="add-record">Add Record</TabsTrigger>
          )}
        </TabsList>
        
        {/* All Records Tab */}
        <TabsContent value="all-records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Tracking Records</CardTitle>
              <CardDescription>
                View all delivery tracking records for projects and filter by various criteria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Label htmlFor="filterResponsibility">Responsibility</Label>
                  <Select
                    value={filterResponsibility}
                    onValueChange={setFilterResponsibility}
                  >
                    <SelectTrigger id="filterResponsibility">
                      <SelectValue placeholder="All Responsibilities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Responsibilities</SelectItem>
                      <SelectItem value="nomad_fault">Nomad Fault</SelectItem>
                      <SelectItem value="vendor_fault">Vendor Fault</SelectItem>
                      <SelectItem value="client_fault">Client Fault</SelectItem>
                      <SelectItem value="not_applicable">Not Applicable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-1">
                  <Label htmlFor="daysLateMin">Min Days Late</Label>
                  <Input
                    id="daysLateMin"
                    type="number"
                    value={daysLateMin}
                    onChange={(e) => setDaysLateMin(e.target.value)}
                    placeholder="Min days late"
                  />
                </div>
                
                <div className="flex-1">
                  <Label htmlFor="daysLateMax">Max Days Late</Label>
                  <Input
                    id="daysLateMax"
                    type="number"
                    value={daysLateMax}
                    onChange={(e) => setDaysLateMax(e.target.value)}
                    placeholder="Max days late"
                  />
                </div>
                
                <div className="flex items-end space-x-2 mt-auto">
                  <Button onClick={() => refetchRecords()}>
                    Apply
                  </Button>
                  <Button variant="outline" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>
              </div>
              
              {isLoadingRecords ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading records...</span>
                </div>
              ) : !deliveryRecords || deliveryRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">No delivery records found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try changing your filters or add a new delivery tracking record.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Project</TableHead>
                        <TableHead>Original Date</TableHead>
                        <TableHead>Actual Date</TableHead>
                        <TableHead>Days Late</TableHead>
                        <TableHead>Responsibility</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Created By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryRecords.map((record) => (
                        <TableRow key={record.tracking.id}>
                          <TableCell className="font-medium">
                            {record.project.projectNumber}: {record.project.name}
                          </TableCell>
                          <TableCell>
                            {formatDate(record.tracking.originalEstimatedDate)}
                          </TableCell>
                          <TableCell>
                            {formatDate(record.tracking.actualDeliveryDate)}
                          </TableCell>
                          <TableCell>
                            {getDaysLateBadge(record.tracking.daysLate)}
                          </TableCell>
                          <TableCell>
                            {getResponsibilityBadge(record.tracking.delayResponsibility)}
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate">
                            {record.tracking.delayReason || "N/A"}
                          </TableCell>
                          <TableCell>
                            {record.createdBy.firstName && record.createdBy.lastName 
                              ? `${record.createdBy.firstName} ${record.createdBy.lastName}`
                              : record.createdBy.username}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {isLoadingAnalytics ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading analytics...</span>
            </div>
          ) : !analytics ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No analytics data available</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add delivery tracking records to generate analytics.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                      Tracked Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {analytics.summary.totalTracked}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Out of {analytics.summary.totalProjects} projects
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Check className="h-5 w-5 mr-2 text-green-500" />
                      On Time Delivery
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {Math.round(analytics.summary.onTimePercentage)}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {analytics.summary.onTimeCount} out of {analytics.summary.totalTracked} projects
                    </p>
                    <Progress 
                      className="mt-2" 
                      value={analytics.summary.onTimePercentage} 
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-orange-500" />
                      Average Days Late
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {Math.round(analytics.summary.avgDaysLate)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Average number of days late across all projects
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <XCircle className="h-5 w-5 mr-2 text-red-500" />
                      Late Deliveries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {analytics.summary.lateCount}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(100 - analytics.summary.onTimePercentage)}% of all tracked projects
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Delay Responsibility</CardTitle>
                    <CardDescription>
                      Distribution of responsibility for delivery delays
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={prepareResponsibilityPieData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {prepareResponsibilityPieData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Delivery Performance</CardTitle>
                    <CardDescription>
                      On-time vs. Late deliveries by month
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={prepareMonthlyTrendsData()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="month" 
                            angle={-45} 
                            textAnchor="end"
                            height={70}
                          />
                          <YAxis />
                          <Tooltip formatter={(value, name) => {
                            if (name === "percentage") return [`${value}%`, "On-Time %"];
                            return [value, name === "onTime" ? "On Time" : "Late"];
                          }} />
                          <Legend />
                          <Bar dataKey="onTime" name="On Time" stackId="a" fill="#16a34a" />
                          <Bar dataKey="late" name="Late" stackId="a" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
        
        {/* Add Record Tab (only visible for admin/editor) */}
        {isAuthenticated && user?.role && ["admin", "editor"].includes(user.role) && (
          <TabsContent value="add-record" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Delivery Tracking Record</CardTitle>
                <CardDescription>
                  Track delivery performance against original estimates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProjects ? (
                  <div className="flex justify-center items-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading projects...</span>
                  </div>
                ) : (
                  <DeliveryTrackingForm 
                    projects={projects || []}
                    onSuccess={handleFormSuccess}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default OnTimeDeliveryPage;