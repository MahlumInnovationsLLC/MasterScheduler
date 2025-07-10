import React, { useMemo, useRef, useEffect } from 'react';
import { format, differenceInDays, startOfWeek, endOfWeek, addWeeks, parseISO, addDays } from 'date-fns';
import { Project } from '@shared/schema';
import { ChevronRight } from 'lucide-react';

interface DepartmentGanttChartProps {
  projects: Project[];
  department: 'mech' | 'fab' | 'paint' | 'wrap';
  dateRange: { start: Date; end: Date };
  viewMode: 'week' | 'month';
}

const DepartmentGanttChart: React.FC<DepartmentGanttChartProps> = ({
  projects,
  department,
  dateRange,
  viewMode
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const slotWidth = 60; // Width per week
  
  // Filter and prepare projects for the specific department
  const ganttRows = useMemo(() => {
    return projects
      .filter(project => {
        // Filter by department phase availability
        switch (department) {
          case 'mech':
            return project.mechShop && project.productionStart;
          case 'fab':
            return project.fabricationStart && project.productionStart;
          case 'paint':
            return project.paintStart && project.productionStart;
          case 'wrap':
            return project.wrapDate && project.qcStartDate;
          default:
            return false;
        }
      })
      .map(project => {
        let startDate: Date;
        let endDate: Date;
        let barColor: string;
        let phaseName: string;
        
        // Determine dates and colors based on department
        switch (department) {
          case 'mech':
            startDate = parseISO(project.mechShop!.split('T')[0]);
            endDate = parseISO(project.productionStart!.split('T')[0]);
            barColor = '#f97316'; // Orange
            phaseName = 'MECH';
            break;
          case 'fab':
            startDate = parseISO(project.fabricationStart!.split('T')[0]);
            endDate = parseISO(project.productionStart!.split('T')[0]);
            barColor = '#2563eb'; // Blue
            phaseName = 'FAB';
            break;
          case 'paint':
            startDate = parseISO(project.paintStart!.split('T')[0]);
            endDate = parseISO(project.productionStart!.split('T')[0]);
            barColor = '#dc2626'; // Red
            phaseName = 'PAINT';
            break;
          case 'wrap':
            startDate = parseISO(project.wrapDate!.split('T')[0]);
            endDate = project.qcStartDate ? parseISO(project.qcStartDate.split('T')[0]) : addDays(startDate, 3);
            barColor = '#dc2626'; // Red for wrap
            phaseName = 'WRAP';
            break;
          default:
            return null;
        }
        
        return {
          project,
          startDate,
          endDate,
          barColor,
          phaseName
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.startDate.getTime() - b!.startDate.getTime());
  }, [projects, department]);
  
  // Generate time slots for headers
  const timeSlots = useMemo(() => {
    const slots = [];
    let current = startOfWeek(dateRange.start, { weekStartsOn: 1 });
    const end = endOfWeek(dateRange.end, { weekStartsOn: 1 });
    
    while (current <= end) {
      slots.push({
        date: current,
        label: format(current, 'MMM dd'),
        weekNumber: format(current, 'w')
      });
      current = addWeeks(current, 1);
    }
    
    return slots;
  }, [dateRange]);
  
  // Auto-scroll to today
  useEffect(() => {
    if (containerRef.current) {
      const today = new Date();
      const daysFromStart = differenceInDays(today, dateRange.start);
      const pixelsPerDay = slotWidth / 7;
      const scrollPosition = daysFromStart * pixelsPerDay - 400; // Center it
      
      containerRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [dateRange]);
  
  // Calculate bar position and width
  const calculateBarPosition = (startDate: Date, endDate: Date) => {
    const pixelsPerDay = slotWidth / 7;
    const daysFromStart = differenceInDays(startDate, dateRange.start);
    const duration = differenceInDays(endDate, startDate);
    
    return {
      left: daysFromStart * pixelsPerDay,
      width: Math.max(duration * pixelsPerDay, 30) // Minimum width for visibility
    };
  };
  
  return (
    <div className="gantt-chart-container relative" style={{ height: 'calc(100vh - 350px)' }}>
      {/* Header with sticky positioning */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b">
        <div className="flex">
          {/* Sticky project column header */}
          <div className="w-64 flex-shrink-0 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-r font-semibold sticky left-0 z-20">
            Project
          </div>
          
          {/* Scrollable timeline headers */}
          <div 
            className="flex-1 overflow-x-auto overflow-y-hidden"
            onScroll={(e) => {
              // Sync scroll with content area
              if (containerRef.current) {
                containerRef.current.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
          >
            <div className="flex" style={{ width: `${timeSlots.length * slotWidth}px` }}>
              {/* Today line in header */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                style={{
                  left: `${differenceInDays(new Date(), dateRange.start) * (slotWidth / 7) + 256}px` // 256px is the project column width
                }}
              >
                <div className="absolute -top-0 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                  TODAY
                </div>
              </div>
              
              {timeSlots.map((slot, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 text-center py-3 border-r text-sm font-medium"
                  style={{ width: `${slotWidth}px` }}
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">Week {slot.weekNumber}</div>
                  <div>{slot.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Scrollable content area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Sticky project column */}
        <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r sticky left-0 z-10 overflow-y-auto">
          {ganttRows.map((row, index) => {
            if (!row) return null;
            const { project } = row;
            
            return (
              <div key={project.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-2" style={{ height: '40px' }}>
                <a 
                  href={`/project/${project.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {project.projectNumber}
                </a>
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {project.name}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Scrollable timeline area */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto"
          onScroll={(e) => {
            // Sync scroll with header
            const header = e.currentTarget.previousElementSibling?.previousElementSibling?.querySelector('.overflow-x-auto');
            if (header) {
              header.scrollLeft = e.currentTarget.scrollLeft;
            }
          }}
        >
          <div className="relative" style={{ width: `${timeSlots.length * slotWidth}px` }}>
            {/* Today line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none today-marker"
              style={{
                left: `${differenceInDays(new Date(), dateRange.start) * (slotWidth / 7)}px`,
                height: `${ganttRows.length * 40}px`
              }}
            />
            
            {/* Project rows */}
            {ganttRows.map((row, index) => {
              if (!row) return null;
              const { project, startDate, endDate, barColor, phaseName } = row;
              const { left, width } = calculateBarPosition(startDate, endDate);
              
              return (
                <div key={project.id} className="relative border-b hover:bg-gray-50 dark:hover:bg-gray-800" style={{ height: '40px' }}>
                  {/* Grid lines */}
                  {timeSlots.map((_, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 border-r border-gray-200 dark:border-gray-700"
                      style={{ left: `${idx * slotWidth}px` }}
                    />
                  ))}
                  
                  {/* Phase bar */}
                  <div
                    className="absolute top-2 rounded shadow-sm flex items-center justify-center text-white text-xs font-semibold hover:shadow-md transition-shadow cursor-pointer"
                    style={{
                      left: `${left}px`,
                      width: `${width}px`,
                      height: '24px',
                      backgroundColor: barColor
                    }}
                    onClick={() => window.location.href = `/project/${project.id}`}
                  >
                    <span className="truncate px-2">
                      {project.projectNumber} - {phaseName}
                    </span>
                  </div>
                  
                  {/* Date labels */}
                  {left >= 0 && left < timeSlots.length * slotWidth && (
                    <>
                      <div
                        className="absolute text-xs text-gray-500 dark:text-gray-400"
                        style={{ left: `${left}px`, top: '28px' }}
                      >
                        {format(startDate, 'MM/dd')}
                      </div>
                      <div
                        className="absolute text-xs text-gray-500 dark:text-gray-400"
                        style={{ left: `${left + width - 30}px`, top: '28px' }}
                      >
                        {format(endDate, 'MM/dd')}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Summary footer */}
      <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t px-4 py-2 text-sm z-20">
        <span className="font-medium">{ganttRows.length} Projects</span>
        <span className="text-gray-500 dark:text-gray-400 ml-4">
          {department.toUpperCase()} Phase Schedule
        </span>
      </div>
    </div>
  );
};

export default DepartmentGanttChart;