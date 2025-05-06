import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Calendar, ArrowLeft, ArrowRight, Filter, PlusCircle, Info } from 'lucide-react';
import { format, addDays, subDays, addWeeks } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ManufacturingCard } from '@/components/ManufacturingCard';
import { AIInsightsModal } from '@/components/AIInsightsModal';
import ResizableBaySchedule from '@/components/ResizableBaySchedule';
import { ManufacturingBay, Project } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

const BaySchedulingPage = () => {
  const { toast } = useToast();
  const [showAddBayDialog, setShowAddBayDialog] = useState(false);
  const [showAddScheduleDialog, setShowAddScheduleDialog] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: addWeeks(new Date(), 4)
  });
  
  // Form states for dialogs
  const [newBay, setNewBay] = useState<Partial<ManufacturingBay>>({
    bayNumber: 0,
    name: '',
    description: '',
    team: 'General',
    staffCount: 1,
    hoursPerPersonPerWeek: 40,
    isActive: true
  });
  
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedBay, setSelectedBay] = useState<number | null>(null);
  const [scheduleTotalHours, setScheduleTotalHours] = useState<number>(40);
  
  // Fetch manufacturing bays, schedules, and projects
  const { data: manufacturingBays, isLoading: isLoadingBays, refetch: refetchBays } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
  });
  
  const { data: manufacturingSchedules, isLoading: isLoadingSchedules, refetch: refetchSchedules } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });
  
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
  });
  
  // Calculate bay utilization and stats
  const manufacturingStats = React.useMemo(() => {
    if (!manufacturingSchedules || !manufacturingBays) return null;

    const active = manufacturingSchedules.filter(s => s.status === 'in_progress').length;
    const scheduled = manufacturingSchedules.filter(s => s.status === 'scheduled').length;
    const completed = manufacturingSchedules.filter(s => s.status === 'complete').length;
    const maintenance = manufacturingSchedules.filter(s => s.status === 'maintenance').length;
    
    const totalBays = manufacturingBays.length;
    const activeBays = manufacturingBays.filter(b => b.isActive).length;
    const idleBays = activeBays - active;
    
    // Calculate total capacity
    let totalCapacity = 0;
    let usedCapacity = 0;
    
    manufacturingBays.forEach(bay => {
      const weeklyCapacity = bay.hoursPerPersonPerWeek * (bay.staffCount || 1);
      totalCapacity += weeklyCapacity;
      
      // Calculate used capacity from schedules
      const baySchedules = manufacturingSchedules.filter(s => s.bayId === bay.id && s.status !== 'complete');
      baySchedules.forEach(schedule => {
        usedCapacity += schedule.totalHours || 40; // Default to 40 hours if not specified
      });
    });
    
    // Calculate utilization percentage
    const capacityUtilization = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;
    const bayUtilization = Math.round((active / totalBays) * 100);

    return {
      active,
      scheduled,
      completed,
      maintenance,
      totalBays,
      activeBays,
      idleBays,
      capacityUtilization,
      bayUtilization,
      totalCapacity,
      usedCapacity,
      total: active + scheduled
    };
  }, [manufacturingSchedules, manufacturingBays]);
  
  // Handlers for schedule management
  const handleScheduleChange = async (
    scheduleId: number, 
    newBayId: number, 
    newStartDate: string, 
    newEndDate: string,
    totalHours?: number
  ) => {
    try {
      const response = await apiRequest(
        'PUT',
        `/api/manufacturing-schedules/${scheduleId}`, 
        {
          bayId: newBayId,
          startDate: newStartDate,
          endDate: newEndDate,
          totalHours: totalHours || 40
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }
      
      // Refetch data
      refetchSchedules();
      return true;
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  };
  
  const handleScheduleCreate = async (
    projectId: number, 
    bayId: number, 
    startDate: string, 
    endDate: string,
    totalHours?: number
  ) => {
    try {
      const response = await apiRequest(
        'POST',
        '/api/manufacturing-schedules',
        {
          projectId,
          bayId,
          startDate,
          endDate,
          totalHours: totalHours || 40,
          status: 'scheduled'
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to create schedule');
      }
      
      // Refetch data
      refetchSchedules();
      return true;
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  };
  
  // Handler for bay creation
  const handleCreateBay = async () => {
    try {
      const response = await apiRequest(
        'POST',
        '/api/manufacturing-bays',
        newBay
      );
      
      if (!response.ok) {
        throw new Error('Failed to create bay');
      }
      
      toast({
        title: "Bay Created",
        description: `Bay ${newBay.bayNumber} has been created successfully`,
      });
      
      // Reset form and close dialog
      setNewBay({
        bayNumber: 0,
        name: '',
        description: '',
        team: 'General',
        staffCount: 1,
        hoursPerPersonPerWeek: 40,
        isActive: true
      });
      setShowAddBayDialog(false);
      
      // Refetch data
      refetchBays();
    } catch (error) {
      console.error('Error creating bay:', error);
      toast({
        title: "Error",
        description: "Failed to create manufacturing bay",
        variant: "destructive"
      });
    }
  };
  
  // Handler for creating a schedule from the dialog
  const handleCreateScheduleFromDialog = async () => {
    if (!selectedProject || !selectedBay) {
      toast({
        title: "Error",
        description: "Please select a project and bay",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const startDate = new Date().toISOString();
      const endDate = addDays(new Date(), 5).toISOString(); // Default 5 days for now
      
      await handleScheduleCreate(
        selectedProject,
        selectedBay,
        startDate,
        endDate,
        scheduleTotalHours
      );
      
      toast({
        title: "Schedule Created",
        description: "Project has been scheduled successfully",
      });
      
      // Reset form and close dialog
      setSelectedProject(null);
      setSelectedBay(null);
      setScheduleTotalHours(40);
      setShowAddScheduleDialog(false);
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({
        title: "Error",
        description: "Failed to create schedule",
        variant: "destructive"
      });
    }
  };
  
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
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-sans font-bold">Bay Scheduling & Capacity</h1>
          <p className="text-gray-400 text-sm">Manage manufacturing capacity, scheduling and bay assignments</p>
        </div>
        
        <div className="flex items-center gap-3">
          <AIInsightsModal />
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddScheduleDialog(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            Add Schedule
          </Button>
          <Button size="sm" onClick={() => setShowAddBayDialog(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Bay
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ManufacturingCard 
          title="Bay Utilization"
          value={manufacturingStats?.bayUtilization || 0}
          type="utilization"
          change={{ 
            value: "7% from last month", 
            isPositive: false 
          }}
        />
        
        <ManufacturingCard 
          title="Capacity Utilization"
          value={manufacturingStats?.capacityUtilization || 0}
          type="utilization"
          subtitle={`${manufacturingStats?.usedCapacity || 0}/${manufacturingStats?.totalCapacity || 0} hours`}
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
          title="Workforce Allocation"
          value=""
          type="resources"
          stats={[
            { label: "Total Staff", value: manufacturingBays?.reduce((acc, bay) => acc + (bay.staffCount || 1), 0) || 0 },
            { label: "Weekly Hours", value: manufacturingBays?.reduce((acc, bay) => acc + ((bay.staffCount || 1) * (bay.hoursPerPersonPerWeek || 40)), 0) || 0 },
            { label: "Active Bays", value: manufacturingBays?.filter(b => b.isActive).length || 0 }
          ]}
        />
      </div>
      
      {/* Date Range Selector */}
      <div className="flex justify-between items-center mb-4 bg-darkCard p-4 rounded-xl">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Button size="sm" variant="outline" onClick={() => setDateRange({
              start: subDays(dateRange.start, 14),
              end: subDays(dateRange.end, 14)
            })}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="mx-3 text-sm">
              {format(dateRange.start, 'MMM d, yyyy')} - {format(dateRange.end, 'MMM d, yyyy')}
            </span>
            <Button size="sm" variant="outline" onClick={() => setDateRange({
              start: addDays(dateRange.start, 14),
              end: addDays(dateRange.end, 14)
            })}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-8" />
          
          <div className="flex space-x-2">
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">Today</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">This Week</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">This Month</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">Next Month</Badge>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span className="text-xs">Active</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-xs">Scheduled</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span className="text-xs">Completed</span>
          </div>
        </div>
      </div>
      
      {/* Resizable Bay Schedule */}
      <div className="bg-darkCard rounded-xl border border-gray-800 p-4 mb-6 overflow-hidden">
        <ResizableBaySchedule 
          schedules={manufacturingSchedules || []}
          projects={projects || []}
          bays={manufacturingBays || []}
          onScheduleChange={handleScheduleChange}
          onScheduleCreate={handleScheduleCreate}
        />
      </div>
      
      {/* Add Bay Dialog */}
      <Dialog open={showAddBayDialog} onOpenChange={setShowAddBayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Manufacturing Bay</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bayNumber">Bay Number</Label>
                <Input 
                  id="bayNumber" 
                  type="number"
                  value={newBay.bayNumber || ''}
                  onChange={(e) => setNewBay({...newBay, bayNumber: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="team">Team</Label>
                <Input 
                  id="team" 
                  value={newBay.team || ''}
                  onChange={(e) => setNewBay({...newBay, team: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="name">Bay Name</Label>
              <Input 
                id="name" 
                value={newBay.name || ''}
                onChange={(e) => setNewBay({...newBay, name: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Input 
                id="description" 
                value={newBay.description || ''}
                onChange={(e) => setNewBay({...newBay, description: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="staffCount">Staff Count</Label>
                <Input 
                  id="staffCount" 
                  type="number"
                  value={newBay.staffCount || 1}
                  onChange={(e) => setNewBay({...newBay, staffCount: parseInt(e.target.value) || 1})}
                />
              </div>
              <div>
                <Label htmlFor="hoursPerPersonPerWeek">Hours Per Person (Weekly)</Label>
                <Input 
                  id="hoursPerPersonPerWeek" 
                  type="number"
                  value={newBay.hoursPerPersonPerWeek || 40}
                  onChange={(e) => setNewBay({...newBay, hoursPerPersonPerWeek: parseInt(e.target.value) || 40})}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBayDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateBay}>Create Bay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Schedule Dialog */}
      <Dialog open={showAddScheduleDialog} onOpenChange={setShowAddScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule a Project</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="project">Project</Label>
              <select 
                id="project"
                className="w-full p-2 bg-darkInput border border-gray-700 rounded-md"
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(parseInt(e.target.value))}
              >
                <option value="">Select a project...</option>
                {projects?.filter(p => !manufacturingSchedules?.some(s => s.projectId === p.id))
                  .map(project => (
                    <option key={project.id} value={project.id}>
                      {project.projectNumber} - {project.name}
                    </option>
                  ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="bay">Manufacturing Bay</Label>
              <select 
                id="bay"
                className="w-full p-2 bg-darkInput border border-gray-700 rounded-md"
                value={selectedBay || ''}
                onChange={(e) => setSelectedBay(parseInt(e.target.value))}
              >
                <option value="">Select a bay...</option>
                {manufacturingBays?.filter(b => b.isActive)
                  .map(bay => (
                    <option key={bay.id} value={bay.id}>
                      Bay {bay.bayNumber} - {bay.name}
                    </option>
                  ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="totalHours">Estimated Hours</Label>
              <Input 
                id="totalHours" 
                type="number"
                value={scheduleTotalHours}
                onChange={(e) => setScheduleTotalHours(parseInt(e.target.value) || 40)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Total hours required to complete this project
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddScheduleDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateScheduleFromDialog}>Schedule Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BaySchedulingPage;