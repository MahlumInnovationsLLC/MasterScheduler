/**
 * This module provides utilities for calculating exact phase widths
 * for manufacturing schedule visualization with capacity-based calculations.
 */

import { safeFilter } from '@/lib/array-utils';

// Define Team interfaces for capacity calculations
export interface TeamCapacity {
  assemblyStaffCount: number;
  electricalStaffCount: number;
  hoursPerPersonPerWeek: number;
}

export interface Bay {
  id: number;
  team: string | null;
  assemblyStaffCount?: number | null;
  electricalStaffCount?: number | null;
  hoursPerPersonPerWeek?: number | null;
}

// Define ScheduleBar type directly to avoid import issues
export interface ScheduleBar {
  id: number;
  projectId: number;
  bayId: number;
  startDate: Date;
  endDate: Date;
  totalHours?: number;
  projectName: string;
  projectNumber: string;
  width: number;
  left: number;
  color: string;
  row: number;
  fabPercentage: number;
  paintPercentage: number;
  productionPercentage: number;
  itPercentage: number;
  ntcPercentage: number;
  qcPercentage: number;
  fabWidth?: number;
  paintWidth?: number;
  productionWidth?: number;
  itWidth?: number;
  ntcWidth?: number;
  qcWidth?: number;
  // New field for capacity expansion
  capacityExpansionFactor?: number;
}

/**
 * Calculate the team's total capacity in hours per week
 */
const calculateTeamCapacity = (bay: Bay, allBays: Bay[]): number => {
  // If bay doesn't have a team, return default capacity
  if (!bay.team) return 29 * 2; // Default 29 hours * 2 staff members
  
  // Find all bays in the same team
  const teamBays = safeFilter(allBays, b => b.team === bay.team, 'ExactFitPhaseWidths.teamBays');
  
  // Just use the first bay's capacity values for the team
  // This ensures we don't double-count staff across multiple bays in the same team
  const teamBay = teamBays[0];
  
  if (!teamBay) return 29 * 2; // Default if no team bay found
  
  // Get capacity values with defaults
  const assemblyStaff = teamBay.assemblyStaffCount || 2;
  const electricalStaff = teamBay.electricalStaffCount || 1;
  const hoursPerWeek = teamBay.hoursPerPersonPerWeek || 29;
  
  // Calculate total team capacity
  const totalStaff = assemblyStaff + electricalStaff;
  const totalCapacity = totalStaff * hoursPerWeek;
  
  // Log the correct calculation for debugging
  console.log(`Team ${teamBay.team} capacity calculation:`, {
    assemblyStaff,
    electricalStaff,
    totalStaff,
    hoursPerWeek,
    weeklyCapacity: totalCapacity
  });
  
  return totalCapacity > 0 ? totalCapacity : 29 * 2; // Default if zero
};

/**
 * Check if bars overlap in production phase
 */
const doProductionPhasesOverlap = (bar1: ScheduleBar, bar2: ScheduleBar): boolean => {
  // Simple collision detection
  return (bar1.bayId === bar2.bayId) && (bar1.id !== bar2.id) &&
         !(bar1.endDate < bar2.startDate || bar1.startDate > bar2.endDate);
};

/**
 * Count overlapping projects in production phase
 */
const countOverlappingProjects = (bar: ScheduleBar, allBars: ScheduleBar[]): number => {
  return safeFilter(allBars, otherBar => doProductionPhasesOverlap(bar, otherBar), 'ExactFitPhaseWidths.overlappingBars').length;
};

/**
 * Calculates exact fit phase widths for a schedule bar with capacity-based production phase
 * @param bar The schedule bar to calculate phase widths for
 * @param allBars All schedule bars for overlap detection
 * @param allBays All bays for team capacity calculation
 * @returns The bar with calculated phase widths
 */
