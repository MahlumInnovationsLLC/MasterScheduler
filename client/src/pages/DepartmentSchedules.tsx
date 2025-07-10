import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Factory, PaintBucket, Package, Wrench } from 'lucide-react';
import ResizableBaySchedule from '@/components/ResizableBaySchedule';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { calculatePhaseDates } from '@shared/utils/bay-utilization';

interface Project {
  id: number;
  projectNumber: string;
  name: string;
  status: string;
  mechShop?: string | null;
  fabricationStart?: string | null;
  paintStart?: string | null;
  wrapDate?: string | null;
  productionStart?: string | null;
  assemblyStart?: string | null;
  itStart?: string | null;
  ntcTestingDate?: string | null;
  qcStartDate?: string | null;
  shipDate?: string | null;
  totalHours?: number;
  fabPercentage?: string;
  paintPercentage?: string;
  productionPercentage?: string;
  itPercentage?: string;
  ntcPercentage?: string;
  qcPercentage?: string;
}

interface ManufacturingSchedule {
  id: number;
  projectId: number;
  bayId: number;
  startDate: string;
  endDate: string;
  totalHours: number;
  row?: number;
}

interface ManufacturingBay {
  id: number;
  name: string;
  bayNumber: number;
  status: 'active' | 'inactive' | 'maintenance';
  location: string | null;
  team: string | null;
}

type DepartmentPhase = 'mech' | 'fab' | 'paint' | 'wrap';
type Location = 'columbia-falls' | 'libby';

