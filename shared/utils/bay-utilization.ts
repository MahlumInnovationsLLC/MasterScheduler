import { format, startOfWeek, endOfWeek, addWeeks, addDays, isWithinInterval, differenceInDays } from 'date-fns';

export interface Project {
  id: number;
  name: string;
  projectNumber: string;
  totalHours?: number;
  // Phase percentages
  fabPercentage?: number;
  paintPercentage?: number;
  productionPercentage?: number;
  itPercentage?: number;
  ntcPercentage?: number;
  qcPercentage?: number;
}

export interface ManufacturingSchedule {
  id: number;
  projectId: number;
  bayId: number;
  startDate: Date;
  endDate: Date;
  totalHours: number;
}

export interface ManufacturingBay {
  id: number;
  name: string;
  team: string | null;
}

export interface PhaseAlignment {
  projectId: number;
  projectNumber: string;
  phase: 'PRODUCTION' | 'IT' | 'NTC';
  startDate: Date;
  endDate: Date;
}

export interface WeeklyUtilization {
  weekStart: Date;
  weekEnd: Date;
  weekKey: string;
  bayId: number;
  bayName: string;
  teamName: string;
  alignedPhases: PhaseAlignment[];
  utilizationPercentage: number;
  projectCount: number;
}

/**
 * Calculate phase dates for a project based on schedule and percentages
 */
export function calculatePhaseDates(
  schedule: ManufacturingSchedule, 
  project: Project
): {
  fab: { start: Date; end: Date };
  paint: { start: Date; end: Date };
  production: { start: Date; end: Date };
  it: { start: Date; end: Date };
  ntc: { start: Date; end: Date };
  qc: { start: Date; end: Date };
} {
  const startDate = new Date(schedule.startDate);
  const endDate = new Date(schedule.endDate);
  const totalDays = differenceInDays(endDate, startDate);
  
  // Get phase percentages (use defaults if not set)
  const fabPercent = (project.fabPercentage || 27) / 100;
  const paintPercent = (project.paintPercentage || 7) / 100;
  const productionPercent = (project.productionPercentage || 60) / 100;
  const itPercent = (project.itPercentage || 7) / 100;
  const ntcPercent = (project.ntcPercentage || 7) / 100;
  const qcPercent = (project.qcPercentage || 7) / 100;
  
  // Calculate phase durations in days
  const fabDays = Math.round(totalDays * fabPercent);
  const paintDays = Math.round(totalDays * paintPercent);
  const productionDays = Math.round(totalDays * productionPercent);
  const itDays = Math.round(totalDays * itPercent);
  const ntcDays = Math.round(totalDays * ntcPercent);
  const qcDays = Math.round(totalDays * qcPercent);
  
  // Calculate phase start and end dates
  let currentDate = new Date(startDate);
  
  // FAB phase
  const fabStart = new Date(currentDate);
  currentDate = addDays(currentDate, fabDays);
  const fabEnd = new Date(currentDate);
  
  // PAINT phase
  const paintStart = new Date(currentDate);
  currentDate = addDays(currentDate, paintDays);
  const paintEnd = new Date(currentDate);
  
  // PRODUCTION phase
  const productionStart = new Date(currentDate);
  currentDate = addDays(currentDate, productionDays);
  const productionEnd = new Date(currentDate);
  
  // IT phase
  const itStart = new Date(currentDate);
  currentDate = addDays(currentDate, itDays);
  const itEnd = new Date(currentDate);
  
  // NTC phase
  const ntcStart = new Date(currentDate);
  currentDate = addDays(currentDate, ntcDays);
  const ntcEnd = new Date(currentDate);
  
  // QC phase
  const qcStart = new Date(currentDate);
  currentDate = addDays(currentDate, qcDays);
  const qcEnd = new Date(currentDate);
  
  return {
    fab: { start: fabStart, end: fabEnd },
    paint: { start: paintStart, end: paintEnd },
    production: { start: productionStart, end: productionEnd },
    it: { start: itStart, end: itEnd },
    ntc: { start: ntcStart, end: ntcEnd },
    qc: { start: qcStart, end: qcEnd }
  };
}

