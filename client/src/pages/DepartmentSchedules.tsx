import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Factory, PaintBucket, Package, Wrench } from 'lucide-react';
import DepartmentGanttChart from '@/components/DepartmentGanttChart';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

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
  const [scrollToTodayFunction, setScrollToTodayFunction] = useState<(() => void) | null>(null);

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

  // Calculate date range for current view (extend from beginning of year to 2030)
  const dateRange = useMemo(() => {
    const yearStart = new Date(2025, 0, 1); // Start from January 1, 2025
    const start = startOfWeek(yearStart, { weekStartsOn: 1 }); // Align to week start
    const yearEnd = new Date(2030, 11, 31); // End at December 31, 2030
    const end = endOfWeek(yearEnd, { weekStartsOn: 1 }); // Align to week end
    return { start, end };
  }, []);

  // Filter projects by location
  const locationProjects = useMemo(() => {
    // Get all bays for the selected location
    const locationBays = bays.filter(bay => {
      const bayTeam = bay.team?.toLowerCase() || '';
      const bayName = bay.name?.toLowerCase() || '';
      
      if (selectedLocation === 'columbia-falls') {
        const isLibbyRelated = bayTeam.includes('libby') || bayName.includes('libby') || bayName.includes('container');
        return !isLibbyRelated;
      } else {
        return bayTeam.includes('libby') || bayName.includes('libby') || bayName.includes('container');
      }
    });

    const locationBayIds = locationBays.map(b => b.id);
    
    // Get all schedules for these bays
    const locationSchedules = schedules.filter(schedule => 
      locationBayIds.includes(schedule.bayId)
    );
    
    // Get unique project IDs
    const projectIds = new Set(locationSchedules.map(s => s.projectId));
    
    // Return projects that are scheduled in this location
    return projects.filter(p => projectIds.has(p.id));
  }, [projects, schedules, bays, selectedLocation]);

  // Count projects that have the specific phase we're viewing
  const activeProjectCount = useMemo(() => {
    // Count projects that have dates for the selected phase
    return locationProjects.filter(project => {
      switch (selectedDepartment) {
        case 'mech':
          return project.mechShop && project.productionStart; // MECH is 30 days before production
        case 'fab':
          return project.fabricationStart && project.productionStart;
        case 'paint':
          return project.paintStart && project.productionStart;
        case 'wrap':
          return project.wrapDate && project.qcStartDate;
        default:
          return false;
      }
    }).length;
  }, [locationProjects, selectedDepartment]);

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
        <Button
          variant="outline" 
          size="sm"
          onClick={() => {
            setCurrentWeek(new Date());
            if (scrollToTodayFunction) {
              scrollToTodayFunction();
            }
          }}
          className="ml-2"
        >
          Today
        </Button>
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
                          {location === selectedLocation && dept === selectedDepartment ? activeProjectCount : 0} Active Projects
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {location === selectedLocation && dept === selectedDepartment && (
                        <DepartmentGanttChart
                          projects={locationProjects}
                          department={selectedDepartment}
                          dateRange={dateRange}
                          viewMode={viewMode}
                          onTodayButtonRef={setScrollToTodayFunction}
                        />
                      )}
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