const DepartmentSchedules = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentPhase>('mech');
  const [selectedLocation, setSelectedLocation] = useState<Location>('columbia-falls');
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'quarter'>('week');
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Fetch data
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects']
  });

  const { data: schedules = [] } = useQuery<ManufacturingSchedule[]>({
    queryKey: ['/api/manufacturing-schedules']
  });

  const { data: bays = [] } = useQuery<ManufacturingBay[]>({
    queryKey: ['/api/bays']
  });

  // Calculate date range for current view (include past weeks)
  const dateRange = useMemo(() => {
    const start = startOfWeek(subWeeks(currentWeek, 4), { weekStartsOn: 1 }); // Show 4 weeks in the past
    const end = endOfWeek(addWeeks(currentWeek, 12), { weekStartsOn: 1 }); // Show 12 weeks in future
    return { start, end };
  }, [currentWeek]);

  // Get actual bays for the selected location instead of creating virtual ones
  const locationBays = useMemo(() => {
    // Since bay locations are null, let's use team names and bay names for filtering
    return bays.filter(bay => {
      const bayTeam = bay.team?.toLowerCase() || '';
      const bayName = bay.name?.toLowerCase() || '';
      
      if (selectedLocation === 'columbia-falls') {
        // Columbia Falls: exclude teams/bays with 'libby' in the name, include everything else
        return !bayTeam.includes('libby') && !bayName.includes('libby') && !bayName.includes('container') && !bayName.includes('libby mt');
      } else {
        // Libby: include only teams/bays with 'libby' in the name
        return bayTeam.includes('libby') || bayName.includes('libby') || bayName.includes('libby mt');
      }
    });
  }, [bays, selectedLocation]);

  // Transform schedules to show only the selected department phase
  const departmentSchedules = useMemo(() => {
    const locationBayIds = locationBays.map(b => b.id);

    // Filter schedules by location
    const locationSchedules = schedules.filter(schedule => 
      locationBayIds.includes(schedule.bayId)
    );

    console.log(`Department Schedules Debug:`, {
      selectedDepartment,
      selectedLocation,
      locationBays: locationBays.length,
      locationSchedules: locationSchedules.length,
      totalSchedules: schedules.length
    });

    // Transform schedules to show only the selected phase
    const transformedSchedules: ManufacturingSchedule[] = [];
    
    locationSchedules.forEach((schedule) => {
      const project = projects.find(p => p.id === schedule.projectId);
      if (!project) return;

      // Calculate phase dates using the schedule
      const phaseDates = calculatePhaseDates(schedule as any, project as any);

      let phaseStart: Date | null = null;
      let phaseEnd: Date | null = null;

      switch (selectedDepartment) {
        case 'mech':
          // MECH shop: 30 working days before production start
          if (project.productionStart || phaseDates.production.start) {
            const prodStart = project.productionStart ? new Date(project.productionStart) : phaseDates.production.start;
            // Calculate 30 working days before production (approx 42 calendar days)
            phaseStart = new Date(prodStart);
            phaseStart.setDate(phaseStart.getDate() - 42);
            phaseEnd = new Date(phaseStart);
            phaseEnd.setDate(phaseEnd.getDate() + 30); // MECH phase lasts 30 days
          }
          break;

        case 'fab':
          phaseStart = phaseDates.fab.start;
          phaseEnd = phaseDates.fab.end;
          break;

        case 'paint':
          phaseStart = phaseDates.paint.start;
          phaseEnd = phaseDates.paint.end;
          break;

        case 'wrap':
          // Wrap is during paint phase
          phaseStart = phaseDates.paint.start;
          phaseEnd = phaseDates.paint.end;
          break;
      }

      if (phaseStart && phaseEnd) {
        // Create a schedule object that preserves the original bay and row information
        const transformedSchedule: any = {
          ...schedule,
          id: schedule.id + 10000 * (selectedDepartment === 'mech' ? 1 : selectedDepartment === 'fab' ? 2 : selectedDepartment === 'paint' ? 3 : 4),
          startDate: phaseStart.toISOString(),
          endDate: phaseEnd.toISOString(),
          // Keep original bay ID and row to maintain positioning
          bayId: schedule.bayId,
          row: schedule.row || 0
        };

        // Override color for MECH shop to be orange
        if (selectedDepartment === 'mech') {
          transformedSchedule.color = '#f97316'; // Orange color for MECH shop
        }

        transformedSchedules.push(transformedSchedule);
      }
    });

    console.log(`Transformed ${transformedSchedules.length} schedules for ${selectedDepartment} department`);
    return transformedSchedules;
  }, [schedules, projects, locationBays, selectedDepartment, selectedLocation]);

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const getDepartmentIcon = (dept: DepartmentPhase) => {
    switch (dept) {
      case 'mech': return <Wrench className="w-4 h-4" />;
      case 'fab': return <Factory className="w-4 h-4" />;
      case 'paint': return <PaintBucket className="w-4 h-4" />;
      case 'wrap': return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Department Schedules</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousWeek}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium">
              Week of {format(currentWeek, 'MMM d, yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextWeek}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline" 
              size="sm"
              onClick={() => setCurrentWeek(new Date())}
              className="ml-2"
            >
              Today
            </Button>
          </div>
          <Badge variant="outline" className="text-xs">
            View Mode: {viewMode === 'week' ? 'Weekly' : 'Monthly'}
          </Badge>
        </div>
      </div>

      <Tabs value={selectedDepartment} onValueChange={(v) => setSelectedDepartment(v as DepartmentPhase)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mech" className="flex items-center gap-2">
            {getDepartmentIcon('mech')}
            MECH Shop
          </TabsTrigger>
          <TabsTrigger value="fab" className="flex items-center gap-2">
            {getDepartmentIcon('fab')}
            Fabrication
          </TabsTrigger>
          <TabsTrigger value="paint" className="flex items-center gap-2">
            {getDepartmentIcon('paint')}
            Paint
          </TabsTrigger>
          <TabsTrigger value="wrap" className="flex items-center gap-2">
            {getDepartmentIcon('wrap')}
            Wrap
          </TabsTrigger>
        </TabsList>

        {['mech', 'fab', 'paint', 'wrap'].map((dept) => (
          <TabsContent key={dept} value={dept} className="mt-6">
            <Tabs value={selectedLocation} onValueChange={(v) => setSelectedLocation(v as Location)}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="columbia-falls">Columbia Falls</TabsTrigger>
                <TabsTrigger value="libby">Libby</TabsTrigger>
              </TabsList>

              {['columbia-falls', 'libby'].map((location) => (
                <TabsContent key={location} value={location}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {getDepartmentIcon(dept as DepartmentPhase)}
                          {dept.toUpperCase()} Schedule - {location === 'columbia-falls' ? 'Columbia Falls' : 'Libby'}
                        </span>
                        <Badge variant="secondary">
                          {departmentSchedules.length} Active Projects
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="border rounded-lg overflow-hidden department-schedule-container">
                        <ResizableBaySchedule
                          schedules={departmentSchedules}
                          projects={projects}
                          bays={locationBays}
                          onScheduleChange={async () => {}} // Read-only
                          onScheduleCreate={async () => {}} // Read-only
                          onScheduleDelete={async () => {}} // Read-only
                          dateRange={dateRange}
                          viewMode={viewMode}
                          enableFinancialImpact={false}
                          isSandboxMode={true} // Read-only mode
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default DepartmentSchedules;