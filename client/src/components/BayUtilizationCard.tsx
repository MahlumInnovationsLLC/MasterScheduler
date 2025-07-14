import React, { useState } from 'react';
import { AlertCircle, BrainCircuit, ChevronRight, Clock, Info, TrendingDown, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Change {
  value: string;
  isPositive: boolean;
}

interface BayStatus {
  bayId: number;
  bayName: string;
  utilization: number;
  status: 'no-projects' | 'at-capacity' | 'near-capacity';
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
  
  // Function to generate color based on utilization percentage
  const getUtilizationColor = (utilization: number) => {
    if (utilization < 40) {
      return 'text-blue-500';
    } else if (utilization < 75) {
      return 'text-amber-500';
    }
    return 'text-red-500';
  };
  
  // Calculate status for each bay
  const bayStatuses: BayStatus[] = React.useMemo(() => {
    // Ensure bays and schedules are always arrays
    const safeBays = Array.isArray(bays) ? bays : [];
    const safeSchedules = Array.isArray(schedules) ? schedules : [];
    
    if (!safeBays.length) return [];
    
    // Track which bays we've processed to avoid duplicates
    const processedBayIds = new Set<number>();
    
    return safeBays
      .filter(bay => bay.staffCount && bay.staffCount > 0 && bay.isActive)
      .filter(bay => {
        // Skip duplicate bays
        if (processedBayIds.has(bay.id)) {
          console.log(`Skipping duplicate bay: ${bay.name} (ID: ${bay.id})`);
          return false;
        }
        processedBayIds.add(bay.id);
        return true;
      })
      .map(bay => {
        // Get schedules for this bay
        const baySchedules = safeSchedules.filter(schedule => schedule.bayId === bay.id);
        
        // Calculate capacity for this bay - always use the bay's specific data (no fallback)
        const hoursPerPerson = bay.hoursPerPersonPerWeek || 0;
        // Calculate total staff count (either from direct staffCount or from assembly + electrical)
        const totalStaff = bay.staffCount || (bay.assemblyStaffCount || 0) + (bay.electricalStaffCount || 0);
        // Calculate weekly capacity based on actual bay data
        const weeklyCapacity = hoursPerPerson * totalStaff;
        
        if (weeklyCapacity === 0) return {
          bayId: bay.id,
          bayName: bay.name,
          utilization: 0,
          status: 'no-projects' as const,
          description: 'No staff assigned to this bay',
          teamName: bay.team || 'Unnamed Team',
          staffCount: 0,
          weeklyCapacity: 0,
          teamType: 'N/A',
          recommendations: ['Assign staff to this bay to begin utilizing it']
        };
        
        // Get projects assigned to this bay (non-ended projects)
        const activeProjects = baySchedules.filter(schedule => {
          const endDate = new Date(schedule.endDate);
          const now = new Date();
          return endDate >= now;
        });
        
        // Simple capacity calculation following project standards:
        // 0 projects = 0% (Available)
        // 1 project = 50% (Near Capacity)
        // 2+ projects = 100% (At Capacity)
        let utilization = 0;
        if (activeProjects.length >= 2) {
          utilization = 100; // At Capacity
          console.log(`Bay ${bay.name} at 100% capacity with ${activeProjects.length} projects`);
        } else if (activeProjects.length === 1) {
          utilization = 50;  // Near Capacity
          console.log(`Bay ${bay.name} at 50% capacity with 1 project`);
        } else {
          console.log(`Bay ${bay.name} at 0% capacity with no projects`);
        }
        
        // Determine staff types
        const assemblyStaff = bay.assemblyStaffCount || 0;
        const electricalStaff = bay.electricalStaffCount || 0;
        const teamType = assemblyStaff > 0 && electricalStaff > 0 
          ? 'Mixed' 
          : assemblyStaff > 0 
            ? 'Assembly' 
            : 'Electrical';
        
        // Determine status and recommendations based on project count
        let status: 'no-projects' | 'at-capacity' | 'near-capacity';
        let description: string;
        let recommendations: string[] = [];
        
        if (activeProjects.length === 0) {
          status = 'no-projects';
          description = `${bay.name} is Available with no projects scheduled.`;
          recommendations = [
            'Assign projects to utilize this bay',
            'Check upcoming projects that could be allocated here',
            'Consider temporary reassignment of staff if no projects are imminent'
          ];
          console.log(`Bay ${bay.name} final status: Available with 0 active projects`);
        } else if (activeProjects.length >= 2) {
          status = 'at-capacity';
          description = `${bay.name} is At Capacity with ${activeProjects.length} active projects.`;
          recommendations = [
            'Monitor workload closely to prevent bottlenecks',
            'Consider adding temporary staff to handle peak workload if needed',
            'Review project timelines for potential adjustments',
            'Identify tasks that could be subcontracted if delays occur'
          ];
          console.log(`Bay ${bay.name} final status: At Capacity with ${activeProjects.length} active projects`);
        } else { // activeProjects.length === 1
          status = 'near-capacity';
          description = `${bay.name} is Near Capacity with 1 active project.`;
          recommendations = [
            'Maintain current staffing and project allocation',
            'Monitor for changes in project scope that may affect capacity', 
            'Prepare contingency plans for unexpected staffing changes'
          ];
          console.log(`Bay ${bay.name} final status: Near Capacity with 1 active project`);
        }
        
        return {
          bayId: bay.id,
          bayName: bay.name,
          utilization: utilization,
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
    const atCapacity = bayStatuses.filter(b => b.status === 'at-capacity').length;
    const noProjects = bayStatuses.filter(b => b.status === 'no-projects').length;
    const nearCapacity = bayStatuses.filter(b => b.status === 'near-capacity').length;
    
    if (atCapacity > 0 && noProjects > 0) {
      return 'Opportunity to balance workload by shifting projects from at-capacity teams to available bays.';
    } else if (atCapacity > 0) {
      return 'Some teams are at full capacity. Consider hiring additional staff or redistributing work.';
    } else if (noProjects > 0 && noProjects === bayStatuses.length) {
      return 'All bays currently have no projects. Consider taking on more projects or adjusting staffing levels.';
    } else if (noProjects > 0) {
      return 'Some bays have capacity for additional projects.';
    } else {
      return 'Team workloads are well-balanced across all bays. Maintaining this balance will optimize productivity.';
    }
  };
  
  // Generate status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'no-projects':
        return 'text-blue-500';
      case 'near-capacity':
        return 'text-amber-500';
      case 'at-capacity':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };
  
  // Generate status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'no-projects':
        return <TrendingDown className="h-3 w-3 text-blue-500" />;
      case 'near-capacity':
        return <Info className="h-3 w-3 text-amber-500" />;
      case 'at-capacity':
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
                          <h5 className="text-sm font-medium">
                            {bay.bayName}
                            {bays.find(b => b.id === bay.bayId)?.description && (
                              <span className="text-xs ml-1 text-gray-400">
                                ({bays.find(b => b.id === bay.bayId)?.description})
                              </span>
                            )}
                          </h5>
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
                  {bayStatuses.some(b => b.status === 'at-capacity') && (
                    <div className="bg-red-900/10 border border-red-900/30 rounded-md p-2.5">
                      <h6 className="text-xs font-medium flex items-center">
                        <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                        <span>At Capacity Teams</span>
                      </h6>
                      <ul className="mt-1.5 space-y-1.5">
                        {bayStatuses
                          .filter(b => b.status === 'at-capacity')
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
                  
                  {bayStatuses.some(b => b.status === 'near-capacity') && (
                    <div className="bg-amber-900/10 border border-amber-900/30 rounded-md p-2.5">
                      <h6 className="text-xs font-medium flex items-center">
                        <Info className="h-3 w-3 text-amber-500 mr-1" />
                        <span>Near Capacity Teams</span>
                      </h6>
                      <ul className="mt-1.5 space-y-1.5">
                        {bayStatuses
                          .filter(b => b.status === 'near-capacity')
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
                  
                  {bayStatuses.some(b => b.status === 'no-projects') && (
                    <div className="bg-blue-900/10 border border-blue-900/30 rounded-md p-2.5">
                      <h6 className="text-xs font-medium flex items-center">
                        <TrendingDown className="h-3 w-3 text-blue-500 mr-1" />
                        <span>Available Bays</span>
                      </h6>
                      <ul className="mt-1.5 space-y-1.5">
                        {bayStatuses
                          .filter(b => b.status === 'no-projects')
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
      
      {/* Main card content */}
      <div className="flex items-baseline justify-between">
        <div className="space-y-2">
          <div className={`text-2xl font-bold ${color}`}>
            {value}%
          </div>
          {subtitle && (
            <p className="text-xs text-gray-400">{subtitle}</p>
          )}
          {change && (
            <div className={`flex items-center text-xs ${change.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              <span>{change.value}</span>
              <ChevronRight className={`h-3 w-3 ml-0.5 ${change.isPositive ? '' : 'rotate-90'}`} />
            </div>
          )}
        </div>
        
        {/* Bay status overview */}
        <div className="flex gap-2">
          {/* At Capacity */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span>At Capacity</span>
            </div>
            <div className="text-xs font-medium">
              {bayStatuses.filter(b => b.status === 'at-capacity').length}
            </div>
          </div>
          
          {/* Near Capacity */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Near Capacity</span>
            </div>
            <div className="text-xs font-medium">
              {bayStatuses.filter(b => b.status === 'near-capacity').length}
            </div>
          </div>
          
          {/* No Projects */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Available</span>
            </div>
            <div className="text-xs font-medium">
              {bayStatuses.filter(b => b.status === 'no-projects').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};