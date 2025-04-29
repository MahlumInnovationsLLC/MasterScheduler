import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

export type ScheduleItem = {
  id: string | number;
  title: string;
  date: Date | string;
  project: string;
  status: string;
  color: string;
};

interface CalendarScheduleProps {
  items: ScheduleItem[];
  onDateClick?: (date: Date) => void;
  onItemClick?: (item: ScheduleItem) => void;
}

export function CalendarSchedule({ items, onDateClick, onItemClick }: CalendarScheduleProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  const today = new Date();
  
  const getItemsForDate = (date: Date) => {
    return items.filter(item => {
      const itemDate = new Date(item.date);
      return isSameDay(itemDate, date);
    });
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
        {daysInMonth.map((date, i) => {
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
                {dateItems.map((item, idx) => (
                  <div 
                    key={`${item.id}-${idx}`}
                    className={cn(
                      "text-xs mb-1 p-1 rounded truncate cursor-pointer",
                      item.color
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick?.(item);
                    }}
                  >
                    {item.title}
                  </div>
                ))}
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
