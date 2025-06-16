import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  Folders, 
  DollarSign, 
  Building2, 
  Flag,
  LineChart,
  Banknote,
  CheckSquare,
  Calendar,
  Users,
  Plus,
  Filter,
  SortDesc,
  ArrowUpRight,
  Shield,
  LogIn,
  BarChart3,
  Eye,
  Hammer,
  Wrench,
  Clock,
  CheckCircle,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectStatsCard } from '@/components/ProjectStatusCard';
import { BillingStatusCard } from '@/components/BillingStatusCard';
import { ManufacturingCard } from '@/components/ManufacturingCard';
import { ProgressBadge } from '@/components/ui/progress-badge';
import { formatDate, formatCurrency, getProjectStatusColor, getProjectScheduleState, calculateBayUtilization, getBayStatusInfo } from '@/lib/utils';
import { DashboardTable } from '@/components/ui/dashboard-table';
import { ProjectStatusBreakdownCard } from '@/components/ProjectStatusBreakdownCard';
import { HighRiskProjectsCard } from '@/components/HighRiskProjectsCard';
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import ResizableBaySchedule from '@/components/ResizableBaySchedule';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const { toast } = useToast();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manufacturing Dashboard</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bay Schedule Overview
          </CardTitle>
          <CardDescription>
            Read-only view of manufacturing bay schedules and project timelines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bay-schedule-readonly">
            <ResizableBaySchedule
              schedules={[]}
              projects={[]}
              bays={[]}
              onScheduleChange={async () => {}}
              onScheduleCreate={async () => {}}
              onScheduleDelete={async () => {}}
              onBayCreate={async () => {}}
              onBayUpdate={async () => {}}
              onBayDelete={async () => {}}
              dateRange={{
                start: new Date(2025, 0, 1),
                end: new Date(new Date().setMonth(new Date().getMonth() + 6))
              }}
              viewMode="week"
              enableFinancialImpact={false}
              isSandboxMode={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;