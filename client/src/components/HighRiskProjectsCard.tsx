import React from 'react';
import { AlertTriangle, Calendar, ArrowRight, Clock, Wrench, Activity, LayoutGrid, Plus, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Project } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

interface HighRiskProjectsCardProps {
  projects: Project[];
}

export function HighRiskProjectsCard({ projects }: HighRiskProjectsCardProps) {
  // State for managing expansion
  const [isActiveExpanded, setIsActiveExpanded] = React.useState(false);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = React.useState(false);

  // Get manufacturing schedules
  const { data: manufacturingSchedules } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });
  
  // Get manufacturing bays
  const { data: manufacturingBays } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
  });
  
  // Projects in active manufacturing phases
  const activeManufacturingProjects = React.useMemo(() => {
    if (!projects || !manufacturingSchedules || !manufacturingBays) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset hours once
    
    // Ensure manufacturingSchedules is an array
    const schedulesArray = Array.isArray(manufacturingSchedules) ? manufacturingSchedules : [];
    const baysArray = Array.isArray(manufacturingBays) ? manufacturingBays : [];
    
    // MODIFIED APPROACH: Find schedules that are currently active OR scheduled to start soon
    // This will show more projects in the Current Production Status widget
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 14); // Show projects starting within 2 weeks
    
    const activeSchedules = schedulesArray.filter((schedule: any) => {
      const startDate = new Date(schedule.startDate);
      const endDate = new Date(schedule.endDate);
      
      // Reset hours to compare dates only
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      // Check if schedule is active today OR starting soon
      const isActiveToday = startDate <= today && today <= endDate;
      const isStartingSoon = today < startDate && startDate <= nextWeek;
      
      // For debugging - log active and upcoming schedules
      if (isActiveToday) {
        console.log(`Found ACTIVE schedule: Project ID ${schedule.projectId}, Bay ID ${schedule.bayId} (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`);
      } else if (isStartingSoon) {
        console.log(`Found UPCOMING schedule: Project ID ${schedule.projectId}, Bay ID ${schedule.bayId} (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`);
      }
      
      return isActiveToday || isStartingSoon;
    });
    
    // Log the total count of active schedules for debugging
    console.log(`Total active schedules found for Current Production Status: ${activeSchedules.length}`);
    
    // Find corresponding projects and add bay information
    const result = activeSchedules.map((schedule: any) => {
      const project = projects.find(p => p.id === schedule.projectId);
      const bay = baysArray.find((b: any) => b.id === schedule.bayId);
      
      if (!project) return null;
      
      // Create an enhanced project with schedule information to assist phase calculation
      const enhancedProject = {
        ...project,
        bayName: bay?.name || 'Unknown',
        teamName: bay?.team || bay?.name || 'Unknown',
        startDate: schedule.startDate,
        endDate: schedule.endDate
      };
      
      // Calculate the current phase using our improved function
      const currentPhase = getCurrentPhase(enhancedProject, today);
      
      return {
        ...enhancedProject,
        currentPhase
      };
    }).filter(Boolean);
    
    // First filter out any nulls or undefined values
    const validResults = result.filter((item): item is NonNullable<typeof item> => !!item);
    
    // Then sort valid results by days until ship date
    const sortedResults = validResults.sort((a, b) => {
      // Safely access ship dates
      const aDays = a.shipDate ? getDaysUntilDate(a.shipDate) : Number.MAX_SAFE_INTEGER;
      const bDays = b.shipDate ? getDaysUntilDate(b.shipDate) : Number.MAX_SAFE_INTEGER;
      return aDays - bDays;
    });
    
    // Show ALL active and upcoming projects - removed the limit completely
    return sortedResults;
  }, [projects, manufacturingSchedules, manufacturingBays]);
  
  // Upcoming ship dates in the next 2 weeks
  const upcomingShipProjects = React.useMemo(() => {
    if (!projects) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(today.getDate() + 14);
    twoWeeksLater.setHours(23, 59, 59, 999);
    
    // Filter projects with ship dates in the next 2 weeks
    return projects
      .filter(project => {
        const shipDate = project.shipDate ? new Date(project.shipDate) : null;
        
        return shipDate && shipDate >= today && shipDate <= twoWeeksLater;
      })
      .sort((a, b) => {
        const shipDateA = a.shipDate ? new Date(a.shipDate) : new Date();
        const shipDateB = b.shipDate ? new Date(b.shipDate) : new Date();
        
        return shipDateA.getTime() - shipDateB.getTime();
      });
  }, [projects]);
  
  // Count for the badge
  const activeCount = activeManufacturingProjects.length;
  const upcomingCount = upcomingShipProjects.length;

  // Helper function to get displayed items
  const getDisplayedActiveProjects = () => {
    return isActiveExpanded ? activeManufacturingProjects : activeManufacturingProjects.slice(0, 5);
  };

  const getDisplayedUpcomingProjects = () => {
    return isUpcomingExpanded ? upcomingShipProjects : upcomingShipProjects.slice(0, 5);
  };
  
  return (
    <Card className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-muted-foreground font-medium">
          Current & Upcoming Production
          {(activeCount + upcomingCount) > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-primary/20 text-primary">
              {activeCount + upcomingCount}
            </span>
          )}
        </h3>
        <div className="p-2 rounded-lg bg-primary/10 flex items-center justify-center w-9 h-9">
          <Activity className="text-primary h-5 w-5" />
        </div>
      </div>
      
      <div>
        {activeCount === 0 && upcomingCount === 0 ? (
          <div className="py-3 text-center text-muted-foreground text-sm">
            No active projects or upcoming ship dates
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Active Projects with NTC/QC Columns */}
            {activeCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-muted-foreground flex items-center">
                    <Wrench className="h-4 w-4 mr-2" /> 
                    Active & Upcoming Projects ({activeCount})
                  </h4>
                  {activeCount > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsActiveExpanded(!isActiveExpanded)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      {isActiveExpanded ? (
                        <Minus className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
                
                <div className="bg-card/50 rounded-lg p-3">
                  {/* Column Headers */}
                  <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground mb-3 px-2 border-b border-border pb-2">
                    <div className="col-span-2">Project</div>
                    <div className="text-center">NTC</div>
                    <div className="text-center">QC</div>
                  </div>
                  
                  {/* Project Rows */}
                  <div className="space-y-2">
                    {getDisplayedActiveProjects().map((project: any) => (
                      <div key={project.id} className="grid grid-cols-4 gap-2 items-center py-2 px-2 rounded-md bg-background/60 hover:bg-background/80 transition-colors">
                        <div className="col-span-2 flex flex-col min-w-0">
                          <p className="text-sm font-medium truncate">
                            {project.projectNumber}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {project.name}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          {project.ntcTestingDate ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded dark:bg-orange-500/20 bg-orange-100 dark:text-orange-500 text-orange-800 border border-orange-300">
                              {getDaysUntilDate(project.ntcTestingDate)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                        
                        <div className="text-center">
                          {project.qcStartDate ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded dark:bg-rose-500/20 bg-rose-100 dark:text-rose-500 text-rose-800 border border-rose-300">
                              {getDaysUntilDate(project.qcStartDate)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Upcoming Ship Dates Section */}
            {upcomingCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-muted-foreground flex items-center">
                    <Calendar className="h-4 w-4 mr-2" /> 
                    Upcoming Ship Dates ({upcomingCount})
                  </h4>
                  {upcomingCount > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      {isUpcomingExpanded ? (
                        <Minus className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
                
                <div className="bg-card/50 rounded-lg p-3">
                  {/* Column Headers */}
                  <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground mb-3 px-2 border-b border-border pb-2">
                    <div className="col-span-2">Project</div>
                    <div className="text-center">Ship</div>
                  </div>
                  
                  {/* Project Rows */}
                  <div className="space-y-2">
                    {getDisplayedUpcomingProjects().map((project: Project) => (
                      <div key={project.id} className="grid grid-cols-3 gap-2 items-center py-2 px-2 rounded-md bg-background/60 hover:bg-background/80 transition-colors">
                        <div className="col-span-2 flex flex-col min-w-0">
                          <p className="text-sm font-medium truncate">
                            {project.projectNumber}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {project.name}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          {project.shipDate ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded dark:bg-blue-500/20 bg-blue-100 dark:text-blue-500 text-blue-800 border border-blue-300">
                              {getDaysUntilDate(project.shipDate)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      

    </Card>
  );
}

// Helper function to check if a date is within the 2-week range
function isDateWithinRange(date: Date): boolean {
  const today = new Date();
  const twoWeeksLater = new Date();
  twoWeeksLater.setDate(today.getDate() + 14);
  
  // Reset time portions to compare dates only
  today.setHours(0, 0, 0, 0);
  twoWeeksLater.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return date >= today && date <= twoWeeksLater;
}

// Helper function to calculate days until a date
function getDaysUntilDate(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  
  try {
    const targetDate = new Date(dateStr);
    const today = new Date();
    
    // Reset time portion to compare dates only
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    // Debug logging
    console.log(`Calculating days for ${dateStr}:`);
    console.log(`Today: ${today.toISOString().split('T')[0]} (${today.getTime()})`);
    console.log(`Target: ${targetDate.toISOString().split('T')[0]} (${targetDate.getTime()})`);
    
    // Calculate days until the date
    const diffTime = targetDate.getTime() - today.getTime();
    const daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    console.log(`Diff time: ${diffTime}, Days diff: ${daysDiff}`);
    
    // If date is in the past, show "0 days"
    if (daysDiff < 0) {
      console.log(`Ship date ${dateStr} is in the past, showing 0 days`);
      return 0;
    }
    
    // Special case: if it's the same day, show 0, otherwise show the calculated difference
    const result = daysDiff;
    console.log(`Final result for ${dateStr}: ${result} days`);
    return result;
  } catch (e) {
    console.error("Error calculating days until date:", e);
    return 0;
  }
}

// Helper function to determine the current manufacturing phase based on dates
function getCurrentPhase(project: any, today: Date): string {
  // Reset time portion for fair comparison
  today = new Date(today);
  today.setHours(0, 0, 0, 0);
  
  // For projects with active schedules, use the visual positioning approach
  // This ensures consistency with the bay schedule timeline
  if (project.startDate && project.endDate) {
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    // Use ship date if available, otherwise use schedule end date
    const actualEndDate = project.shipDate ? new Date(project.shipDate) : endDate;
    actualEndDate.setHours(0, 0, 0, 0);
    
    // Check if project hasn't started
    if (today < startDate) return "Pre-Production";
    
    // Check if project has shipped
    if (today >= actualEndDate) return "Shipped";
    
    // Calculate the exact position of today within the project timeline (matching visual calculation)
    const totalDays = Math.ceil((actualEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get phase percentages with normalization (matching visual timeline logic)
    const fabPercent = parseFloat(project.fabPercentage || '27');
    const paintPercent = parseFloat(project.paintPercentage || '7');
    const prodPercent = parseFloat(project.productionPercentage || '60');
    const itPercent = parseFloat(project.itPercentage || '7');
    const ntcPercent = parseFloat(project.ntcPercentage || '7');
    const qcPercent = parseFloat(project.qcPercentage || '7');
    
    // Calculate total and normalize (matching visual calculation)
    const totalPercentages = fabPercent + paintPercent + prodPercent + itPercent + ntcPercent + qcPercent;
    const normalizeFactor = totalPercentages === 100 ? 1 : 100 / totalPercentages;
    
    // Calculate phase durations in days (matching visual phase width calculation)
    const fabDays = Math.floor(totalDays * ((fabPercent * normalizeFactor) / 100));
    const paintDays = Math.floor(totalDays * ((paintPercent * normalizeFactor) / 100));
    const prodDays = Math.floor(totalDays * ((prodPercent * normalizeFactor) / 100));
    const itDays = Math.floor(totalDays * ((itPercent * normalizeFactor) / 100));
    const ntcDays = Math.floor(totalDays * ((ntcPercent * normalizeFactor) / 100));
    
    // QC gets the remainder (matching visual calculation)
    const usedDays = fabDays + paintDays + prodDays + itDays + ntcDays;
    const qcDays = totalDays - usedDays;
    
    // Determine which phase the current day falls into (matching visual positioning)
    let cumulativeDays = 0;
    
    // FAB phase
    cumulativeDays += fabDays;
    if (daysSinceStart < cumulativeDays) return "Fabrication";
    
    // PAINT phase
    cumulativeDays += paintDays;
    if (daysSinceStart < cumulativeDays) return "Paint";
    
    // PRODUCTION phase
    cumulativeDays += prodDays;
    if (daysSinceStart < cumulativeDays) return "Production";
    
    // IT phase
    cumulativeDays += itDays;
    if (daysSinceStart < cumulativeDays) return "IT Integration";
    
    // NTC phase
    cumulativeDays += ntcDays;
    if (daysSinceStart < cumulativeDays) return "NTC Testing";
    
    // QC phase (everything else)
    return "QC";
  }
  
  // Fallback to date-based calculation for projects without schedules
  const fabStart = project.fabricationStart ? new Date(project.fabricationStart) : null;
  const paintStart = project.wrapDate ? new Date(project.wrapDate) : null;
  const assemblyStart = project.assemblyStart ? new Date(project.assemblyStart) : null;
  const ntcDate = project.ntcTestingDate ? new Date(project.ntcTestingDate) : null;
  const qcStart = project.qcStartDate ? new Date(project.qcStartDate) : null;
  const execReview = project.executiveReviewDate ? new Date(project.executiveReviewDate) : null;
  const shipDate = project.shipDate ? new Date(project.shipDate) : null;
  
  // Normalize dates
  [fabStart, paintStart, assemblyStart, ntcDate, qcStart, execReview, shipDate].forEach(date => {
    if (date) date.setHours(0, 0, 0, 0);
  });
  
  let phase = "Pre-Production";
  
  if (shipDate && today >= shipDate) {
    phase = "Shipped";
  } else if (execReview && today >= execReview) {
    phase = "Exec Review";
  } else if (qcStart && today >= qcStart) {
    phase = "QC";
  } else if (ntcDate && today >= ntcDate) {
    phase = "NTC";
  } else if (assemblyStart && today >= assemblyStart) {
    phase = "Production";
  } else if (paintStart && today >= paintStart) {
    phase = "Paint";
  } else if (fabStart && today >= fabStart) {
    phase = "FAB";
  }
  
  return phase;
}

export default HighRiskProjectsCard;