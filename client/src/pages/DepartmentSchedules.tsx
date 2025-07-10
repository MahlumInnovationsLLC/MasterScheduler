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
    queryKey: ['/api/manufacturing-bays']
  });

  // Calculate date range for current view (include past weeks)
  const dateRange = useMemo(() => {
    const start = startOfWeek(subWeeks(currentWeek, 4), { weekStartsOn: 1 }); // Show 4 weeks in the past
    const end = endOfWeek(addWeeks(currentWeek, 12), { weekStartsOn: 1 }); // Show 12 weeks in future
    return { start, end };
  }, [currentWeek]);

  // Get actual bays for the selected location
  const locationBays = useMemo(() => {
    console.log('Available bays:', bays.map(b => ({ id: b.id, name: b.name, team: b.team })));
    
    return bays.filter(bay => {
      const bayTeam = bay.team?.toLowerCase() || '';
      const bayName = bay.name?.toLowerCase() || '';
      
      if (selectedLocation === 'columbia-falls') {
        // Columbia Falls: exclude teams/bays with 'libby' in the name, include everything else
        const isLibbyRelated = bayTeam.includes('libby') || bayName.includes('libby') || bayName.includes('container');
        return !isLibbyRelated;
      } else {
        // Libby: include only teams/bays with 'libby' in the name
        return bayTeam.includes('libby') || bayName.includes('libby') || bayName.includes('container');
      }
    });
  }, [bays, selectedLocation]);

  // Use existing bay schedules and let ResizableBaySchedule handle phase filtering  
  const departmentSchedules = useMemo(() => {
    const locationBayIds = locationBays.map(b => b.id);

    // Filter schedules by location only - ResizableBaySchedule will handle phase display
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

    return locationSchedules;
  }, [schedules, locationBays, selectedLocation]);

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
                          {location === selectedLocation ? departmentSchedules.length : 0} Active Projects
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
                          departmentPhaseFilter={selectedDepartment as any} // Filter to show only this phase
                          hideUnassignedProjects={true} // Hide sidebar in Department view
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