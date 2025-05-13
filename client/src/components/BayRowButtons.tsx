import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface BayRowButtonsProps {
  bayId: number;
  rowIndex: number;
  onAddRow: (bayId: number, rowIndex: number) => void;
  onDeleteRow: (bayId: number, rowIndex: number, hasProjects: boolean) => void;
  hasProjects: boolean;
}

// Standalone component for row management buttons
const BayRowButtons: React.FC<BayRowButtonsProps> = ({
  bayId,
  rowIndex,
  onAddRow,
  onDeleteRow,
  hasProjects
}) => {
  return (
    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-[-10px] flex gap-2 z-[999] pointer-events-auto">
      {/* Delete row button */}
      <button
        type="button"
        className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-white shadow-lg border-2 border-white hover:bg-destructive/90"
        title="Delete Row"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteRow(bayId, rowIndex, hasProjects);
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
          onAddRow(bayId, rowIndex);
        }}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
};

export default BayRowButtons;