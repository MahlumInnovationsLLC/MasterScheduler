import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Video, Users, TrendingUp, AlertTriangle, CheckCircle, AlertCircle, DollarSign, Package, Calendar as CalendarIcon, Truck, Building, ExternalLink, Target, Zap, Activity, BarChart, WifiOff, Settings, Loader2, FileText, Edit, Save, X, CheckCheck, MousePointer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, isAfter, differenceInDays, isWithinInterval, subDays, addDays } from 'date-fns';

// Enhanced type definitions
interface Project {
  id: number;
  projectNumber: string;
  name: string;
  pmOwner?: string;
  shipDate?: string;
  deliveryDate?: string;
  status: string;
  location?: string;
  notes?: string;
  fabNotes?: string;
  fabricationStart?: string;
  assemblyStart?: string;
  fabProgress?: number; // User-adjusted FAB progress percentage (0-100)
}

interface Task {
  id: number;
  description: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedToId?: string;
}

interface ElevatedConcern {
  id: number;
  projectId: number;
  type: "task" | "note";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  assignedToId?: string;
  dueDate?: string;
  isEscalatedToTierIV: boolean;
  escalatedAt?: string;
  escalatedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Meeting {
  id: number;
  title: string;
  datetime: string;
  location?: string;
  virtualLink?: string;
  organizerId: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  agenda: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Meetings() {
  const [selectedTab, setSelectedTab] = useState('tier-ii');
  const [tierIIILocationFilter, setTierIIILocationFilter] = useState('all');
  const [tierIIIStatusFilter, setTierIIIStatusFilter] = useState('all');
  const [selectedProjectForCCB, setSelectedProjectForCCB] = useState<Project | null>(null);
  const [selectedProjectForFabNotes, setSelectedProjectForFabNotes] = useState<Project | null>(null);
  const [showFabNotesDialog, setShowFabNotesDialog] = useState(false);
  const [fabNotesContent, setFabNotesContent] = useState('');
  const [showCCBDialog, setShowCCBDialog] = useState(false);
  const [ccbNotes, setCCBNotes] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTierIIIFilter, setSelectedTierIIIFilter] = useState('all');
  const [draggedFabProgress, setDraggedFabProgress] = useState<{ [key: number]: number }>({});
  const [isDragging, setIsDragging] = useState<{ [key: number]: boolean }>({});
  const [fabProgressTemp, setFabProgressTemp] = useState<{ [key: number]: number }>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
    enabled: true,
  });

  const { data: elevatedConcerns, isLoading: elevatedConcernsLoading } = useQuery({
    queryKey: ['/api/elevated-concerns'],
    enabled: true,
  });

  const { data: ptnProjects, isLoading: ptnProjectsLoading } = useQuery({
    queryKey: ['/api/ptn-projects'],
    enabled: true,
  });

  const calculateProgress = (project: Project) => {
    if (!project.fabricationStart || !project.assemblyStart) return 0;
    
    const fabStart = new Date(project.fabricationStart);
    const assemblyStart = new Date(project.assemblyStart);
    const now = new Date();
    
    if (now < fabStart) return 0;
    if (now >= assemblyStart) return 100;
    
    const totalDays = differenceInDays(assemblyStart, fabStart);
    const daysPassed = differenceInDays(now, fabStart);
    
    return Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
  };

  const getRiskLevel = (project: Project) => {
    const shipDate = project.shipDate ? new Date(project.shipDate) : null;
    const now = new Date();
    
    if (!shipDate) return 'unknown';
    
    const daysUntilShip = differenceInDays(shipDate, now);
    if (daysUntilShip < 0) return 'overdue';
    if (daysUntilShip <= 7) return 'critical';
    if (daysUntilShip <= 30) return 'high';
    if (daysUntilShip <= 60) return 'medium';
    return 'low';
  };

  const handleOpenFabNotes = (project: Project) => {
    setSelectedProjectForFabNotes(project);
    setFabNotesContent(project.fabNotes || '');
    setShowFabNotesDialog(true);
  };

  const handleCloseFabNotesDialog = () => {
    setShowFabNotesDialog(false);
    setSelectedProjectForFabNotes(null);
    setFabNotesContent('');
  };

  const updateFabNotes = useMutation({
    mutationFn: async ({ projectId, fabNotes }: { projectId: number; fabNotes: string }) => {
      return apiRequest('PUT', `/api/projects/${projectId}/fab-notes`, { fabNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "FAB Notes Updated",
        description: "FAB notes have been successfully updated.",
      });
      handleCloseFabNotesDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update FAB notes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveFabNotes = () => {
    if (!selectedProjectForFabNotes) return;
    updateFabNotes.mutate({
      projectId: selectedProjectForFabNotes.id,
      fabNotes: fabNotesContent,
    });
  };

  const updateFabProgress = useMutation({
    mutationFn: async ({ projectId, fabProgress }: { projectId: number; fabProgress: number }) => {
      return apiRequest('PUT', `/api/projects/${projectId}/fab-progress`, { fabProgress });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "FAB Progress Updated",
        description: "FAB progress has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update FAB progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFabProgressChange = (projectId: number, newProgress: number) => {
    const clampedProgress = Math.max(0, Math.min(100, newProgress));
    updateFabProgress.mutate({
      projectId,
      fabProgress: clampedProgress,
    });
  };

  const handleFabProgressReset = (projectId: number) => {
    updateFabProgress.mutate({
      projectId,
      fabProgress: null,
    });
  };

  const handleMouseDown = (e: React.MouseEvent, projectId: number) => {
    e.preventDefault();
    setIsDragging({ ...isDragging, [projectId]: true });
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    
    setFabProgressTemp({ ...fabProgressTemp, [projectId]: newProgress });
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const currentX = moveEvent.clientX - rect.left;
      const progress = Math.max(0, Math.min(100, (currentX / rect.width) * 100));
      setFabProgressTemp({ ...fabProgressTemp, [projectId]: progress });
    };
    
    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsDragging({ ...isDragging, [projectId]: false });
      const finalProgress = fabProgressTemp[projectId];
      if (finalProgress !== undefined) {
        handleFabProgressChange(projectId, finalProgress);
      }
      setFabProgressTemp({});
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Filter projects for Tier II dashboard
  const tierIIProjects = (projects as Project[])
    ?.filter((p: Project) => p.shipDate && new Date(p.shipDate) > new Date())
    .filter((p: Project) => {
      const risk = getRiskLevel(p);
      return risk === 'critical' || risk === 'high';
    })
    .sort((a: Project, b: Project) => new Date(a.shipDate!).getTime() - new Date(b.shipDate!).getTime())
    .slice(0, 10) || [];

  // Filter projects for Tier III dashboard
  const tierIIIProjects = (projects as Project[])?.filter((p: Project) => {
    const progress = calculateProgress(p);
    const isInFabPhase = p.fabricationStart && p.assemblyStart &&
      new Date() >= new Date(p.fabricationStart) && new Date() < new Date(p.assemblyStart);
    return isInFabPhase && progress < 100;
  })
  .filter((p: Project) => {
    if (tierIIILocationFilter === 'all') return true;
    return p.location === tierIIILocationFilter;
  })
  .filter((p: Project) => {
    if (tierIIIStatusFilter === 'all') return true;
    return p.status.toLowerCase() === tierIIIStatusFilter.toLowerCase();
  })
  .sort((a: Project, b: Project) => {
    const aDate = a.shipDate ? new Date(a.shipDate) : new Date('2099-12-31');
    const bDate = b.shipDate ? new Date(b.shipDate) : new Date('2099-12-31');
    return aDate.getTime() - bDate.getTime();
  })
  .slice(0, 30) || [];

  const tierIVProjects = (projects as Project[]).filter((p: Project) => 
    p.shipDate && new Date(p.shipDate) <= new Date()
  ).sort((a: Project, b: Project) => {
    const aDate = a.shipDate ? new Date(a.shipDate) : new Date('1900-01-01');
    const bDate = b.shipDate ? new Date(b.shipDate) : new Date('1900-01-01');
    return bDate.getTime() - aDate.getTime();
  });

  const goodProjects = (projects as Project[]).filter((p: Project) => 
    p.shipDate && new Date(p.shipDate) > new Date() && getRiskLevel(p) === 'low'
  ).sort((a: Project, b: Project) => {
    const aDate = a.shipDate ? new Date(a.shipDate) : new Date('2099-12-31');
    const bDate = b.shipDate ? new Date(b.shipDate) : new Date('2099-12-31');
    return aDate.getTime() - bDate.getTime();
  });

  const tierIVConcerns = (elevatedConcerns as ElevatedConcern[]).filter((c: ElevatedConcern) => 
    c.isEscalatedToTierIV && c.status !== 'completed'
  );

  const handleCloseConcern = (concern: ElevatedConcern) => {
    // Handle closing concern logic here
  };

  if (projectsLoading || elevatedConcernsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-muted-foreground">Loading data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Tier Dashboard</h1>
          <p className="text-muted-foreground">
            Manufacturing tier status and project management dashboard
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tier-ii">Tier II</TabsTrigger>
          <TabsTrigger value="tier-iii">Tier III</TabsTrigger>
          <TabsTrigger value="tier-iv">Tier IV</TabsTrigger>
        </TabsList>

        {/* Tier II Tab Content */}
        <TabsContent value="tier-ii" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold dark:text-white">Tier II - High Priority Projects</h2>
              <p className="text-muted-foreground">
                Critical and high-risk projects requiring immediate attention
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Team Needs Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Team Needs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold dark:text-white">12</div>
                <p className="text-sm text-muted-foreground">Active needs across all teams</p>
              </CardContent>
            </Card>

            {/* Production Metrics Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Production Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold dark:text-white">85%</div>
                <p className="text-sm text-muted-foreground">Current efficiency rate</p>
              </CardContent>
            </Card>

            {/* Enhanced Summary Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Enhanced Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold dark:text-white">24</div>
                <p className="text-sm text-muted-foreground">Projects on track</p>
              </CardContent>
            </Card>

            {/* PTN Projects Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-orange-600" />
                  PTN Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold dark:text-white">18</div>
                <p className="text-sm text-muted-foreground">Active PTN projects</p>
              </CardContent>
            </Card>
          </div>

          {/* Large View Full PTN Dashboard Button */}
          <div className="flex justify-center pt-8">
            <Button 
              size="lg" 
              className="px-8 py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
              onClick={() => window.open('/ptn-dashboard', '_blank')}
            >
              <ExternalLink className="mr-2 h-6 w-6" />
              View Full PTN Dashboard
            </Button>
          </div>
        </TabsContent>

        {/* Tier III Tab Content */}
        <TabsContent value="tier-iii" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold dark:text-white">Tier III - Project Readiness</h2>
              <p className="text-muted-foreground">
                Projects currently in FAB phase, sorted by ship date
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={tierIIILocationFilter} onValueChange={setTierIIILocationFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="Orlando">Orlando</SelectItem>
                  <SelectItem value="Ocala">Ocala</SelectItem>
                  <SelectItem value="Tampa">Tampa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tierIIIStatusFilter} onValueChange={setTierIIIStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tierIIIProjects.map((project: Project) => {
              const progress = project.fabProgress !== null && project.fabProgress !== undefined 
                ? project.fabProgress 
                : calculateProgress(project);
              const isCustomProgress = project.fabProgress !== null && project.fabProgress !== undefined;
              const displayProgress = isDragging[project.id] 
                ? (fabProgressTemp[project.id] ?? progress) 
                : progress;

              return (
                <Card key={project.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base dark:text-white">{project.projectNumber}</CardTitle>
                      <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                        {project.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm dark:text-gray-400">
                      {project.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium dark:text-white">
                          FAB Progress {isCustomProgress && "(Custom)"}
                        </span>
                        <span className="text-sm dark:text-gray-300">{Math.round(displayProgress)}%</span>
                      </div>
                      <div className="relative">
                        <div
                          className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 cursor-pointer transition-colors hover:bg-gray-300 dark:hover:bg-gray-600"
                          onMouseDown={(e) => handleMouseDown(e, project.id)}
                        >
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all duration-200"
                            style={{ width: `${displayProgress}%` }}
                          />
                        </div>
                        {isDragging[project.id] && (
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded text-xs">
                            {Math.round(displayProgress)}%
                          </div>
                        )}
                      </div>
                      {isCustomProgress && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFabProgressReset(project.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          Reset to Auto
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Ship Date:</span>
                        <span className="font-medium dark:text-white">
                          {project.shipDate ? format(new Date(project.shipDate), 'MMM d, yyyy') : 'TBD'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium dark:text-white">{project.location || 'TBD'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenFabNotes(project)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        FAB Notes
                      </Button>
                      {project.fabNotes && (
                        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                          Notes available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tier IV Tab Content */}
        <TabsContent value="tier-iv" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold dark:text-white">Tier IV - Overdue Projects</h2>
              <p className="text-muted-foreground">
                Projects past their original ship date requiring immediate attention
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tierIVProjects.map((project: Project) => (
              <Card key={project.id} className="border-l-4 border-l-red-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base dark:text-white">{project.projectNumber}</CardTitle>
                    <Badge variant="destructive">
                      Overdue
                    </Badge>
                  </div>
                  <CardDescription className="text-sm dark:text-gray-400">
                    {project.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Ship Date:</span>
                      <span className="font-medium text-red-600">
                        {project.shipDate ? format(new Date(project.shipDate), 'MMM d, yyyy') : 'TBD'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Days Overdue:</span>
                      <span className="font-medium text-red-600">
                        {project.shipDate ? differenceInDays(new Date(), new Date(project.shipDate)) : 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* FAB Notes Dialog */}
      <Dialog open={showFabNotesDialog} onOpenChange={setShowFabNotesDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              FAB Notes - {selectedProjectForFabNotes?.projectNumber}
            </DialogTitle>
            <DialogDescription>
              Add or edit FAB-specific notes for {selectedProjectForFabNotes?.name}. These notes are separate from general project notes and only appear in the FAB section.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fab-notes">FAB Notes</Label>
              <Textarea
                id="fab-notes"
                placeholder="Enter FAB-specific notes, observations, or important information..."
                value={fabNotesContent}
                onChange={(e) => setFabNotesContent(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground">
                These notes will only be visible in the Tier III FAB section and are separate from general project notes.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseFabNotesDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveFabNotes}
              disabled={updateFabNotes.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateFabNotes.isPending ? "Saving..." : "Save FAB Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}