/**
 * Check if a phase is aligned (active) in a given week
 * Only PRODUCTION, IT, and NTC phases count for utilization
 * This uses the exact same logic as the visual bay schedule bars
 */
export function getPhaseAlignmentsForWeek(
  weekStart: Date,
  weekEnd: Date,
  schedules: ManufacturingSchedule[],
  projects: Project[],
  bayId: number
): PhaseAlignment[] {
  const alignments: PhaseAlignment[] = [];
  
  // Filter schedules for this bay
  const baySchedules = schedules.filter(s => s.bayId === bayId);
  
  baySchedules.forEach(schedule => {
    const project = projects.find(p => p.id === schedule.projectId);
    if (!project) return;
    
    // Check if the overall schedule overlaps with this week first
    const scheduleStart = new Date(schedule.startDate);
    const scheduleEnd = new Date(schedule.endDate);
    
    // If schedule doesn't overlap with week at all, skip it
    if (scheduleEnd < weekStart || scheduleStart > weekEnd) {
      return;
    }
    
    // Calculate phase dates for this project using the same logic as the visual bars
    const phases = calculatePhaseDates(schedule, project);
    
    // Check each phase for overlap with the week
    // A phase is "aligned" if any part of it falls within the week
    
    // PRODUCTION phase check
    if (phases.production.start <= weekEnd && phases.production.end >= weekStart) {
      alignments.push({
        projectId: project.id,
        projectNumber: project.projectNumber,
        phase: 'PRODUCTION',
        startDate: phases.production.start,
        endDate: phases.production.end
      });
    }
    
    // IT phase check
    if (phases.it.start <= weekEnd && phases.it.end >= weekStart) {
      alignments.push({
        projectId: project.id,
        projectNumber: project.projectNumber,
        phase: 'IT',
        startDate: phases.it.start,
        endDate: phases.it.end
      });
    }
    
    // NTC phase check
    if (phases.ntc.start <= weekEnd && phases.ntc.end >= weekStart) {
      alignments.push({
        projectId: project.id,
        projectNumber: project.projectNumber,
        phase: 'NTC',
        startDate: phases.ntc.start,
        endDate: phases.ntc.end
      });
    }
  });
  
  return alignments;
}

/**
 * Calculate utilization percentage based on aligned phases
 * 1 project = 50%, 2 projects = 85%, 3+ projects = 115%
 */
export function calculateUtilizationPercentage(alignedPhaseCount: number): number {
  if (alignedPhaseCount === 0) return 0;
  if (alignedPhaseCount === 1) return 50;
  if (alignedPhaseCount === 2) return 85;
  return 115; // 3 or more projects
}

/**
 * Calculate weekly utilization for all bays (excluding LIBBY team)
 * Uses exact visual bar positioning logic from ResizableBaySchedule
 */
