import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Download, Package, Truck, Search, Calendar, CheckCircle2, Edit2, Check, X } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type DeliveredProject = {
  id: number;
  projectNumber: string;
  name: string;
  contractDate: string | null;
  actualDeliveryDate: string | null;
  daysLate: number;
  reason: string | null;
  delayResponsibility: 'not_applicable' | 'client_fault' | 'nomad_fault' | 'vendor_fault';
  percentComplete: string;
  status: string;
};

const DeliveredProjects = () => {
  const [editingReason, setEditingReason] = useState<number | null>(null);
  const [reasonValue, setReasonValue] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: deliveredProjects, isLoading } = useQuery({
    queryKey: ['/api/delivered-projects'],
  });

  const updateReasonMutation = useMutation({
    mutationFn: async ({ projectId, reason }: { projectId: number; reason: string }) => {
      return apiRequest(`/api/delivered-projects/${projectId}/reason`, 'PATCH', { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/delivered-projects'] });
      toast({ title: "Success", description: "Reason updated successfully" });
      setEditingReason(null);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to update reason",
        variant: "destructive"
      });
    }
  });

  const handleReasonEdit = (projectId: number, currentReason: string | null) => {
    setEditingReason(projectId);
    setReasonValue(currentReason || '');
  };

  const handleReasonSave = (projectId: number) => {
    updateReasonMutation.mutate({ projectId, reason: reasonValue });
  };

  const handleReasonCancel = () => {
    setEditingReason(null);
    setReasonValue('');
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
      accessorKey: 'actualDeliveryDate',
      header: 'Actual Delivery Date',
      cell: ({ row }) => {
        if (!row.original.actualDeliveryDate) return 'Not Delivered';
        // Parse date as local time to avoid timezone shifts
        const [year, month, day] = row.original.actualDeliveryDate.split('-');
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
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => {
        const projectId = row.original.id;
        const isEditing = editingReason === projectId;
        
        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={reasonValue}
                onChange={(e) => setReasonValue(e.target.value)}
                className="h-8 text-xs"
                placeholder="Enter reason..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleReasonSave(projectId);
                  } else if (e.key === 'Escape') {
                    handleReasonCancel();
                  }
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleReasonSave(projectId)}
                disabled={updateReasonMutation.isPending}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReasonCancel}
                disabled={updateReasonMutation.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        }
        
        return (
          <div className="flex items-center gap-2 group">
            <span className="text-sm">
              {row.original.reason || '-'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={() => handleReasonEdit(projectId, row.original.reason)}
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
        
        if (responsibility === 'not_applicable') {
          return <span className="px-2 py-1 rounded-full text-xs bg-green-900 text-green-400">N/A</span>;
        } else if (responsibility === 'client_fault') {
          return <span className="px-2 py-1 rounded-full text-xs bg-blue-900 text-blue-400">Client</span>;
        } else if (responsibility === 'nomad_fault') {
          return <span className="px-2 py-1 rounded-full text-xs bg-red-900 text-red-400">Nomad</span>;
        } else {
          return <span className="px-2 py-1 rounded-full text-xs bg-yellow-900 text-yellow-400">Vendor</span>;
        }
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
    </div>
  );
};

export default DeliveredProjects;