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
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'delayed', label: 'Delayed', color: 'bg-red-100 text-red-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-purple-100 text-purple-800' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-100 text-gray-800' },
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
      <SelectTrigger className="w-full border-none shadow-none bg-transparent hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-primary">
        <SelectValue asChild>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            currentStatus?.color || 'bg-gray-100 text-gray-800'
          }`}>
            {currentStatus?.label || value || 'Select Status'}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
              {option.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}