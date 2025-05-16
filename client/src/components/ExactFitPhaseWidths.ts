/**
 * This module provides utilities for calculating exact phase widths
 * for manufacturing schedule visualization.
 */

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
}

/**
 * Calculates exact fit phase widths for a schedule bar
 * @param bar The schedule bar to calculate phase widths for
 * @returns The bar with calculated phase widths
 */
export const calculateExactFitPhaseWidths = (bar: ScheduleBar): ScheduleBar => {
  // Calculate the width of each phase based on percentages
  const totalWidth = bar.width;
  
  // Calculate widths for each phase based on their percentages
  const fabWidth = (bar.fabPercentage / 100) * totalWidth;
  const paintWidth = (bar.paintPercentage / 100) * totalWidth;
  const productionWidth = (bar.productionPercentage / 100) * totalWidth;
  const itWidth = (bar.itPercentage / 100) * totalWidth;
  const ntcWidth = (bar.ntcPercentage / 100) * totalWidth;
  const qcWidth = (bar.qcPercentage / 100) * totalWidth;
  
  console.log(`Phase widths calculated for schedule ${bar.id}:`, {
    totalWidth,
    fabWidth,
    paintWidth,
    productionWidth,
    itWidth,
    ntcWidth,
    qcWidth
  });
  
  // Create a copy of the bar with the calculated widths
  return {
    ...bar,
    fabWidth,
    paintWidth,
    productionWidth,
    itWidth,
    ntcWidth,
    qcWidth
  };
};

/**
 * Updates phase widths with exact fit calculations
 * @param bars The array of schedule bars to update
 * @returns The updated bars array
 */
export const updatePhaseWidthsWithExactFit = (bars: ScheduleBar[]): ScheduleBar[] => {
  return bars.map(bar => calculateExactFitPhaseWidths(bar));
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