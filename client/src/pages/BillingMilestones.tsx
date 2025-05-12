import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  DollarSign, 
  Flag, 
  LineChart, 
  Banknote,
  Plus,
  Filter,
  FileText,
  CheckSquare,
  MoreHorizontal,
  Download,
  Calendar,
  Edit,
  Trash2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BillingStatusCard } from '@/components/BillingStatusCard';
import { DataTable } from '@/components/ui/data-table';
import { ProgressBadge } from '@/components/ui/progress-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, formatCurrency, getBillingStatusInfo } from '@/lib/utils';
import { AIInsightsModal } from '@/components/AIInsightsModal';
import BillingMilestoneForm from '@/components/BillingMilestoneForm';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

const BillingMilestones = () => {
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  
  const { data: billingMilestones, isLoading: isLoadingBilling } = useQuery({
    queryKey: ['/api/billing-milestones'],
  });

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
  });
  
  // Delete mutation
  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/billing-milestones/${id}`, {});
      return response.ok;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Billing milestone deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete billing milestone: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handler for adding a new milestone
  const handleAddMilestone = () => {
    setSelectedMilestone(null);
    setIsEditing(false);
    setShowMilestoneForm(true);
  };
  
  // Handler for editing a milestone
  const handleEditMilestone = (milestone: any) => {
    setSelectedMilestone(milestone);
    setIsEditing(true);
    setShowMilestoneForm(true);
  };
  
  // Handler for deleting a milestone
  const handleDeleteMilestone = (id: number) => {
    if (confirm("Are you sure you want to delete this milestone?")) {
      deleteMilestoneMutation.mutate(id);
    }
  };

  // Calculate billing stats
  const billingStats = React.useMemo(() => {
    if (!billingMilestones || billingMilestones.length === 0) return null;

    const completed = billingMilestones.filter(m => m.status === 'paid').length;
    const inProgress = billingMilestones.filter(m => m.status === 'invoiced').length;
    const overdue = billingMilestones.filter(m => m.status === 'delayed').length;
    const upcoming = billingMilestones.filter(m => m.status === 'upcoming').length;

    // Calculate total amounts
    const totalReceived = billingMilestones
      .filter(m => m.status === 'paid')
      .reduce((sum, m) => sum + parseFloat(m.amount), 0);
      
    const totalPending = billingMilestones
      .filter(m => m.status === 'invoiced')
      .reduce((sum, m) => sum + parseFloat(m.amount), 0);
      
    const totalOverdue = billingMilestones
      .filter(m => m.status === 'delayed')
      .reduce((sum, m) => sum + parseFloat(m.amount), 0);

    // Calculate forecast for next 3 months
    const today = new Date();
    const nextThreeMonths = [
      new Date(today.getFullYear(), today.getMonth(), 1),
      new Date(today.getFullYear(), today.getMonth() + 1, 1),
      new Date(today.getFullYear(), today.getMonth() + 2, 1)
    ];
    
    const forecast = nextThreeMonths.map(month => {
      const nextMonth = new Date(month);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      return billingMilestones
        .filter(m => {
          const targetDate = new Date(m.targetInvoiceDate);
          return targetDate >= month && targetDate < nextMonth && m.status !== 'paid';
        })
        .reduce((sum, m) => sum + parseFloat(m.amount), 0);
    });

    const monthNames = nextThreeMonths.map(date => date.toLocaleString('default', { month: 'short' }));

    return {
      milestones: {
        completed,
        inProgress,
        overdue,
        upcoming
      },
      amounts: {
        received: totalReceived,
        pending: totalPending,
        overdue: totalOverdue,
        total: totalReceived + totalPending + totalOverdue
      },
      forecast: {
        labels: monthNames,
        values: forecast
      }
    };
  }, [billingMilestones]);

  const columns = [
    {
      accessorKey: 'projectId',
      header: 'Project',
      cell: ({ row }) => {
        const project = projects?.find(p => p.id === row.original.projectId);
        if (!project) return <div>-</div>;
        
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8 rounded bg-primary flex items-center justify-center text-white font-medium">
              {project.projectNumber.slice(-2)}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-white">{project.projectNumber}</div>
              <div className="text-xs text-gray-400">{project.name}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Milestone',
      cell: ({ row }) => <div className="text-sm">{row.original.name}</div>,
    },
    {
      accessorKey: 'amount',
      header: 'Value',
      cell: ({ row }) => <div className="text-sm font-medium">{formatCurrency(row.original.amount)}</div>,
    },
    {
      accessorKey: 'targetInvoiceDate',
      header: 'Target Date',
      cell: ({ row }) => <div className="text-sm">{formatDate(row.original.targetInvoiceDate)}</div>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const statusInfo = getBillingStatusInfo(
          row.original.status,
          row.original.targetInvoiceDate,
          row.original.actualInvoiceDate
        );
        return <ProgressBadge status={statusInfo.display} />;
      },
    },
    {
      accessorKey: 'timeline',
      header: 'Timeline',
      cell: ({ row }) => {
        const statusInfo = getBillingStatusInfo(
          row.original.status,
          row.original.targetInvoiceDate,
          row.original.actualInvoiceDate
        );
        const textColorClass = row.original.status === 'delayed' ? 'text-danger' : 
                            row.original.status === 'invoiced' ? 'text-warning' :
                            row.original.status === 'paid' ? 'text-success' : 'text-gray-400';
        return <div className={`text-sm ${textColorClass}`}>{statusInfo.timeline}</div>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-right space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <CheckSquare className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditMilestone(row.original)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Milestone
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const updatedMilestone = { 
                  ...row.original,
                  status: 'paid',
                  paymentReceivedDate: format(new Date(), 'yyyy-MM-dd')
                };
                handleEditMilestone(updatedMilestone);
              }}>
                Mark as Paid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeleteMilestone(row.original.id)}>
                <Trash2 className="h-4 w-4 mr-2 text-danger" />
                Delete Milestone
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Milestones' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'invoiced', label: 'Invoiced' },
    { value: 'paid', label: 'Paid' },
    { value: 'delayed', label: 'Overdue' },
  ];

  if (isLoadingBilling || isLoadingProjects) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-sans font-bold mb-6">Billing Milestones</h1>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-darkCard h-28 rounded-xl border border-gray-800"></div>
            ))}
          </div>
          <div className="bg-darkCard h-96 rounded-xl border border-gray-800"></div>
          <div className="bg-darkCard h-72 rounded-xl border border-gray-800"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-sans font-bold">Billing Milestones</h1>
          <p className="text-gray-400 text-sm">Manage and track billing milestones and revenue forecasts</p>
        </div>
        
        <div className="flex items-center gap-3">
          <AIInsightsModal />
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button size="sm" onClick={handleAddMilestone}>
            <Plus className="mr-2 h-4 w-4" />
            New Milestone
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <BillingStatusCard 
          title="Total Revenue"
          value={formatCurrency(billingStats?.amounts.total || 0)}
          type="revenue"
          change={{ 
            value: "8% YTD", 
            isPositive: true 
          }}
          progress={{ 
            value: 75, 
            label: "75% of target" 
          }}
        />
        
        <BillingStatusCard 
          title="Milestone Status"
          value=""
          type="milestones"
          stats={[
            { label: "Completed", value: billingStats?.milestones.completed || 0 },
            { label: "In Progress", value: billingStats?.milestones.inProgress || 0 },
            { label: "Overdue", value: billingStats?.milestones.overdue || 0 },
            { label: "Upcoming", value: billingStats?.milestones.upcoming || 0 }
          ]}
        />
        
        <BillingStatusCard 
          title="Monthly Forecasts"
          value={formatCurrency(billingStats?.forecast.values[0] || 0)}
          type="forecast"
          chart={{
            labels: billingStats?.forecast.labels || ["Apr", "May", "Jun"],
            values: billingStats?.forecast.values || [8, 5, 10]
          }}
        />
        
        <BillingStatusCard 
          title="Cash Flow"
          value=""
          type="cashflow"
          stats={[
            { label: "Outstanding", value: formatCurrency(billingStats?.amounts.pending + billingStats?.amounts.overdue || 0) },
            { label: "Invoiced", value: formatCurrency(billingStats?.amounts.pending || 0) },
            { label: "Received (30d)", value: formatCurrency(billingStats?.amounts.received || 0) }
          ]}
        />
      </div>
      
      {/* Billing Milestones Table */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-sans font-bold">Billing Milestones</h2>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={billingMilestones || []}
        filterColumn="status"
        filterOptions={statusOptions}
        searchPlaceholder="Search milestones..."
      />

      {/* Monthly Revenue Forecast Chart */}
      <div className="mt-6 bg-darkCard rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="font-bold text-lg">Revenue Forecast</h2>
          <div className="flex items-center gap-3">
            <select className="bg-darkInput text-gray-300 border-none rounded-lg px-4 py-2 text-sm appearance-none pr-8 relative focus:ring-1 focus:ring-primary">
              <option>Next 6 Months</option>
              <option>Next Quarter</option>
              <option>Year to Date</option>
              <option>Custom Range</option>
            </select>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        
        <div className="p-4">
          <div className="h-72 flex items-end gap-2">
            <div className="w-full flex items-end justify-between">
              {["Apr", "May", "Jun", "Jul", "Aug", "Sep"].map((month, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="flex gap-1 h-56">
                    <div className="w-16 bg-success bg-opacity-20 relative">
                      <div 
                        className="absolute bottom-0 w-full bg-success" 
                        style={{
                          height: `${60 - idx * 10}%`
                        }}
                      ></div>
                    </div>
                    <div className="w-16 bg-warning bg-opacity-20 relative">
                      <div 
                        className="absolute bottom-0 w-full bg-warning" 
                        style={{
                          height: `${20 + idx * 10}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-400">{month}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6 flex justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-success"></div>
              <span className="text-sm">Confirmed ($3.2M)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-warning"></div>
              <span className="text-sm">Projected ($4.8M)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-danger"></div>
              <span className="text-sm">At Risk ($0.7M)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Milestone Form Dialog */}
      <BillingMilestoneForm
        open={showMilestoneForm}
        onOpenChange={setShowMilestoneForm}
        defaultValues={selectedMilestone ? {
          projectId: selectedMilestone.projectId,
          name: selectedMilestone.name,
          description: selectedMilestone.description || '',
          amount: selectedMilestone.amount.toString(),
          targetInvoiceDate: selectedMilestone.targetInvoiceDate,
          actualInvoiceDate: selectedMilestone.actualInvoiceDate || '',
          paymentReceivedDate: selectedMilestone.paymentReceivedDate || '',
          status: selectedMilestone.status,
          // Add new fields
          contractReference: selectedMilestone.contractReference || '',
          paymentTerms: selectedMilestone.paymentTerms || '',
          invoiceNumber: selectedMilestone.invoiceNumber || '',
          percentageOfTotal: selectedMilestone.percentageOfTotal || '',
          billingContact: selectedMilestone.billingContact || '',
          notes: selectedMilestone.notes || ''
        } : undefined}
        isEdit={isEditing}
        milestoneId={selectedMilestone?.id}
      />
    </div>
  );
};

export default BillingMilestones;
