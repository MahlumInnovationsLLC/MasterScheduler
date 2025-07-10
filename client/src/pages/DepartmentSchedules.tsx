import React, { useState, useMemo } from 'react';
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

  // Calculate date range for current view
  const dateRange = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(addWeeks(currentWeek, 12), { weekStartsOn: 1 }); // Show 12 weeks
    return { start, end };
  }, [currentWeek]);

  // Filter schedules based on selected department and location
  const filteredSchedules = useMemo(() => {
    // Get bays for selected location
    const locationBays = bays.filter(bay => {
      const bayLocation = bay.location?.toLowerCase() || '';
      if (selectedLocation === 'columbia-falls') {
        return bayLocation.includes('columbia') || !bayLocation.includes('libby');
      }
      return bayLocation.includes('libby');
    });
    const locationBayIds = locationBays.map(b => b.id);

    // Filter schedules by location
    const locationSchedules = schedules.filter(schedule => 
      locationBayIds.includes(schedule.bayId)
    );

    // Now filter by department phase
    return locationSchedules.filter(schedule => {
      const project = projects.find(p => p.id === schedule.projectId);
      if (!project) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate phase dates using the schedule
      const phaseDates = calculatePhaseDates(schedule as any, project as any);

      // Check if project is currently in the selected department phase
      switch (selectedDepartment) {
        case 'mech':
          // MECH shop phase: 30 working days before FAB start
          if (!project.mechShop) return false;
          const mechDate = new Date(project.mechShop);
          const fabStart = project.fabricationStart ? new Date(project.fabricationStart) : phaseDates.fab.start;
          // Project is in MECH phase if today is between MECH start and FAB start
          return today >= mechDate && today < fabStart;

        case 'fab':
          // FAB phase: between FAB start and PAINT start
          return today >= phaseDates.fab.start && today < phaseDates.paint.start;

        case 'paint':
          // PAINT phase: between PAINT start and PRODUCTION start
          return today >= phaseDates.paint.start && today < phaseDates.production.start;

        case 'wrap':
          // WRAP phase is during paint phase
          // If project has specific wrapDate, use that; otherwise same as paint
          if (project.wrapDate) {
            const wrapDate = new Date(project.wrapDate);
            return today >= wrapDate && today < phaseDates.production.start;
          }
          // Default to paint phase if no specific wrap date
          return today >= phaseDates.paint.start && today < phaseDates.production.start;

        default:
          return false;
      }
    });
  }, [schedules, projects, bays, selectedDepartment, selectedLocation]);

  // Create a virtual bay for the department view
  const virtualBay = useMemo(() => {
    const deptName = selectedDepartment.toUpperCase();
    const locationName = selectedLocation === 'columbia-falls' ? 'Columbia Falls' : 'Libby';
    return {
      id: 99999, // Virtual ID
      name: `${deptName} - ${locationName}`,
      bayNumber: 1,
      status: 'active' as const,
      location: locationName,
      team: `${deptName} Department`,
      capacityTonn: null,
      maxWidth: null,
      maxHeight: null,
      maxLength: null,
      teamId: null,
      createdAt: null,
      updatedAt: null
    };
  }, [selectedDepartment, selectedLocation]);

  // Map filtered schedules to the virtual bay
  const departmentSchedules = useMemo(() => {
    return filteredSchedules.map((schedule, index) => ({
      ...schedule,
      bayId: virtualBay.id,
      row: Math.floor(index / 4) // Create rows with up to 4 projects each
    }));
  }, [filteredSchedules, virtualBay]);

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
                      <div className="border rounded-lg overflow-hidden">
                        <ResizableBaySchedule
                          schedules={departmentSchedules}
                          projects={projects}
                          bays={[virtualBay]}
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