import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, addWeeks, subWeeks } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Check, X, Edit, Trash, CalendarIcon, PlusCircle, Settings } from 'lucide-react';

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

// Form schemas
const benchmarkFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  weeksBeforePhase: z.coerce.number().min(1, "Must be at least 1 week"),
  targetPhase: z.string().min(1, "Target phase is required"),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

const projectBenchmarkFormSchema = z.object({
  projectId: z.coerce.number().min(1, "Project is required"),
  benchmarkId: z.coerce.number().min(1, "Benchmark is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  isCompleted: z.boolean().default(false),
  completedDate: z.string().optional().nullable(),
  weeksBeforePhase: z.coerce.number().min(1, "Must be at least 1 week"),
  targetPhase: z.string().min(1, "Target phase is required"),
  notes: z.string().optional().nullable()
});

const SupplyChain = () => {
  const [activeTab, setActiveTab] = useState('project-benchmarks');
  const [openBenchmarkDialog, setOpenBenchmarkDialog] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState<SupplyChainBenchmark | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for all benchmarks
  const { data: benchmarks, isLoading: loadingBenchmarks } = useQuery({
    queryKey: ['/api/supply-chain-benchmarks'],
    select: (data) => data as SupplyChainBenchmark[]
  });

  // Query for active projects
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['/api/projects'],
    select: (data) => (data as Project[]).filter(p => p.status === 'active')
  });

  // Query for project benchmarks
  const { data: projectBenchmarks, isLoading: loadingProjectBenchmarks } = useQuery({
    queryKey: ['/api/project-supply-chain-benchmarks'],
    select: (data) => data as ProjectSupplyChainBenchmark[]
  });

  // Mutations
  const createBenchmarkMutation = useMutation({
    mutationFn: (data: z.infer<typeof benchmarkFormSchema>) => 
      apiRequest('/api/supply-chain-benchmarks', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain-benchmarks'] });
      toast({
        title: "Benchmark created",
        description: "The supply chain benchmark has been created successfully."
      });
      setOpenBenchmarkDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error creating benchmark",
        description: "There was an error creating the benchmark. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateBenchmarkMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: z.infer<typeof benchmarkFormSchema> }) => 
      apiRequest(`/api/supply-chain-benchmarks/${id}`, { method: 'PATCH', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain-benchmarks'] });
      toast({
        title: "Benchmark updated",
        description: "The supply chain benchmark has been updated successfully."
      });
      setOpenBenchmarkDialog(false);
      setEditingBenchmark(null);
    },
    onError: (error) => {
      toast({
        title: "Error updating benchmark",
        description: "There was an error updating the benchmark. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteBenchmarkMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/supply-chain-benchmarks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain-benchmarks'] });
      toast({
        title: "Benchmark deleted",
        description: "The supply chain benchmark has been deleted successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting benchmark",
        description: "There was an error deleting the benchmark. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateProjectBenchmarkMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<z.infer<typeof projectBenchmarkFormSchema>> }) => 
      apiRequest(`/api/project-supply-chain-benchmarks/${id}`, { method: 'PATCH', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-supply-chain-benchmarks'] });
      toast({
        title: "Project benchmark updated",
        description: "The project benchmark has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating project benchmark",
        description: "There was an error updating the project benchmark. Please try again.",
        variant: "destructive"
      });
    }
  });

  const addDefaultBenchmarksMutation = useMutation({
    mutationFn: (projectId: number) => 
      apiRequest(`/api/project-supply-chain-benchmarks/add-defaults/${projectId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-supply-chain-benchmarks'] });
      toast({
        title: "Default benchmarks added",
        description: "Default supply chain benchmarks have been added to the project."
      });
    },
    onError: (error) => {
      toast({
        title: "Error adding default benchmarks",
        description: "There was an error adding default benchmarks to the project. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Form for benchmark creation/editing
  const benchmarkForm = useForm<z.infer<typeof benchmarkFormSchema>>({
    resolver: zodResolver(benchmarkFormSchema),
    defaultValues: {
      name: '',
      description: '',
      weeksBeforePhase: 3,
      targetPhase: 'FABRICATION',
      isDefault: false,
      isActive: true
    }
  });

  // Handle opening the form dialog for creating or editing a benchmark
  const handleEditBenchmark = (benchmark: SupplyChainBenchmark) => {
    setEditingBenchmark(benchmark);
    benchmarkForm.reset({
      name: benchmark.name,
      description: benchmark.description || '',
      weeksBeforePhase: benchmark.weeksBeforePhase,
      targetPhase: benchmark.targetPhase,
      isDefault: benchmark.isDefault,
      isActive: benchmark.isActive
    });
    setOpenBenchmarkDialog(true);
  };

  // Handle creating a new benchmark
  const handleNewBenchmark = () => {
    setEditingBenchmark(null);
    benchmarkForm.reset({
      name: '',
      description: '',
      weeksBeforePhase: 3,
      targetPhase: 'FABRICATION',
      isDefault: false,
      isActive: true
    });
    setOpenBenchmarkDialog(true);
  };

  // Handle form submission for benchmark creation/editing
  const onBenchmarkSubmit = (values: z.infer<typeof benchmarkFormSchema>) => {
    if (editingBenchmark) {
      updateBenchmarkMutation.mutate({ 
        id: editingBenchmark.id, 
        data: values 
      });
    } else {
      createBenchmarkMutation.mutate(values);
    }
  };

  // Calculate target date based on project data and benchmark settings
  const getPhaseDate = (project: Project, phase: string): string | null => {
    switch (phase.toUpperCase()) {
      case 'FABRICATION':
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

  // Calculate benchmark target date based on project phase date and weeks before
  const calculateTargetDate = (project: Project | undefined, benchmark: ProjectSupplyChainBenchmark): string => {
    if (!project) return 'No project data';
    
    const phaseDate = getPhaseDate(project, benchmark.targetPhase);
    if (!phaseDate) return 'Phase date not set';
    
    try {
      const phaseDateObj = parseISO(phaseDate);
      const targetDateObj = subWeeks(phaseDateObj, benchmark.weeksBeforePhase);
      return format(targetDateObj, 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get status badge for a benchmark
  const getBenchmarkStatus = (benchmark: ProjectSupplyChainBenchmark): { label: string; color: string } => {
    if (benchmark.isCompleted) {
      return { label: 'Completed', color: 'bg-green-500' };
    }
    
    if (!benchmark.targetDate) return { label: 'No Date', color: 'bg-gray-500' };
    
    try {
      const today = new Date();
      const targetDate = parseISO(benchmark.targetDate);
      
      if (targetDate < today) {
        return { label: 'Overdue', color: 'bg-red-500' };
      } else {
        // Check if within 2 weeks
        const twoWeeksFromNow = addWeeks(today, 2);
        if (targetDate <= twoWeeksFromNow) {
          return { label: 'Upcoming', color: 'bg-amber-500' };
        }
      }
      
      return { label: 'Scheduled', color: 'bg-blue-500' };
    } catch (error) {
      return { label: 'Error', color: 'bg-gray-500' };
    }
  };

  // Toggle completion status of a project benchmark
  const toggleBenchmarkCompletion = (benchmark: ProjectSupplyChainBenchmark) => {
    const newStatus = !benchmark.isCompleted;
    const data: Partial<z.infer<typeof projectBenchmarkFormSchema>> = {
      isCompleted: newStatus,
      completedDate: newStatus ? new Date().toISOString() : null
    };
    
    updateProjectBenchmarkMutation.mutate({ id: benchmark.id, data });
  };

  // Filter project benchmarks by selected project
  const filteredProjectBenchmarks = selectedProjectId
    ? projectBenchmarks?.filter(pb => pb.projectId === selectedProjectId)
    : projectBenchmarks;

  if (loadingBenchmarks || loadingProjects || loadingProjectBenchmarks) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Supply Chain Management</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-8">
          <TabsList>
            <TabsTrigger value="project-benchmarks">Project Benchmarks</TabsTrigger>
          </TabsList>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setActiveTab('benchmarks')} 
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
        </div>
        
        {/* Benchmark Settings Tab */}
        <TabsContent value="benchmarks" className="mt-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Supply Chain Benchmarks</h2>
            <Button onClick={handleNewBenchmark}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Benchmark
            </Button>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benchmarks && benchmarks.length > 0 ? (
                    benchmarks.map((benchmark) => (
                      <TableRow key={benchmark.id}>
                        <TableCell className="font-medium">{benchmark.name}</TableCell>
                        <TableCell>{benchmark.description}</TableCell>
                        <TableCell>{benchmark.weeksBeforePhase} weeks before {benchmark.targetPhase}</TableCell>
                        <TableCell>
                          {benchmark.isDefault ? (
                            <Badge variant="default" className="bg-blue-500">Default</Badge>
                          ) : (
                            <Badge variant="outline">Optional</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {benchmark.isActive ? (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-200">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            onClick={() => handleEditBenchmark(benchmark)} 
                            variant="ghost" 
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={() => deleteBenchmarkMutation.mutate(benchmark.id)} 
                            variant="ghost" 
                            size="sm"
                            className="text-red-500"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        No benchmarks found. Create your first benchmark.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Project Benchmarks Tab */}
        <TabsContent value="project-benchmarks" className="mt-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold">Project Supply Chain Benchmarks</h2>
            
            <div className="flex flex-col md:flex-row gap-4">
              <Select
                value={selectedProjectId?.toString() || ""}
                onValueChange={value => setSelectedProjectId(value ? parseInt(value) : null)}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Projects</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.projectNumber} - {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedProjectId && (
                <Button
                  onClick={() => addDefaultBenchmarksMutation.mutate(selectedProjectId)}
                  variant="outline"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Default Benchmarks
                </Button>
              )}
            </div>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              {selectedProjectId ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benchmark</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Timeline</TableHead>
                      <TableHead>Target Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjectBenchmarks && filteredProjectBenchmarks.length > 0 ? (
                      filteredProjectBenchmarks.map((benchmark) => {
                        const project = projects?.find(p => p.id === benchmark.projectId);
                        const status = getBenchmarkStatus(benchmark);
                        
                        return (
                          <TableRow key={benchmark.id}>
                            <TableCell className="font-medium">{benchmark.name}</TableCell>
                            <TableCell>{benchmark.description}</TableCell>
                            <TableCell>
                              {benchmark.weeksBeforePhase} weeks before {benchmark.targetPhase}
                            </TableCell>
                            <TableCell>
                              {calculateTargetDate(project, benchmark)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className={status.color}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                onClick={() => toggleBenchmarkCompletion(benchmark)}
                                variant="ghost"
                                size="sm"
                                className={benchmark.isCompleted ? "text-red-500" : "text-green-500"}
                              >
                                {benchmark.isCompleted ? (
                                  <X className="h-4 w-4" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          No benchmarks found for this project. Add default benchmarks or create custom ones.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  Please select a project to view benchmarks.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Benchmark Creation/Editing Dialog */}
      <Dialog open={openBenchmarkDialog} onOpenChange={setOpenBenchmarkDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingBenchmark ? 'Edit Benchmark' : 'Create New Benchmark'}
            </DialogTitle>
            <DialogDescription>
              {editingBenchmark 
                ? 'Update the supply chain benchmark information.' 
                : 'Add a new supply chain benchmark to track purchasing and preparation.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...benchmarkForm}>
            <form onSubmit={benchmarkForm.handleSubmit(onBenchmarkSubmit)} className="space-y-6">
              <FormField
                control={benchmarkForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Benchmark Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Order Materials" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={benchmarkForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Description of the benchmark"
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={benchmarkForm.control}
                  name="weeksBeforePhase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weeks Before</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="3"
                          type="number" 
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Weeks before phase date</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={benchmarkForm.control}
                  name="targetPhase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Phase</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select phase" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FABRICATION">Fabrication</SelectItem>
                          <SelectItem value="PRODUCTION">Production</SelectItem>
                          <SelectItem value="NTC">NTC</SelectItem>
                          <SelectItem value="QC">Quality Control</SelectItem>
                          <SelectItem value="SHIP">Shipping</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Project phase this benchmark relates to</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={benchmarkForm.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Default Benchmark</FormLabel>
                        <FormDescription>
                          Add to all new projects
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={benchmarkForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Include in new projects
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="submit" disabled={createBenchmarkMutation.isPending || updateBenchmarkMutation.isPending}>
                  {editingBenchmark ? 'Update Benchmark' : 'Create Benchmark'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplyChain;