import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Search, Filter, Calendar, User, AlertTriangle, CheckCircle, Clock, XCircle, Target, Wrench, Package, Shield, Truck, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest, getQueryFn } from '../lib/queryClient';

const priorityFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['production', 'supply_chain', 'quality', 'engineering', 'logistics', 'maintenance']),
  level: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.enum(['new', 'in_progress', 'blocked', 'review', 'completed', 'cancelled']),
  assignedToId: z.string().optional(),
  projectId: z.number().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  tags: z.array(z.string()).default([])
});

type PriorityFormData = z.infer<typeof priorityFormSchema>;

const Priorities = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<any>(null);

  const form = useForm<PriorityFormData>({
    resolver: zodResolver(priorityFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'production',
      level: 'medium',
      status: 'new',
      tags: []
    }
  });

  // Fetch priorities
  const { data: priorities = [], isLoading, error } = useQuery({
    queryKey: ['/api/priorities'],
    queryFn: getQueryFn({})
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getQueryFn({})
  });

  // Fetch projects for linking
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: getQueryFn({})
  });

  // Create priority mutation
  const createPriorityMutation = useMutation({
    mutationFn: (data: PriorityFormData) => apiRequest('/api/priorities', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      toast({
        title: "Priority Created",
        description: "New priority has been successfully created.",
      });
      setShowCreateDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/priorities'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create priority: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Update priority mutation
  const updatePriorityMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<PriorityFormData> }) => 
      apiRequest(`/api/priorities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: "Priority Updated",
        description: "Priority has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/priorities'] });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to update priority: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const handleCreatePriority = (data: PriorityFormData) => {
    createPriorityMutation.mutate(data);
  };

  const handleStatusChange = (priorityId: number, newStatus: string) => {
    updatePriorityMutation.mutate({
      id: priorityId,
      data: { status: newStatus as any }
    });
  };

  // Filter priorities
  const filteredPriorities = priorities.filter((priority: any) => {
    const matchesSearch = priority.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         priority.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || priority.type === filterType;
    const matchesStatus = filterStatus === 'all' || priority.status === filterStatus;
    const matchesLevel = filterLevel === 'all' || priority.level === filterLevel;
    
    return matchesSearch && matchesType && matchesStatus && matchesLevel;
  });

  const getPriorityIcon = (type: string) => {
    switch (type) {
      case 'production': return <Target className="w-4 h-4" />;
      case 'supply_chain': return <Truck className="w-4 h-4" />;
      case 'quality': return <Shield className="w-4 h-4" />;
      case 'engineering': return <Wrench className="w-4 h-4" />;
      case 'logistics': return <Package className="w-4 h-4" />;
      case 'maintenance': return <Settings className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <AlertTriangle className="w-4 h-4" />;
      case 'blocked': return <XCircle className="w-4 h-4" />;
      case 'review': return <Search className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const priorityStats = {
    total: priorities.length,
    critical: priorities.filter((p: any) => p.level === 'critical').length,
    production: priorities.filter((p: any) => p.type === 'production').length,
    supplyChain: priorities.filter((p: any) => p.type === 'supply_chain').length,
    inProgress: priorities.filter((p: any) => p.status === 'in_progress').length,
    completed: priorities.filter((p: any) => p.status === 'completed').length
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Priorities</h1>
          <p className="text-muted-foreground">
            Manage production and supply chain priorities for targeted personnel access
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Priority
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Priority</DialogTitle>
              <DialogDescription>
                Add a new priority item for production or supply chain management.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreatePriority)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Priority title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="production">Production</SelectItem>
                            <SelectItem value="supply_chain">Supply Chain</SelectItem>
                            <SelectItem value="quality">Quality</SelectItem>
                            <SelectItem value="engineering">Engineering</SelectItem>
                            <SelectItem value="logistics">Logistics</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="assignedToId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user: any) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Priority description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPriorityMutation.isPending}>
                    {createPriorityMutation.isPending ? 'Creating...' : 'Create Priority'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{priorityStats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{priorityStats.critical}</div>
                <div className="text-xs text-muted-foreground">Critical</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{priorityStats.production}</div>
                <div className="text-xs text-muted-foreground">Production</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{priorityStats.supplyChain}</div>
                <div className="text-xs text-muted-foreground">Supply Chain</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{priorityStats.inProgress}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{priorityStats.completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search priorities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="supply_chain">Supply Chain</SelectItem>
                <SelectItem value="quality">Quality</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="logistics">Logistics</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Priority List */}
      <div className="grid gap-4">
        {filteredPriorities.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No priorities found</h3>
              <p className="text-gray-500">
                {searchQuery || filterType !== 'all' || filterStatus !== 'all' || filterLevel !== 'all' 
                  ? 'Try adjusting your search or filters.'
                  : 'Create your first priority to get started.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPriorities.map((priority: any) => (
            <Card key={priority.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getPriorityIcon(priority.type)}
                      <h3 className="text-lg font-medium">{priority.title}</h3>
                      <Badge className={getLevelColor(priority.level)}>
                        {priority.level}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {priority.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    {priority.description && (
                      <p className="text-muted-foreground mb-3">{priority.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(priority.status)}
                        <span className="capitalize">{priority.status.replace('_', ' ')}</span>
                      </div>
                      
                      {priority.assignedToId && (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>
                            {users.find((u: any) => u.id === priority.assignedToId)?.firstName || 'Unknown'} 
                            {users.find((u: any) => u.id === priority.assignedToId)?.lastName || ''}
                          </span>
                        </div>
                      )}
                      
                      {priority.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(priority.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select value={priority.status} onValueChange={(value) => handleStatusChange(priority.id, value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Priorities;