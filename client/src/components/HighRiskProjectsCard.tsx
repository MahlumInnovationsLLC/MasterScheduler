import React from 'react';
import { AlertTriangle, Calendar, ArrowRight, Clock, Wrench, Activity, LayoutGrid } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { Project } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

interface HighRiskProjectsCardProps {
  projects: Project[];
}

export function HighRiskProjectsCard({ projects }: HighRiskProjectsCardProps) {
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
  
  // Upcoming NTC or QC dates in the next 2 weeks
  const upcomingNtcQcProjects = React.useMemo(() => {
    if (!projects) return [];
    
    const today = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(today.getDate() + 14);
    
    // Filter projects with NTC testing or QC start dates in the next 2 weeks
    return projects
      .filter(project => {
        const ntcDate = project.ntcTestingDate ? new Date(project.ntcTestingDate) : null;
        const qcDate = project.qcStartDate ? new Date(project.qcStartDate) : null;
        
        return (
          (ntcDate && ntcDate >= today && ntcDate <= twoWeeksLater) ||
          (qcDate && qcDate >= today && qcDate <= twoWeeksLater)
        );
      })
      .sort((a, b) => {
        // Get the earliest of NTC or QC date for each project
        const getEarliestDate = (project: Project) => {
          const ntcDate = project.ntcTestingDate ? new Date(project.ntcTestingDate) : null;
          const qcDate = project.qcStartDate ? new Date(project.qcStartDate) : null;
          
          if (ntcDate && qcDate) {
            return ntcDate < qcDate ? ntcDate : qcDate;
          }
          return ntcDate || qcDate || new Date();
        };
        
        const dateA = getEarliestDate(a);
        const dateB = getEarliestDate(b);
        
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 3); // Limit to top 3
  }, [projects]);
  
  // Count for the badge
  const activeCount = activeManufacturingProjects.length;
  const upcomingCount = upcomingNtcQcProjects.length;
  
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
            No active projects or upcoming NTC/QC dates
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Today's Active Projects Section */}
            {activeCount > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-1 text-muted-foreground flex items-center">
                  <Wrench className="h-3 w-3 mr-1" /> 
                  Active & Upcoming Projects (Next 14 Days)
                </h4>
                <ul className="divide-y divide-border">
                  {activeManufacturingProjects.map((project: any) => (
                    <li key={project.id} className="py-2">
                      <div className="flex items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium line-clamp-1">
                            {project.projectNumber}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {project.name}
                          </p>
                          <div className="flex items-center mt-1 text-xs dark:text-blue-500 text-blue-700">
                            <LayoutGrid className="h-3 w-3 mr-1" />
                            <span>{project.bayName}</span>
                          </div>
                        </div>
                        <div className="ml-2 flex items-center">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded 
                          ${project.currentPhase === 'Pre-Production' || !project.currentPhase ? 'dark:bg-amber-500/20 bg-amber-100 dark:text-amber-500 text-amber-800 border border-amber-300' : 
                            project.currentPhase === 'Fabrication' ? 'dark:bg-blue-500/20 bg-blue-100 dark:text-blue-500 text-blue-800 border border-blue-300' :
                            project.currentPhase === 'Paint' ? 'dark:bg-purple-500/20 bg-purple-100 dark:text-purple-500 text-purple-800 border border-purple-300' :
                            project.currentPhase === 'Production' ? 'dark:bg-green-500/20 bg-green-100 dark:text-green-500 text-green-800 border border-green-300' :
                            project.currentPhase === 'IT Integration' ? 'dark:bg-cyan-500/20 bg-cyan-100 dark:text-cyan-500 text-cyan-800 border border-cyan-300' :
                            project.currentPhase === 'NTC Testing' ? 'dark:bg-orange-500/20 bg-orange-100 dark:text-orange-500 text-orange-800 border border-orange-300' :
                            project.currentPhase === 'QC' ? 'dark:bg-rose-500/20 bg-rose-100 dark:text-rose-500 text-rose-800 border border-rose-300' :
                            'dark:bg-blue-500/20 bg-blue-100 dark:text-blue-500 text-blue-800 border border-blue-300'
                          }`}>
                            <Activity className="h-3 w-3 mr-1" />
                            {project.currentPhase || 'Upcoming'}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Upcoming NTC/QC Dates Section */}
            {upcomingCount > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-1 text-muted-foreground flex items-center">
                  <Calendar className="h-3 w-3 mr-1" /> 
                  Upcoming NTC/QC Dates (2 Weeks)
                </h4>
                <ul className="divide-y divide-border">
                  {upcomingNtcQcProjects.map((project: Project) => (
                    <li key={project.id} className="py-2">
                      <div className="flex items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium line-clamp-1">
                            {project.projectNumber}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {project.name}
                          </p>
                          <div className="flex items-center mt-1 text-xs dark:text-amber-500 text-amber-700">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>
                              {project.ntcTestingDate && 
                                isDateWithinRange(new Date(project.ntcTestingDate)) ? 
                                `NTC: ${formatDate(project.ntcTestingDate)}` : ''}
                              {project.ntcTestingDate && project.qcStartDate && 
                                isDateWithinRange(new Date(project.qcStartDate)) ? 
                                ' | ' : ''}
                              {project.qcStartDate && 
                                isDateWithinRange(new Date(project.qcStartDate)) ? 
                                `QC: ${formatDate(project.qcStartDate)}` : ''}
                            </span>
                          </div>
                        </div>
                        <div className="ml-2 flex flex-col items-end">
                          <div className="text-[10px] font-light text-muted-foreground mb-1">
                            Days Until Ship
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded dark:bg-amber-500/20 bg-amber-100 dark:text-amber-500 text-amber-800 border border-amber-300">
                            <Clock className="h-3 w-3 mr-1" />
                            {getDaysUntilDate(project.shipDate || project.ntcTestingDate || project.qcStartDate)} days
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      
      {(activeCount + upcomingCount) > 0 && (
        <div className="mt-3 text-right">
          <a href="/manufacturing-schedules" className="text-xs text-primary hover:text-primary/80 inline-flex items-center">
            View full manufacturing schedule <ArrowRight className="h-3 w-3 ml-1" />
          </a>
        </div>
      )}
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
    
    // If date is in the past, show "0 days" instead of counting days in the past
    if (targetDate < today) {
      console.log(`Ship date ${dateStr} is in the past, showing 0 days`);
      return 0;
    }
    
    // Calculate days until the date (don't use absolute value)
    const diffTime = targetDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log(`Days until ${dateStr}: ${daysDiff} days (from ${today.toISOString().split('T')[0]})`);
    return daysDiff;
  } catch (e) {
    console.error("Error calculating days until date:", e);
    return 0;
  }
}

// Helper function to determine the current manufacturing phase based on dates
function getCurrentPhase(project: any, today: Date): string {
  // Check if this is the project we're debugging (805304)
  const isDebugProject = project.projectNumber === "805304";
  
  // Reset time portion of today for fair comparison
  today = new Date(today);
  today.setHours(0, 0, 0, 0);
  
  // SPECIAL HANDLING FOR PROJECTS THAT DON'T HAVE PHASE DATES
  // If we have startDate & endDate (from a schedule) but missing phase dates
  if (project.startDate && project.endDate && 
      (!project.fabricationStart || !project.assemblyStart || !project.wrapDate)) {
    
    const startDate = new Date(project.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(project.endDate);
    endDate.setHours(0, 0, 0, 0);
    
    if (isDebugProject) {
      console.log("==== CALCULATING PHASE BASED ON SCHEDULE DATES ====");
      console.log("Schedule startDate:", startDate.toISOString().split('T')[0]);
      console.log("Schedule endDate:", endDate.toISOString().split('T')[0]);
      console.log("Today date:", today.toISOString().split('T')[0]);
      console.log("Project has active schedule:", startDate <= today && today <= endDate);
    }
    
    // If today falls between startDate and endDate, the project is in production
    if (startDate <= today && today <= endDate) {
      // Get total duration of the project
      const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Calculate phase percentages (use real percentages from the project if available)
      const fabPercent = project.fabPercentage ? parseFloat(project.fabPercentage) : 27;
      const paintPercent = project.paintPercentage ? parseFloat(project.paintPercentage) : 7;
      const prodPercent = project.productionPercentage ? parseFloat(project.productionPercentage) : 60;
      const itPercent = project.itPercentage ? parseFloat(project.itPercentage) : 7;
      const ntcPercent = project.ntcPercentage ? parseFloat(project.ntcPercentage) : 7;
      const qcPercent = project.qcPercentage ? parseFloat(project.qcPercentage) : 7;
      
      // Calculate days for each phase
      const fabDays = Math.round((fabPercent / 100) * totalDays);
      const paintDays = Math.round((paintPercent / 100) * totalDays);
      const prodDays = Math.round((prodPercent / 100) * totalDays);
      const itDays = Math.round((itPercent / 100) * totalDays);
      const ntcDays = Math.round((ntcPercent / 100) * totalDays);
      
      // Calculate phase transition dates
      const fabEndDate = new Date(startDate);
      fabEndDate.setDate(fabEndDate.getDate() + fabDays);
      
      const paintEndDate = new Date(fabEndDate);
      paintEndDate.setDate(paintEndDate.getDate() + paintDays);
      
      const prodEndDate = new Date(paintEndDate);
      prodEndDate.setDate(prodEndDate.getDate() + prodDays);
      
      const itEndDate = new Date(prodEndDate);
      itEndDate.setDate(itEndDate.getDate() + itDays);
      
      const ntcEndDate = new Date(itEndDate);
      ntcEndDate.setDate(ntcEndDate.getDate() + ntcDays);
      
      if (isDebugProject) {
        console.log("Phase transition dates:");
        console.log("  Fab end:", fabEndDate.toISOString().split('T')[0]);
        console.log("  Paint end:", paintEndDate.toISOString().split('T')[0]);
        console.log("  Production end:", prodEndDate.toISOString().split('T')[0]);
        console.log("  IT end:", itEndDate.toISOString().split('T')[0]);
        console.log("  NTC end:", ntcEndDate.toISOString().split('T')[0]);
      }
      
      // Determine current phase based on today's position
      if (today <= fabEndDate) {
        return "Fabrication";
      } else if (today <= paintEndDate) {
        return "Paint";
      } else if (today <= prodEndDate) {
        return "Production";
      } else if (today <= itEndDate) {
        return "IT Integration";
      } else if (today <= ntcEndDate) {
        return "NTC Testing";
      } else {
        return "QC";
      }
    }
  }
  
  // STANDARD PHASE DETECTION USING SPECIFIC DATES
  // Get relevant dates
  const fabStart = project.fabricationStart ? new Date(project.fabricationStart) : null;
  const paintStart = project.wrapDate ? new Date(project.wrapDate) : null; // Paint/Wrap phase
  const assemblyStart = project.assemblyStart ? new Date(project.assemblyStart) : null;
  const ntcDate = project.ntcTestingDate ? new Date(project.ntcTestingDate) : null;
  const qcStart = project.qcStartDate ? new Date(project.qcStartDate) : null;
  const execReview = project.executiveReviewDate ? new Date(project.executiveReviewDate) : null;
  const shipDate = project.shipDate ? new Date(project.shipDate) : null;
  
  // Normalize all dates
  if (fabStart) fabStart.setHours(0, 0, 0, 0);
  if (paintStart) paintStart.setHours(0, 0, 0, 0);
  if (assemblyStart) assemblyStart.setHours(0, 0, 0, 0);
  if (ntcDate) ntcDate.setHours(0, 0, 0, 0);
  if (qcStart) qcStart.setHours(0, 0, 0, 0);
  if (execReview) execReview.setHours(0, 0, 0, 0);
  if (shipDate) shipDate.setHours(0, 0, 0, 0);
  
  // DEBUG INFORMATION for project 805304
  if (isDebugProject) {
    console.log("==== DEBUG PROJECT 805304 PHASE CALCULATION ====");
    console.log("Today date:", today.toISOString().split('T')[0]);
    console.log("Fabrication start:", fabStart?.toISOString().split('T')[0] || "null");
    console.log("Paint start:", paintStart?.toISOString().split('T')[0] || "null");
    console.log("Assembly start:", assemblyStart?.toISOString().split('T')[0] || "null");
    console.log("NTC Testing date:", ntcDate?.toISOString().split('T')[0] || "null");
    console.log("QC start date:", qcStart?.toISOString().split('T')[0] || "null");
    console.log("Executive Review date:", execReview?.toISOString().split('T')[0] || "null");
    console.log("Ship date:", shipDate?.toISOString().split('T')[0] || "null");
  }
  
  // CRITICAL: Determine phase transitions - the order matters!
  // We need to check from the end of the timeline backwards
  let phase = "Pre-Production";
  
  if (shipDate && today >= shipDate) {
    phase = "Shipping";
  } else if (execReview && today >= execReview) {
    phase = "Exec Review";
  } else if (qcStart && today >= qcStart) {
    phase = "QC";
  } else if (ntcDate && today >= ntcDate) {
    phase = "NTC Testing";
  } else if (assemblyStart && today >= assemblyStart) {
    phase = "Production";
  } else if (paintStart && today >= paintStart) {
    phase = "Paint";
  } else if (fabStart && today >= fabStart) {
    phase = "Fabrication";
  }
  
  // DEBUG INFORMATION for project 805304
  if (isDebugProject) {
    console.log("Calculated phase:", phase);
    console.log("==== END DEBUG PROJECT 805304 ====");
  }
  
  return phase;
}

export default HighRiskProjectsCard;