export const calculateExactFitPhaseWidths = (
  bar: ScheduleBar, 
  allBars: ScheduleBar[] = [], 
  allBays: Bay[] = []
): ScheduleBar => {
  // Calculate the width of each phase based on percentages
  const totalWidth = bar.width;
  
  // Find the bay for this bar
  const bay = allBays.find(b => b.id === bar.bayId);
  
  // Calculate team capacity
  const teamCapacity = bay ? calculateTeamCapacity(bay, allBays) : 58; // Default 29*2 hours
  
  // Count overlapping projects for capacity calculation
  const overlappingProjects = countOverlappingProjects(bar, allBars);
  const capacityPerProject = overlappingProjects > 0 
    ? teamCapacity / (overlappingProjects + 1) // +1 to include this project
    : teamCapacity;
  
  // Calculate production phase expansion factor based on capacity
  let capacityExpansionFactor = 1;
  
  if (bar.totalHours && capacityPerProject > 0) {
    // Only apply capacity expansion to the production phase
    const productionHours = bar.totalHours * (bar.productionPercentage / 100);
    
    // Weekly capacity is divided by 5 to get daily capacity
    const weeksNeeded = productionHours / capacityPerProject;
    
    // Calculate expansion factor based on hours needed vs. capacity available
    capacityExpansionFactor = weeksNeeded;
    
    console.log(`Project ${bar.projectNumber} production calculation:`, {
      totalHours: bar.totalHours,
      productionPercentage: bar.productionPercentage,
      productionHours,
      teamCapacity,
      capacityPerProject,
      weeksNeeded,
      capacityExpansionFactor
    });
    
    // Cap the expansion factor to reasonable limits (1-10x)
    capacityExpansionFactor = Math.max(1, Math.min(10, capacityExpansionFactor));
  }
  
  // Store the expansion factor for debugging/reference
  const updatedBar = { ...bar, capacityExpansionFactor };
  
  // Calculate standard phase widths
  let fabWidth = (bar.fabPercentage / 100) * totalWidth;
  let paintWidth = (bar.paintPercentage / 100) * totalWidth;
  
  // Apply capacity expansion to production phase only
  let productionWidth = (bar.productionPercentage / 100) * totalWidth * capacityExpansionFactor;
  
  let itWidth = (bar.itPercentage / 100) * totalWidth;
  let ntcWidth = (bar.ntcPercentage / 100) * totalWidth;
  let qcWidth = (bar.qcPercentage / 100) * totalWidth;
  
  console.log(`Phase widths calculated for schedule ${bar.id}:`, {
    totalWidth,
    fabWidth,
    paintWidth,
    productionWidth,
    itWidth,
    ntcWidth,
    qcWidth,
    capacityExpansionFactor,
    teamCapacity,
    overlappingProjects,
    capacityPerProject,
    totalHours: bar.totalHours
  });
  
  // Create a copy of the bar with the calculated widths
  return {
    ...updatedBar,
    fabWidth,
    paintWidth,
    productionWidth,
    itWidth,
    ntcWidth,
    qcWidth
  };
};

/**
 * Updates phase widths with exact fit calculations and capacity-based expansion
 * @param bars The array of schedule bars to update
 * @param allBays All bays for team capacity calculation
 * @returns The updated bars array
 */
export const updatePhaseWidthsWithExactFit = (
  bars: ScheduleBar[],
  allBays: Bay[] = []
): ScheduleBar[] => {
  return bars.map(bar => calculateExactFitPhaseWidths(bar, bars, allBays));
};

/**
 * Applies calculated phase widths to DOM elements
 * @param barElement The bar element in the DOM
 * @param bar The schedule bar data
 */
export const applyPhaseWidthsToDom = (barElement: HTMLElement, bar: ScheduleBar): void => {
  // Find phase elements - support both naming conventions
  const fabElement = barElement.querySelector('.fab-phase') || barElement.querySelector('.phase-fab');
  const paintElement = barElement.querySelector('.paint-phase') || barElement.querySelector('.phase-paint');
  const productionElement = barElement.querySelector('.production-phase') || barElement.querySelector('.phase-production');
  const itElement = barElement.querySelector('.it-phase') || barElement.querySelector('.phase-it');
  const ntcElement = barElement.querySelector('.ntc-phase') || barElement.querySelector('.phase-ntc');
  const qcElement = barElement.querySelector('.qc-phase') || barElement.querySelector('.phase-qc');
  
  // Apply calculated widths to phase elements
  if (fabElement instanceof HTMLElement && bar.fabWidth !== undefined) {
    fabElement.style.width = `${bar.fabWidth}px`;
  }
  
  if (paintElement instanceof HTMLElement && bar.paintWidth !== undefined) {
    paintElement.style.width = `${bar.paintWidth}px`;
  }
  
  if (productionElement instanceof HTMLElement && bar.productionWidth !== undefined) {
    productionElement.style.width = `${bar.productionWidth}px`;
  }
  
  if (itElement instanceof HTMLElement && bar.itWidth !== undefined) {
    itElement.style.width = `${bar.itWidth}px`;
  }
  
  if (ntcElement instanceof HTMLElement && bar.ntcWidth !== undefined) {
    ntcElement.style.width = `${bar.ntcWidth}px`;
  }
  
  if (qcElement instanceof HTMLElement && bar.qcWidth !== undefined) {
    qcElement.style.width = `${bar.qcWidth}px`;
  }
};