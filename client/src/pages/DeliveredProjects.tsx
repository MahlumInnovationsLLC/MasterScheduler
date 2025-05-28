import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Download, Package, Truck, Search, Calendar, CheckCircle2, Edit2, Check, X, ChevronDown, Plus, Upload, FileDown } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type DeliveredProject = {
  id: number;
  projectNumber: string;
  name: string;
  contractDate: string | null;
  deliveryDate: string | null;
  actualDeliveryDate: string | null;
  daysLate: number;
  reason: string | null;
  lateDeliveryReason: string | null;
  delayResponsibility: 'not_applicable' | 'client_fault' | 'nomad_fault' | 'vendor_fault';
  percentComplete: string;
  status: string;
  contractExtensions: number;
};

const DeliveredProjects = () => {
  const [editingReason, setEditingReason] = useState<number | null>(null);
  const [reasonValue, setReasonValue] = useState<string>('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [manualEntryForm, setManualEntryForm] = useState({
    projectNumber: '',
    name: '',
    contractDate: '',
    deliveryDate: '',
    daysLate: 0,
    reason: '',
    lateDeliveryReason: '',
    delayResponsibility: 'not_applicable' as 'not_applicable' | 'client_fault' | 'nomad_fault' | 'vendor_fault',
    percentComplete: '100',
    contractExtensions: 0
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Force clear cache and refetch on component mount
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ['/api/delivered-projects'] });
    queryClient.invalidateQueries({ queryKey: ['/api/delivered-projects'] });
  }, [queryClient]);

  const { data: deliveredProjects, isLoading, refetch } = useQuery({
    queryKey: ['/api/delivered-projects'],
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data at all
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Manual entry mutation
  const manualEntryMutation = useMutation({
    mutationFn: async (data: typeof manualEntryForm) => {
      return await apiRequest('POST', '/api/delivered-projects/manual', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Delivered project added successfully"
      });
      setShowManualEntry(false);
      setManualEntryForm({
        projectNumber: '',
        name: '',
        contractDate: '',
        deliveryDate: '',
        daysLate: 0,
        reason: '',
        lateDeliveryReason: '',
        delayResponsibility: 'not_applicable',
        percentComplete: '100'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/delivered-projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/delivered-projects/analytics'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add delivered project",
        variant: "destructive"
      });
    }
  });

  // Import mutation with real-time Server-Sent Events
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return new Promise((resolve, reject) => {
        setImportStatus('processing');
        setImportLogs(['📁 Starting file upload...']);
        
        // Start the fetch request
        fetch('/api/delivered-projects/import', {
          method: 'POST',
          body: formData,
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          
          const processStream = () => {
            reader?.read().then(({ done, value }) => {
              if (done) {
                resolve({ message: 'Import completed', count: 0 });
                return;
              }
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n\n');
              buffer = lines.pop() || '';
              
              lines.forEach(line => {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.substring(6));
                    
                    // Update logs with real-time progress
                    setImportLogs(prev => [
                      ...prev,
                      `${data.message || 'Processing...'}`
                    ]);
                    
                    if (data.type === 'complete') {
                      resolve(data);
                    } else if (data.type === 'error') {
                      reject(new Error(data.message));
                    }
                  } catch (e) {
                    console.warn('Failed to parse SSE data:', line);
                  }
                }
              });
              
              processStream();
            }).catch(reject);
          };
          
          processStream();
        })
        .catch(reject);
      });
    },
    onSuccess: (data) => {
      setImportStatus(data.count > 0 ? 'complete' : 'error');
      
      if (data.count > 0) {
        setImportLogs(prev => [
          ...prev,
          `🎉 Import completed! ${data.count} projects added to database.`
        ]);
        
        // Auto-close after 3 seconds on success
        setTimeout(() => {
          setShowImport(false);
          setImportFile(null);
          setImportLogs([]);
          setImportStatus('idle');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 3000);
        
        queryClient.invalidateQueries({ queryKey: ['/api/delivered-projects'] });
        queryClient.invalidateQueries({ queryKey: ['/api/delivered-projects/analytics'] });
      } else {
        setImportLogs(prev => [
          ...prev,
          `💥 Import failed - no projects were imported due to validation errors.`
        ]);
      }
    },
    onError: (error: any) => {
      setImportStatus('error');
      setImportLogs(prev => [
        ...prev,
        `💥 Fatal error: ${error?.message || "Failed to import delivered projects"}`
      ]);
    }
  });

  const updateReasonMutation = useMutation({
    mutationFn: async ({ projectId, reason }: { projectId: number; reason: string }) => {
      console.log("🚀 Frontend: Starting reason update mutation");
      console.log("🚀 Frontend: Project ID:", projectId, "Reason:", reason);
      
      // Try the API request with full error logging
      try {
        const response = await apiRequest('PATCH', `/api/delivered-projects/${projectId}/reason`, { reason });
        console.log("🚀 Frontend: API response:", response);
        return response;
      } catch (error) {
        console.error("🚨 Frontend: API request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("✅ Frontend: Mutation succeeded with data:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/delivered-projects'] });
      toast({ title: "Success", description: "Reason updated successfully" });
      setEditingReason(null);
    },
    onError: (error) => {
      console.error("💥 Frontend: Mutation failed with error:", error);
      toast({ 
        title: "Error", 
        description: "Failed to update reason - API routing issue detected",
        variant: "destructive"
      });
    }
  });

  const updateResponsibilityMutation = useMutation({
    mutationFn: async ({ projectId, responsibility }: { projectId: number; responsibility: string }) => {
      return apiRequest('PATCH', `/api/delivered-projects/${projectId}/responsibility`, { responsibility });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/delivered-projects'] });
      toast({ title: "Success", description: "Responsibility updated successfully" });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to update responsibility",
        variant: "destructive"
      });
    }
  });

  const handleReasonEdit = (projectId: number, currentReason: string | null) => {
    setEditingReason(projectId);
    setReasonValue(currentReason || '');
  };

  const handleReasonSave = async (projectId: number, value?: string) => {
    const finalReason = value || reasonValue;
    console.log("💾 Saving reason:", finalReason, "for project:", projectId);
    
    // Prevent the mutation from triggering if already pending
    if (updateReasonMutation.isPending) {
      console.log("⏳ Save already in progress, skipping...");
      return;
    }
    
    updateReasonMutation.mutate({ projectId, reason: finalReason });
  };

  const handleReasonCancel = () => {
    console.log("❌ Canceling reason edit");
    setEditingReason(null);
    setReasonValue('');
  };

  // Manual entry handlers
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    manualEntryMutation.mutate(manualEntryForm);
  };

  // Import handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast({
        title: "Error",
        description: "Please select a file to import",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);
    importMutation.mutate(formData);
  };

  const downloadTemplate = () => {
    const csvHeaders = [
      'Project Number',
      'Project Name',
      'Contract Date (YYYY-MM-DD)',
      'Delivery Date (YYYY-MM-DD)',
      'Days Late (number)',
      'Late Delivery Reason',
      'Delay Responsibility (not_applicable|client_fault|nomad_fault|vendor_fault)',
      'Percent Complete',
      'Contract Extensions (number)'
    ];
    
    const csvContent = csvHeaders.join(',') + '\n' +
      '804508,Sample Project Name,2024-01-15,2024-02-20,5,Vendor supplied parts late,vendor_fault,100,2\n' +
      '804509,Another Project,2024-02-01,2024-02-28,0,,not_applicable,100,0';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'delivered_projects_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Success",
      description: "Template downloaded successfully"
    });
  };

  const columns: ColumnDef<DeliveredProject>[] = [
    {
      accessorKey: 'projectNumber',
      header: 'Project Number',
      cell: ({ row }) => (
        <div className="font-medium text-blue-400 hover:underline">
          <Link href={`/project/${row.original.id}`}>
            {row.original.projectNumber}
          </Link>
        </div>
      )
    },
    {
      accessorKey: 'name',
      header: 'Project Name',
    },
    {
      accessorKey: 'contractDate',
      header: 'Contract Date',
      cell: ({ row }) => {
        if (!row.original.contractDate) return '-';
        // Parse date as local time to avoid timezone shifts
        const [year, month, day] = row.original.contractDate.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return format(date, 'MMM d, yyyy');
      }
    },
    {
      accessorKey: 'deliveryDate',
      header: 'Delivery Date',
      cell: ({ row }) => {
        // Check both possible field names for delivery date
        const deliveryDate = row.original.deliveryDate || row.original.actualDeliveryDate;
        
        if (!deliveryDate) return 'Not Delivered';
        // Parse date as local time to avoid timezone shifts
        const [year, month, day] = deliveryDate.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return format(date, 'MMM d, yyyy');
      }
    },
    {
      accessorKey: 'daysLate',
      header: 'Days Late',
      cell: ({ row }) => {
        const daysLate = Math.round(row.original.daysLate);
        
        if (daysLate === 0) {
          return <span className="text-green-400 flex items-center">
            <CheckCircle2 className="h-4 w-4 mr-1" /> On Time
          </span>;
        } else if (daysLate > 0) {
          return <span className="text-red-400">{daysLate} days late</span>;
        } else {
          return <span className="text-green-400">{Math.abs(daysLate)} days early</span>;
        }
      }
    },
    {
      accessorKey: 'lateDeliveryReason',
      header: 'Reason',
      cell: ({ row }) => {
        const projectId = row.original.id;
        const cellId = `reason-${projectId}`;
        const reason = row.original.lateDeliveryReason || row.original.reason;
        
        // Local state for this specific cell - NO GLOBAL STATE BULLSHIT
        const [isEditing, setIsEditing] = useState(false);
        const [reasonValue, setReasonValue] = useState(reason || '');
        const [isUpdating, setIsUpdating] = useState(false);
        
        const handleSave = async () => {
          if (isUpdating) return;
          
          setIsUpdating(true);
          try {
            console.log("💾 DIRECT SAVE - Project:", projectId, "Reason:", reasonValue);
            console.log("🔍 Making API request to:", `/api/delivered-projects/${projectId}/reason`);
            console.log("🔍 Request payload:", { reason: reasonValue });
            
            const response = await apiRequest('PATCH', `/api/delivered-projects/${projectId}/reason`, { 
              reason: reasonValue 
            });
            
            console.log("🎉 API Response received:", response);
            console.log("🎉 Response type:", typeof response);
            console.log("🎉 Response stringified:", JSON.stringify(response));
            
            queryClient.invalidateQueries({ queryKey: ['/api/delivered-projects'] });
            toast({
              title: "Success",
              description: "Reason updated successfully"
            });
            setIsEditing(false);
          } catch (error) {
            console.error("💥 Save failed with error:", error);
            console.error("💥 Error type:", typeof error);
            console.error("💥 Error stringified:", JSON.stringify(error));
            toast({
              title: "Error",
              description: `Update failed: ${error?.message || 'Unknown error'}`,
              variant: "destructive"
            });
          } finally {
            setIsUpdating(false);
          }
        };
        
        const handleCancel = () => {
          setReasonValue(reason || '');
          setIsEditing(false);
        };
        
        if (isEditing) {
          return (
            <div className="min-w-48">
              <textarea
                value={reasonValue}
                onChange={(e) => setReasonValue(e.target.value)}
                className="w-full p-2 border rounded text-sm bg-gray-800 text-white border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                rows={3}
                placeholder="Enter reason for delay..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    handleSave();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                  }
                }}
                autoFocus
              />
              <div className="flex gap-1 mt-1">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="h-6 text-xs"
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="h-6 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          );
        }
        
        return (
          <div className="flex items-center gap-2 group">
            <span className="text-sm">
              {reason || '-'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          </div>
        );
      }
    },
    {
      accessorKey: 'delayResponsibility',
      header: 'Responsibility',
      cell: ({ row }) => {
        const responsibility = row.original.delayResponsibility;
        const projectId = row.original.id;
        
        const getResponsibilityBadge = (value: string | null) => {
          if (value === 'not_applicable') {
            return <span className="px-2 py-1 rounded-full text-xs bg-green-900 text-green-400">N/A</span>;
          } else if (value === 'client_fault') {
            return <span className="px-2 py-1 rounded-full text-xs bg-blue-900 text-blue-400">Client Fault</span>;
          } else if (value === 'nomad_fault') {
            return <span className="px-2 py-1 rounded-full text-xs bg-red-900 text-red-400">Nomad Fault</span>;
          } else if (value === 'vendor_fault') {
            return <span className="px-2 py-1 rounded-full text-xs bg-yellow-900 text-yellow-400">Vendor Fault</span>;
          } else {
            return <span className="px-2 py-1 rounded-full text-xs bg-gray-900 text-gray-400">-</span>;
          }
        };
        
        return (
          <Select
            value={responsibility || ''}
            onValueChange={(value) => {
              updateResponsibilityMutation.mutate({ projectId, responsibility: value });
            }}
            disabled={updateResponsibilityMutation.isPending}
          >
            <SelectTrigger className="w-auto h-auto p-0 border-none bg-transparent hover:bg-gray-800">
              {getResponsibilityBadge(responsibility)}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_applicable">
                <span className="px-2 py-1 rounded-full text-xs bg-green-900 text-green-400">N/A</span>
              </SelectItem>
              <SelectItem value="client_fault">
                <span className="px-2 py-1 rounded-full text-xs bg-blue-900 text-blue-400">Client Fault</span>
              </SelectItem>
              <SelectItem value="nomad_fault">
                <span className="px-2 py-1 rounded-full text-xs bg-red-900 text-red-400">Nomad Fault</span>
              </SelectItem>
              <SelectItem value="vendor_fault">
                <span className="px-2 py-1 rounded-full text-xs bg-yellow-900 text-yellow-400">Vendor Fault</span>
              </SelectItem>
            </SelectContent>
          </Select>
        );
      }
    },
    {
      accessorKey: 'contractExtensions',
      header: 'Contract Extensions',
      cell: ({ row }) => {
        const extensions = row.original.contractExtensions || 0;
        return (
          <div className="text-center">
            <span className={`px-2 py-1 rounded-full text-xs ${
              extensions === 0 ? 'bg-green-900 text-green-400' :
              extensions === 1 ? 'bg-yellow-900 text-yellow-400' :
              'bg-red-900 text-red-400'
            }`}>
              {extensions}
            </span>
          </div>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${
            row.original.status === 'completed' ? 'bg-green-900 text-green-400' :
            row.original.status === 'delivered' ? 'bg-blue-900 text-blue-400' :
            'bg-gray-800 text-gray-400'
          }`}>
            {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
          </span>
        );
      }
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Active Projects
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Delivered Projects</h1>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="bg-darkCard rounded-xl border border-gray-800 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium">Delivered Projects List</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowManualEntry(true)}
              disabled={manualEntryMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowImport(true)}
              disabled={importMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search delivered projects..."
              className="pl-8 bg-darkInput border-gray-700"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : deliveredProjects && deliveredProjects.length > 0 ? (
          <DataTable 
            columns={columns} 
            data={deliveredProjects}
            searchPlaceholder="Filter projects..."
            filterColumn="projectNumber"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-700 rounded-lg">
            <Package className="h-12 w-12 text-gray-500 mb-3" />
            <h3 className="text-lg font-medium mb-1">No Delivered Projects</h3>
            <p className="text-gray-400 max-w-md">
              There are no delivered projects in the system yet. Delivered projects will appear here once they have been marked as delivered.
            </p>
          </div>
        )}
      </div>

      {/* Manual Entry Dialog */}
      <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Delivered Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectNumber">Project Number</Label>
                <Input
                  id="projectNumber"
                  value={manualEntryForm.projectNumber}
                  onChange={(e) => setManualEntryForm(prev => ({ ...prev, projectNumber: e.target.value }))}
                  placeholder="e.g., 804507"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={manualEntryForm.name}
                  onChange={(e) => setManualEntryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Project name"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contractDate">Contract Date</Label>
                <Input
                  id="contractDate"
                  type="date"
                  value={manualEntryForm.contractDate}
                  onChange={(e) => setManualEntryForm(prev => ({ ...prev, contractDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="deliveryDate">Delivery Date</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={manualEntryForm.deliveryDate}
                  onChange={(e) => setManualEntryForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="daysLate">Days Late</Label>
                <Input
                  id="daysLate"
                  type="number"
                  value={manualEntryForm.daysLate}
                  onChange={(e) => setManualEntryForm(prev => ({ ...prev, daysLate: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="contractExtensions">Contract Extensions</Label>
                <Input
                  id="contractExtensions"
                  type="number"
                  value={manualEntryForm.contractExtensions}
                  onChange={(e) => setManualEntryForm(prev => ({ ...prev, contractExtensions: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="delayResponsibility">Delay Responsibility</Label>
              <Select
                value={manualEntryForm.delayResponsibility}
                onValueChange={(value: any) => setManualEntryForm(prev => ({ ...prev, delayResponsibility: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  <SelectItem value="client_fault">Client Fault</SelectItem>
                  <SelectItem value="nomad_fault">Nomad Fault</SelectItem>
                  <SelectItem value="vendor_fault">Vendor Fault</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={manualEntryForm.reason}
                onChange={(e) => setManualEntryForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="General reason or notes"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="lateDeliveryReason">Late Delivery Reason</Label>
              <Textarea
                id="lateDeliveryReason"
                value={manualEntryForm.lateDeliveryReason}
                onChange={(e) => setManualEntryForm(prev => ({ ...prev, lateDeliveryReason: e.target.value }))}
                placeholder="Specific reason for late delivery (if applicable)"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowManualEntry(false)}
                disabled={manualEntryMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={manualEntryMutation.isPending}
              >
                {manualEntryMutation.isPending ? 'Adding...' : 'Add Project'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Delivered Projects</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Upload CSV file with delivered projects</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={downloadTemplate}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <Label htmlFor="file">Select CSV File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  required
                />
              </div>
              
              {importFile && (
                <div className="text-sm text-gray-400">
                  Selected: {importFile.name}
                </div>
              )}

              {/* Real-time Import Logs */}
              {importLogs.length > 0 && (
                <div className="mt-4">
                  <Label>Import Progress</Label>
                  <div className="mt-2 p-4 bg-gray-900 rounded-lg border border-gray-700 max-h-60 overflow-y-auto">
                    <div className="space-y-1 font-mono text-sm">
                      {importLogs.map((log, index) => (
                        <div 
                          key={index} 
                          className={`${
                            log.includes('❌') ? 'text-red-400' :
                            log.includes('✅') || log.includes('🎉') ? 'text-green-400' :
                            log.includes('📊') || log.includes('📁') ? 'text-blue-400' :
                            'text-gray-300'
                          }`}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowImport(false);
                    setImportLogs([]);
                    setImportStatus('idle');
                    setImportFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={importMutation.isPending}
                >
                  {importStatus === 'complete' ? 'Close' : 'Cancel'}
                </Button>
                <Button 
                  type="submit" 
                  disabled={importMutation.isPending || !importFile || importStatus === 'complete'}
                  className={
                    importStatus === 'complete' ? 'bg-green-600 hover:bg-green-700' :
                    importStatus === 'error' ? 'bg-red-600 hover:bg-red-700' :
                    ''
                  }
                >
                  {importMutation.isPending ? 'Processing...' : 
                   importStatus === 'complete' ? '✅ Completed' :
                   importStatus === 'error' ? '❌ Failed' :
                   'Import Projects'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveredProjects;