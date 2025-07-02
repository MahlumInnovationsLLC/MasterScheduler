import React, { useState, useEffect } from 'react';
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
  Trash2,
  Check,
  X,
  Pencil as PencilIcon,
  PlusCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BillingStatusCard } from '@/components/BillingStatusCard';
import { DataTable } from '@/components/ui/data-table';
import { ProgressBadge } from '@/components/ui/progress-badge';
import { ModuleHelpButton } from '@/components/ModuleHelpButton';
import { billingHelpContent } from '@/data/moduleHelpContent';
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
import { formatDate, formatCurrency, getBillingStatusInfo, getFiscalWeeksForMonth } from '@/lib/utils';
import { AIInsightsModal } from '@/components/AIInsightsModal';
import BillingMilestoneForm from '@/components/BillingMilestoneForm';
import { EnhancedCashFlowWidget } from '@/components/EnhancedCashFlowWidget';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

const BillingMilestones = () => {
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [isAcceptingShipDate, setIsAcceptingShipDate] = useState<{[key: number]: boolean}>({});
  const [activeTab, setActiveTab] = useState<'open' | 'invoiced'>('open');
  const [revenueTarget, setRevenueTarget] = useState(50000000); // Default 50M target
  const { toast } = useToast();

  // Handler for viewing milestone details
  const handleViewMilestoneDetails = (milestone: any) => {
    setSelectedMilestone(milestone);
    setShowDetailsDialog(true);
  };

  // Handler for selecting a month in the forecast
  const handleMonthSelect = (year: number, month: number) => {
    // Calculate the index based on current date
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Calculate how many months from current month
    const monthsDiff = (year - currentYear) * 12 + (month - 1 - currentMonth);

    // Ensure the index is within the valid range (0-11) for 12 months
    const newIndex = Math.max(0, Math.min(11, monthsDiff));

    // Reset selected week to first week when changing months
    // This prevents issues with different months having different numbers of weeks
    setSelectedWeekIndex(0);

    // Update the selected month index
    setSelectedMonthIndex(newIndex);
  };

  // Query for billing milestones
  const { data: allBillingMilestones, isLoading: isLoadingBilling } = useQuery({
    queryKey: ['/api/billing-milestones'],
  });

  // Filter milestones based on active tab
  const billingMilestones = React.useMemo(() => {
    if (!allBillingMilestones) return [];

    return allBillingMilestones.filter(milestone => {
      if (activeTab === 'open') {
        // Open tab should only show upcoming and delayed milestones
        return milestone.status === 'upcoming' || milestone.status === 'delayed';
      } else {
        // Invoiced tab should show invoiced, paid, and billed milestones (all completed)
        return milestone.status === 'invoiced' || milestone.status === 'paid' || milestone.status === 'billed';
      }
    });
  }, [allBillingMilestones, activeTab]);

  // Query for financial goals
  const { data: financialGoals, isLoading: isLoadingGoals } = useQuery<{
    id: number;
    year: number;
    month: number;
    targetAmount: number;
    description?: string;
    createdAt: string;
    updatedAt: string;
  }[]>({
    queryKey: ['/api/financial-goals'],
  });

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Delete milestone mutation
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

  // Create financial goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async ({ year, month, targetAmount, description, week }: { 
      year: number; 
      month: number; 
      targetAmount: number; 
      description: string;
      week?: number;
    }) => {
      const response = await apiRequest("POST", "/api/financial-goals", {
        year,
        month,
        targetAmount,
        description,
        week
      });
      return response.ok;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Financial goal created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-goals'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create financial goal: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update financial goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async ({ year, month, targetAmount, description, week }: { 
      year: number; 
      month: number; 
      targetAmount: number; 
      description: string;
      week?: number;
    }) => {
      // Use different endpoint for weekly goals vs monthly goals
      const endpoint = week !== undefined
        ? `/api/financial-goals/${year}/${month}/${week}`
        : `/api/financial-goals/${year}/${month}`;

      const response = await apiRequest("PUT", endpoint, {
        targetAmount,
        description
      });
      return response.ok;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Financial goal updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-goals'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update financial goal: ${error.message}`,
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

  // Handler for marking milestone as invoiced
  const handleMarkAsInvoiced = async (id: number) => {
    try {
      console.log(`🔄 Marking milestone ${id} as invoiced`);
      const response = await apiRequest("PATCH", `/api/billing-milestones/${id}`, {
        status: 'invoiced',
        actualInvoiceDate: format(new Date(), 'yyyy-MM-dd')
      });

      if (response.ok) {
        console.log(`✅ Milestone ${id} marked as invoiced`);
        toast({
          title: "Success",
          description: "Milestone marked as invoiced",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update milestone");
      }
    } catch (error) {
      console.error(`❌ Error marking milestone ${id} as invoiced:`, error);
      toast({
        title: "Error",
        description: `Failed to mark milestone as invoiced: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  // Handler for marking milestone as paid
  const handleMarkAsPaid = async (id: number) => {
    try {
      const response = await apiRequest("PATCH", `/api/billing-milestones/${id}`, {
        status: 'paid',
        paidDate: format(new Date(), 'yyyy-MM-dd')
      });

      if (response.ok) {
        toast({
          title: "Success", 
          description: "Milestone marked as paid",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      } else {
        throw new Error("Failed to update milestone");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to mark milestone as paid: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  // Handler for accepting ship date changes
  const handleAcceptShipDate = async (id: number) => {
    setIsAcceptingShipDate(prev => ({ ...prev, [id]: true }));

    try {
      console.log(`📅 Accepting date change for milestone ${id}`);
      const response = await apiRequest("PATCH", `/api/billing-milestones/${id}`, {
        acceptDateChange: true
      });

      if (response.ok) {
        console.log(`✅ Date change accepted for milestone ${id}`);
        toast({
          title: "Date Change Accepted",
          description: "The target date has been updated to match the live date",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to accept date change");
      }
    } catch (error) {
      console.error(`❌ Error accepting ship date for milestone ${id}:`, error);
      toast({
        title: "Error",
        description: `Failed to accept ship date: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsAcceptingShipDate(prev => ({ ...prev, [id]: false }));
    }
  };

  // State for revenue period selector
  const [revenuePeriod, setRevenuePeriod] = useState<'ytd' | 'quarter' | 'month'>('ytd');

  // Calculate billing stats
  const billingStats = React.useMemo(() => {
    if (!allBillingMilestones || !Array.isArray(allBillingMilestones) || allBillingMilestones.length === 0) return null;

    // Use allBillingMilestones for milestone counts instead of filtered data
    const invoicedAndBilled = allBillingMilestones.filter((m: any) => m.status === 'invoiced' || m.status === 'billed').length;
    
    // Overdue: milestones with upcoming status that have dates in the past
    const overdue = allBillingMilestones.filter((m: any) => {
      if (m.status !== 'upcoming' || !m.targetInvoiceDate) return false;
      const targetDate = new Date(m.targetInvoiceDate);
      return targetDate < new Date();
    }).length;
    
    // Upcoming (next 30 days): milestones with upcoming status that have dates within 30 days
    const upcoming = allBillingMilestones.filter((m: any) => {
      if (m.status !== 'upcoming' || !m.targetInvoiceDate) return false;
      const targetDate = new Date(m.targetInvoiceDate);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return targetDate >= new Date() && targetDate <= thirtyDaysFromNow;
    }).length;
    
    // Future: milestones with upcoming status that have dates beyond 30 days + milestones without dates
    const upcomingTBD = allBillingMilestones.filter((m: any) => {
      if (m.status !== 'upcoming') return false;
      
      // Include milestones without dates
      if (!m.targetInvoiceDate) return true;
      
      // Include milestones beyond 30 days
      const targetDate = new Date(m.targetInvoiceDate);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return targetDate > thirtyDaysFromNow;
    }).length;

    // Calculate amounts using allBillingMilestones with proper typing
    const totalReceived = allBillingMilestones
      .filter((m: any) => m.status === 'paid')
      .reduce((sum: number, m: any) => sum + parseFloat(m.amount || '0'), 0);

    const receivedLast30Days = allBillingMilestones
      .filter((m: any) => {
        if (m.status !== 'paid' || !m.targetInvoiceDate) return false;
        const targetDate = new Date(m.targetInvoiceDate);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return targetDate >= thirtyDaysAgo;
      })
      .reduce((sum: number, m: any) => sum + parseFloat(m.amount || '0'), 0);

    const totalPending = allBillingMilestones
      .filter((m: any) => m.status === 'invoiced' || m.status === 'billed')
      .reduce((sum: number, m: any) => sum + parseFloat(m.amount || '0'), 0);

    const totalOverdue = allBillingMilestones
      .filter((m: any) => {
        if (!m.targetInvoiceDate || m.status === 'paid' || m.status === 'invoiced') return false;
        const targetDate = new Date(m.targetInvoiceDate);
        return targetDate < new Date();
      })
      .reduce((sum: number, m: any) => sum + parseFloat(m.amount || '0'), 0);

    const totalUpcoming = allBillingMilestones
      .filter((m: any) => {
        if (!m.targetInvoiceDate || m.status === 'paid' || m.status === 'invoiced') return false;
        const targetDate = new Date(m.targetInvoiceDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return targetDate >= new Date() && targetDate <= thirtyDaysFromNow;
      })
      .reduce((sum: number, m: any) => sum + parseFloat(m.amount || '0'), 0);

    const total = allBillingMilestones.reduce((sum: number, m: any) => sum + parseFloat(m.amount || '0'), 0);

    // Calculate period-based revenue
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Calculate period-based revenue using same logic as Cash Flow widget (invoiced + billed statuses)

    const pastMonthRevenue = allBillingMilestones
      .filter((m: any) => {
        // Include invoiced and billed milestones as revenue (same as Cash Flow widget)
        const isRevenueStatus = m.status === 'invoiced' || m.status === 'billed';
        if (!isRevenueStatus) return false;
        
        // Use actualInvoiceDate if available, otherwise use targetInvoiceDate
        const dateToCheck = m.actualInvoiceDate || m.targetInvoiceDate;
        if (!dateToCheck) return false;
        
        const actualDate = new Date(dateToCheck);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const isInPastMonth = actualDate >= lastMonth && actualDate <= endOfLastMonth;
        
        return isInPastMonth;
      })
      .reduce((sum: number, m: any) => sum + parseFloat(m.amount || '0'), 0);

    const quarterRevenue = allBillingMilestones
      .filter((m: any) => {
        // Include invoiced and billed milestones as revenue (same as Cash Flow widget)
        const isRevenueStatus = m.status === 'invoiced' || m.status === 'billed';
        if (!isRevenueStatus) return false;
        
        // Use actualInvoiceDate if available, otherwise use targetInvoiceDate
        const dateToCheck = m.actualInvoiceDate || m.targetInvoiceDate;
        if (!dateToCheck) return false;
        
        const actualDate = new Date(dateToCheck);
        const isInQuarter = actualDate >= startOfQuarter;
        
        return isInQuarter;
      })
      .reduce((sum: number, m: any) => sum + parseFloat(m.amount || '0'), 0);

    const ytdRevenue = allBillingMilestones
      .filter((m: any) => {
        // Include invoiced and billed milestones as revenue (same as Cash Flow widget)
        const isRevenueStatus = m.status === 'invoiced' || m.status === 'billed';
        if (!isRevenueStatus) return false;
        
        // Use actualInvoiceDate if available, otherwise use targetInvoiceDate
        const dateToCheck = m.actualInvoiceDate || m.targetInvoiceDate;
        if (!dateToCheck) return false;
        
        const actualDate = new Date(dateToCheck);
        const isInYTD = actualDate >= startOfYear;
        
        return isInYTD;
      })
      .reduce((sum: number, m: any) => sum + parseFloat(m.amount || '0'), 0);
      
    console.log('Revenue totals calculated:');
    console.log('  Past Month:', pastMonthRevenue);
    console.log('  Quarter:', quarterRevenue);
    console.log('  YTD:', ytdRevenue);
    console.log('=== END TOTAL REVENUE DEBUGGING ===');

    // Calculate YTD (year to date) change
    // For demo purposes, we'll calculate this as the percentage of received vs total
    const ytdProgress = Math.round((totalReceived / (total || 1)) * 100);

    // Calculate target progress (for demo, set a target of 80% collection rate)
    const targetCollectionRate = 80;
    const currentCollectionRate = Math.round((totalReceived / (total || 1)) * 100);
    const progressOfTarget = Math.round((currentCollectionRate / targetCollectionRate) * 100);

    // Calculate forecast for next 12 months
    const today = new Date();
    const nextTwelveMonths = [
      new Date(today.getFullYear(), today.getMonth(), 1),
      new Date(today.getFullYear(), today.getMonth() + 1, 1),
      new Date(today.getFullYear(), today.getMonth() + 2, 1),
      new Date(today.getFullYear(), today.getMonth() + 3, 1),
      new Date(today.getFullYear(), today.getMonth() + 4, 1),
      new Date(today.getFullYear(), today.getMonth() + 5, 1),
      new Date(today.getFullYear(), today.getMonth() + 6, 1),
      new Date(today.getFullYear(), today.getMonth() + 7, 1),
      new Date(today.getFullYear(), today.getMonth() + 8, 1),
      new Date(today.getFullYear(), today.getMonth() + 9, 1),
      new Date(today.getFullYear(), today.getMonth() + 10, 1),
      new Date(today.getFullYear(), today.getMonth() + 11, 1)
    ];

    // Calculate forecast by milestone status
    const forecastData = nextTwelveMonths.map((month, monthIdx) => {
      const nextMonth = new Date(month);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // Add debugging for months past May
      if (monthIdx > 4) {
        console.log(`Processing forecast for month ${monthIdx + 1} (${month.toLocaleString('default', { month: 'short' })})`);
        console.log(`  Month start: ${month.toISOString()}`);
        console.log(`  Month end: ${nextMonth.toISOString()}`);
      }

      // Confirmed revenue (invoiced, billed, paid, or delayed milestones)
      const confirmedRevenue = billingMilestones
        .filter(m => {
          if (!m.targetInvoiceDate) return false;

          try {
            const targetDate = new Date(m.targetInvoiceDate);

            // Check if date is valid
            if (isNaN(targetDate.getTime())) return false;

            const isInMonth = targetDate >= month && targetDate < nextMonth;
            // Include more statuses as confirmed revenue
            const isConfirmedStatus = ['invoiced', 'billed', 'paid', 'delayed'].includes(m.status);

            // Debug for months past May
            if (monthIdx > 4 && isInMonth && isConfirmedStatus) {
              console.log(`  Found confirmed milestone in month ${monthIdx + 1}: ${m.name}, amount: ${m.amount}, date: ${m.targetInvoiceDate}, status: ${m.status}`);
            }

            return isInMonth && isConfirmedStatus;
          } catch (error) {
            console.error(`Error processing date for milestone ${m.name}: ${error}`);
            return false;
          }
        })
        .reduce((sum, m) => {
          try {
            return sum + parseFloat(m.amount || '0');
          } catch (error) {
            console.error(`Error parsing amount for milestone ${m.name}: ${error}`);
            return sum;
          }
        }, 0);

      // Projected revenue (upcoming milestones)
      const projectedRevenue = billingMilestones
        .filter(m => {
          if (!m.targetInvoiceDate) return false;

          try {
            const targetDate = new Date(m.targetInvoiceDate);

            // Check if date is valid
            if (isNaN(targetDate.getTime())) return false;

            const isInMonth = targetDate >= month && targetDate < nextMonth;
            const isUpcoming = m.status === 'upcoming';

            // Debug for months past May
            if (monthIdx > 4 && isInMonth && isUpcoming) {
              console.log(`  Found upcoming milestone in month ${monthIdx + 1}: ${m.name}, amount: ${m.amount}, date: ${m.targetInvoiceDate}`);
            }

            return isInMonth && isUpcoming;
          } catch (error) {
            console.error(`Error processing date for milestone ${m.name}: ${error}`);
            return false;
          }
        })
        .reduce((sum, m) => {
          try {
            return sum + parseFloat(m.amount || '0');
          } catch (error) {
            console.error(`Error parsing amount for milestone ${m.name}: ${error}`);
            return sum;
          }
        }, 0);

      // At-risk revenue (calculated as 15% of upcoming milestones for demo purposes)
      const atRiskRevenue = projectedRevenue * 0.15;

      // Total projected for this month (for the top summary card)
      const totalMonthRevenue = confirmedRevenue + projectedRevenue;

      // Debug for months past May
      if (monthIdx > 4) {
        console.log(`  Month ${monthIdx + 1} (${month.toLocaleString('default', { month: 'short' })}) totals - Confirmed: ${confirmedRevenue}, Projected: ${projectedRevenue}, Total: ${totalMonthRevenue}`);
      }

      return {
        confirmed: confirmedRevenue,
        projected: projectedRevenue,
        atRisk: atRiskRevenue,
        total: totalMonthRevenue
      };
    });

    const monthNames = nextTwelveMonths.map(date => date.toLocaleString('default', { month: 'short' }));

    // Generate fiscal week data for the selected month using our standardized function
    const generateFiscalWeekData = (monthIndex: number) => {
      const month = nextTwelveMonths[monthIndex];
      if (!month) return { labels: [], values: [] };

      // Use the standardized fiscal week calculation
      const fiscalWeeks = getFiscalWeeksForMonth(month.getFullYear(), month.getMonth() + 1);

      // Calculate revenue values for each week
      const weeklyValues = fiscalWeeks.map((week, weekIdx) => {
        // Filter milestones that fall within this week's date range
        const weekMilestones = billingMilestones.filter(m => {
          if (!m.targetInvoiceDate) return false;

          // Ensure proper date parsing with improved error handling
          try {
            const milestoneDate = new Date(m.targetInvoiceDate);

            // Check if the date is valid
            if (isNaN(milestoneDate.getTime())) {
              console.log(`Invalid milestone date: ${m.targetInvoiceDate} for milestone ${m.name}`);
              return false;
            }

            // Include revenue-generating statuses for weekly breakdown
            const isRevenueStatus = ['invoiced', 'billed', 'paid', 'upcoming', 'delayed'].includes(m.status);
            if (!isRevenueStatus) return false;

            // For debugging 
            if (monthIndex > 4) { // Only log for months after May
              if (milestoneDate >= week.startDate && milestoneDate <= week.endDate) {
                console.log(`Month ${monthIndex + 1} (${month.toLocaleString('default', { month: 'short' })}), Week ${weekIdx + 1}: Found milestone ${m.name} with amount ${m.amount} on date ${m.targetInvoiceDate}, status: ${m.status}`);
              }
            }

            return milestoneDate >= week.startDate && milestoneDate <= week.endDate;
          } catch (error) {
            console.error(`Error processing milestone date: ${error}`);
            return false;
          }
        });

        // Sum up the values for this week with improved error handling
        const weekTotal = weekMilestones.reduce((sum, m) => {
          try {
            return sum + parseFloat(m.amount || '0');
          } catch (error) {
            console.error(`Error parsing amount for milestone ${m.name}: ${error}`);
            return sum;
          }
        }, 0);

        // Log the result for debugging
        if (monthIndex > 4) { // Only log for months after May
          console.log(`Month ${monthIndex + 1} (${month.toLocaleString('default', { month: 'short' })}), Week ${weekIdx + 1}: Total = ${weekTotal}`);
        }

        return weekTotal;
      });

      return {
        labels: fiscalWeeks.map(w => w.label),
        values: weeklyValues
      };
    };

    // Calculate fiscal week data for the selected month
    const fiscalWeekData = generateFiscalWeekData(selectedMonthIndex);

    // Debug log to track weekly values for different months
    console.log(`Fiscal week data for month ${selectedMonthIndex + 1} (${monthNames[selectedMonthIndex]}):`);
    console.log(`  Labels: ${fiscalWeekData.labels.join(', ')}`);
    console.log(`  Values: ${fiscalWeekData.values.join(', ')}`);

    // Calculate totals for the legend
    const totalConfirmed = forecastData.reduce((sum, month) => sum + month.confirmed, 0);
    const totalProjected = forecastData.reduce((sum, month) => sum + month.projected, 0);
    const totalAtRisk = forecastData.reduce((sum, month) => sum + month.atRisk, 0);

    // Calculate last 30 days revenue
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const receivedLast30DaysData = billingMilestones
      .filter(m => {
        const paidDate = m.paidDate ? new Date(m.paidDate) : null;
        return m.status === 'paid' && paidDate && paidDate >= last30Days;
      })
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

    return {
      milestones: {
        invoicedAndBilled,
        overdue,
        upcoming,
        upcomingTBD
      },
      amounts: {
        received: totalReceived,
        receivedLast30Days: receivedLast30DaysData,
        pending: totalPending,
        overdue: totalOverdue,
        upcoming: totalUpcoming,
        total,
        pastMonthRevenue,
        quarterRevenue,
        ytdRevenue
      },
      forecast: {
        labels: monthNames,
        values: forecastData.map(m => m.total),
        confirmedValues: forecastData.map(m => m.confirmed),
        projectedValues: forecastData.map(m => m.projected),
        atRiskValues: forecastData.map(m => m.atRisk),
        weekLabels: fiscalWeekData.labels,
        weekValues: fiscalWeekData.values,
        totals: {
          confirmed: totalConfirmed,
          projected: totalProjected,
          atRisk: totalAtRisk
        }
      },
      progress: {
        ytd: ytdProgress,
        target: progressOfTarget,
        isPositive: ytdProgress > 0
      }
    };
  }, [allBillingMilestones, selectedMonthIndex, financialGoals, revenuePeriod]);

  const columns = [
    {
      accessorKey: 'projectId',
      header: 'Project',
      cell: ({ row }) => {
        const project = projects?.find(p => p.id === row.original.projectId);
        if (!project) return <div>-</div>;

        return (
          <div className="flex items-center">
            <div className="ml-1">
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
      cell: ({ row }) => {
        // Each cell needs its own state for editing target date
        const cellId = `targetdate-${row.original.id}`;

        const [editingStates, setEditingStates] = useState<Record<string, boolean>>({});
        const [dateValues, setDateValues] = useState<Record<string, string | undefined>>({});
        const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});

        // Initialize date value if not already set
        useEffect(() => {
          if (!dateValues[cellId] && row.original.targetInvoiceDate) {
            setDateValues(prev => ({
              ...prev,
              [cellId]: new Date(row.original.targetInvoiceDate).toISOString().split('T')[0]
            }));
          }
        }, [cellId, row.original.targetInvoiceDate]);

        const isEditing = editingStates[cellId] || false;
        const dateValue = dateValues[cellId];
        const isUpdating = updatingStates[cellId] || false;

        const isDeliveryMilestone = row.original.isDeliveryMilestone || 
          (row.original.name && row.original.name.toUpperCase().includes("DELIVERY"));
        const hasShipDateChanged = row.original.shipDateChanged;

        // Handlers that use the cell ID for tracking state
        const setIsEditing = (value: boolean) => {
          setEditingStates(prev => ({...prev, [cellId]: value}));
        };

        const setDateValue = (value: string | undefined) => {
          setDateValues(prev => ({...prev, [cellId]: value}));
        };

        const setIsUpdating = (value: boolean) => {
          setUpdatingStates(prev => ({...prev, [cellId]: value}));
        };

        // Function to handle saving the target date
        const handleSave = async () => {
          if (!dateValue) return;

          setIsUpdating(true);
          try {
            const updateData: any = { 
              targetInvoiceDate: dateValue,
            };

            // If this is a delivery milestone, also update the live date
            if (isDeliveryMilestone) {
              updateData.liveDate = dateValue;
            }

            const response = await apiRequest(
              "PATCH",
              `/api/billing-milestones/${row.original.id}`,
              updateData
            );

            if (response.ok) {
              queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
              toast({
                title: "Target Date Updated",
                description: isDeliveryMilestone 
                  ? "Target date and live date have been updated successfully"
                  : "Target date has been updated successfully",
                variant: "default"
              });
            } else {
              throw new Error("Failed to update target date");
            }
          } catch (error) {
            toast({
              title: "Update Failed",
              description: `Error updating target date: ${(error as Error).message}`,
              variant: "destructive"
            });
          } finally {
            setIsUpdating(false);
            setIsEditing(false);
          }
        };

        // Display editor if in edit mode
        if (isEditing) {
          return (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                className="w-32 px-2 py-1 rounded text-xs bg-background border border-input"
                value={dateValue || ''}
                onChange={(e) => setDateValue(e.target.value)}
              />
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={handleSave}
                  disabled={isUpdating}
                >
                  {isUpdating ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent border-primary"></div> : <Check className="h-3 w-3 text-success" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => setIsEditing(false)}
                  disabled={isUpdating}
                >
                  <X className="h-3 w-3 text-danger" />
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div 
            className={`text-sm cursor-pointer hover:underline flex items-center ${isDeliveryMilestone && hasShipDateChanged 
              ? "bg-orange-100 p-1 rounded border border-orange-300 font-medium text-orange-800" 
              : ""}`}
            onClick={() => setIsEditing(true)}
          >
            <span>{formatDate(row.original.targetInvoiceDate)}</span>
            <Calendar className="inline-block ml-1 h-3 w-3" />
            {isDeliveryMilestone && hasShipDateChanged && (
              <div className="text-xs text-orange-600 mt-1">Ship date changed</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'liveDate',
      header: 'Live Date',
      cell: ({ row }) => {
        // Check if this is a delivery milestone
        const isDeliveryMilestone = row.original.isDeliveryMilestone || 
          (row.original.name && row.original.name.toLowerCase().includes('delivery'));

        // Get the project for this milestone to access delivery date
        const project = projects?.find(p => p.id === row.original.projectId);
        const projectDeliveryDate = project?.deliveryDate;

        // For delivery milestones, show project delivery date; otherwise show liveDate
        const displayDate = isDeliveryMilestone && projectDeliveryDate ? 
          projectDeliveryDate : row.original.liveDate;

        // Check if there's an actual difference between target date and live date
        const targetDate = row.original.targetInvoiceDate;
        const hasDateChange = isDeliveryMilestone && 
                             projectDeliveryDate && 
                             targetDate && 
                             new Date(projectDeliveryDate).toDateString() !== new Date(targetDate).toDateString();

        // Each cell needs its own state
        const cellId = `livedate-${row.original.id}`;

        const [editingStates, setEditingStates] = useState<Record<string, boolean>>({});
        const [dateValues, setDateValues] = useState<Record<string, string | undefined>>({});
        const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});

        // Initialize date value if not already set
        useEffect(() => {
          if (!dateValues[cellId] && displayDate) {
            setDateValues(prev => ({
              ...prev,
              [cellId]: new Date(displayDate).toISOString().split('T')[0]
            }));
          }
        }, [cellId, displayDate]);

        const isEditing = editingStates[cellId] || false;
        const dateValue = dateValues[cellId];
        const isUpdating = updatingStates[cellId] || false;

        // Handlers that use the cell ID for tracking state
        const setIsEditing = (value: boolean) => {
          setEditingStates(prev => ({...prev, [cellId]: value}));
        };

        const setDateValue = (value: string | undefined) => {
          setDateValues(prev => ({...prev, [cellId]: value}));
        };

        const setIsUpdating = (value: boolean) => {
          setUpdatingStates(prev => ({...prev, [cellId]: value}));
        };

        // Function to handle saving the date
        const handleSave = async () => {
          if (!dateValue) return;

          setIsUpdating(true);
          try {
            const response = await apiRequest(
              "PATCH",
              `/api/billing-milestones/${row.original.id}`,
              { 
                liveDate: dateValue,
              }
            );

            if (response.ok) {
              queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
              toast({
                title: "Live Date Updated",
                description: "Live date has been updated successfully",
                variant: "default"
              });
            } else {
              throw new Error("Failed to update live date");
            }
          } catch (error) {
            toast({
              title: "Update Failed",
              description: `Error updating live date: ${(error as Error).message}`,
              variant: "destructive"
            });
          } finally {
            setIsUpdating(false);
            setIsEditing(false);
          }
        };

        // Display editor if in edit mode
        if (isEditing) {
          return (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                className="w-32 px-2 py-1 rounded text-xs bg-background border border-input"
                value={dateValue || ''}
                onChange={(e) => setDateValue(e.target.value)}
              />
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={handleSave}
                  disabled={isUpdating}
                >
                  {isUpdating ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent border-primary"></div> : <Check className="h-3 w-3 text-success" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => setIsEditing(false)}
                  disabled={isUpdating}
                >
                  <X className="h-3 w-3 text-danger" />
                </Button>
              </div>
            </div>
          );
        }

        // Check if there's a ship date change
        const hasShipDateChanged = row.original.shipDateChanged;

        // Regular display mode
        if (!displayDate) {
          return (
            <div 
              className="text-sm text-gray-400 cursor-pointer hover:underline flex items-center"
              onClick={() => setIsEditing(true)}
            >
              <span>-</span>
              <Calendar className="inline-block ml-1 h-3 w-3" />
            </div>
          );
        }

        return (
          <div 
            className={`text-sm ${hasDateChange ? "bg-red-100 font-semibold text-red-600 border border-red-300" : ""} rounded px-2 py-1 cursor-pointer hover:underline flex items-center`}
            onClick={() => setIsEditing(true)}
          >
            <span>{formatDate(displayDate)}</span>
            <Calendar className="inline-block ml-1 h-3 w-3" />
            {hasDateChange && (
              <div className="text-xs text-red-600 ml-2">
                Needs acceptance
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const statusInfo = getBillingStatusInfo(
          row.original.status,
          row.original.targetInvoiceDate,
          row.original.actualInvoiceDate,
          row.original.liveDate
        );
        return <ProgressBadge status={statusInfo.display} />;
      },
    },
    {
      accessorKey: 'timeline',
      header: 'Timeline',
      cell: ({ row }) => {
        // Each cell needs its own state since there are multiple rows
        // Using a unique key based on the row ID ensures state isolation
        const cellId = `timeline-${row.original.id}`;

        const [editingStates, setEditingStates] = useState<Record<string, boolean>>({});
        const [dateValues, setDateValues] = useState<Record<string, string | undefined>>({});
        const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});

        // Initialize date value if not already set
        useEffect(() => {
          if (!dateValues[cellId] && row.original.actualInvoiceDate) {
            setDateValues(prev => ({
              ...prev,
              [cellId]: new Date(row.original.actualInvoiceDate).toISOString().split('T')[0]
            }));
          }
        }, [cellId, row.original.actualInvoiceDate]);

        const isEditing = editingStates[cellId] || false;
        const dateValue = dateValues[cellId];
        const isUpdating = updatingStates[cellId] || false;

        // Handlers that use the cell ID for tracking state
        const setIsEditing = (value: boolean) => {
          setEditingStates(prev => ({...prev, [cellId]: value}));
        };

        const setDateValue = (value: string | undefined) => {
          setDateValues(prev => ({...prev, [cellId]: value}));
        };

        const setIsUpdating = (value: boolean) => {
          setUpdatingStates(prev => ({...prev, [cellId]: value}));
        };

        // Get status info using Live Date as a reference when available
        const statusInfo = getBillingStatusInfo(
          row.original.status,
          row.original.targetInvoiceDate,
          row.original.actualInvoiceDate,
          row.original.liveDate
        );

        // Color coding for text based on status
        const textColorClass = row.original.status === 'delayed' ? 'text-danger' : 
                            row.original.status === 'invoiced' ? 'text-warning' :
                            row.original.status === 'paid' ? 'text-success' : 'text-gray-400';

        // Function to handle saving the date
        const handleSave = async () => {
          if (!dateValue) return;

          setIsUpdating(true);
          try {
            // Check if this is a delivery milestone and if target date is being updated
            const updateData: any = { actualInvoiceDate: dateValue };

            // If this is a delivery milestone, also update the live date
            if (row.original.isDeliveryMilestone || 
                (row.original.name && row.original.name.toUpperCase().includes("DELIVERY"))) {
              updateData.liveDate = dateValue;
            }

            const response = await apiRequest(
              "PATCH",
              `/api/billing-milestones/${row.original.id}`,
              updateData
            );

            if (response.ok) {
              queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
              toast({
                title: "Date Updated",
                description: "Invoice date has been updated successfully",
                variant: "default"
              });
            } else {
              throw new Error("Failed to update date");
            }
          } catch (error) {
            toast({
              title: "Update Failed",
              description: `Error updating date: ${(error as Error).message}`,
              variant: "destructive"
            });
          } finally {
            setIsUpdating(false);
            setIsEditing(false);
          }
        };

        // If the milestone is invoiced or delayed, make the date editable
        const isInvoicedOrDelayed = row.original.status === 'invoiced' || row.original.status === 'delayed';

        if (isEditing && isInvoicedOrDelayed) {
          return (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                className="w-32 px-2 py-1 rounded text-xs bg-background border border-input"
                value={dateValue || ''}
                onChange={(e) => setDateValue(e.target.value)}
              />
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={handleSave}
                  disabled={isUpdating}
                >
                  {isUpdating ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent border-primary"></div> : <Check className="h-3 w-3 text-success" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => setIsEditing(false)}
                  disabled={isUpdating}
                >
                  <X className="h-3 w-3 text-danger" />
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div 
            className={`text-sm ${textColorClass} ${isInvoicedOrDelayed ? "cursor-pointer hover:underline" : ""}`}
            onClick={() => isInvoicedOrDelayed && setIsEditing(true)}
            title={isInvoicedOrDelayed ? "Click to edit invoice date" : ""}
          >
            {statusInfo.timeline}
            {isInvoicedOrDelayed && <Calendar className="inline-block ml-1 h-3 w-3" />}
          </div>
        );
      },
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => {
        // Each cell needs its own state since there are multiple rows
        const cellId = `notes-${row.original.id}`;

        const [editingStates, setEditingStates] = useState<Record<string, boolean>>({});
        const [noteValues, setNoteValues] = useState<Record<string, string | undefined>>({});
        const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});

        // Initialize note value if not already set
        useEffect(() => {
          if (!noteValues[cellId] && row.original.notes !== undefined) {
            setNoteValues(prev => ({
              ...prev,
              [cellId]: row.original.notes || ''
            }));
          }
        }, [cellId, row.original.notes]);

        const isEditing = editingStates[cellId] || false;
        const noteValue = noteValues[cellId];
        const isUpdating = updatingStates[cellId] || false;

        // Handlers that use the cell ID for tracking state
        const setIsEditing = (value: boolean) => {
          setEditingStates(prev => ({...prev, [cellId]: value}));
        };

        const setNoteValue = (value: string | undefined) => {
          setNoteValues(prev => ({...prev, [cellId]: value}));
        };

        const setIsUpdating = (value: boolean) => {
          setUpdatingStates(prev => ({...prev, [cellId]: value}));
        };

        // Function to handle saving the note
        const handleSave = async () => {
          setIsUpdating(true);
          try {
            const response = await apiRequest(
              "PATCH",
              `/api/billing-milestones/${row.original.id}`,
              { 
                notes: noteValue,
              }
            );

            if (response.ok) {
              queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
              toast({
                title: "Notes Updated",
                description: "Notes have been updated successfully",
                variant: "default"
              });
            } else {
              throw new Error("Failed to update notes");
            }
          } catch (error) {
            toast({
              title: "Update Failed",
              description: `Error updating notes: ${(error as Error).message}`,
              variant: "destructive"
            });
          } finally {
            setIsUpdating(false);
            setIsEditing(false);
          }
        };

        // Display editor if in edit mode
        if (isEditing) {
          return (
            <div className="flex flex-col space-y-2 py-1">
              <textarea
                className="w-full h-24 px-2 py-1 rounded text-xs bg-background border border-input"
                value={noteValue || ''}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="Add notes here..."
              />
              <div className="flex justify-end space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6" 
                  onClick={handleSave}
                  disabled={isUpdating}
                >
                  {isUpdating ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent border-primary"></div> : <Check className="h-3 w-3 text-success mr-1" />}
                  Save
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6" 
                  onClick={() => setIsEditing(false)}
                  disabled={isUpdating}
                >
                  <X className="h-3 w-3 text-danger mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          );
        }

        // Regular display mode
        return (
          <div 
            className="text-sm cursor-pointer hover:underline flex items-center min-h-[32px] relative group"
            onClick={() => setIsEditing(true)}
          >
            {noteValue ? (
              <>
                <div className="line-clamp-2">{noteValue}</div>
                <PencilIcon className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 absolute right-0 top-0" />
              </>
            ) : (
              <div className="text-gray-400 flex items-center">
                <span>Add notes</span>
                <PlusCircle className="h-3 w-3 ml-1" />
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-right">
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

              {/* Accept Ship Date option */}
              {(row.original.isDeliveryMilestone || 
                (row.original.name && row.original.name.toUpperCase().includes("DELIVERY"))) && 
                row.original.shipDateChanged && (
                <DropdownMenuItem 
                  onClick={() => handleAcceptShipDate(row.original.id)}
                  disabled={isAcceptingShipDate[row.original.id]}
                >
                  {isAcceptingShipDate[row.original.id] ? (
                    <>
                      <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Accepting...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Accept Ship Date
                    </>
                  )}
                </DropdownMenuItem>
              )}

              {/* Mark as Invoiced */}
              {row.original.status === 'upcoming' && (
                <DropdownMenuItem 
                  onClick={() => handleMarkAsInvoiced(row.original.id)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Mark as Invoiced
                </DropdownMenuItem>
              )}

              {/* Mark as Paid */}
              {(row.original.status === 'invoiced' || row.original.status === 'delayed') && (
                <DropdownMenuItem 
                  onClick={() => handleMarkAsPaid(row.original.id)}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Mark as Paid
                </DropdownMenuItem>
              )}

              <DropdownMenuItem 
                onClick={() => handleDeleteMilestone(row.original.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
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
    { value: 'invoiced', label: 'Invoiced/Billed' },
    { value: 'paid', label: 'Paid/Complete' },
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
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-sans font-bold">Billing Milestones</h1>
            <p className="text-gray-400 text-sm">Manage and track billing milestones and revenue forecasts</p>
          </div>
          <ModuleHelpButton moduleId="billing" helpContent={billingHelpContent} />
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

      {/* Top Row Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <BillingStatusCard 
          title="Total Revenue"
          value={formatCurrency(
            revenuePeriod === 'ytd' 
              ? billingStats?.amounts.ytdRevenue || 0
              : revenuePeriod === 'quarter'
              ? billingStats?.amounts.quarterRevenue || 0  
              : billingStats?.amounts.pastMonthRevenue || 0
          )}
          type="revenue"
          change={{ 
            value: `${revenuePeriod === 'ytd' ? 'YTD' : revenuePeriod === 'quarter' ? 'Quarter' : 'Last Month'}`, 
            isPositive: billingStats?.progress.isPositive || false 
          }}
          progress={{ 
            value: billingStats?.progress.target || 0, 
            label: `${billingStats?.progress.target || 0}% of target` 
          }}
          periodData={{
            pastMonth: billingStats?.amounts.pastMonthRevenue || 0,
            quarter: billingStats?.amounts.quarterRevenue || 0,
            ytd: billingStats?.amounts.ytdRevenue || 0
          }}
          onPeriodChange={(period: 'ytd' | 'quarter' | 'month') => setRevenuePeriod(period)}
          selectedPeriod={revenuePeriod}
        />

        <BillingStatusCard 
          title="Milestone Status"
          value=""
          type="milestones"
          stats={[
            { label: "Invoiced/Billed", value: billingStats?.milestones.invoicedAndBilled || 0 },
            { label: "Overdue", value: billingStats?.milestones.overdue || 0 },
            { label: "Upcoming", value: billingStats?.milestones.upcoming || 0 },
            { label: "Future/TBD", value: billingStats?.milestones.upcomingTBD || 0 }
          ]}
        />


      </div>

      {/* Enhanced Cash Flow Analysis (Full Width) */}
      <div className="mb-6">
        <EnhancedCashFlowWidget billingMilestones={allBillingMilestones || []} />
      </div>

      {/* Monthly Forecasts Row (Full Width) */}
      <div className="mb-6">
        <BillingStatusCard 
          title="Monthly Forecasts"
          value={formatCurrency(billingStats?.forecast.values[selectedMonthIndex] || 0)}
          type="forecast"
          chart={{
            labels: billingStats?.forecast.labels || [],
            values: billingStats?.forecast.values || [],
            weekLabels: billingStats?.forecast.weekLabels || [],
            weekValues: billingStats?.forecast.weekValues || []
          }}
          onMonthSelect={handleMonthSelect}
          selectedMonthIndex={selectedMonthIndex}
          onWeekSelect={(year, week) => {
            // Implement week selection logic
            setSelectedWeekIndex(week - 1); // Adjust for 0-based index
          }}
          selectedWeekIndex={selectedWeekIndex}
          showFiscalWeeks={true}
          fiscalWeekDisplay="below"
          goals={financialGoals}
          onGoalCreate={(year, month, targetAmount, description, week) => {
            createGoalMutation.mutate({ year, month, targetAmount, description, week });
          }}
          onGoalUpdate={(year, month, targetAmount, description, week) => {
            updateGoalMutation.mutate({ year, month, targetAmount, description, week });
          }}
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

      {/* Tab interface for filtering open vs invoiced milestones */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'open'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Open Milestones ({allBillingMilestones?.filter(m => m.status === 'upcoming' || m.status === 'delayed').length || 0})
          </button>
          <button
            onClick={() => setActiveTab('invoiced')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'invoiced'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Invoiced ({allBillingMilestones?.filter(m => m.status === 'invoiced' || m.status === 'paid' || m.status === 'billed').length || 0})
          </button>
        </div>
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