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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate, formatCurrency, getBillingStatusInfo } from '@/lib/utils';
import { AIInsightsModal } from '@/components/AIInsightsModal';
import BillingMilestoneForm from '@/components/BillingMilestoneForm';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

const BillingMilestones = () => {
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  
  // Handler for viewing milestone details
  const handleViewMilestoneDetails = (milestone: any) => {
    setSelectedMilestone(milestone);
    setShowDetailsDialog(true);
  };
  
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
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);
      
    const totalPending = billingMilestones
      .filter(m => m.status === 'invoiced')
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);
      
    const totalOverdue = billingMilestones
      .filter(m => m.status === 'delayed')
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);
      
    const totalUpcoming = billingMilestones
      .filter(m => m.status === 'upcoming')
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);
    
    const total = totalReceived + totalPending + totalOverdue + totalUpcoming;

    // Calculate YTD (year to date) change
    // For demo purposes, we'll calculate this as the percentage of received vs total
    const ytdProgress = Math.round((totalReceived / (total || 1)) * 100);
    
    // Calculate target progress (for demo, set a target of 80% collection rate)
    const targetCollectionRate = 80;
    const currentCollectionRate = Math.round((totalReceived / (total || 1)) * 100);
    const progressOfTarget = Math.round((currentCollectionRate / targetCollectionRate) * 100);

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
          const targetDate = new Date(m.targetInvoiceDate || '');
          return targetDate >= month && targetDate < nextMonth && m.status !== 'paid';
        })
        .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);
    });

    const monthNames = nextThreeMonths.map(date => date.toLocaleString('default', { month: 'short' }));

    // Calculate last 30 days revenue
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const receivedLast30Days = billingMilestones
      .filter(m => {
        const paidDate = m.paidDate ? new Date(m.paidDate) : null;
        return m.status === 'paid' && paidDate && paidDate >= last30Days;
      })
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

    return {
      milestones: {
        completed,
        inProgress,
        overdue,
        upcoming
      },
      amounts: {
        received: totalReceived,
        receivedLast30Days,
        pending: totalPending,
        overdue: totalOverdue,
        upcoming: totalUpcoming,
        total
      },
      forecast: {
        labels: monthNames,
        values: forecast
      },
      progress: {
        ytd: ytdProgress,
        target: progressOfTarget,
        isPositive: ytdProgress > 0
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
              <DropdownMenuItem onClick={() => handleViewMilestoneDetails(row.original)}>
                <FileText className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
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
            value: `${billingStats?.progress.ytd || 0}% YTD`, 
            isPositive: billingStats?.progress.isPositive || false 
          }}
          progress={{ 
            value: billingStats?.progress.target || 0, 
            label: `${billingStats?.progress.target || 0}% of target` 
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
            labels: billingStats?.forecast.labels || [],
            values: billingStats?.forecast.values || []
          }}
        />
        
        <BillingStatusCard 
          title="Cash Flow"
          value=""
          type="cashflow"
          stats={[
            { label: "Outstanding", value: formatCurrency((billingStats?.amounts.pending || 0) + (billingStats?.amounts.overdue || 0)) },
            { label: "Invoiced", value: formatCurrency(billingStats?.amounts.pending || 0) },
            { label: "Received (30d)", value: formatCurrency(billingStats?.amounts.receivedLast30Days || 0) }
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
      
      {/* Milestone Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center">
              <div className="mr-2 h-6 w-6 rounded bg-primary flex items-center justify-center text-white text-xs font-medium">
                {selectedMilestone?.name?.charAt(0)}
              </div>
              {selectedMilestone?.name}
            </DialogTitle>
            <DialogDescription>
              Billing Milestone Details
            </DialogDescription>
          </DialogHeader>
          
          {selectedMilestone && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Project</h3>
                  <p className="text-sm mt-1">
                    {(() => {
                      const project = projects?.find(p => p.id === selectedMilestone.projectId);
                      return project ? `${project.projectNumber} - ${project.name}` : 'Unknown';
                    })()}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Amount</h3>
                  <p className="text-sm mt-1">{formatCurrency(parseFloat(selectedMilestone.amount) || 0)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <div className="mt-1">
                    <ProgressBadge status={selectedMilestone.status} />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Target Invoice Date</h3>
                  <p className="text-sm mt-1">{selectedMilestone.targetInvoiceDate ? formatDate(new Date(selectedMilestone.targetInvoiceDate)) : 'Not set'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Actual Invoice Date</h3>
                  <p className="text-sm mt-1">{selectedMilestone.actualInvoiceDate ? formatDate(new Date(selectedMilestone.actualInvoiceDate)) : 'Not invoiced yet'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Payment Date</h3>
                  <p className="text-sm mt-1">{selectedMilestone.paidDate ? formatDate(new Date(selectedMilestone.paidDate)) : 'Not paid yet'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Contract Reference</h3>
                  <p className="text-sm mt-1">{selectedMilestone.contractReference || 'N/A'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Payment Terms</h3>
                  <p className="text-sm mt-1">{selectedMilestone.paymentTerms || 'N/A'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Invoice Number</h3>
                  <p className="text-sm mt-1">{selectedMilestone.invoiceNumber || 'Not invoiced yet'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Percentage of Total</h3>
                  <p className="text-sm mt-1">{selectedMilestone.percentageOfTotal ? `${selectedMilestone.percentageOfTotal}%` : 'N/A'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Billing Contact</h3>
                  <p className="text-sm mt-1">{selectedMilestone.billingContact || 'N/A'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedMilestone.notes || 'No notes available'}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-between items-center">
            <div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setShowDetailsDialog(false);
                  handleEditMilestone(selectedMilestone);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowDetailsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Billing Milestone Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Billing Milestone Details</DialogTitle>
            <DialogDescription>
              Detailed information about this billing milestone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedMilestone && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Project Number</h3>
                  <p className="text-sm mt-1">
                    {projects?.find(p => p.id === selectedMilestone.projectId)?.projectNumber || '-'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Project Name</h3>
                  <p className="text-sm mt-1">
                    {projects?.find(p => p.id === selectedMilestone.projectId)?.name || '-'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Milestone Name</h3>
                  <p className="text-sm mt-1">{selectedMilestone.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Status</h3>
                  <div className="mt-1">
                    <ProgressBadge status={selectedMilestone.status} />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium">Description</h3>
                <p className="text-sm mt-1">{selectedMilestone.description || '-'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Amount</h3>
                  <p className="text-sm mt-1 font-medium">{formatCurrency(selectedMilestone.amount)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Percentage of Total</h3>
                  <p className="text-sm mt-1">{selectedMilestone.percentageOfTotal || '-'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Target Date</h3>
                  <p className="text-sm mt-1">{formatDate(selectedMilestone.targetInvoiceDate)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Actual Invoice Date</h3>
                  <p className="text-sm mt-1">{selectedMilestone.actualInvoiceDate ? formatDate(selectedMilestone.actualInvoiceDate) : '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Payment Received Date</h3>
                  <p className="text-sm mt-1">{selectedMilestone.paymentReceivedDate ? formatDate(selectedMilestone.paymentReceivedDate) : '-'}</p>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-2">
                <h3 className="text-sm font-medium mb-2">Additional Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Contract Reference</h3>
                    <p className="text-sm mt-1">{selectedMilestone.contractReference || '-'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Invoice Number</h3>
                    <p className="text-sm mt-1">{selectedMilestone.invoiceNumber || '-'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <h3 className="text-sm font-medium">Payment Terms</h3>
                    <p className="text-sm mt-1">{selectedMilestone.paymentTerms || '-'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Billing Contact</h3>
                    <p className="text-sm mt-1">{selectedMilestone.billingContact || '-'}</p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <h3 className="text-sm font-medium">Notes</h3>
                  <p className="text-sm mt-1">{selectedMilestone.notes || '-'}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowDetailsDialog(false);
              handleEditMilestone(selectedMilestone);
            }}>
              Edit Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
