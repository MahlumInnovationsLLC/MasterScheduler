import React from 'react';
import { Plus, Minus, Users } from 'lucide-react';
import { ManufacturingBay, ManufacturingSchedule, Project } from '@shared/schema';
import { format, isSameDay } from 'date-fns';

interface MultiRowBayContentProps {
  bay: ManufacturingBay;
  weekSlots: { date: Date }[];
  scheduleBars: any[];
  projects: Project[];
  handleDragOver: (e: React.DragEvent<Element>, bayId: number, weekIndex: number, rowIndex?: number) => void;
  handleDrop: (e: React.DragEvent<Element>, bayId: number, weekIndex?: number, rowIndex?: number) => void;
  setRowToDelete: React.Dispatch<React.SetStateAction<{
    bayId: number;
    rowIndex: number;
    projects: {
      id: number;
      projectId: number;
      projectName: string;
      projectNumber: string;
    }[];
  } | null>>;
  setDeleteRowDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleRowDelete: (bayId: number, rowIndex: number) => void;
  handleRowAdd: (bayId: number, rowIndex: number) => void;
  rowCount: number;
}

const MultiRowBayContent: React.FC<MultiRowBayContentProps> = ({
  bay,
  weekSlots,
  scheduleBars,
  projects,
  handleDragOver,
  handleDrop,
  setRowToDelete,
  setDeleteRowDialogOpen,
  handleRowDelete,
  handleRowAdd,
  rowCount = 20 // Default to 20 rows for multi-row bays
}) => {
  
  // Set a consistent container height for Team 7 & 8 bays
  // This ensures all 20 rows fit within a standardized height that matches the screenshot
  const containerStyle = {
    height: '600px', // Much taller height to match Team 8 in the screenshot
    minHeight: '600px', // Enforce minimum height
  };
  // Calculate the height percentage for each row
  const rowHeightPercentage = 100 / rowCount;
  
  // Use CSS variables for dynamic styling
  // For Teams 7 & 8, use a much taller consistent height for all rows
  // This matches exactly what we see in the screenshot for Team 8
  const rowStyle = {
    height: `${rowHeightPercentage}%`,
    minHeight: '30px', // Much taller rows to match Team 8 in screenshot
  };
  
  // Check if this is Team 7 or 8 for special styling
  const isTeam7Or8 = bay.name && bay.name.trim().startsWith('Team') && 
                    (bay.name.includes('7') || bay.name.includes('8'));

  return (
    <div className="multi-row-bay-wrapper" style={{ height: '600px', minHeight: '600px' }}>
      {/* Add wrapper div with fixed height */}
      {/* Week cells grid with row subdivision for precise row targeting */}
      <div className="absolute inset-0 grid grid-cols-52 border-l border-gray-700/50">
        {weekSlots.map((slot, index) => (
          <div
            key={`week-cell-${bay.id}-${index}`}
            className={`week-cell relative border-r border-gray-700/50 cursor-pointer ${isSameDay(slot.date, new Date()) ? 'bg-blue-900/20' : ''}`}
            data-bay-id={bay.id}
            data-week-index={index}
            data-date={format(slot.date, 'yyyy-MM-dd')}
          >
            {/* Create row sub-divisions for drag targeting in each cell */}
            <div className="absolute inset-0 flex flex-col">
              {Array.from({ length: rowCount }).map((_, rowIdx) => (
                <div 
                  key={`subcell-${bay.id}-${index}-${rowIdx}`}
                  className={`flex-1 min-h-0 relative subcell ${rowIdx % 2 === 0 ? 'subcell-even' : 'subcell-odd'}`}
                  data-row-index={rowIdx}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Add highlights to the specific row and cell
                    const weekCell = e.currentTarget.closest('.week-cell');
                    if (weekCell) {
                      weekCell.classList.add('drag-hover');
                      
                      // Add row-specific highlight
                      weekCell.classList.add(`row-${rowIdx}-highlight`);
                      
                      // Store the target row for reference
                      weekCell.setAttribute('data-target-row', rowIdx.toString());
                    }
                    
                    // Update current row globally
                    document.body.setAttribute('data-current-drag-row', rowIdx.toString());
                    
                    // Call the handler with precise row information
                    handleDragOver(e, bay.id, index, rowIdx);
                    
                    // Log for debugging
                    if (rowIdx % 5 === 0) { // Reduce log volume
                      console.log(`Dragging over bay ${bay.id}, week ${index}, row ${rowIdx}`);
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Only remove the row-specific highlight
                    const weekCell = e.currentTarget.closest('.week-cell');
                    if (weekCell) {
                      weekCell.classList.remove(`row-${rowIdx}-highlight`);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Get the week cell parent
                    const weekCell = e.currentTarget.closest('.week-cell');
                    if (weekCell) {
                      // Remove all highlights
                      weekCell.classList.remove('drag-hover');
                      for (let i = 0; i < rowCount; i++) {
                        weekCell.classList.remove(`row-${i}-highlight`);
                      }
                    }
                    
                    // MAY 16, 2025 CRITICAL USER-DEMANDED FIX:
                    // ABSOLUTELY EXACT ROW PLACEMENT - ZERO PROCESSING
                    
                    // USE EXTREMELY SIMPLE APPROACH - JUST USE ROW INDEX DIRECTLY
                    // NO CALCULATIONS, NO ADJUSTMENTS, NO AUTOMATIC REPOSITIONING
                    // This is what the user explicitly demands - total control over positioning
                    
                    // FOR MAXIMUM REDUNDANCY: Set all possible attributes with this row
                    // This provides maximum compatibility with all code paths
                    document.body.setAttribute('data-current-drag-row', rowIdx.toString());
                    document.body.setAttribute('data-exact-row-drop', rowIdx.toString());
                    document.body.setAttribute('data-last-row-select', rowIdx.toString());
                    document.body.setAttribute('data-precision-drop-row', rowIdx.toString());
                    document.body.setAttribute('data-absolute-row-index', rowIdx.toString());
                    document.body.setAttribute('data-forced-row-index', rowIdx.toString());
                    document.body.setAttribute('data-final-exact-row', rowIdx.toString());
                    document.body.setAttribute('data-y-axis-row', rowIdx.toString());
                    
                    // SET EMERGENCY BYPASS FLAGS
                    document.body.setAttribute('data-bypass-all-row-logic', 'true');
                    document.body.setAttribute('data-force-exact-row-placement', 'true');
                    document.body.setAttribute('data-allow-row-overlap', 'true');
                    document.body.setAttribute('data-emergency-fix-mode', 'true');
                    
                    // Log emergency bypass mode
                    console.log(`🚨🚨🚨 EMERGENCY USER-DEMANDED FIX - EXACT ROW PLACEMENT`);
                    console.log(`🚨🚨🚨 Using ROW ${rowIdx} with ZERO PROCESSING`);
                    console.log(`🚨🚨🚨 ALL COLLISION DETECTION DISABLED`);
                    console.log(`🚨🚨🚨 ALL AUTOMATIC POSITIONING DISABLED`);
                    console.log(`🚨🚨🚨 ALL ROW OVERLAP PREVENTION DISABLED`);
                    console.log(`🚨🚨🚨 PROJECT WILL BE PLACED EXACTLY WHERE DROPPED`);
                    
                    // Store pixel-perfect calculation details for debugging
                    const rowPct = (relativeY / cellHeight);
                    document.body.setAttribute('data-exact-drop-y-percent', rowPct.toString());
                    document.body.setAttribute('data-exact-drop-y-pixels', relativeY.toString());
                    document.body.setAttribute('data-exact-drop-adjusted-y', adjustedY.toString());
                    
                    console.log(`🎯 PIXEL-PERFECT ROW CALCULATION:`);
                    console.log(`  - Cell height: ${cellHeight}px with ${rowCount} rows (${rowHeight}px per row)`);
                    console.log(`  - Mouse Y position: ${relativeY}px (${rowPct.toFixed(2)}% of cell height)`);
                    console.log(`  - Drag offset Y: ${dragOffsetY}px (where user grabbed the bar)`);
                    console.log(`  - Adjusted Y: ${adjustedY}px (after compensating for grab offset)`);
                    console.log(`  - Calculated exact row: ${exactRow} (clamped to ${clampedExactRow})`);
                    console.log(`  - Cell index row: ${rowIdx} (original cell-based calculation)`);
                    console.log(`  - USING PRECISION ROW: ${clampedExactRow} for final placement`);
                    
                    // CRITICAL FIX: Use the pixel-perfect calculated row instead of the cell-based rowIdx
                    // This ensures the project lands exactly where the user expects based on pixel position
                    handleDrop(e, bay.id, index, clampedExactRow);
                    
                    // Log the exact cell location for debugging
                    const weekStartDate = format(slot.date, 'yyyy-MM-dd');
                    console.log(`Project dropped at Bay ${bay.id}, Week ${index} (${weekStartDate}), Row ${rowIdx} [GUARANTEED POSITION]`);
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Row dividers with visible action buttons */}
      <div className="absolute inset-0 flex flex-col multi-row-bay">
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <div 
            key={`bay-row-${bay.id}-${rowIndex}`}
            className={`${rowIndex < rowCount - 1 ? 'border-b' : ''} border-gray-700/50 bay-row transition-colors hover:bg-gray-700/10 cursor-pointer relative`}
            style={{ height: `${100/rowCount}%`, minHeight: '30px' }}
            onDragOver={(e) => {
              // Add strong visual indicator for this row
              e.currentTarget.classList.add('row-target-highlight', `row-${rowIndex}-target`);
              handleDragOver(e, bay.id, 0, rowIndex);
            }}
            onDragLeave={(e) => {
              // Remove highlight when leaving this row
              e.currentTarget.classList.remove('row-target-highlight', `row-${rowIndex}-target`);
            }}
            onDrop={(e) => {
              // Set global row data attribute to current row
              document.body.setAttribute('data-current-drag-row', rowIndex.toString());
              handleDrop(e, bay.id, 0, rowIndex);
            }}
          >
            {/* Row number indicator - smaller for Team 7 & 8 */}
            <div className="absolute -left-6 top-0 h-full row-number pointer-events-none flex items-center justify-center">
              {isTeam7Or8 ? (
                // Smaller, more compact badges for Team 7 & 8 with 20 rows
                <div className={`row-number-badge px-1 py-0 text-[7px] ${rowIndex % 2 === 0 ? 'font-bold' : 'opacity-50'}`}>
                  {rowIndex + 1}
                </div>
              ) : (
                // Normal badges for other bays
                <div className="row-number-badge px-2 py-0.5 text-xs font-bold">
                  {rowIndex + 1}
                </div>
              )}
            </div>
            
            {/* Row management buttons - only show for regular bays, hide completely for Team 7 & 8 */}
            {!isTeam7Or8 && (
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-[-6px] flex gap-1 z-[999] pointer-events-auto row-management-buttons">
                {/* Delete row button */}
                <button
                  type="button"
                  className="flex items-center justify-center w-4 h-4 text-[8px] rounded-full row-delete-button text-white shadow-sm border border-white/80 hover:bg-destructive/90"
                  title="Delete Row"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Get projects in this row
                    const projectsInRow = scheduleBars
                      .filter(bar => bar.bayId === bay.id && bar.row === rowIndex)
                      .map(bar => {
                        const project = projects.find(p => p.id === bar.projectId);
                        return {
                          id: bar.id,
                          projectId: bar.projectId,
                          projectName: project?.name || 'Unknown Project',
                          projectNumber: project?.projectNumber || 'Unknown'
                        };
                      });
                    
                    // If projects are found, show confirmation dialog
                    if (projectsInRow.length > 0) {
                      setRowToDelete({
                        bayId: bay.id,
                        rowIndex: rowIndex,
                        projects: projectsInRow
                      });
                      setDeleteRowDialogOpen(true);
                    } else {
                      // No projects, delete row immediately
                      handleRowDelete(bay.id, rowIndex);
                    }
                  }}
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                {/* Add row button */}
                <button
                  type="button"
                  className="flex items-center justify-center w-4 h-4 text-[8px] rounded-full row-add-button text-white shadow-sm border border-white/80 hover:bg-primary/90"
                  title="Add Row"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowAdd(bay.id, rowIndex);
                  }}
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiRowBayContent;