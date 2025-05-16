import React, { useState } from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { addWeeks } from 'date-fns';

interface SimpleProject {
  id: number;
  name: string;
  projectNumber: string;
  status: string;
  team?: string | null;
}

export function SimpleCollapsibleSidebar({ projects }: { projects: SimpleProject[] }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div 
      className={`border-r border-gray-700 flex-shrink-0 overflow-y-auto bg-gray-900 transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-64'}`}
    >
      <div className="flex items-center justify-between p-4">
        {!isCollapsed && <h3 className="font-bold text-white">Unassigned Projects</h3>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-full bg-gray-800 hover:bg-gray-700 text-white"
        >
          {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="p-4 pt-0">
          {projects.length === 0 ? (
            <div className="text-sm text-gray-400 italic">No unassigned projects</div>
          ) : (
            <div className="space-y-3">
              {projects.map(project => (
                <div 
                  key={`unassigned-${project.id}`}
                  className="bg-gray-800 p-3 rounded border border-gray-700 shadow-sm cursor-grab hover:bg-gray-700 transition-colors"
                  draggable
                >
                  <div className="font-medium text-white text-sm mb-1 truncate">{project.projectNumber}: {project.name}</div>
                  <div className="text-xs text-gray-400 truncate">{project.status}</div>
                  <div className="text-xs text-gray-400 mt-1 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                    {project.team || 'No Team'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}