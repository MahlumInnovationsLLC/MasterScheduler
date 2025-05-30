import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, Plus, X } from 'lucide-react';

interface EditableStatusFieldProps {
  projectId: number;
  value: string | string[] | null;
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
  
  // Handle both single string and array values
  const currentStatuses = Array.isArray(value) ? value : (value ? [value] : []);
  
  const handleStatusToggle = async (statusValue: string) => {
    try {
      let newStatuses: string[];
      
      if (currentStatuses.includes(statusValue)) {
        // Remove status (only if we have more than one)
        if (currentStatuses.length > 1) {
          newStatuses = currentStatuses.filter(s => s !== statusValue);
        } else {
          return; // Don't remove the last status
        }
      } else {
        // Add status
        newStatuses = [...currentStatuses, statusValue];
      }
      
      // For database compatibility, send as single string if only one status
      const valueToSend = newStatuses.length === 1 ? newStatuses[0] : newStatuses[0]; // Keep single for now
      
      await apiRequest('PATCH', `/api/projects/${projectId}`, {
        [field]: valueToSend
      });
      
      // Update the cache
      queryClient.setQueryData(['/api/projects'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((project: any) => 
          project.id === projectId ? { ...project, [field]: valueToSend } : project
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

  const removeStatus = async (statusValue: string) => {
    if (currentStatuses.length <= 1) return; // Don't allow removing the last status
    
    const newStatuses = currentStatuses.filter(s => s !== statusValue);
    
    try {
      const valueToSend = newStatuses[0]; // Use first remaining status
      
      await apiRequest('PATCH', `/api/projects/${projectId}`, {
        [field]: valueToSend
      });
      
      queryClient.setQueryData(['/api/projects'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((project: any) => 
          project.id === projectId ? { ...project, [field]: valueToSend } : project
        );
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <div className="flex flex-wrap gap-1 items-center min-w-0">
      {/* Display current status badges */}
      {currentStatuses.map(status => {
        const statusOption = statusOptions.find(opt => opt.value === status);
        return (
          <div
            key={status}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border-2 ${
              statusOption?.color || 'bg-gray-500 text-white border-gray-600'
            }`}
          >
            {statusOption?.label || status}
            {currentStatuses.length > 1 && (
              <button
                onClick={() => removeStatus(status)}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
      
      {/* Add status button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs border-dashed hover:border-solid transition-all"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-700 mb-2 px-1">Select Status</div>
            {statusOptions.map((option) => {
              const isSelected = currentStatuses.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusToggle(option.value)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-gray-50 transition-colors ${
                    isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                  disabled={isSelected}
                >
                  <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border-2 ${option.color}`}>
                    {option.label}
                  </div>
                  {isSelected && <Check className="w-3 h-3 text-green-600" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}