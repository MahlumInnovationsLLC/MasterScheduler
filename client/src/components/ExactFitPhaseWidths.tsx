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
export const calculateExactFitPhaseWidths = (totalWidth: number, project: Project | null) => {
  if (!project || totalWidth <= 0) {
    return {
      fabWidth: 0,
      paintWidth: 0,
      prodWidth: 0,
      itWidth: 0,
      ntcWidth: 0,
      qcWidth: 0,
      visiblePhases: []
    };
  }

  // Check which phases are visible
  const showFab = project.showFabPhase !== false;
  const showPaint = project.showPaintPhase !== false;
  const showProduction = project.showProductionPhase !== false;
  const showIt = project.showItPhase !== false;
  const showNtc = project.showNtcPhase !== false;
  const showQc = project.showQcPhase !== false;

  // Get percentages from project data with proper fallbacks
  const fabPercentage = showFab ? (parseFloat(project.fabPercentage as any) || 27) : 0;
  const paintPercentage = showPaint ? (parseFloat(project.paintPercentage as any) || 7) : 0;
  const productionPercentage = showProduction ? (parseFloat(project.productionPercentage as any) || 60) : 0;
  const itPercentage = showIt ? (parseFloat(project.itPercentage as any) || 7) : 0;
  const ntcPercentage = showNtc ? (parseFloat(project.ntcPercentage as any) || 7) : 0;
  const qcPercentage = showQc ? (parseFloat(project.qcPercentage as any) || 7) : 0;

  // Calculate the total percentage and normalization factor (only for visible phases)
  const totalPercentages = fabPercentage + paintPercentage + productionPercentage + 
                          itPercentage + ntcPercentage + qcPercentage;

  // If no phases are visible, return zeros
  if (totalPercentages === 0) {
    return {
      fabWidth: 0,
      paintWidth: 0,
      prodWidth: 0,
      itWidth: 0,
      ntcWidth: 0,
      qcWidth: 0,
      visiblePhases: []
    };
  }

  const normalizeFactor = totalPercentages === 100 ? 1 : 100 / totalPercentages;

  // Calculate exact phase widths (floor + remainder method) - only for visible phases
  const fabWidth = showFab ? Math.floor(totalWidth * (fabPercentage * normalizeFactor / 100)) : 0;
  const paintWidth = showPaint ? Math.floor(totalWidth * (paintPercentage * normalizeFactor / 100)) : 0;
  const prodWidth = showProduction ? Math.floor(totalWidth * (productionPercentage * normalizeFactor / 100)) : 0;
  const itWidth = showIt ? Math.floor(totalWidth * (itPercentage * normalizeFactor / 100)) : 0;
  const ntcWidth = showNtc ? Math.floor(totalWidth * (ntcPercentage * normalizeFactor / 100)) : 0;

  // The last visible phase gets the remainder to ensure exact fit
  const usedWidth = fabWidth + paintWidth + prodWidth + itWidth + ntcWidth;
  const qcWidth = showQc ? (totalWidth - usedWidth) : 0;

  // Track which phases are visible for rendering logic
  const visiblePhases = [];
  if (showFab) visiblePhases.push('fab');
  if (showPaint) visiblePhases.push('paint');
  if (showProduction) visiblePhases.push('production');
  if (showIt) visiblePhases.push('it');
  if (showNtc) visiblePhases.push('ntc');
  if (showQc) visiblePhases.push('qc');

  return {
    fabWidth,
    paintWidth,
    prodWidth,
    itWidth,
    ntcWidth,
    qcWidth,
    visiblePhases
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