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
  // Calculate the height percentage for each row
  const rowHeightPercentage = 100 / rowCount;
  const rowHeight = `h-[${rowHeightPercentage}%]`;

  return (
    <>
      {/* Week cells grid */}
      <div className="absolute inset-0 grid grid-cols-52 border-l border-gray-700/50">
        {weekSlots.map((slot, index) => (
          <div
            key={`week-cell-${bay.id}-${index}`}
            className={`week-cell border-r border-gray-700/50 cursor-pointer ${isSameDay(slot.date, new Date()) ? 'bg-blue-900/20' : ''}`}
            data-bay-id={bay.id}
            data-week-index={index}
            data-date={format(slot.date, 'yyyy-MM-dd')}
            onDragOver={(e) => {
              e.preventDefault();
              // Visualize the specific week cell being targeted
              e.currentTarget.classList.add('drag-hover');
              
              // Log week info for debugging
              const weekNumber = format(slot.date, 'w');
              console.log(`Entering week ${weekNumber} (index ${index}) in bay ${bay.id}`);
            }}
            onDragLeave={(e) => {
              // Remove visual feedback when leaving cell
              e.currentTarget.classList.remove('bg-primary/10', 'drag-hover');
              
              // Remove all row highlight classes
              for (let i = 0; i < rowCount; i++) {
                e.currentTarget.classList.remove(`row-${i}-highlight`);
              }
              
              // Reset data attributes
              e.currentTarget.removeAttribute('data-target-row');
              e.currentTarget.removeAttribute('data-week-number');
            }}
            onDrop={(e) => {
              // Calculate which row within the cell the cursor is over
              const cellHeight = e.currentTarget.clientHeight;
              const relativeY = e.nativeEvent.offsetY;
              const rowIndex = Math.floor((relativeY / cellHeight) * rowCount);
              
              // CRITICAL: Update global data attribute with current row
              // This ensures the drop handler can use the current row where the mouse is
              document.body.setAttribute('data-current-drag-row', rowIndex.toString());
              
              // Remove all highlight classes
              for (let i = 0; i < rowCount; i++) {
                e.currentTarget.classList.remove(`row-${i}-highlight`);
              }
              e.currentTarget.classList.remove('drag-hover', 'active-drop-target');
              
              // Reset data attributes
              e.currentTarget.removeAttribute('data-target-row');
              e.currentTarget.removeAttribute('data-week-number');
              
              // Handle the drop with the specific row
              handleDrop(e, bay.id, index, rowIndex);
              
              // Log the exact cell location for debugging
              const weekStartDate = format(slot.date, 'yyyy-MM-dd');
              console.log(`Project dropped at Bay ${bay.id}, Week ${index} (${weekStartDate}), Row ${rowIndex}`);
            }}
          />
        ))}
      </div>

      {/* Row dividers with visible action buttons */}
      <div className="absolute inset-0 flex flex-col">
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <div 
            key={`bay-row-${bay.id}-${rowIndex}`}
            className={`${rowIndex < rowCount - 1 ? 'border-b' : ''} border-gray-700/50 bay-row transition-colors hover:bg-gray-700/10 cursor-pointer relative`}
            style={{ height: `${rowHeightPercentage}%` }}
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
            {/* Row number indicator */}
            <div className="absolute -left-6 top-0 h-full opacity-70 pointer-events-none flex items-center justify-center">
              <div className="bg-primary/20 rounded-md px-2 py-0.5 text-xs font-bold text-primary">
                {rowIndex + 1}
              </div>
            </div>
            
            {/* Enhanced row management buttons */}
            <div className="absolute left-1/2 transform -translate-x-1/2 bottom-[-10px] flex gap-2 z-[999] pointer-events-auto">
              {/* Delete row button */}
              <button
                type="button"
                className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-white shadow-lg border-2 border-white hover:bg-destructive/90"
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
                <Minus className="h-3 w-3" />
              </button>
              {/* Add row button */}
              <button
                type="button"
                className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white shadow-lg border-2 border-white hover:bg-primary/90"
                title="Add Row"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowAdd(bay.id, rowIndex);
                }}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default MultiRowBayContent;