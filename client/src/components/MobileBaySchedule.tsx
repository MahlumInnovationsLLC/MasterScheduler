import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Plus, MoreVertical, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileBayScheduleProps {
  schedules: any[];
  projects: any[];
  bays: any[];
  dateRange: { start: Date; end: Date };
  viewMode: 'day' | 'week' | 'month';
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void;
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
}

export function MobileBaySchedule({
  schedules,
  projects,
  bays,
  dateRange,
  viewMode,
  onViewModeChange,
  onDateRangeChange
}: MobileBayScheduleProps) {
  const isMobile = useIsMobile();
  const [selectedBay, setSelectedBay] = useState<number | null>(null);

  if (!isMobile) {
    return null; // Don't render on desktop
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const { start, end } = dateRange;
    let newStart: Date;
    let newEnd: Date;

    if (viewMode === 'day') {
      newStart = addDays(start, direction === 'next' ? 1 : -1);
      newEnd = addDays(end, direction === 'next' ? 1 : -1);
    } else if (viewMode === 'week') {
      newStart = addDays(start, direction === 'next' ? 7 : -7);
      newEnd = addDays(end, direction === 'next' ? 7 : -7);
    } else {
      // month
      newStart = addDays(start, direction === 'next' ? 30 : -30);
      newEnd = addDays(end, direction === 'next' ? 30 : -30);
    }

    onDateRangeChange({ start: newStart, end: newEnd });
  };

  const getSchedulesForBay = (bayId: number) => {
    return schedules.filter(schedule => schedule.bayId === bayId);
  };

  const getProjectDetails = (projectId: number) => {
    return projects.find(p => p.id === projectId);
  };

  const formatDateRange = () => {
    if (viewMode === 'day') {
      return format(dateRange.start, 'MMM dd, yyyy');
    } else if (viewMode === 'week') {
      return `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;
    } else {
      return format(dateRange.start, 'MMMM yyyy');
    }
  };

  return (
    <div className="mobile-bay-schedule">
      {/* Mobile Header Controls */}
      <div className="mobile-timeline-header">
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateDate('prev')}
            className="p-2"
          >
            <ChevronLeft size={16} />
          </Button>
          
          <div className="flex flex-col items-center">
            <span className="text-sm font-medium text-white">{formatDateRange()}</span>
            <span className="text-xs text-gray-400 capitalize">{viewMode} view</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateDate('next')}
            className="p-2"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Mobile View Mode Switcher */}
      <div className="mobile-view-switcher">
        {['day', 'week', 'month'].map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode as any)}
            className={`mobile-view-button ${viewMode === mode ? 'active' : ''}`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Bay Selection for Mobile */}
      <div className="mobile-card">
        <div className="mobile-card-header">Manufacturing Bays</div>
        <div className="space-y-2">
          {bays.map((bay) => {
            const baySchedules = getSchedulesForBay(bay.id);
            const isSelected = selectedBay === bay.id;

            return (
              <div
                key={bay.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-600 bg-gray-700/50'
                }`}
                onClick={() => setSelectedBay(isSelected ? null : bay.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-blue-400" />
                    <span className="font-medium text-white">{bay.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {baySchedules.length} projects
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical size={12} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Plus className="mr-2 h-3 w-3" />
                          Add Project
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Clock className="mr-2 h-3 w-3" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Bay Capacity Bar */}
                <div className="mt-2">
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((baySchedules.length / (bay.capacity || 4)) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{baySchedules.length} / {bay.capacity || 4}</span>
                    <span>{Math.round((baySchedules.length / (bay.capacity || 4)) * 100)}% utilized</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Bay Schedule Details */}
      {selectedBay && (
        <div className="mobile-card">
          <div className="mobile-card-header">
            {bays.find(b => b.id === selectedBay)?.name} Schedule
          </div>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {getSchedulesForBay(selectedBay).map((schedule) => {
                const project = getProjectDetails(schedule.projectId);
                if (!project) return null;

                return (
                  <div
                    key={schedule.id}
                    className="mobile-project-item"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {project.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          #{project.projectNumber}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {format(new Date(schedule.startDate), 'MMM dd')} - {format(new Date(schedule.endDate), 'MMM dd')}
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: project.color || '#3b82f6',
                          borderColor: project.color || '#3b82f6',
                          color: 'white'
                        }}
                      >
                        {schedule.totalHours}h
                      </Badge>
                    </div>

                    {/* Mobile Phase Progress */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Progress</span>
                        <span>{project.percentComplete || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1.5">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${project.percentComplete || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Mobile Phase Indicators */}
                    <div className="mt-2 flex gap-1">
                      {[
                        { name: 'FAB', color: '#ef4444', percent: project.fabPercent || 27 },
                        { name: 'PAINT', color: '#f59e0b', percent: project.paintPercent || 7 },
                        { name: 'PROD', color: '#10b981', percent: project.productionPercent || 60 },
                        { name: 'IT', color: '#6366f1', percent: project.itPercent || 7 },
                        { name: 'QC', color: '#8b5cf6', percent: project.qcPercent || 7 }
                      ].map((phase) => (
                        <div
                          key={phase.name}
                          className="mobile-phase text-white"
                          style={{ 
                            backgroundColor: phase.color,
                            width: `${phase.percent}%`,
                            minWidth: '16px'
                          }}
                        >
                          {phase.percent > 15 ? phase.name : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Mobile Action Bar */}
      <div className="mobile-action-bar">
        <button className="mobile-action-button">
          <Plus size={16} />
          <span>Add Project</span>
        </button>
        <button className="mobile-action-button">
          <Calendar size={16} />
          <span>Calendar</span>
        </button>
        <button className="mobile-action-button">
          <Clock size={16} />
          <span>Timeline</span>
        </button>
      </div>
    </div>
  );
}