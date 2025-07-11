import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { format, differenceInDays, startOfWeek, endOfWeek, addWeeks, parseISO, addDays } from 'date-fns';
import { Project } from '@shared/schema';
import { ChevronRight } from 'lucide-react';

interface DepartmentGanttChartProps {
  projects: Project[];
  department: 'mech' | 'fab' | 'paint' | 'production' | 'it' | 'ntc' | 'qc' | 'wrap';
  dateRange: { start: Date; end: Date };
  viewMode: 'week' | 'month';
  onTodayButtonRef?: (scrollToToday: () => void) => void;
}

const DepartmentGanttChart: React.FC<DepartmentGanttChartProps> = ({
  projects,
  department,
  dateRange,
  viewMode,
  onTodayButtonRef
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const slotWidth = 60; // Width per week
  const rowHeight = 65; // Increased height for project name visibility
  
  // Filter and prepare projects for the specific department
  const ganttRows = useMemo(() => {
    const filteredProjects = projects.filter(project => {
      // Filter by department phase availability - project must have BOTH dates
      switch (department) {
        case 'mech':
          return project.mechShop && project.productionStart;
        case 'fab':
          return project.fabricationStart && project.productionStart;
        case 'paint':
          return project.paintStart && project.productionStart;
        case 'production':
          return project.productionStart && project.itStart;
        case 'it':
          return project.itStart && project.ntcTestingDate;
        case 'ntc':
          return project.ntcTestingDate && project.qcStartDate;
        case 'qc':
          return project.qcStartDate && project.shipDate;
        case 'wrap':
          return project.wrapDate && project.qcStartDate;
        default:
          return false;
      }
    });
    
    return filteredProjects
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
          case 'production':
            startDate = parseISO(project.productionStart!.split('T')[0]);
            endDate = parseISO(project.itStart!.split('T')[0]);
            barColor = '#10b981'; // Green
            phaseName = 'PRODUCTION';
            break;
          case 'it':
            startDate = parseISO(project.itStart!.split('T')[0]);
            endDate = parseISO(project.ntcTestingDate!.split('T')[0]);
            barColor = '#8b5cf6'; // Purple
            phaseName = 'IT';
            break;
          case 'ntc':
            startDate = parseISO(project.ntcTestingDate!.split('T')[0]);
            endDate = parseISO(project.qcStartDate!.split('T')[0]);
            barColor = '#06b6d4'; // Cyan
            phaseName = 'NTC';
            break;
          case 'qc':
            startDate = parseISO(project.qcStartDate!.split('T')[0]);
            endDate = parseISO(project.shipDate!.split('T')[0]);
            barColor = '#f59e0b'; // Amber
            phaseName = 'QC';
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
  
  // Smart scroll to today with first project
  const scrollToToday = useCallback(() => {
    if (containerRef.current && headerRef.current) {
      const today = new Date();
      const pixelsPerDay = slotWidth / 7;
      const todayPosition = differenceInDays(today, dateRange.start) * pixelsPerDay;
      
      // Find the first project that crosses the today line
      const firstProject = ganttRows.find(row => {
        if (!row) return false;
        const { startDate, endDate } = row;
        return startDate <= today && endDate >= today;
      });
      
      let scrollPosition = todayPosition - 400; // Default center on today
      
      if (firstProject) {
        // Calculate the project's row position for vertical scrolling
        const projectIndex = ganttRows.indexOf(firstProject);
        const projectVerticalPosition = projectIndex * rowHeight;
        
        // Scroll to center the project vertically
        const containerHeight = containerRef.current.clientHeight;
        const verticalScrollPosition = projectVerticalPosition - (containerHeight / 2) + (rowHeight / 2);
        
        containerRef.current.scrollTop = Math.max(0, verticalScrollPosition);
      }
      
      // Horizontal scroll to today line
      containerRef.current.scrollLeft = Math.max(0, scrollPosition);
      headerRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [dateRange, ganttRows, rowHeight, slotWidth]);

  // Auto-scroll to today on mount
  useEffect(() => {
    scrollToToday();
  }, [scrollToToday]);

  // Expose scrollToToday function to parent
  useEffect(() => {
    if (onTodayButtonRef) {
      onTodayButtonRef(scrollToToday);
    }
  }, [scrollToToday, onTodayButtonRef]);
  
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
            ref={headerRef}
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
      <div className="relative flex overflow-hidden" style={{ height: 'calc(100vh - 350px - 58px)' }}>
        {/* Container for synchronized scrolling */}
        <div className="flex flex-1 overflow-auto" 
             ref={containerRef}
             onScroll={(e) => {
               // Sync horizontal scroll with header
               if (headerRef.current) {
                 headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
               }
             }}
        >
          {/* Sticky project column */}
          <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r sticky left-0 z-10">
            {ganttRows.map((row, index) => {
              if (!row) return null;
              const { project } = row;
              
              return (
                <div key={project.id} className="border-b border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-3 flex flex-col justify-center" style={{ height: `${rowHeight}px` }}>
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
          <div className="flex-1 relative" style={{ width: `${timeSlots.length * slotWidth}px`, height: `${ganttRows.length * rowHeight}px` }}>
            {/* Today line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none today-marker"
              style={{
                left: `${differenceInDays(new Date(), dateRange.start) * (slotWidth / 7)}px`,
                height: `${ganttRows.length * rowHeight}px`
              }}
            />
            
            {/* Project rows */}
            {ganttRows.map((row, index) => {
              if (!row) return null;
              const { project, startDate, endDate, barColor, phaseName } = row;
              const { left, width } = calculateBarPosition(startDate, endDate);
              
              return (
                <div key={project.id} className="relative border-b border-gray-400 dark:border-gray-600" style={{ height: `${rowHeight}px` }}>
                  {/* Grid lines */}
                  {timeSlots.map((_, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 border-r border-gray-400 dark:border-gray-600"
                      style={{ left: `${idx * slotWidth}px` }}
                    />
                  ))}
                  
                  {/* Horizontal grid line extension */}
                  <div 
                    className="absolute top-0 left-0 h-0 border-t border-gray-400 dark:border-gray-600" 
                    style={{ width: `${timeSlots.length * slotWidth}px` }}
                  />
                  
                  {/* Phase bar */}
                  <div
                    className="absolute rounded shadow-sm flex items-center justify-center text-white text-xs font-semibold hover:shadow-md transition-shadow cursor-pointer"
                    style={{
                      left: `${left}px`,
                      width: `${width}px`,
                      height: '24px',
                      top: `${(rowHeight - 24) / 2}px`, // Center vertically
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
                        style={{ left: `${left}px`, top: `${rowHeight - 16}px` }}
                      >
                        {format(startDate, 'MM/dd')}
                      </div>
                      <div
                        className="absolute text-xs text-gray-500 dark:text-gray-400"
                        style={{ left: `${left + width - 30}px`, top: `${rowHeight - 16}px` }}
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
    </div>
  );
};

export default DepartmentGanttChart;