import React, { useState } from 'react';
import { TrendingUp, TrendingDown, BrainCircuit, Info, AlertCircle, Users, Clock, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Change {
  value: string;
  isPositive: boolean;
}

interface BayStatus {
  bayId: number;
  bayName: string;
  utilization: number;
  status: 'underutilized' | 'balanced' | 'overloaded';
  description: string;
  teamName: string;
  staffCount: number;
  weeklyCapacity: number;
  teamType?: string; // E.g., "Assembly", "Electrical"
  recommendations?: string[];
}

interface BayUtilizationCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: Change;
  bays: any[];
  schedules: any[];
}

export const BayUtilizationCard: React.FC<BayUtilizationCardProps> = ({
  title,
  value,
  subtitle,
  change,
  bays,
  schedules
}) => {
  const [showAIDetails, setShowAIDetails] = useState(false);
  
  // Helper function to determine the color based on utilization percentage
  const getUtilizationColor = (value: number) => {
    if (value < 30) return 'text-amber-500';
    if (value < 70) return 'text-blue-500';
    if (value < 85) return 'text-green-500';
    return 'text-red-500';
  };
  
  // Calculate status for each bay
  const bayStatuses: BayStatus[] = React.useMemo(() => {
    if (!bays.length) return [];
    
    return bays
      .filter(bay => bay.staffCount && bay.staffCount > 0 && bay.isActive)
      .map(bay => {
        // Get schedules for this bay
        const baySchedules = schedules.filter(schedule => schedule.bayId === bay.id);
        
        // Calculate capacity for this bay
        const weeklyCapacity = (bay.hoursPerPersonPerWeek || 40) * (bay.staffCount || 0);
        
        if (weeklyCapacity === 0) return {
          bayId: bay.id,
          bayName: bay.name,
          utilization: 0,
          status: 'balanced' as const,
          description: 'No staff assigned to this bay',
          teamName: bay.team || 'Unnamed Team',
          staffCount: 0,
          weeklyCapacity: 0,
          teamType: 'N/A',
          recommendations: ['Assign staff to this bay to begin utilizing it']
        };
        
        // Calculate scheduled hours for this bay
        const bayScheduledHours = baySchedules.reduce((sum, schedule) => sum + (schedule.totalHours || 0), 0);
        
        // Calculate utilization percentage for this bay
        const utilization = Math.min(100, (bayScheduledHours / weeklyCapacity) * 100);
        
        // Determine staff types
        const assemblyStaff = bay.assemblyStaffCount || 0;
        const electricalStaff = bay.electricalStaffCount || 0;
        const teamType = assemblyStaff > 0 && electricalStaff > 0 
          ? 'Mixed' 
          : assemblyStaff > 0 
            ? 'Assembly' 
            : 'Electrical';
        
        // Determine status and recommendations
        let status: 'underutilized' | 'balanced' | 'overloaded';
        let description: string;
        let recommendations: string[] = [];
        
        if (utilization < 30) {
          status = 'underutilized';
          description = `${bay.name} is significantly underutilized. Consider assigning more projects.`;
          recommendations = [
            'Assign additional projects to increase utilization',
            'Consider temporarily reassigning staff to other teams',
            'Check for upcoming projects that can be scheduled earlier'
          ];
        } else if (utilization > 85) {
          status = 'overloaded';
          description = `${bay.name} is approaching or exceeding capacity. Consider redistributing workload.`;
          recommendations = [
            'Redistribute projects to less utilized teams where possible',
            'Consider adding temporary staff to handle peak workload',
            'Review project timelines for potential adjustments',
            'Identify tasks that could be subcontracted'
          ];
        } else {
          status = 'balanced';
          description = `${bay.name} has a balanced workload.`;
          recommendations = [
            'Maintain current staffing and project allocation',
            'Monitor for changes in project scope that may affect capacity',
            'Prepare contingency plans for unexpected staffing changes'
          ];
        }
        
        return {
          bayId: bay.id,
          bayName: bay.name,
          utilization: Math.round(utilization),
          status,
          description,
          teamName: bay.team || 'General',
          staffCount: bay.staffCount || 0,
          weeklyCapacity,
          teamType,
          recommendations
        };
      });
  }, [bays, schedules]);
  
  // Get overall insight
  const getOverallInsight = () => {
    const overloaded = bayStatuses.filter(b => b.status === 'overloaded').length;
    const underutilized = bayStatuses.filter(b => b.status === 'underutilized').length;
    const balanced = bayStatuses.filter(b => b.status === 'balanced').length;
    
    if (overloaded > 0 && underutilized > 0) {
      return 'Opportunity to balance workload by shifting projects from overloaded teams to underutilized teams.';
    } else if (overloaded > 0) {
      return 'Some teams are overloaded. Consider hiring additional staff or redistributing work.';
    } else if (underutilized > 0 && underutilized === bayStatuses.length) {
      return 'All teams are underutilized. Consider taking on more projects or adjusting staffing levels.';
    } else if (underutilized > 0) {
      return 'Some teams have capacity for additional projects.';
    } else {
      return 'Team workloads are well-balanced across all bays. Maintaining this balance will optimize productivity.';
    }
  };
  
  // Generate status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'underutilized':
        return 'text-blue-500';
      case 'balanced':
        return 'text-green-500';
      case 'overloaded':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };
  
  // Generate status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'underutilized':
        return <TrendingDown className="h-3 w-3 text-blue-500" />;
      case 'balanced':
        return <Info className="h-3 w-3 text-green-500" />;
      case 'overloaded':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Info className="h-3 w-3 text-gray-500" />;
    }
  };
  
  const numericValue = typeof value === 'string' ? parseInt(value) : value;
  const color = getUtilizationColor(numericValue);
  
  return (
    <div className="bg-darkCard rounded-xl border border-gray-800 p-4 h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <Popover open={showAIDetails} onOpenChange={setShowAIDetails}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 rounded-full bg-primary/10 hover:bg-primary/20"
            >
              <BrainCircuit className="h-3 w-3 text-primary" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[350px] p-0" align="end">
            <div className="p-3 border-b border-gray-800">
              <h4 className="font-medium text-sm flex items-center">
                <BrainCircuit className="h-3 w-3 mr-2 text-primary" />
                AI Bay Analysis
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                {getOverallInsight()}
              </p>
            </div>
            
            <Tabs defaultValue="status" className="w-full">
              <TabsList className="w-full grid grid-cols-3 border-b border-gray-800 rounded-none h-9">
                <TabsTrigger value="status" className="text-xs">Status</TabsTrigger>
                <TabsTrigger value="teams" className="text-xs">Teams</TabsTrigger>
                <TabsTrigger value="recommendations" className="text-xs">Action Plan</TabsTrigger>
              </TabsList>
              
              <TabsContent value="status" className="m-0 max-h-[300px] overflow-y-auto">
                {bayStatuses.map((bay) => (
                  <div 
                    key={bay.bayId}
                    className="border-b border-gray-800 last:border-b-0 p-3"
                  >
                    <div className="flex items-start">
                      <div className="mr-2 mt-0.5">
                        {getStatusIcon(bay.status)}
                      </div>
                      <div>
                        <div className="flex items-center">
                          <h5 className="text-sm font-medium">{bay.bayName}</h5>
                          <span className={`text-xs ml-2 ${getStatusColor(bay.status)}`}>
                            {bay.utilization}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {bay.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="teams" className="m-0 max-h-[300px] overflow-y-auto">
                {bayStatuses.map((bay) => (
                  <div 
                    key={bay.bayId}
                    className="border-b border-gray-800 last:border-b-0 p-3"
                  >
                    <div className="flex items-start">
                      <div className="mr-2 mt-0.5">
                        <Users className="h-3 w-3 text-gray-400" />
                      </div>
                      <div>
                        <div className="flex items-center">
                          <h5 className="text-sm font-medium">{bay.teamName}</h5>
                          {bay.teamType && (
                            <span className="text-xs ml-2 px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">
                              {bay.teamType}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center mt-1 gap-3 text-xs text-gray-400">
                          <div className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            <span>{bay.staffCount} staff</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{bay.weeklyCapacity}hrs/week</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="recommendations" className="m-0 max-h-[300px] overflow-y-auto p-3">
                <div className="grid gap-3">
                  {bayStatuses.some(b => b.status === 'overloaded') && (
                    <div className="bg-red-900/10 border border-red-900/30 rounded-md p-2.5">
                      <h6 className="text-xs font-medium flex items-center">
                        <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                        <span>Overloaded Teams</span>
                      </h6>
                      <ul className="mt-1.5 space-y-1.5">
                        {bayStatuses
                          .filter(b => b.status === 'overloaded')
                          .map(bay => bay.recommendations?.[0])
                          .filter(Boolean)
                          .map((rec, i) => (
                            <li key={i} className="text-xs text-gray-400 flex">
                              <span className="mr-1.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))
                        }
                      </ul>
                    </div>
                  )}
                  
                  {bayStatuses.some(b => b.status === 'balanced') && (
                    <div className="bg-green-900/10 border border-green-900/30 rounded-md p-2.5">
                      <h6 className="text-xs font-medium flex items-center">
                        <Info className="h-3 w-3 text-green-500 mr-1" />
                        <span>Balanced Teams</span>
                      </h6>
                      <ul className="mt-1.5 space-y-1.5">
                        {bayStatuses
                          .filter(b => b.status === 'balanced')
                          .map(bay => bay.recommendations?.[0])
                          .filter(Boolean)
                          .map((rec, i) => (
                            <li key={i} className="text-xs text-gray-400 flex">
                              <span className="mr-1.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))
                        }
                      </ul>
                    </div>
                  )}
                  
                  {bayStatuses.some(b => b.status === 'underutilized') && (
                    <div className="bg-blue-900/10 border border-blue-900/30 rounded-md p-2.5">
                      <h6 className="text-xs font-medium flex items-center">
                        <TrendingDown className="h-3 w-3 text-blue-500 mr-1" />
                        <span>Underutilized Teams</span>
                      </h6>
                      <ul className="mt-1.5 space-y-1.5">
                        {bayStatuses
                          .filter(b => b.status === 'underutilized')
                          .map(bay => bay.recommendations?.[0])
                          .filter(Boolean)
                          .map((rec, i) => (
                            <li key={i} className="text-xs text-gray-400 flex">
                              <span className="mr-1.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))
                        }
                      </ul>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex items-end space-x-1">
        <span className={`text-2xl font-bold ${color}`}>{numericValue}%</span>
        {change && (
          <div className="flex items-center text-xs mb-1 ml-2">
            {change.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={change.isPositive ? 'text-green-500' : 'text-red-500'}>
              {change.value}
            </span>
          </div>
        )}
      </div>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      
      <div className="mt-3 w-full bg-gray-800 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${
            numericValue < 30 ? 'bg-amber-600' : 
            numericValue < 70 ? 'bg-blue-600' :
            numericValue < 85 ? 'bg-green-600' : 'bg-red-600'
          }`}
          style={{ width: `${numericValue}%` }}
        ></div>
      </div>
      
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Team Status</span>
          <button 
            className="text-primary text-xs hover:underline"
            onClick={() => setShowAIDetails(!showAIDetails)}
          >
            View AI Insights
          </button>
        </div>
        
        <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
          {bayStatuses.length > 0 ? (
            <>
              <div className="bg-red-900/10 p-1.5 rounded text-center">
                <div className="font-medium text-red-500">
                  {bayStatuses.filter(b => b.status === 'overloaded').length}
                </div>
                <div className="text-[10px] text-gray-400">Overloaded</div>
              </div>
              <div className="bg-green-900/10 p-1.5 rounded text-center">
                <div className="font-medium text-green-500">
                  {bayStatuses.filter(b => b.status === 'balanced').length}
                </div>
                <div className="text-[10px] text-gray-400">Balanced</div>
              </div>
              <div className="bg-blue-900/10 p-1.5 rounded text-center">
                <div className="font-medium text-blue-500">
                  {bayStatuses.filter(b => b.status === 'underutilized').length}
                </div>
                <div className="text-[10px] text-gray-400">Underutilized</div>
              </div>
            </>
          ) : (
            <div className="col-span-3 text-center py-2 text-gray-400">
              No active teams
            </div>
          )}
        </div>
      </div>
    </div>
  );
};