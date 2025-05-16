import React, { useState } from 'react';
import { Project } from '@shared/schema';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';

// Component for collapsible sidebar with unassigned projects
export function CollapsibleSidebar({ unassignedProjects }: { unassignedProjects: Project[] }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div 
      className={`unassigned-projects-sidebar border-r border-gray-700 flex-shrink-0 overflow-y-auto bg-gray-900 transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-64'}`}
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
          {unassignedProjects.length === 0 ? (
            <div className="text-sm text-gray-400 italic">No unassigned projects</div>
          ) : (
            <div className="space-y-3">
              {unassignedProjects.map(project => (
                <div 
                  key={`unassigned-${project.id}`}
                  className="unassigned-project-card bg-gray-800 p-3 rounded border border-gray-700 shadow-sm cursor-grab hover:bg-gray-700 transition-colors"
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

// Component for fixed bay labels that stay visible during horizontal scrolling
export function BayLabelFixed({ bay, children }: { 
  bay: any, 
  children: React.ReactNode 
}) {
  return (
    <div 
      className="bay-label sticky left-0 w-48 h-full bg-gray-100 border-r flex flex-col justify-between py-2 px-2 z-10"
    >
      {children}
    </div>
  );
}