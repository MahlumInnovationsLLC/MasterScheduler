import React from 'react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertTriangle, 
  ArrowRight, 
  Calendar, 
  DollarSign, 
  Clock, 
  PieChart,
  CheckCircle2,
  XCircle,
  ShieldAlert
} from 'lucide-react';

interface BillingMilestone {
  id: number;
  projectId: number;
  name: string;
  amount: string;
  status: string;
  targetInvoiceDate: string | null;
  actualInvoiceDate: string | null;
  paidDate: string | null;
}

interface ProjectSupplyChainBenchmark {
  id: number;
  projectId: number;
  benchmarkId: number;
  name: string;
  description: string | null;
  targetDate: string | null;
  isCompleted: boolean;
  completedDate: string | null;
  completedBy: string | null;
  weeksBeforePhase: number;
  targetPhase: string;
  notes: string | null;
}

interface FinancialImpactProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  originalStartDate: string;
  originalEndDate: string;
  newStartDate: string;
  newEndDate: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function FinancialImpactPopup({
  isOpen,
  onClose,
  projectId,
  originalStartDate,
  originalEndDate,
  newStartDate,
  newEndDate,
  onConfirm,
  onCancel
}: FinancialImpactProps) {
  // Fetch all billing milestones for this project
  const { data: billingMilestones = [] } = useQuery<BillingMilestone[]>({
    queryKey: [`/api/projects/${projectId}/billing-milestones`],
    enabled: isOpen && !!projectId,
  });

  // Fetch supply chain benchmarks for the project
  const { data: allProjectBenchmarks = [] } = useQuery<ProjectSupplyChainBenchmark[]>({
    queryKey: ['/api/project-supply-chain-benchmarks'],
    enabled: isOpen
  });
  
  // Filter benchmarks for this specific project
  const projectBenchmarks = useMemo(() => {
    return allProjectBenchmarks.filter(b => b.projectId === projectId);
  }, [allProjectBenchmarks, projectId]);

  // DIRECT DATE DISPLAY: Use exact dates without calculations
  const billingImpact = useMemo(() => {
    // If there are no billing milestones or the milestone data hasn't loaded, return empty array
    if (!billingMilestones.length) return [];

    // DIRECT DATE COMPARISON: No percentage calculations, just raw comparison
    console.log("EXACT DATE DISPLAY - Original:", originalStartDate, "to", originalEndDate);
    console.log("EXACT DATE DISPLAY - New:", newStartDate, "to", newEndDate);
    
    // Calculate days difference directly
    const origEndDate = new Date(originalEndDate);
    const newEndDateObj = new Date(newEndDate);
    const daysDifference = Math.round(
      (newEndDateObj.getTime() - origEndDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    console.log("EXACT DAYS DIFFERENCE:", daysDifference);
    
    // Only consider milestones that are not paid
    const affectedMilestones = billingMilestones.filter(
      m => m.status !== 'paid' && m.targetInvoiceDate
    );
    
    // For each milestone, shift by the exact same number of days as the project shifted
    return affectedMilestones.map(milestone => {
      try {
        // Get milestone date
        const milestoneDate = new Date(milestone.targetInvoiceDate!);
        
        // Simply add the exact same number of days difference
        const newMilestoneDate = new Date(milestoneDate);
        newMilestoneDate.setDate(newMilestoneDate.getDate() + daysDifference);
        
        // Format for display
        const formattedOriginalDate = format(milestoneDate, 'MMM d, yyyy');
        const formattedNewDate = format(newMilestoneDate, 'MMM d, yyyy');
        
        console.log(`EXACT DATES - Milestone ${milestone.name}: ${formattedOriginalDate} → ${formattedNewDate} (${daysDifference} days)`);
        
        return {
          ...milestone,
          originalDate: formattedOriginalDate,
          newDate: formattedNewDate,
          dateChange: daysDifference,
          isDelayed: daysDifference > 0,
          isAdvanced: daysDifference < 0
        };
      } catch (err) {
        console.error("Error in exact date calculation:", err);
        return {
          ...milestone,
          originalDate: milestone.targetInvoiceDate ? format(new Date(milestone.targetInvoiceDate), 'MMM d, yyyy') : "Unknown",
          newDate: "Could not calculate", 
          dateChange: daysDifference,
          isDelayed: daysDifference > 0,
          isAdvanced: daysDifference < 0
        };
      }
    });
  }, [billingMilestones, originalStartDate, originalEndDate, newStartDate, newEndDate]);
  
  // EXACT DATES: Calculate cost impact based on direct date comparison 
  const costImpact = useMemo(() => {
    if (!projectBenchmarks.length) return [];
    
    // Get exact dates from string inputs
    const origEndDate = new Date(originalEndDate);
    const newEndDateObj = new Date(newEndDate);
    
    // Calculate exact day difference
    const daysDifference = Math.round(
      (newEndDateObj.getTime() - origEndDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    console.log("EXACT SUPPLY CHAIN IMPACT - Days difference:", daysDifference);
    
    // Only consider incomplete benchmarks
    const incompleteBenchmarks = projectBenchmarks.filter(b => !b.isCompleted);
    
    // For each benchmark, apply exact day shift
    return incompleteBenchmarks.map(benchmark => {
      try {
        // Calculate cost impact: $1000 per day of delay 
        const estimatedCostImpact = daysDifference > 0 
          ? daysDifference * 1000  // $1000 per day impact
          : 0;
          
        // If we have a target date, simply shift it by the same number of days
        let originalDate = null;
        let newDate = null;
        
        if (benchmark.targetDate) {
          // Direct date manipulation
          const benchmarkDate = new Date(benchmark.targetDate);
          originalDate = format(benchmarkDate, 'MMM d, yyyy');
          
          // Create new date and add exact number of days
          const newBenchmarkDate = new Date(benchmarkDate);
          newBenchmarkDate.setDate(newBenchmarkDate.getDate() + daysDifference);
          newDate = format(newBenchmarkDate, 'MMM d, yyyy');
          
          console.log(`EXACT BENCHMARK ${benchmark.name}: ${originalDate} → ${newDate} (${daysDifference} days)`);
        }
        
        return {
          ...benchmark,
          originalDate,
          newDate,
          costImpact: estimatedCostImpact,
          dayChange: daysDifference
        };
      } catch (err) {
        console.error("Error in exact benchmark calculation:", err);
        return {
          ...benchmark, 
          originalDate: benchmark.targetDate ? format(new Date(benchmark.targetDate), 'MMM d, yyyy') : "Unknown",
          newDate: "Could not calculate",
          costImpact: 0,
          dayChange: daysDifference
        };
      }
    });
  }, [projectBenchmarks, originalStartDate, originalEndDate, newStartDate, newEndDate]);

  // EXACT REVENUE CALCULATION - Direct date comparison
  const totalRevenueImpact = useMemo(() => {
    // Calculate the total contract value
    const totalBillingAmount = billingMilestones.reduce(
      (total, milestone) => total + parseFloat(milestone.amount || '0'), 
      0
    );
    
    // Get exact dates as JavaScript Date objects
    const origEndDate = new Date(originalEndDate);
    const newEndDateObj = new Date(newEndDate);
    
    // Calculate exact days difference
    const daysDifference = Math.round(
      (newEndDateObj.getTime() - origEndDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    console.log("EXACT REVENUE IMPACT - Total contract value:", totalBillingAmount);
    console.log("EXACT REVENUE IMPACT - Days difference:", daysDifference);
    
    // Standardized financial impact calculation:
    // - Delay: Financial penalty of $5,000 per day
    // - Early: Financial bonus of $2,500 per day
    let revenueImpact = 0;
    
    if (daysDifference > 0) {
      // Delay penalty - fixed amount per day
      revenueImpact = -(5000 * daysDifference);
      console.log(`Project delayed by ${daysDifference} days: Fixed penalty of ${revenueImpact}`);
    } else if (daysDifference < 0) {
      // Early delivery bonus - fixed amount per day with cap
      const potentialBonus = 2500 * Math.abs(daysDifference);
      const maxBonus = totalBillingAmount * 0.1; // Cap at 10% of total contract
      const cappedBonus = Math.min(potentialBonus, maxBonus);
      revenueImpact = cappedBonus;
      console.log(`Project advanced by ${Math.abs(daysDifference)} days: Fixed bonus of ${revenueImpact}`);
    }
      
    return revenueImpact;
  }, [billingMilestones, originalEndDate, newEndDate]);
  
  const totalCostImpact = useMemo(() => {
    // Sum up all cost impacts from benchmarks
    return costImpact.reduce((total, benchmark) => total + (benchmark.costImpact || 0), 0);
  }, [costImpact]);
  
  // Overall financial impact (revenue - cost)
  const netFinancialImpact = totalRevenueImpact - totalCostImpact;
  
  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldAlert className="h-6 w-6 text-orange-500" />
            Financial Impact Analysis
          </DialogTitle>
          <DialogDescription>
            Review the financial impact of schedule changes before confirming.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Schedule Change Summary */}
          <div className="bg-muted/50 p-4 rounded-md">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Change Summary
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Original Schedule:</p>
                <p className="font-medium">
                  {format(parseISO(originalStartDate), 'MMM d, yyyy')} - {format(parseISO(originalEndDate), 'MMM d, yyyy')}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">New Schedule:</p>
                <p className="font-medium">
                  {format(parseISO(newStartDate), 'MMM d, yyyy')} - {format(parseISO(newEndDate), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
          
          {/* Financial Impact Summary */}
          <div className="bg-muted/50 p-4 rounded-md">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial Impact Summary
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Impact:</p>
                <p className={`font-medium ${totalRevenueImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalRevenueImpact)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Cost Impact:</p>
                <p className={`font-medium ${totalCostImpact <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalCostImpact)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Net Impact:</p>
                <p className={`font-medium ${netFinancialImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netFinancialImpact)}
                </p>
              </div>
            </div>
          </div>
        
          {/* Tabs for detailed analysis */}
          <Tabs defaultValue="billing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="billing">Billing Milestones Impact</TabsTrigger>
              <TabsTrigger value="costs">Supply Chain & Costs Impact</TabsTrigger>
            </TabsList>
            
            {/* Billing Milestones Tab */}
            <TabsContent value="billing" className="mt-4">
              {billingImpact.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Milestone</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Original Date</TableHead>
                      <TableHead>New Date</TableHead>
                      <TableHead>Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingImpact.map((milestone) => (
                      <TableRow key={milestone.id}>
                        <TableCell className="font-medium">{milestone.name}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(milestone.amount || '0'))}</TableCell>
                        <TableCell>{milestone.originalDate}</TableCell>
                        <TableCell>{milestone.newDate}</TableCell>
                        <TableCell className={
                          milestone.dateChange > 0 
                            ? "text-amber-600" 
                            : milestone.dateChange < 0 
                              ? "text-green-600" 
                              : ""
                        }>
                          {milestone.dateChange > 0 
                            ? `+${milestone.dateChange} days` 
                            : milestone.dateChange < 0 
                              ? `${milestone.dateChange} days` 
                              : "No change"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No billing milestones affected by this change.
                </div>
              )}
            </TabsContent>
            
            {/* Supply Chain Costs Tab */}
            <TabsContent value="costs" className="mt-4">
              {costImpact.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benchmark</TableHead>
                      <TableHead>Original Date</TableHead>
                      <TableHead>New Date</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Cost Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costImpact.map((benchmark) => (
                      <TableRow key={benchmark.id}>
                        <TableCell className="font-medium">{benchmark.name}</TableCell>
                        <TableCell>{benchmark.originalDate || "No date"}</TableCell>
                        <TableCell>{benchmark.newDate || "No date"}</TableCell>
                        <TableCell className={
                          benchmark.dayChange > 0 
                            ? "text-amber-600" 
                            : benchmark.dayChange < 0 
                              ? "text-green-600" 
                              : ""
                        }>
                          {benchmark.dayChange > 0 
                            ? `+${benchmark.dayChange} days` 
                            : benchmark.dayChange < 0 
                              ? `${benchmark.dayChange} days` 
                              : "No change"}
                        </TableCell>
                        <TableCell className={benchmark.costImpact > 0 ? "text-red-600" : ""}>
                          {benchmark.costImpact > 0 
                            ? `+${formatCurrency(benchmark.costImpact)}` 
                            : formatCurrency(benchmark.costImpact)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No supply chain benchmarks affected by this change.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter className="flex items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="text-sm">
              {netFinancialImpact >= 0 
                ? "This change has a positive financial impact." 
                : "This change has a negative financial impact."}
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Changes
            </Button>
            <Button onClick={onConfirm}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}