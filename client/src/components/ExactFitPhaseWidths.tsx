/**
 * ExactFitPhaseWidths.tsx
 * 
 * Helper functions to ensure phase widths exactly match total bar width.
 * These utilities ensure that all phase widths sum up exactly to the total width,
 * with the last phase adjusted to fill any remaining pixels.
 */

import { Project } from "@shared/schema";

/**
 * Calculates exact-fit phase widths from project percentages
 * ensuring they sum exactly to totalWidth
 */
export const calculateExactFitPhaseWidths = (
  totalWidth: number,
  project: Project | null | undefined,
  defaultNormalizeFactor: number = 1
) => {
  // Use project-specific phase percentages or fallback to company standard defaults
  const fabPercentage = project ? (parseFloat(project.fabPercentage as any) || 27) : 27;
  const paintPercentage = project ? (parseFloat(project.paintPercentage as any) || 7) : 7; 
  const productionPercentage = project ? (parseFloat(project.productionPercentage as any) || 60) : 60;
  const itPercentage = project ? (parseFloat(project.itPercentage as any) || 7) : 7;
  const ntcPercentage = project ? (parseFloat(project.ntcPercentage as any) || 7) : 7;
  const qcPercentage = project ? (parseFloat(project.qcPercentage as any) || 7) : 7;
  
  // Calculate the total percentage and normalization factor
  const totalPercentages = fabPercentage + paintPercentage + productionPercentage + 
                         itPercentage + ntcPercentage + qcPercentage;
  const normalizeFactor = totalPercentages === 100 ? 1 : 100 / totalPercentages;
  
  // Calculate phase widths using floor for the first 5 phases
  // This prevents rounding errors that can cause the sum to be off by a few pixels
  const fabWidth = Math.floor(totalWidth * (fabPercentage * normalizeFactor / 100));
  const paintWidth = Math.floor(totalWidth * (paintPercentage * normalizeFactor / 100));
  const prodWidth = Math.floor(totalWidth * (productionPercentage * normalizeFactor / 100));
  const itWidth = Math.floor(totalWidth * (itPercentage * normalizeFactor / 100));
  const ntcWidth = Math.floor(totalWidth * (ntcPercentage * normalizeFactor / 100));
  
  // The last phase (QC) gets the remaining width to ensure perfect fit
  const sumFirstFivePhases = fabWidth + paintWidth + prodWidth + itWidth + ntcWidth;
  const qcWidth = totalWidth - sumFirstFivePhases;
  
  // Return all calculated widths
  return { 
    fabWidth, 
    paintWidth, 
    prodWidth, 
    itWidth, 
    ntcWidth, 
    qcWidth,
    totalWidth,
    exactMatch: (fabWidth + paintWidth + prodWidth + itWidth + ntcWidth + qcWidth) === totalWidth
  };
};

/**
 * Directly applies calculated phase widths to DOM elements
 */
export const applyPhaseWidthsToDom = (
  phaseWidths: ReturnType<typeof calculateExactFitPhaseWidths>,
  elements: {
    fabPhase: HTMLElement;
    paintPhase: HTMLElement;
    prodPhase: HTMLElement;
    itPhase: HTMLElement;
    ntcPhase: HTMLElement;
    qcPhase: HTMLElement;
  }
) => {
  const { fabWidth, paintWidth, prodWidth, itWidth, ntcWidth, qcWidth } = phaseWidths;
  const { fabPhase, paintPhase, prodPhase, itPhase, ntcPhase, qcPhase } = elements;
  
  // Apply width and position changes directly to DOM elements
  fabPhase.style.width = `${fabWidth}px`;
  
  paintPhase.style.left = `${fabWidth}px`;
  paintPhase.style.width = `${paintWidth}px`;
  
  prodPhase.style.left = `${fabWidth + paintWidth}px`;
  prodPhase.style.width = `${prodWidth}px`;
  
  itPhase.style.left = `${fabWidth + paintWidth + prodWidth}px`;
  itPhase.style.width = `${itWidth}px`;
  
  ntcPhase.style.left = `${fabWidth + paintWidth + prodWidth + itWidth}px`;
  ntcPhase.style.width = `${ntcWidth}px`;
  
  qcPhase.style.left = `${fabWidth + paintWidth + prodWidth + itWidth + ntcWidth}px`;
  qcPhase.style.width = `${qcWidth}px`;
  
  // Return true if successfully applied
  return true;
};

/**
 * Combined function to calculate and apply phase widths in one step
 */
export const updatePhaseWidthsWithExactFit = (
  barElement: HTMLElement, 
  totalWidth: number,
  project: Project | null | undefined
) => {
  try {
    // Find all phase elements
    const fabPhase = barElement.querySelector('.dept-fab-phase') as HTMLElement;
    const paintPhase = barElement.querySelector('.dept-paint-phase') as HTMLElement;
    const prodPhase = barElement.querySelector('.dept-prod-phase') as HTMLElement;
    const itPhase = barElement.querySelector('.dept-it-phase') as HTMLElement;
    const ntcPhase = barElement.querySelector('.dept-ntc-phase') as HTMLElement;
    const qcPhase = barElement.querySelector('.dept-qc-phase') as HTMLElement;
    
    if (!fabPhase || !paintPhase || !prodPhase || !itPhase || !ntcPhase || !qcPhase) {
      console.warn("Missing phase elements - can't apply exact fit widths");
      return false;
    }
    
    // Calculate the exact fit widths
    const phaseWidths = calculateExactFitPhaseWidths(totalWidth, project);
    
    // Apply to DOM
    applyPhaseWidthsToDom(phaseWidths, {
      fabPhase, paintPhase, prodPhase, itPhase, ntcPhase, qcPhase
    });
    
    // Add debugging attributes
    barElement.setAttribute('data-phases-updated', 'exact-fit');
    barElement.setAttribute('data-phase-sum', 
      (phaseWidths.fabWidth + phaseWidths.paintWidth + phaseWidths.prodWidth + 
       phaseWidths.itWidth + phaseWidths.ntcWidth + phaseWidths.qcWidth).toString());
    barElement.setAttribute('data-exact-match', phaseWidths.exactMatch.toString());
    
    return true;
  } catch (error) {
    console.error("Error applying exact fit phase widths:", error);
    return false;
  }
};