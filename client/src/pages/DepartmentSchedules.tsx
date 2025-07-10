import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Factory, PaintBucket, Package, Wrench } from 'lucide-react';
import ResizableBaySchedule from '@/components/ResizableBaySchedule';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
// Removed unused import

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

  // Calculate date range for current view (start from current week for better phase alignment)
  const dateRange = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start from current week
    const end = endOfWeek(addWeeks(currentWeek, 16), { weekStartsOn: 1 }); // Show 16 weeks in future
    return { start, end };
  }, [currentWeek]);

  // Create multiple virtual bays (rows) for the department/location combination
  const virtualBays = useMemo(() => {
    const deptName = selectedDepartment.toUpperCase();
    const locationName = selectedLocation === 'columbia-falls' ? 'Columbia Falls' : 'Libby';
    const rowCount = selectedLocation === 'columbia-falls' ? 30 : 20;
    
    const bays: ManufacturingBay[] = [];
    for (let row = 0; row < rowCount; row++) {
      bays.push({
        id: 10000 + selectedDepartment.charCodeAt(0) * 100 + (selectedLocation === 'libby' ? 1000 : 0) + row,
        bayNumber: row + 1,
        name: `${deptName} Row ${row + 1}`,
        status: 'active' as const,
        location: selectedLocation,
        team: `${deptName} Team - ${locationName}`,
        description: null,
        capacityTonn: null,
        maxWidth: null,
        maxHeight: null,
        maxLength: null,
        teamId: null,
        createdAt: null,
        updatedAt: null,
        // Only show capacity on first row to avoid confusion
        assemblyStaffCount: row === 0 ? 4 : null,
        electricalStaffCount: row === 0 ? 2 : null,
        hoursPerPersonPerWeek: row === 0 ? 40 : null
      } as ManufacturingBay);
    }
    
    return bays;
  }, [selectedDepartment, selectedLocation]);

  // Get all schedules for the selected location's bays
  const departmentSchedules = useMemo(() => {
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

    // Determine row count based on location
    const maxRows = selectedLocation === 'columbia-falls' ? 30 : 20;

    // Get projects with their FAB start dates for sorting
    const schedulesWithFabDates = locationSchedules.map(schedule => {
      const project = projects.find(p => p.id === schedule.projectId);
      return {
        schedule,
        project,
        fabStartDate: project?.fabricationStart ? new Date(project.fabricationStart) : null
      };
    });
    
    // Sort by FAB start date (earliest first)
    const sortedByFab = schedulesWithFabDates.sort((a, b) => {
      if (!a.fabStartDate && !b.fabStartDate) return 0;
      if (!a.fabStartDate) return 1;
      if (!b.fabStartDate) return -1;
      return a.fabStartDate.getTime() - b.fabStartDate.getTime();
    });
    
    // Distribute schedules across the virtual bays in sorted order
    return sortedByFab.map((item, index) => {
      // Make sure we don't exceed available rows
      if (index >= virtualBays.length) {
        console.warn(`Not enough rows for project ${item.project?.projectNumber}. Need ${index + 1} rows but only have ${virtualBays.length}`);
        return null;
      }
      const targetBay = virtualBays[index]; // Each project gets its own row
      console.log(`Assigning project ${item.project?.projectNumber} (FAB: ${item.fabStartDate?.toISOString()}) to row ${index + 1}`);
      return {
        ...item.schedule,
        bayId: targetBay.id, // Map to the specific row's bay
        row: 0 // Always row 0 since each bay is now a single row
      };
    }).filter(Boolean); // Remove any null entries
  }, [schedules, bays, selectedLocation, virtualBays]);

  // Count projects that have the specific phase we're viewing
  const activeProjectCount = useMemo(() => {
    const projectIds = new Set(departmentSchedules.map(s => s.projectId));
    const scheduledProjects = projects.filter(p => projectIds.has(p.id));
    
    // Count projects that have dates for the selected phase
    return scheduledProjects.filter(project => {
      switch (selectedDepartment) {
        case 'mech':
          return project.mechShop && project.productionStart; // MECH is 30 days before production
        case 'fab':
          return project.fabricationStart;
        case 'paint':
          return project.paintStart;
        case 'wrap':
          return project.wrapDate;
        default:
          return false;
      }
    }).length;
  }, [departmentSchedules, projects, selectedDepartment]);

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
                          {location === selectedLocation && dept === selectedDepartment ? activeProjectCount : 0} Active Projects
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="border rounded-lg overflow-auto department-schedule-container" style={{ 
                        maxHeight: '80vh', 
                        minHeight: location === 'columbia-falls' ? '600px' : '400px' 
                      }}>
                        <ResizableBaySchedule
                          schedules={departmentSchedules}
                          projects={projects}
                          bays={virtualBays} // Multiple virtual bays for rows
                          onScheduleChange={async () => {}} // Read-only
                          onScheduleCreate={async () => {}} // Read-only
                          onScheduleDelete={async () => {}} // Read-only
                          dateRange={dateRange}
                          viewMode={viewMode}
                          enableFinancialImpact={false}
                          isSandboxMode={true} // Read-only mode
                          departmentPhaseFilter={selectedDepartment} // Filter to show only this phase
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