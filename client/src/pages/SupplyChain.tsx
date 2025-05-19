import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, addWeeks, subWeeks, parseISO } from 'date-fns';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Calendar as CalendarIcon, Settings, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import LoadingSpinner from '@/components/LoadingSpinner';
import ActionMenu from '@/components/ActionMenu';

// Types based on our schema
interface SupplyChainBenchmark {
  id: number;
  name: string;
  description: string | null;
  weeksBeforePhase: number;
  targetPhase: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProjectSupplyChainBenchmark {
  id: number;
  projectId: number;
  benchmarkId: number;
  name: string;
  description: string | null;
  targetDate: string | null;
  isCompleted: boolean;
  completedDate: string | null;
  weeksBeforePhase: number;
  targetPhase: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  benchmark?: SupplyChainBenchmark;
}

interface Project {
  id: number;
  name: string;
  projectNumber: string;
  status: string;
  startDate: string;
  estimatedCompletionDate: string;
  fabricationStart: string | null;
  assemblyStart: string | null;
  ntcTestingDate: string | null;
  qcStartDate: string | null;
  shipDate: string | null;
}

// Create a benchmark schema for the form
const createBenchmarkSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  weeksBeforePhase: z.number().min(1, { message: "Must be at least 1 week" }),
  targetPhase: z.string().min(1, { message: "Target phase is required" }),
  isDefault: z.boolean().default(false),
});

