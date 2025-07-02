import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Building2, 
  CheckSquare, 
  Calendar, 
  Users,
  Plus,
  Filter,
  FileText,
  Edit,
  MoreHorizontal,
  Download
} from 'lucide-react';
import { ManufacturingBayLayout } from '@/components/ManufacturingBayLayout';

import { Button } from '@/components/ui/button';
import { ManufacturingCard } from '@/components/ManufacturingCard';
import { GanttChart, GanttItem } from '@/components/ui/gantt-chart';
import { DataTable } from '@/components/ui/data-table';
import { ProgressBadge } from '@/components/ui/progress-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, checkScheduleConflict } from '@/lib/utils';
import { AIInsightsModal } from '@/components/AIInsightsModal';
import { addDays, subDays, format, addMonths } from 'date-fns';
import { ModuleHelpButton } from "@/components/ModuleHelpButton";
import { manufacturingHelpContent } from "@/data/moduleHelpContent";

const ManufacturingBay = () => {
  const [startDate, setStartDate] = useState(subDays(new Date(), 3));
  const [endDate, setEndDate] = useState(addDays(new Date(), 26));
  
  const { data: manufacturingBays, isLoading: isLoadingBays } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
  });

  const { data: manufacturingSchedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Calculate utilization stats
  const manufacturingStats = React.useMemo(() => {
    if (!manufacturingSchedules || !manufacturingBays) return null;

    const active = manufacturingSchedules.filter(s => s.status === 'in_progress').length;
    const scheduled = manufacturingSchedules.filter(s => s.status === 'scheduled').length;
    const completed = manufacturingSchedules.filter(s => s.status === 'complete').length;
    const maintenance = manufacturingSchedules.filter(s => s.status === 'maintenance').length;
    
    const totalBays = manufacturingBays.length;
    const activeBays = manufacturingBays.filter(b => b.isActive).length;
    const idleBays = activeBays - active;
    
    // Calculate utilization percentage
    const utilization = Math.round((active / totalBays) * 100);

    return {
      active,
      scheduled,
      completed,
      maintenance,
      totalBays,
      activeBays,
      idleBays,
      utilization,
      total: active + scheduled
    };
  }, [manufacturingSchedules, manufacturingBays]);
  
  // Prepare data for Gantt chart
  const ganttData = React.useMemo(() => {
    if (!manufacturingBays || !manufacturingSchedules || !projects) return [];
    
    return manufacturingBays.map(bay => {
      const baySchedules = manufacturingSchedules.filter(s => s.bayId === bay.id);
      
      const items = baySchedules.map(schedule => {
        const project = projects.find(p => p.id === schedule.projectId);
        
        // Define color based on status
        let color = '';
        switch (schedule.status) {
          case 'in_progress':
            color = 'bg-primary';
            break;
          case 'scheduled':
            color = 'bg-accent';
            break;
          case 'maintenance':
            color = 'bg-gray-600';
            break;
          case 'complete':
            color = 'bg-success';
            break;
          default:
            color = 'bg-primary';
        }
        
        return {
          id: schedule.id,
          title: project ? project.name : `Project #${schedule.projectId}`,
          projectNumber: project ? project.projectNumber : '',
          startDate: new Date(schedule.startDate),
          endDate: new Date(schedule.endDate),
          color,
          status: schedule.status
        };
      });
      
      return {
        id: bay.id,
        name: `Bay ${bay.bayNumber}`,
        items
      };
    });
  }, [manufacturingBays, manufacturingSchedules, projects]);

  // Table columns for upcoming schedules
  const columns = [
    {
      accessorKey: 'projectId',
      header: 'Project',
      cell: ({ row }) => {
        const project = projects?.find(p => p.id === row.original.projectId);
        if (!project) return <div>-</div>;
        
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8 rounded bg-primary flex items-center justify-center text-white font-medium">
              {project.projectNumber.slice(-2)}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-white">{project.projectNumber}</div>
              <div className="text-xs text-gray-400">{project.name}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'bayId',
      header: 'Bay Preference',
      cell: ({ row }) => {
        const bay = manufacturingBays?.find(b => b.id === row.original.bayId);
        return <div className="text-sm">Bay {bay?.bayNumber || row.original.bayId}</div>;
      },
    },
    {
      accessorKey: 'startDate',
      header: 'Start Date',
      cell: ({ row }) => <div className="text-sm">{formatDate(row.original.startDate)}</div>,
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => {
        const startDate = new Date(row.original.startDate);
        const endDate = new Date(row.original.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return <div className="text-sm">{days} days</div>;
      },
    },
    {
      accessorKey: 'equipment',
      header: 'Equipment',
      cell: ({ row }) => <div className="text-sm">{row.original.equipment || 'Standard Equipment'}</div>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <ProgressBadge status={row.original.status === 'in_progress' ? 'In Progress' : row.original.status === 'scheduled' ? 'Scheduled' : 'Unscheduled'} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-right space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Calendar className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit Schedule</DropdownMenuItem>
              <DropdownMenuItem>Mark as Complete</DropdownMenuItem>
              <DropdownMenuItem>Reschedule</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (isLoadingBays || isLoadingSchedules || isLoadingProjects) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-sans font-bold mb-6">Manufacturing Bay Schedule</h1>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-darkCard h-28 rounded-xl border border-gray-800"></div>
            ))}
          </div>
          <div className="bg-darkCard h-96 rounded-xl border border-gray-800"></div>
          <div className="bg-darkCard h-72 rounded-xl border border-gray-800"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-sans font-bold">Manufacturing Bay Schedule</h1>
          <p className="text-gray-400 text-sm">Manage and track production schedules and bay assignments</p>
        </div>
        
        <div className="flex items-center gap-3">
          <ModuleHelpButton 
            moduleId="manufacturing" 
            helpContent={manufacturingHelpContent}
          />
          <AIInsightsModal />
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Schedule Production
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ManufacturingCard 
          title="Bay Utilization"
          value={manufacturingStats?.utilization || 0}
          type="utilization"
          change={{ 
            value: "7% from last month", 
            isPositive: false 
          }}
        />
        
        <ManufacturingCard 
          title="Bay Status"
          value=""
          type="status"
          stats={[
            { label: "Active", value: manufacturingStats?.active || 0 },
            { label: "Idle", value: manufacturingStats?.idleBays || 0 },
            { label: "Maintenance", value: manufacturingStats?.maintenance || 0 },
            { label: "Issues", value: 0 }
          ]}
        />
        
        <ManufacturingCard 
          title="Production Schedule"
          value={manufacturingStats?.total || 0}
          type="schedule"
          calendar={{
            months: ["Apr", "May", "Jun", "Jul"],
            values: ["success", "success", "warning", "gray"]
          }}
        />
        
        <ManufacturingCard 
          title="Resource Allocation"
          value=""
          type="resources"
          stats={[
            { label: "Staff Utilization", value: "92%" },
            { label: "Equipment", value: "78%" },
            { label: "Materials", value: "65%" }
          ]}
        />
      </div>
      
      {/* Drag & Drop Bay Schedule Layout */}
      <div className="mb-6">
        <ManufacturingBayLayout 
          schedules={manufacturingSchedules || []}
          projects={projects || []}
          bays={manufacturingBays || []}
          onScheduleChange={async (scheduleId, newBayId, newStartDate, newEndDate) => {
            try {
              // Find the bay to get team information
              const bay = manufacturingBays?.find(b => b.id === newBayId);
              const teamName = bay?.team || bay?.name;
              
              // Find the schedule to get project ID
              const schedule = manufacturingSchedules?.find(s => s.id === scheduleId);
              const projectId = schedule?.projectId;
              
              const response = await fetch(`/api/manufacturing-schedules/${scheduleId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  bayId: newBayId,
                  startDate: newStartDate,
                  endDate: newEndDate
                }),
              });
              
              if (!response.ok) {
                throw new Error('Failed to update schedule');
              }
              
              // Auto-update project team when moved to a bay
              if (projectId && teamName) {
                try {
                  await fetch(`/api/projects/${projectId}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      team: teamName
                    }),
                  });
                } catch (teamUpdateError) {
                  console.warn('Failed to auto-update project team:', teamUpdateError);
                }
              }
              
              // Refetch manufacturing schedules
              window.location.reload(); // Simple way to refresh data
            } catch (error) {
              console.error('Error updating schedule:', error);
              throw error;
            }
          }}
          onScheduleCreate={async (projectId, bayId, startDate, endDate, row) => {
            try {
              console.log(`Creating new schedule with EXACT row placement: Bay=${bayId}, Row=${row}, Project=${projectId}`);
              
              // 🚨 MAY 17 2025 - CRITICAL EMERGENCY FIX 🚨
              // ALWAYS prioritize the explicit row parameter passed from the drop handler
              // This ensures pixel-perfect placement with projects appearing at exact drop position
              
              // Check multiple sources for the row value (in order of priority)
              const forcedRowAttr = document.body.getAttribute('data-forced-row-index');
              const absoluteRowAttr = document.body.getAttribute('data-absolute-row-index');
              const exactRowAttr = document.body.getAttribute('data-exact-row');
              const computedRowAttr = document.body.getAttribute('data-computed-row-index');
              
              // Always use the row parameter if defined (highest priority)
              // Fall back to various DOM attributes in priority order
              const rowValue = row !== undefined ? row : 
                  forcedRowAttr !== null ? parseInt(forcedRowAttr) :
                  absoluteRowAttr !== null ? parseInt(absoluteRowAttr) :
                  exactRowAttr !== null ? parseInt(exactRowAttr) :
                  computedRowAttr !== null ? parseInt(computedRowAttr) :
                  0; // Last resort default
              
              console.log(`🚨 CRITICAL ROW OVERRIDE: Using EXACT row position ${rowValue}`);
              console.log(`Row sources: parameter=${row}, forced=${forcedRowAttr}, absolute=${absoluteRowAttr}, exact=${exactRowAttr}, computed=${computedRowAttr}`);
              
              // 🚨 MAY 17 2025 - CRITICAL ADDITIONAL FIX 🚨
              // Add debug logging to show the EXACT data being sent to the API
              console.log(`🚨 SENDING TO API: projectId=${projectId}, bayId=${bayId}, row=${rowValue}`);
              
              // Find the bay to get team information for auto-update
              const bay = manufacturingBays?.find(b => b.id === bayId);
              const teamName = bay?.team || bay?.name;
              
              // Enhanced API call with redundant row parameters for maximum reliability
              const response = await fetch('/api/manufacturing-schedules', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  projectId,
                  bayId,
                  startDate,
                  endDate,
                  status: 'scheduled',
                  row: rowValue, // Primary row parameter
                  rowIndex: rowValue, // Redundant for maximum compatibility
                  forcedRowIndex: rowValue, // Highest priority signal
                  forceExactRowPlacement: true // Signal no auto-adjustment
                }),
              });
              
              if (!response.ok) {
                throw new Error('Failed to create schedule');
              }
              
              // Auto-update project team when placed in a bay
              if (projectId && teamName) {
                try {
                  await fetch(`/api/projects/${projectId}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      team: teamName
                    }),
                  });
                } catch (teamUpdateError) {
                  console.warn('Failed to auto-update project team:', teamUpdateError);
                }
              }
              
              // Refetch manufacturing schedules
              window.location.reload(); // Simple way to refresh data
            } catch (error) {
              console.error('Error creating schedule:', error);
              throw error;
            }
          }}
          onUpdateBay={async (bayId, name, description, team) => {
            try {
              const response = await fetch(`/api/manufacturing-bays/${bayId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name,
                  description,
                  team
                }),
              });
              
              if (!response.ok) {
                throw new Error('Failed to update bay information');
              }
              
              // Refetch manufacturing bays
              window.location.reload(); // Simple way to refresh data
            } catch (error) {
              console.error('Error updating bay:', error);
              throw error;
            }
          }}
        />
      </div>
      
      {/* Traditional Gantt Chart View (Optional) */}
      <div className="bg-darkCard rounded-xl border border-gray-800 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="font-bold text-lg">Traditional Gantt View</h2>
          <div className="flex items-center gap-3">
            <select className="bg-darkInput text-gray-300 border-none rounded-lg px-4 py-2 text-sm appearance-none pr-8 relative focus:ring-1 focus:ring-primary">
              <option>All Bays</option>
              {manufacturingBays.map(bay => (
                <option key={bay.id} value={bay.id}>Bay {bay.bayNumber}</option>
              ))}
            </select>
            <select 
              className="bg-darkInput text-gray-300 border-none rounded-lg px-4 py-2 text-sm appearance-none pr-8 relative focus:ring-1 focus:ring-primary"
              value={format(startDate, 'MMMM yyyy')}
              onChange={(e) => {
                const [month, year] = e.target.value.split(' ');
                const newStartDate = new Date(parseInt(year), new Date(Date.parse(`${month} 1, 2000`)).getMonth(), 1);
                setStartDate(newStartDate);
                setEndDate(addDays(addMonths(newStartDate, 1), -1));
              }}
            >
              {[0, 1, 2, 3, 4, 5].map(offset => {
                const date = addMonths(new Date(), offset);
                return (
                  <option key={offset} value={format(date, 'MMMM yyyy')}>
                    {format(date, 'MMMM yyyy')}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        
        <GanttChart
          startDate={startDate}
          endDate={endDate}
          rows={ganttData}
        />
        
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing schedule for <span className="font-medium">{format(startDate, 'MMMM yyyy')}</span>
            </div>
            <div className="flex gap-4">
              {projects?.slice(0, 6).map((project, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${
                    idx === 0 ? 'bg-primary' :
                    idx === 1 ? 'bg-warning' :
                    idx === 2 ? 'bg-secondary' :
                    idx === 3 ? 'bg-success' :
                    idx === 4 ? 'bg-danger' :
                    'bg-accent'
                  }`}></div>
                  <span className="text-sm">{project.projectNumber}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Upcoming Productions Table */}
      <div className="bg-darkCard rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-bold text-lg">Upcoming Production Assignments</h2>
        </div>
        
        <DataTable
          columns={columns}
          data={(manufacturingSchedules || [])
            .filter(s => s.status === 'scheduled' || new Date(s.startDate) > new Date())
            .slice(0, 5)}
          showPagination={false}
        />
      </div>
    </div>
  );
};

export default ManufacturingBay;
