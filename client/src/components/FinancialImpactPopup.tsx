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

  // Calculate financial impact on billing milestones
  const billingImpact = useMemo(() => {
    // If there are no billing milestones or the milestone data hasn't loaded, return empty array
    if (!billingMilestones.length) return [];

    // Get original end date as Date object
    const origEndDate = parseISO(originalEndDate);
    const newEndDate = parseISO(newEndDate);
    
    // Determine if project was moved (extended or shortened)
    const daysDifference = Math.round(
      (newEndDate.getTime() - origEndDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Only consider milestones that are not paid (upcoming or invoiced)
    const affectedMilestones = billingMilestones.filter(
      m => m.status !== 'paid' && m.targetInvoiceDate
    );
    
    // Calculate new target dates for affected milestones
    return affectedMilestones.map(milestone => {
      // For simplicity, we'll adjust all milestone dates proportionally
      // In a real-world scenario, you might have more complex rules
      
      // Calculate original position as percentage of project duration
      const milestoneDate = parseISO(milestone.targetInvoiceDate!);
      const origStartDate = parseISO(originalStartDate);
      
      // Calculate what percentage through the project this milestone falls
      const originalProjectDuration = origEndDate.getTime() - origStartDate.getTime();
      const milestonePosition = (milestoneDate.getTime() - origStartDate.getTime()) / originalProjectDuration;
      
      // Apply same percentage to new duration
      const newStartDateTime = parseISO(newStartDate).getTime();
      const newEndDateTime = newEndDate.getTime();
      const newProjectDuration = newEndDateTime - newStartDateTime;
      const newMilestoneTime = newStartDateTime + (milestonePosition * newProjectDuration);
      const newMilestoneDate = new Date(newMilestoneTime);
      
      // Format for display
      const formattedOriginalDate = format(milestoneDate, 'MMM d, yyyy');
      const formattedNewDate = format(newMilestoneDate, 'MMM d, yyyy');
      
      return {
        ...milestone,
        originalDate: formattedOriginalDate,
        newDate: formattedNewDate,
        dateChange: daysDifference,
        isDelayed: newMilestoneDate > milestoneDate,
        isAdvanced: newMilestoneDate < milestoneDate
      };
    });
  }, [billingMilestones, originalStartDate, originalEndDate, newStartDate, newEndDate]);
  
  // Calculate cost impact based on supply chain benchmarks
  const costImpact = useMemo(() => {
    if (!projectBenchmarks.length) return [];
    
    // Get original and new dates as Date objects
    const origStartDate = parseISO(originalStartDate);
    const origEndDate = parseISO(originalEndDate);
    const newStart = parseISO(newStartDate);
    const newEnd = parseISO(newEndDate);
    
    // Calculate project duration change
    const originalDuration = origEndDate.getTime() - origStartDate.getTime();
    const newDuration = newEnd.getTime() - newStart.getTime();
    const durationChange = newDuration - originalDuration;
    const daysDifference = Math.round(durationChange / (1000 * 60 * 60 * 24));
    
    // Only consider incomplete benchmarks
    const incompleteBenchmarks = projectBenchmarks.filter(b => !b.isCompleted);
    
    // For simplicity, we'll estimate that later purchases might cost more
    // In a real system, you might have more complex cost estimations
    return incompleteBenchmarks.map(benchmark => {
      // Estimate a 0.5% cost increase per day of delay as an example
      // This would be replaced with real cost calculations in an actual implementation
      const estimatedCostImpact = daysDifference > 0 
        ? daysDifference * 0.005 * 10000  // Arbitrary value for demonstration
        : 0;
        
      // If we have a target date, adjust it based on the project shift
      let originalDate = null;
      let newDate = null;
      
      if (benchmark.targetDate) {
        const benchmarkDate = parseISO(benchmark.targetDate);
        originalDate = format(benchmarkDate, 'MMM d, yyyy');
        
        // Calculate what percentage through the project this benchmark falls
        const benchmarkPosition = (benchmarkDate.getTime() - origStartDate.getTime()) / originalDuration;
        
        // Apply same percentage to new duration
        const newBenchmarkTime = newStart.getTime() + (benchmarkPosition * newDuration);
        const newBenchmarkDate = new Date(newBenchmarkTime);
        newDate = format(newBenchmarkDate, 'MMM d, yyyy');
      }
      
      return {
        ...benchmark,
        originalDate,
        newDate,
        costImpact: estimatedCostImpact,
        dayChange: daysDifference
      };
    });
  }, [projectBenchmarks, originalStartDate, originalEndDate, newStartDate, newEndDate]);

  // Calculate total financial impact
  const totalRevenueImpact = useMemo(() => {
    // Calculate the sum of all billing milestone amounts
    const totalBillingAmount = billingMilestones.reduce(
      (total, milestone) => total + parseFloat(milestone.amount || '0'), 
      0
    );
    
    // For demonstration purposes, estimate revenue impact based on delay
    // In a real system, this would be based on contract terms, etc.
    const daysDifference = Math.round(
      (parseISO(newEndDate).getTime() - parseISO(originalEndDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Estimate revenue impact (this logic would be customized based on business rules)
    // Example: If project is delayed, estimate 0.1% penalty per day
    const revenuePenalty = daysDifference > 0 
      ? totalBillingAmount * 0.001 * daysDifference 
      : 0;
      
    return -revenuePenalty; // Negative for penalties
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