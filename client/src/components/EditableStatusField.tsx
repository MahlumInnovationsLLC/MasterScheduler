import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

interface EditableStatusFieldProps {
  projectId: number;
  value: string | null;
  field: string;
}

const statusOptions = [
  { value: 'active', label: 'Active', color: 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/30' },
  { value: 'delayed', label: 'Delayed', color: 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/30' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/30' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/30' },
  { value: 'delivered', label: 'Delivered', color: 'bg-purple-500 text-white border-purple-600 shadow-lg shadow-purple-500/30' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-500 text-white border-gray-600 shadow-lg shadow-gray-500/30' },
];

export function EditableStatusField({ projectId, value, field }: EditableStatusFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  
  const currentStatus = statusOptions.find(option => option.value === value);
  
  const handleStatusChange = async (newValue: string) => {
    try {
      await apiRequest('PATCH', `/api/projects/${projectId}`, {
        [field]: newValue
      });
      
      // Update the cache
      queryClient.setQueryData(['/api/projects'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((project: any) => 
          project.id === projectId ? { ...project, [field]: newValue } : project
        );
      });
      
      setIsOpen(false);
      
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update project status.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Select 
      value={value || ''} 
      onValueChange={handleStatusChange}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className="w-full border-none shadow-none bg-transparent hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20">
        <SelectValue asChild>
          <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border-2 ${
            currentStatus?.color || 'bg-gray-200 text-gray-800 border-gray-300'
          }`}>
            {currentStatus?.label || value || 'Select Status'}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border-2 ${option.color}`}>
              {option.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}