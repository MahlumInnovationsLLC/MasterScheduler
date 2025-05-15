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
  const containerStyle = {
    height: '600px',
    minHeight: '600px',
  };

  // Calculate row height
  const rowHeightPercentage = 100 / rowCount;

  // Row style with consistent height
  const rowStyle = {
    height: `${rowHeightPercentage}%`,
    minHeight: '30px',
  };

  // Check if this is Team 7 or 8
  const isTeam7Or8 = bay.name && bay.name.trim().startsWith('Team') && 
                    (bay.name.includes('7') || bay.name.includes('8'));

  // Enhanced handleDragOver with pixel-perfect positioning and row limit enforcement
  const handleEnhancedDragOver = (e: React.DragEvent<HTMLElement>, bayId: number, weekIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Get container dimensions
    const container = e.currentTarget.closest('.multi-row-bay-wrapper');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;

    // Calculate exact row from Y position
    const rowHeight = rect.height / rowCount;
    let exactRow = Math.floor(mouseY / rowHeight);
    
    // Check if this is a regular bay (not TCV Line/Team 7&8)
    const isRegularBay = bay.bayNumber !== 7 && bay.bayNumber !== 8;
    const maxRowIndex = isRegularBay ? 3 : 19; // 4 rows (0-3) for regular bays, 20 rows (0-19) for TCV Line
    
    // Store raw position before enforcing limits
    document.body.setAttribute('data-raw-exact-row', exactRow.toString());
    
    // Enforce row limits (except if emergency mode is active)
    const emergencyFixMode = localStorage.getItem('emergencyFixMode') === 'true';
    const forceExactPlacement = localStorage.getItem('forceExactRowPlacement') === 'true';
    
    // Only apply limits if not in emergency mode
    if (isRegularBay && exactRow > maxRowIndex && !emergencyFixMode) {
      console.log(`⚠️ Row limit reached: ${exactRow} exceeds max of ${maxRowIndex} for bay ${bayId}`);
      exactRow = maxRowIndex;
      
      // Add visual warning for reaching row limit
      document.body.setAttribute('data-row-limit-reached', 'true');
      
      // Add a style to indicate we've hit the row limit
      container.classList.add('row-limit-reached');
    } else {
      document.body.setAttribute('data-row-limit-reached', 'false');
      container.classList.remove('row-limit-reached');
    }

    // Store exact position data with additional attributes
    document.body.setAttribute('data-exact-y-position', mouseY.toString());
    document.body.setAttribute('data-computed-row-index', exactRow.toString());
    document.body.setAttribute('data-row-height', rowHeight.toString());
    document.body.setAttribute('data-current-drag-row', exactRow.toString()); 
    document.body.setAttribute('data-bay-max-row-index', maxRowIndex.toString());
    document.body.setAttribute('data-bay-is-regular', isRegularBay.toString());
    
    // For emergency mode tracking
    if (emergencyFixMode) {
      document.body.setAttribute('data-emergency-drag-active', 'true');
      document.body.setAttribute('data-forced-row-index', exactRow.toString());
    }

    // Add visual feedback for the exact row
    const allRows = container.querySelectorAll('.bay-row');
    allRows.forEach((row, idx) => {
      if (idx === exactRow) {
        row.classList.add('exact-row-highlight');
      } else {
        row.classList.remove('exact-row-highlight');
      }
    });

    // Call original handler with exact row
    handleDragOver(e, bayId, weekIndex, exactRow);
  };

  // Enhanced handleDrop with pixel-perfect positioning and row limit enforcement
  const handleEnhancedDrop = (e: React.DragEvent<HTMLElement>, bayId: number, weekIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Get container dimensions
    const container = e.currentTarget.closest('.multi-row-bay-wrapper');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;

    // Calculate exact row from Y position
    const rowHeight = rect.height / rowCount;
    let exactRow = Math.floor(mouseY / rowHeight);
    
    // Check if this is a regular bay (not TCV Line/Team 7&8)
    const isRegularBay = bay.bayNumber !== 7 && bay.bayNumber !== 8;
    const maxRowIndex = isRegularBay ? 3 : 19; // 4 rows (0-3) for regular bays, 20 rows (0-19) for TCV Line
    
    // Store raw position before enforcing limits
    document.body.setAttribute('data-raw-drop-row', exactRow.toString());
    document.body.setAttribute('data-drop-y-position', mouseY.toString());
    
    // Check for emergency fix mode
    const emergencyFixMode = localStorage.getItem('emergencyFixMode') === 'true';
    const forceExactPlacement = localStorage.getItem('forceExactRowPlacement') === 'true';
    
    // Only enforce row limits if we're not in emergency mode
    if (isRegularBay && exactRow > maxRowIndex && !emergencyFixMode) {
      console.log(`⚠️ DROP ROW LIMIT: Row ${exactRow} exceeds max of ${maxRowIndex} for bay ${bayId}`);
      
      // Add visual indicator that we're limiting the row
      container.classList.add('row-limit-enforced');
      
      // Enforce the limit for the drop operation
      exactRow = maxRowIndex;
      
      // Show a quick visual indication
      const flashElement = document.createElement('div');
      flashElement.className = 'row-limit-flash';
      flashElement.style.position = 'absolute';
      flashElement.style.top = `${maxRowIndex * rowHeight}px`;
      flashElement.style.left = '0';
      flashElement.style.right = '0';
      flashElement.style.height = `${rowHeight}px`;
      flashElement.style.backgroundColor = 'rgba(255, 100, 100, 0.3)';
      flashElement.style.zIndex = '100';
      flashElement.style.pointerEvents = 'none';
      container.appendChild(flashElement);
      
      // Remove flash after animation
      setTimeout(() => {
        if (flashElement.parentElement) {
          flashElement.parentElement.removeChild(flashElement);
        }
        container.classList.remove('row-limit-enforced');
      }, 800);
    }
    
    // Store all final position data with additional redundant attributes
    document.body.setAttribute('data-final-row-index', exactRow.toString());
    document.body.setAttribute('data-final-exact-row', exactRow.toString());
    document.body.setAttribute('data-absolute-row-index', exactRow.toString());
    document.body.setAttribute('data-force-exact-row-placement', 'true');
    document.body.setAttribute('data-bay-limited-to', maxRowIndex.toString());
    document.body.setAttribute('data-bay-is-regular-type', isRegularBay.toString());
    
    // For emergency mode tracking
    if (emergencyFixMode) {
      document.body.setAttribute('data-emergency-drop-active', 'true');
      document.body.setAttribute('data-emergency-row-override', exactRow.toString());
    }

    // Call original handler with exact row
    handleDrop(e, bayId, weekIndex, exactRow);
  };

  return (
    <div className="multi-row-bay-wrapper" style={{ height: '600px', minHeight: '600px' }}>
      {/* Week cells grid with row subdivision for precise row targeting */}
      <div className="absolute inset-0 grid grid-cols-52 border-l border-gray-700/50">
        {weekSlots.map((slot, index) => (
          <div
            key={`week-cell-${bay.id}-${index}`}
            className={`week-cell relative border-r border-gray-700/50 cursor-pointer ${isSameDay(slot.date, new Date()) ? 'bg-blue-900/20' : ''}`}
            data-bay-id={bay.id}
            data-week-index={index}
            data-date={format(slot.date, 'yyyy-MM-dd')}
            onDragOver={(e) => handleEnhancedDragOver(e, bay.id, index)}
            onDrop={(e) => handleEnhancedDrop(e, bay.id, index)}
          >
            {/* Row subdivisions */}
            <div className="absolute inset-0 flex flex-col">
              {Array.from({ length: rowCount }).map((_, rowIdx) => (
                <div 
                  key={`subcell-${bay.id}-${index}-${rowIdx}`}
                  className={`flex-1 min-h-0 relative subcell ${rowIdx % 2 === 0 ? 'subcell-even' : 'subcell-odd'}`}
                  data-row-index={rowIdx}
                  style={{ height: `${100/rowCount}%` }}
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
            data-row-index={rowIndex}
          >
            {/* Row number indicator */}
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

            {/* Row management buttons */}
            {!isTeam7Or8 && (
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-[-6px] flex gap-1 z-[999] pointer-events-auto row-management-buttons">
                <button
                  type="button"
                  className="flex items-center justify-center w-4 h-4 text-[8px] rounded-full row-delete-button text-white shadow-sm border border-white/80 hover:bg-destructive/90"
                  title="Delete Row"
                  onClick={(e) => {
                    e.stopPropagation();
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

                    if (projectsInRow.length > 0) {
                      setRowToDelete({
                        bayId: bay.id,
                        rowIndex: rowIndex,
                        projects: projectsInRow
                      });
                      setDeleteRowDialogOpen(true);
                    } else {
                      handleRowDelete(bay.id, rowIndex);
                    }
                  }}
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
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