const SupplyChain = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [benchmarkDialogOpen, setBenchmarkDialogOpen] = useState(false);
  const [selectedBenchmark, setSelectedBenchmark] = useState<SupplyChainBenchmark | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [benchmarkToDelete, setBenchmarkToDelete] = useState<number | null>(null);
  const [projectBenchmarkToComplete, setProjectBenchmarkToComplete] = useState<number | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  // Form for creating/editing benchmarks
  const form = useForm<z.infer<typeof createBenchmarkSchema>>({
    resolver: zodResolver(createBenchmarkSchema),
    defaultValues: {
      name: '',
      description: '',
      weeksBeforePhase: 2,
      targetPhase: 'FAB',
      isDefault: false,
    },
  });

  // Query to fetch all benchmarks
  const { data: benchmarks, isLoading: isBenchmarksLoading } = useQuery({
    queryKey: ['/api/supply-chain-benchmarks'],
    queryFn: () => apiRequest<SupplyChainBenchmark[]>({ url: '/api/supply-chain-benchmarks' }),
  });

  // Query to fetch project benchmarks with their projects
  const { data: projectBenchmarks, isLoading: isProjectBenchmarksLoading } = useQuery({
    queryKey: ['/api/project-supply-chain-benchmarks'],
    queryFn: () => apiRequest<ProjectSupplyChainBenchmark[]>({ 
      url: '/api/project-supply-chain-benchmarks',
      params: { include: 'project' }
    }),
  });

  // Mutation to create a new benchmark
  const createBenchmarkMutation = useMutation({
    mutationFn: (data: z.infer<typeof createBenchmarkSchema>) => 
      apiRequest({ 
        url: '/api/supply-chain-benchmarks', 
        method: 'POST',
        data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain-benchmarks'] });
      toast({
        title: "Success",
        description: "Benchmark created successfully",
      });
      setBenchmarkDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create benchmark: " + error,
        variant: "destructive",
      });
    }
  });

  // Mutation to update a benchmark
  const updateBenchmarkMutation = useMutation({
    mutationFn: (data: Partial<SupplyChainBenchmark>) => 
      apiRequest({ 
        url: `/api/supply-chain-benchmarks/${data.id}`, 
        method: 'PATCH',
        data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain-benchmarks'] });
      toast({
        title: "Success",
        description: "Benchmark updated successfully",
      });
      setBenchmarkDialogOpen(false);
      setSelectedBenchmark(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update benchmark: " + error,
        variant: "destructive",
      });
    }
  });

  // Mutation to delete a benchmark
  const deleteBenchmarkMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest({ 
        url: `/api/supply-chain-benchmarks/${id}`, 
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain-benchmarks'] });
      toast({
        title: "Success",
        description: "Benchmark deleted successfully",
      });
      setDeleteDialogOpen(false);
      setBenchmarkToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete benchmark: " + error,
        variant: "destructive",
      });
    }
  });

  // Mutation to complete a project benchmark
  const completeProjectBenchmarkMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest({ 
        url: `/api/project-supply-chain-benchmarks/${id}`, 
        method: 'PATCH',
        data: {
          isCompleted: true,
          completedDate: new Date().toISOString().split('T')[0]
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-supply-chain-benchmarks'] });
      toast({
        title: "Success",
        description: "Benchmark marked as completed",
      });
      setCompleteDialogOpen(false);
      setProjectBenchmarkToComplete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete benchmark: " + error,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: z.infer<typeof createBenchmarkSchema>) => {
    if (selectedBenchmark) {
      updateBenchmarkMutation.mutate({
        id: selectedBenchmark.id,
        ...data
      });
    } else {
      createBenchmarkMutation.mutate(data);
    }
  };

  // Handle editing a benchmark
  const handleEditBenchmark = (benchmark: SupplyChainBenchmark) => {
    setSelectedBenchmark(benchmark);
    form.reset({
      name: benchmark.name,
      description: benchmark.description || '',
      weeksBeforePhase: benchmark.weeksBeforePhase,
      targetPhase: benchmark.targetPhase,
      isDefault: benchmark.isDefault,
    });
    setBenchmarkDialogOpen(true);
  };

  // Handle deleting a benchmark
  const handleDeleteBenchmark = (id: number) => {
    setBenchmarkToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Handle confirming benchmark completion
  const handleConfirmComplete = (id: number) => {
    setProjectBenchmarkToComplete(id);
    setCompleteDialogOpen(true);
  };

  // Filtered project benchmarks based on active tab
  const filteredProjectBenchmarks = projectBenchmarks?.filter(benchmark => {
    if (activeTab === 'upcoming') {
      return !benchmark.isCompleted;
    } else {
      return benchmark.isCompleted;
    }
  });

  // Helper function to get phase date from project
  const getPhaseDate = (project: Project, phase: string): string | null => {
    switch (phase) {
      case 'FAB':
        return project.fabricationStart;
      case 'PRODUCTION':
        return project.assemblyStart;
      case 'NTC':
        return project.ntcTestingDate;
      case 'QC':
        return project.qcStartDate;
      case 'SHIP':
        return project.shipDate;
      default:
        return null;
    }
  };

  // Calculate target date based on phase and weeks before
  const calculateTargetDate = (project: Project | undefined, benchmark: ProjectSupplyChainBenchmark): string => {
    if (!project) return 'N/A';
    
    const phaseDate = getPhaseDate(project, benchmark.targetPhase);
    if (!phaseDate) return 'Phase date not set';
    
    try {
      const phaseDateObj = parseISO(phaseDate);
      const targetDateObj = subWeeks(phaseDateObj, benchmark.weeksBeforePhase);
      return format(targetDateObj, 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get status badge for a benchmark
  const getBenchmarkStatus = (benchmark: ProjectSupplyChainBenchmark): { label: string; color: string } => {
    if (benchmark.isCompleted) {
      return { label: 'Completed', color: 'bg-green-600 hover:bg-green-700' };
    }
    
    if (!benchmark.project) {
      return { label: 'No Project', color: 'bg-gray-500 hover:bg-gray-600' };
    }
    
    const phaseDate = getPhaseDate(benchmark.project, benchmark.targetPhase);
    if (!phaseDate) {
      return { label: 'Phase Not Set', color: 'bg-yellow-500 hover:bg-yellow-600' };
    }
    
    const today = new Date();
    const targetDate = subWeeks(parseISO(phaseDate), benchmark.weeksBeforePhase);
    
    const daysUntilTarget = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilTarget < 0) {
      return { label: 'Overdue', color: 'bg-red-600 hover:bg-red-700' };
    } else if (daysUntilTarget <= 7) {
      return { label: 'Urgent', color: 'bg-orange-500 hover:bg-orange-600' };
    } else if (daysUntilTarget <= 14) {
      return { label: 'Soon', color: 'bg-blue-500 hover:bg-blue-600' };
    } else {
      return { label: 'Upcoming', color: 'bg-gray-500 hover:bg-gray-600' };
    }
  };

  if (isBenchmarksLoading || isProjectBenchmarksLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container px-4 py-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Supply Chain Planning</h1>
          <p className="text-gray-400">Manage purchasing benchmarks for projects</p>
        </div>
        <Button onClick={() => setSettingsDialogOpen(true)} variant="outline" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Benchmark Settings
        </Button>
      </div>

      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming Benchmarks</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-4">
          <Card className="bg-darkCard">
            <CardHeader>
              <CardTitle>Upcoming Purchase Benchmarks</CardTitle>
              <CardDescription>Materials and components that need purchasing soon</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Benchmark</TableHead>
                      <TableHead>Target Phase</TableHead>
                      <TableHead>Purchase By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjectBenchmarks && filteredProjectBenchmarks.length > 0 ? (
                      filteredProjectBenchmarks.map((benchmark) => {
                        const status = getBenchmarkStatus(benchmark);
                        return (
                          <TableRow key={benchmark.id}>
                            <TableCell className="font-medium">
                              {benchmark.project ? (
                                <div>
                                  <div>{benchmark.project.name}</div>
                                  <div className="text-xs text-gray-400">{benchmark.project.projectNumber}</div>
                                </div>
                              ) : (
                                "Unknown Project"
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{benchmark.name}</div>
                                {benchmark.description && (
                                  <div className="text-xs text-gray-400">{benchmark.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{benchmark.targetPhase}</span>
                                <span className="text-xs text-gray-400">(-{benchmark.weeksBeforePhase} weeks)</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {benchmark.project ? calculateTargetDate(benchmark.project, benchmark) : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge className={status.color}>{status.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                onClick={() => handleConfirmComplete(benchmark.id)}
                                variant="outline"
                                size="sm"
                                className="ml-2"
                              >
                                Mark Complete
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          No upcoming benchmarks found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="completed" className="mt-4">
          <Card className="bg-darkCard">
            <CardHeader>
              <CardTitle>Completed Purchase Benchmarks</CardTitle>
              <CardDescription>Materials and components already purchased</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Benchmark</TableHead>
                      <TableHead>Target Phase</TableHead>
                      <TableHead>Purchased On</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjectBenchmarks && filteredProjectBenchmarks.length > 0 ? (
                      filteredProjectBenchmarks.map((benchmark) => (
                        <TableRow key={benchmark.id}>
                          <TableCell className="font-medium">
                            {benchmark.project ? (
                              <div>
                                <div>{benchmark.project.name}</div>
                                <div className="text-xs text-gray-400">{benchmark.project.projectNumber}</div>
                              </div>
                            ) : (
                              "Unknown Project"
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{benchmark.name}</div>
                              {benchmark.description && (
                                <div className="text-xs text-gray-400">{benchmark.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{benchmark.targetPhase}</span>
                              <span className="text-xs text-gray-400">(-{benchmark.weeksBeforePhase} weeks)</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {benchmark.completedDate ? format(new Date(benchmark.completedDate), 'MMM dd, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-600 hover:bg-green-700">Completed</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No completed benchmarks found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Benchmark Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="bg-darkCard max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Supply Chain Benchmark Settings</DialogTitle>
            <DialogDescription>
              Manage default benchmarks that will be applied to all new projects.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Default Benchmarks</h3>
              <Button 
                onClick={() => {
                  setSelectedBenchmark(null);
                  form.reset({
                    name: '',
                    description: '',
                    weeksBeforePhase: 2,
                    targetPhase: 'FAB',
                    isDefault: false,
                  });
                  setBenchmarkDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Benchmark
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Target Phase</TableHead>
                  <TableHead>Weeks Before</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmarks && benchmarks.length > 0 ? (
                  benchmarks.map((benchmark) => (
                    <TableRow key={benchmark.id}>
                      <TableCell className="font-medium">{benchmark.name}</TableCell>
                      <TableCell>{benchmark.description || '-'}</TableCell>
                      <TableCell>{benchmark.targetPhase}</TableCell>
                      <TableCell>{benchmark.weeksBeforePhase}</TableCell>
                      <TableCell>{benchmark.isDefault ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          onClick={() => handleEditBenchmark(benchmark)}
                          variant="ghost" 
                          size="sm"
                        >
                          Edit
                        </Button>
                        <Button 
                          onClick={() => handleDeleteBenchmark(benchmark.id)}
                          variant="ghost" 
                          size="sm"
                          className="text-red-500 hover:text-red-400"
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No benchmarks found. Create a new benchmark to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Benchmark Dialog */}
      <Dialog open={benchmarkDialogOpen} onOpenChange={setBenchmarkDialogOpen}>
        <DialogContent className="bg-darkCard">
          <DialogHeader>
            <DialogTitle>{selectedBenchmark ? 'Edit Benchmark' : 'Create New Benchmark'}</DialogTitle>
            <DialogDescription>
              {selectedBenchmark 
                ? 'Edit the details for this benchmark.' 
                : 'Add a new benchmark for the supply chain team.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Purchase Raw Materials" {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for this purchasing benchmark
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Details about what needs to be purchased" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetPhase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Phase</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select phase" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FAB">Fabrication</SelectItem>
                          <SelectItem value="PRODUCTION">Production</SelectItem>
                          <SelectItem value="NTC">NTC Testing</SelectItem>
                          <SelectItem value="QC">Quality Control</SelectItem>
                          <SelectItem value="SHIP">Ship Date</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Which project phase this benchmark is related to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weeksBeforePhase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weeks Before Phase</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        How many weeks before the phase to place the order
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Default Benchmark
                      </FormLabel>
                      <FormDescription>
                        Apply this benchmark to all new projects automatically
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setBenchmarkDialogOpen(false);
                    setSelectedBenchmark(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedBenchmark ? 'Update Benchmark' : 'Create Benchmark'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-darkCard">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this benchmark and remove it from all projects.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBenchmarkToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (benchmarkToDelete) {
                  deleteBenchmarkMutation.mutate(benchmarkToDelete);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Benchmark Confirmation Dialog */}
      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent className="bg-darkCard">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Completion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this benchmark as completed?
              This will record today's date as the completion date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectBenchmarkToComplete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (projectBenchmarkToComplete) {
                  completeProjectBenchmarkMutation.mutate(projectBenchmarkToComplete);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Mark as Completed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SupplyChain;