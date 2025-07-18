import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  isSameDay, 
  isWithinInterval, 
  parseISO, 
  isBefore,
  isAfter,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { cn } from '@/lib/utils';
import { safeFilter } from '@/lib/array-utils';

export type ScheduleItem = {
  id: string | number;
  title: string;
  date: Date | string;
  project: string;
  status: string;
  color: string;
  bay?: string;
  endDate?: Date | string;
  notes?: string;
  projectId?: number;
  projectName?: string;
  variant?: string; // For billing milestone status: 'paid', 'delayed', 'upcoming', etc.
};

interface CalendarScheduleProps {
  items: ScheduleItem[];
  onDateClick?: (date: Date) => void;
  onItemClick?: (item: ScheduleItem) => void;
}

export function CalendarSchedule({ items, onDateClick, onItemClick }: CalendarScheduleProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Include days from previous and next month to fill calendar grid
  const calendarDays = React.useMemo(() => {
    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    
    // Start from the first day of the week that contains the first day of the month
    const startDate = startOfWeek(firstDayOfMonth);
    // End on the last day of the week that contains the last day of the month
    const endDate = endOfWeek(lastDayOfMonth);
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  const today = new Date();
  
  // Function to check if an item spans multiple days and includes the given date
  const getItemsForDate = (date: Date) => {
    return safeFilter(items, item => {
      try {
        const itemStartDate = item.date instanceof Date ? item.date : parseISO(item.date as string);
        
        // If the item has no end date or the end date is the same as the start date
        if (!item.endDate) {
          return isSameDay(itemStartDate, date);
        }
        
        const itemEndDate = item.endDate instanceof Date ? item.endDate : parseISO(item.endDate as string);
        
        // Check if the date is within the interval of the start and end date (inclusive)
        return isWithinInterval(date, {
          start: itemStartDate,
          end: itemEndDate
        });
      } catch (error) {
        console.error("Error parsing date:", error);
        return false;
      }
    }, 'CalendarSchedule.getItemsForDate');
  };
  
  // Get the status color based on the status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete':
      case 'completed':
        return 'bg-success/90 text-white';
      case 'in_progress':
      case 'in progress':
        return 'bg-warning/90 text-white';
      case 'scheduled':
        return 'bg-primary/90 text-white';
      case 'delayed':
        return 'bg-danger/90 text-white';
      case 'maintenance':
        return 'bg-purple-600/90 text-white';
      default:
        return 'bg-gray-600/90 text-white';
    }
  };
  
  // Function to calculate display text for multi-day events
  const getEventDisplayText = (item: ScheduleItem, date: Date) => {
    if (!item.endDate) return item.title;
    
    const startDate = item.date instanceof Date ? item.date : parseISO(item.date as string);
    const endDate = item.endDate instanceof Date ? item.endDate : parseISO(item.endDate as string);
    
    if (isSameDay(startDate, date)) {
      return `${item.title} (Start)`;
    }
    
    if (isSameDay(endDate, date)) {
      return `${item.title} (End)`;
    }
    
    return item.title;
  };
  
  return (
    <div className="bg-darkCard rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h2 className="font-bold text-lg">
          <CalendarIcon className="h-5 w-5 inline-block mr-2" />
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-gray-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"></path></svg>
          </button>
          <button
            onClick={() => setCurrentMonth(today)}
            className="px-2 py-1 text-xs bg-primary text-white rounded"
          >
            Today
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-gray-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"></path></svg>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 text-center border-b border-gray-800">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-2 text-xs font-medium text-gray-400 bg-gray-900">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 text-center">
        {calendarDays.map((date, i) => {
          const dateItems = getItemsForDate(date);
          const isCurrentMonth = isSameMonth(date, currentMonth);
          
          return (
            <div 
              key={i} 
              className={cn(
                "p-2 border-gray-800 border-r border-b h-24 relative",
                !isCurrentMonth && "opacity-50 bg-gray-900/20",
                isToday(date) && "bg-primary bg-opacity-5"
              )}
              onClick={() => onDateClick?.(date)}
            >
              <div className={cn(
                "font-medium text-sm mb-1",
                isToday(date) ? "text-primary" : "text-gray-300"
              )}>
                {format(date, 'd')}
              </div>
              
              <div className="overflow-y-auto h-16">
                {dateItems.map((item, idx) => {
                  const statusColor = item.color || getStatusColor(item.status);
                  const displayText = getEventDisplayText(item, date);
                  
                  // Different display for milestones vs schedules
                  const isMilestone = item.status === 'milestone' || item.status === 'billing';
                  
                  if (isMilestone) {
                    // Display as text with colored dot for milestones
                    return (
                      <div 
                        key={`${item.id}-${idx}`}
                        className="text-xs mb-1 p-1 flex items-center gap-1 cursor-pointer hover:bg-gray-800 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemClick?.(item);
                        }}
                        title={`${item.title} - ${item.project}`}
                      >
                        <div 
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            item.color.includes('bg-') 
                              ? item.color.replace('text-white', '') 
                              : `bg-${item.color.replace('text-white', '')}`
                          }`}
                        ></div>
                        <span className="truncate">{displayText}</span>
                      </div>
                    );
                  } else {
                    // Display as colored bar for schedules
                    return (
                      <div 
                        key={`${item.id}-${idx}`}
                        className={cn(
                          "text-xs mb-1 p-1 rounded truncate cursor-pointer",
                          statusColor,
                          "hover:opacity-90 transition-opacity"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemClick?.(item);
                        }}
                        title={`${item.title} - ${item.bay || ''} - ${item.project}`}
                      >
                        {displayText}
                      </div>
                    );
                  }
                })}
              </div>
              
              {dateItems.length > 2 && (
                <div className="absolute bottom-1 right-1 text-xs text-gray-400">
                  {dateItems.length} items
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
