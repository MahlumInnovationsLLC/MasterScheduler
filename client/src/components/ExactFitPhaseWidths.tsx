
import { Project } from '@shared/schema';

export interface PhaseWidths {
  fabWidth: number;
  paintWidth: number;
  prodWidth: number;
  itWidth: number;
  ntcWidth: number;
  qcWidth: number;
  visiblePhases: string[];
}

/**
 * Calculate exact-fit phase widths with proper redistribution when phases are hidden
 */
export const calculateExactFitPhaseWidths = (totalWidth: number, project: Project | null | undefined): PhaseWidths => {
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

  // Check phase visibility settings from the project
  const showFab = project.showFabPhase !== false; // Default to true if undefined
  const showPaint = project.showPaintPhase !== false;
  const showProduction = project.showProductionPhase !== false;
  const showIt = project.showItPhase !== false;
  const showNtc = project.showNtcPhase !== false;
  const showQc = project.showQcPhase !== false;

  console.log(`Phase visibility for project ${project.projectNumber}:`, {
    fab: showFab,
    paint: showPaint,
    production: showProduction,
    it: showIt,
    ntc: showNtc,
    qc: showQc
  });

  // Get original percentages from project data with proper fallbacks
  const originalFabPercentage = parseFloat(project.fabPercentage as any) || 27;
  const originalPaintPercentage = parseFloat(project.paintPercentage as any) || 7;
  const originalProductionPercentage = parseFloat(project.productionPercentage as any) || 60;
  const originalItPercentage = parseFloat(project.itPercentage as any) || 7;
  const originalNtcPercentage = parseFloat(project.ntcPercentage as any) || 7;
  const originalQcPercentage = parseFloat(project.qcPercentage as any) || 7;

  // Calculate which phases are visible and their percentages
  const visiblePhases = [];
  let visiblePercentageSum = 0;

  if (showFab) {
    visiblePhases.push('fab');
    visiblePercentageSum += originalFabPercentage;
  }
  if (showPaint) {
    visiblePhases.push('paint');
    visiblePercentageSum += originalPaintPercentage;
  }
  if (showProduction) {
    visiblePhases.push('production');
    visiblePercentageSum += originalProductionPercentage;
  }
  if (showIt) {
    visiblePhases.push('it');
    visiblePercentageSum += originalItPercentage;
  }
  if (showNtc) {
    visiblePhases.push('ntc');
    visiblePercentageSum += originalNtcPercentage;
  }
  if (showQc) {
    visiblePhases.push('qc');
    visiblePercentageSum += originalQcPercentage;
  }

  // If no phases are visible, return zeros
  if (visiblePhases.length === 0 || visiblePercentageSum === 0) {
    console.log('No visible phases or zero percentage sum');
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

  // Calculate redistribution factor to make visible phases add up to 100%
  const redistributionFactor = 100 / visiblePercentageSum;

  console.log(`Redistribution calculation:`, {
    visiblePercentageSum,
    redistributionFactor,
    visiblePhases
  });

  // Apply redistribution to visible phases only
  const fabPercentage = showFab ? (originalFabPercentage * redistributionFactor) : 0;
  const paintPercentage = showPaint ? (originalPaintPercentage * redistributionFactor) : 0;
  const productionPercentage = showProduction ? (originalProductionPercentage * redistributionFactor) : 0;
  const itPercentage = showIt ? (originalItPercentage * redistributionFactor) : 0;
  const ntcPercentage = showNtc ? (originalNtcPercentage * redistributionFactor) : 0;
  const qcPercentage = showQc ? (originalQcPercentage * redistributionFactor) : 0;

  // Calculate exact phase widths (floor + remainder method) - only for visible phases
  const fabWidth = showFab ? Math.floor(totalWidth * (fabPercentage / 100)) : 0;
  const paintWidth = showPaint ? Math.floor(totalWidth * (paintPercentage / 100)) : 0;
  const prodWidth = showProduction ? Math.floor(totalWidth * (productionPercentage / 100)) : 0;
  const itWidth = showIt ? Math.floor(totalWidth * (itPercentage / 100)) : 0;
  const ntcWidth = showNtc ? Math.floor(totalWidth * (ntcPercentage / 100)) : 0;

  // The last visible phase gets the remainder to ensure exact fit
  const usedWidth = fabWidth + paintWidth + prodWidth + itWidth + ntcWidth;
  const qcWidth = showQc ? (totalWidth - usedWidth) : 0;

  console.log(`Final phase widths for project ${project.projectNumber}:`, {
    totalWidth,
    fabWidth,
    paintWidth,
    prodWidth,
    itWidth,
    ntcWidth,
    qcWidth,
    totalUsed: fabWidth + paintWidth + prodWidth + itWidth + ntcWidth + qcWidth
  });

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
 * Apply calculated phase widths to DOM elements with proper positioning
 */
export const applyPhaseWidthsToDom = (
  phaseWidths: PhaseWidths,
  elements: {
    fabPhase: HTMLElement;
    paintPhase: HTMLElement;
    prodPhase: HTMLElement;
    itPhase: HTMLElement;
    ntcPhase: HTMLElement;
    qcPhase: HTMLElement;
  }
) => {
  const { fabPhase, paintPhase, prodPhase, itPhase, ntcPhase, qcPhase } = elements;
  const { fabWidth, paintWidth, prodWidth, itWidth, ntcWidth, qcWidth, visiblePhases } = phaseWidths;

  let currentLeft = 0;

  // Apply FAB phase
  if (visiblePhases.includes('fab')) {
    fabPhase.style.display = 'block';
    fabPhase.style.left = `${currentLeft}px`;
    fabPhase.style.width = `${fabWidth}px`;
    currentLeft += fabWidth;
  } else {
    fabPhase.style.display = 'none';
    fabPhase.style.width = '0px';
  }

  // Apply PAINT phase
  if (visiblePhases.includes('paint')) {
    paintPhase.style.display = 'block';
    paintPhase.style.left = `${currentLeft}px`;
    paintPhase.style.width = `${paintWidth}px`;
    currentLeft += paintWidth;
  } else {
    paintPhase.style.display = 'none';
    paintPhase.style.width = '0px';
  }

  // Apply PRODUCTION phase
  if (visiblePhases.includes('production')) {
    prodPhase.style.display = 'block';
    prodPhase.style.left = `${currentLeft}px`;
    prodPhase.style.width = `${prodWidth}px`;
    currentLeft += prodWidth;
  } else {
    prodPhase.style.display = 'none';
    prodPhase.style.width = '0px';
  }

  // Apply IT phase
  if (visiblePhases.includes('it')) {
    itPhase.style.display = 'block';
    itPhase.style.left = `${currentLeft}px`;
    itPhase.style.width = `${itWidth}px`;
    currentLeft += itWidth;
  } else {
    itPhase.style.display = 'none';
    itPhase.style.width = '0px';
  }

  // Apply NTC phase
  if (visiblePhases.includes('ntc')) {
    ntcPhase.style.display = 'block';
    ntcPhase.style.left = `${currentLeft}px`;
    ntcPhase.style.width = `${ntcWidth}px`;
    currentLeft += ntcWidth;
  } else {
    ntcPhase.style.display = 'none';
    ntcPhase.style.width = '0px';
  }

  // Apply QC phase
  if (visiblePhases.includes('qc')) {
    qcPhase.style.display = 'block';
    qcPhase.style.left = `${currentLeft}px`;
    qcPhase.style.width = `${qcWidth}px`;
  } else {
    qcPhase.style.display = 'none';
    qcPhase.style.width = '0px';
  }

  console.log('Applied phase widths to DOM elements with visibility controls');
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
    const prodPhase = barElement.querySelector('.dept-prod-phase, .dept-production-phase') as HTMLElement;
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

    return true;
  } catch (error) {
    console.error('Error updating phase widths:', error);
    return false;
  }
};
