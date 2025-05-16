import React, { useState } from 'react';
import { Project } from '@shared/schema';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { addWeeks } from 'date-fns';

interface CollapsibleSidebarProps {
  unassignedProjects: Project[];
}

export function CollapsibleSidebar({ unassignedProjects }: CollapsibleSidebarProps) {
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
                  onDragStart={(e) => {
                    // Create dummy schedule to use the existing drag logic
                    const dummySchedule = {
                      id: -project.id, // Negative ID to mark as new
                      projectId: project.id,
                      bayId: 0,
                      startDate: new Date(),
                      endDate: addWeeks(new Date(), 4),
                      totalHours: 160,
                      row: 0
                    };
                    
                    // Set drag data
                    e.dataTransfer.setData('text/plain', String(dummySchedule.id));
                    e.dataTransfer.effectAllowed = 'copy';
                    
                    // Visual feedback
                    e.currentTarget.classList.add('opacity-50');
                    
                    // Create custom drag image
                    const dragImage = document.createElement('div');
                    dragImage.className = 'bg-blue-600 text-white p-2 rounded opacity-80 pointer-events-none fixed -left-full';
                    dragImage.textContent = `${project.projectNumber}: ${project.name}`;
                    document.body.appendChild(dragImage);
                    e.dataTransfer.setDragImage(dragImage, 10, 10);
                    
                    // Add to temporary data to be accessed by drop handlers
                    (window as any).draggedProject = project;
                    console.log(`Dragging unassigned project ${project.projectNumber}: ${project.name}`);
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.classList.remove('opacity-50');
                    const dragImages = document.querySelectorAll('div.pointer-events-none.fixed.-left-full');
                    dragImages.forEach(el => el.remove());
                  }}
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