export function calculateWeeklyBayUtilization(
  schedules: ManufacturingSchedule[],
  projects: Project[],
  bays: ManufacturingBay[],
  startDate: Date,
  weeksCount: number = 26 // Default to 6 months
): WeeklyUtilization[] {
  const utilizations: WeeklyUtilization[] = [];
  
  // Filter out LIBBY team
  const filteredBays = bays.filter(bay => 
    bay.team && bay.team.toUpperCase() !== 'LIBBY'
  );
  
  // Generate weeks
  for (let weekOffset = 0; weekOffset < weeksCount; weekOffset++) {
    const weekStart = startOfWeek(addWeeks(startDate, weekOffset), { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    // Calculate for each bay
    filteredBays.forEach(bay => {
      // Get projects that have ANY active phase in this week for this bay
      const activeProjectsInWeek = new Set<number>();
      
      // Check each schedule for this bay
      const baySchedules = schedules.filter(s => s.bayId === bay.id);
      
      baySchedules.forEach(schedule => {
        const project = projects.find(p => p.id === schedule.projectId);
        if (!project) return;
        
        // Calculate all phase dates for this project
        const phases = calculatePhaseDates(schedule, project);
        
        // Check if ANY of the key phases (PRODUCTION, IT, NTC) are active in this week
        const productionActive = phases.production.start <= weekEnd && phases.production.end >= weekStart;
        const itActive = phases.it.start <= weekEnd && phases.it.end >= weekStart;
        const ntcActive = phases.ntc.start <= weekEnd && phases.ntc.end >= weekStart;
        
        if (productionActive || itActive || ntcActive) {
          activeProjectsInWeek.add(project.id);
        }
      });
      
      const projectCount = activeProjectsInWeek.size;
      const utilizationPercentage = calculateUtilizationPercentage(projectCount);
      
      // Debug logging for utilization calculation
      if (weekOffset < 4 && bay.name.includes('Bay 1')) { // Only log first 4 weeks for Bay 1 to avoid spam
        console.log(`🔍 UTILIZATION DEBUG for ${bay.name} (${format(weekStart, 'MMM dd')}):`, {
          weekStart: format(weekStart, 'yyyy-MM-dd'),
          activeProjects: Array.from(activeProjectsInWeek),
          projectCount,
          utilizationPercentage,
          baySchedulesCount: baySchedules.length
        });
      }
      
      // Create phase alignments for detailed tracking
      const alignedPhases: PhaseAlignment[] = [];
      baySchedules.forEach(schedule => {
        const project = projects.find(p => p.id === schedule.projectId);
        if (!project || !activeProjectsInWeek.has(project.id)) return;
        
        const phases = calculatePhaseDates(schedule, project);
        
        if (phases.production.start <= weekEnd && phases.production.end >= weekStart) {
          alignedPhases.push({
            projectId: project.id,
            projectNumber: project.projectNumber,
            phase: 'PRODUCTION',
            startDate: phases.production.start,
            endDate: phases.production.end
          });
        }
        
        if (phases.it.start <= weekEnd && phases.it.end >= weekStart) {
          alignedPhases.push({
            projectId: project.id,
            projectNumber: project.projectNumber,
            phase: 'IT',
            startDate: phases.it.start,
            endDate: phases.it.end
          });
        }
        
        if (phases.ntc.start <= weekEnd && phases.ntc.end >= weekStart) {
          alignedPhases.push({
            projectId: project.id,
            projectNumber: project.projectNumber,
            phase: 'NTC',
            startDate: phases.ntc.start,
            endDate: phases.ntc.end
          });
        }
      });
      
      utilizations.push({
        weekStart,
        weekEnd,
        weekKey,
        bayId: bay.id,
        bayName: bay.name,
        teamName: bay.team || 'Unknown',
        alignedPhases,
        utilizationPercentage,
        projectCount
      });
    });
  }
  
  return utilizations;
}

/**
 * Calculate current week utilization for team bubbles
 */
export function calculateCurrentWeekTeamUtilization(
  schedules: ManufacturingSchedule[],
  projects: Project[],
  teamBays: ManufacturingBay[]
): {
  projectCount: number;
  utilizationPercentage: number;
  alignedPhases: PhaseAlignment[];
} {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  
  let allAlignedPhases: PhaseAlignment[] = [];
  
  // Get aligned phases for all bays in the team
  teamBays.forEach(bay => {
    const bayAlignments = getPhaseAlignmentsForWeek(
      weekStart,
      weekEnd,
      schedules,
      projects,
      bay.id
    );
    allAlignedPhases = [...allAlignedPhases, ...bayAlignments];
  });
  
  // Count unique projects across the team
  const uniqueProjects = new Set(allAlignedPhases.map(a => a.projectId));
  const projectCount = uniqueProjects.size;
  
  const utilizationPercentage = calculateUtilizationPercentage(projectCount);
  
  return {
    projectCount,
    utilizationPercentage,
    alignedPhases: allAlignedPhases
  };
}