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
    
    // Ensure manufacturingSchedules is an array
    const schedulesArray = Array.isArray(manufacturingSchedules) ? manufacturingSchedules : [];
    const baysArray = Array.isArray(manufacturingBays) ? manufacturingBays : [];
    
    // Find schedules where today's date falls between start and end date
    const activeSchedules = schedulesArray.filter((schedule: any) => {
      const startDate = new Date(schedule.startDate);
      const endDate = new Date(schedule.endDate);
      
      // Reset hours to compare dates only
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      return startDate <= today && today <= endDate;
    });
    
    // Find corresponding projects and add bay information
    return activeSchedules.map((schedule: any) => {
      const project = projects.find(p => p.id === schedule.projectId);
      const bay = baysArray.find((b: any) => b.id === schedule.bayId);
      
      if (!project) return null;
      
      return {
        ...project,
        bayName: bay?.name || 'Unknown',
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        currentPhase: getCurrentPhase(project, today),
      };
    }).filter(Boolean).slice(0, 3); // Limit to top 3 most important
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
          Current Production Status
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
          <div className="space-y-3">
            {/* Today's Active Projects Section */}
            {activeCount > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-1 text-muted-foreground flex items-center">
                  <Wrench className="h-3 w-3 mr-1" /> 
                  Projects In Production Today
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
                          <div className="flex items-center mt-1 text-xs text-blue-500">
                            <LayoutGrid className="h-3 w-3 mr-1" />
                            <span>{project.bayName}</span>
                          </div>
                        </div>
                        <div className="ml-2 flex items-center">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-blue-500/20 text-blue-500">
                            <Activity className="h-3 w-3 mr-1" />
                            {project.currentPhase}
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
                          <div className="flex items-center mt-1 text-xs text-amber-500">
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
                        <div className="ml-2 flex items-center">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-amber-500/20 text-amber-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {getDaysUntilDate(project.ntcTestingDate || project.qcStartDate)} days
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
    
    const diffTime = Math.abs(targetDate.getTime() - today.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    console.error("Error calculating days until date:", e);
    return 0;
  }
}

// Helper function to determine the current manufacturing phase based on dates
function getCurrentPhase(project: any, today: Date): string {
  // Get relevant dates
  const fabStart = project.fabricationStart ? new Date(project.fabricationStart) : null;
  const assemblyStart = project.assemblyStart ? new Date(project.assemblyStart) : null;
  const ntcDate = project.ntcTestingDate ? new Date(project.ntcTestingDate) : null;
  const qcStart = project.qcStartDate ? new Date(project.qcStartDate) : null;
  const execReview = project.executiveReviewDate ? new Date(project.executiveReviewDate) : null;
  const shipDate = project.shipDate ? new Date(project.shipDate) : null;
  
  // Reset time portion of today for fair comparison
  today = new Date(today);
  today.setHours(0, 0, 0, 0);
  
  // Determine current phase based on today's date
  if (shipDate && today >= shipDate) {
    return "Shipping";
  } else if (execReview && today >= execReview) {
    return "Exec Review";
  } else if (qcStart && today >= qcStart) {
    return "QC";
  } else if (ntcDate && today >= ntcDate) {
    return "NTC Testing";
  } else if (assemblyStart && today >= assemblyStart) {
    return "Assembly";
  } else if (fabStart && today >= fabStart) {
    return "Fabrication";
  } else {
    return "Pre-Production";
  }
}

export default HighRiskProjectsCard;