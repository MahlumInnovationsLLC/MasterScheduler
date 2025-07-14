import React, { useState, useEffect } from 'react';
import { addDays, format, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { safeFilter } from '@/lib/array-utils';

export type GanttItem = {
  id: string | number;
  title: string;
  startDate: Date | string;
  endDate: Date | string;
  color: string;
  status: string;
  projectNumber?: string;
};

type GanttRowProps = {
  label: string;
  items: GanttItem[];
  days: Date[];
  today: Date;
};

interface GanttChartProps {
  startDate: Date;
  endDate: Date;
  rows: { 
    id: string | number;
    name: string;
    items: GanttItem[];
  }[];
  onItemClick?: (item: GanttItem) => void;
}

const GanttRow = ({ label, items, days, today }: GanttRowProps) => {
  return (
    <div className="gantt-row">
      <div className="gantt-cell font-medium">{label}</div>
      {days.map((day, dayIndex) => {
        const isToday = isSameDay(day, today);
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        
        const itemsForCell = safeFilter(items, item => {
          const itemStart = new Date(item.startDate);
          const itemEnd = new Date(item.endDate);
          return isWithinInterval(day, { start: itemStart, end: itemEnd });
        }, 'GanttRow.itemsForCell');

        return (
          <div 
            key={dayIndex} 
            className={cn(
              "gantt-cell relative", 
              isToday ? "bg-primary bg-opacity-5" : isWeekend ? "bg-gray-900" : ""
            )}
          >
            {itemsForCell.map((item, idx) => {
              const itemStart = new Date(item.startDate);
              const itemEnd = new Date(item.endDate);
              
              // Check if this is the first day of the item
              const isFirstDay = isSameDay(day, itemStart);
              if (!isFirstDay) return null;
              
              // Calculate the span based on the difference between start and end dates
              const spanDays = Math.max(1, Math.ceil((itemEnd.getTime() - itemStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
              
              return (
                <div 
                  key={idx} 
                  className={cn(
                    "absolute inset-0 m-1 rounded px-2 flex items-center text-xs text-white z-10 cursor-pointer",
                    `${item.color}`
                  )}
                  style={{ 
                    gridColumn: `span ${spanDays}`, 
                    zIndex: 10,
                    width: `calc(${spanDays * 100}% - 8px)`,
                  }}
                >
                  {item.projectNumber ? `${item.projectNumber}: ` : ''}
                  {item.title} ({format(itemStart, 'MMM d')}-{format(itemEnd, 'MMM d')})
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export const GanttChart = ({ startDate, endDate, rows, onItemClick }: GanttChartProps) => {
  const [days, setDays] = useState<Date[]>([]);
  const today = new Date();
  
  useEffect(() => {
    // Generate array of days between start and end dates
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    setDays(dateRange);
  }, [startDate, endDate]);
  
  return (
    <div className="overflow-x-auto">
      <div className="p-4">
        <div className="gantt-chart text-sm">
          {/* Header Row with dates */}
          <div className="gantt-row font-medium">
            <div className="gantt-cell">Bay / Date</div>
            {days.map((day, idx) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isToday = isSameDay(day, today);
              
              return (
                <div 
                  key={idx} 
                  className={cn(
                    "gantt-cell text-center",
                    isWeekend ? "bg-gray-900" : "",
                    isToday ? "bg-primary bg-opacity-5" : ""
                  )}
                >
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>
          
          {/* Data rows */}
          {rows.map((row) => (
            <GanttRow 
              key={row.id} 
              label={row.name} 
              items={row.items} 
              days={days} 
              today={today} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};
