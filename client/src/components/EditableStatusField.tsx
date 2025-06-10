import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Check, Plus, X, Palette } from 'lucide-react';

interface EditableStatusFieldProps {
  projectId: number;
  value: string | string[] | null;
  field: string;
}

const defaultStatusOptions = [
  { value: 'active', label: 'Active', color: 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/30' },
  { value: 'delayed', label: 'Delayed', color: 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/30' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/30' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/30' },
  { value: 'delivered', label: 'Delivered', color: 'bg-purple-500 text-white border-purple-600 shadow-lg shadow-purple-500/30' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-500 text-white border-gray-600 shadow-lg shadow-gray-500/30' },
];

const colorOptions = [
  { name: 'Emerald', value: 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/30' },
  { name: 'Blue', value: 'bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/30' },
  { name: 'Red', value: 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/30' },
  { name: 'Amber', value: 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/30' },
  { name: 'Purple', value: 'bg-purple-500 text-white border-purple-600 shadow-lg shadow-purple-500/30' },
  { name: 'Pink', value: 'bg-pink-500 text-white border-pink-600 shadow-lg shadow-pink-500/30' },
  { name: 'Indigo', value: 'bg-indigo-500 text-white border-indigo-600 shadow-lg shadow-indigo-500/30' },
  { name: 'Teal', value: 'bg-teal-500 text-white border-teal-600 shadow-lg shadow-teal-500/30' },
  { name: 'Orange', value: 'bg-orange-500 text-white border-orange-600 shadow-lg shadow-orange-500/30' },
  { name: 'Cyan', value: 'bg-cyan-500 text-white border-cyan-600 shadow-lg shadow-cyan-500/30' },
  { name: 'Lime', value: 'bg-lime-500 text-white border-lime-600 shadow-lg shadow-lime-500/30' },
  { name: 'Gray', value: 'bg-gray-500 text-white border-gray-600 shadow-lg shadow-gray-500/30' },
];

export function EditableStatusField({ projectId, value, field }: EditableStatusFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customColor, setCustomColor] = useState(colorOptions[0].value);
  const [customStatuses, setCustomStatuses] = useState<Array<{value: string, label: string, color: string}>>([]);
  const { toast } = useToast();
  
  // Load custom statuses from localStorage on component mount
  React.useEffect(() => {
    const savedCustomStatuses = localStorage.getItem('customStatusOptions');
    if (savedCustomStatuses) {
      try {
        const parsed = JSON.parse(savedCustomStatuses);
        
        // Update any existing "ON TIME" status to "GOOD"
        const updatedStatuses = parsed.map((status: any) => {
          if (status.label === 'ON TIME' || status.value === 'on-time') {
            return {
              ...status,
              label: 'GOOD',
              value: 'good'
            };
          }
          return status;
        });
        
        // Save updated statuses back to localStorage if changes were made
        const hasChanges = JSON.stringify(parsed) !== JSON.stringify(updatedStatuses);
        if (hasChanges) {
          localStorage.setItem('customStatusOptions', JSON.stringify(updatedStatuses));
        }
        
        setCustomStatuses(updatedStatuses);
      } catch (error) {
        console.error('Failed to parse custom statuses:', error);
      }
    }
  }, []);
  
  // Handle both single string and array values
  const currentStatuses = Array.isArray(value) ? value : (value ? [value] : []);
  
  // Combine default and custom status options
  const allStatusOptions = [...defaultStatusOptions, ...customStatuses];
  
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
      
      // Send as array to support multiple statuses
      const valueToSend = newStatuses;
      
      await apiRequest('PATCH', `/api/projects/${projectId}`, {
        [field]: valueToSend
      });
      
      // Invalidate the cache to trigger a fresh fetch
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
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
      await apiRequest('PATCH', `/api/projects/${projectId}`, {
        [field]: newStatuses
      });
      
      // Invalidate the cache to trigger a fresh fetch
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleCreateCustomStatus = () => {
    if (!customLabel.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a status label.',
        variant: 'destructive'
      });
      return;
    }

    const customValue = customLabel.toLowerCase().replace(/\s+/g, '-');
    
    // Check if this status already exists
    const existingStatus = allStatusOptions.find(opt => opt.value === customValue);
    if (existingStatus) {
      toast({
        title: 'Status Already Exists',
        description: `A status with this name already exists.`,
        variant: 'destructive'
      });
      return;
    }

    const newCustomStatus = {
      value: customValue,
      label: customLabel,
      color: customColor
    };

    const updatedCustomStatuses = [...customStatuses, newCustomStatus];
    setCustomStatuses(updatedCustomStatuses);
    
    // Save to localStorage
    localStorage.setItem('customStatusOptions', JSON.stringify(updatedCustomStatuses));
    
    setCustomLabel('');
    setCustomColor(colorOptions[0].value);
    setShowCustomForm(false);
    
    toast({
      title: 'Custom Status Created',
      description: `"${customLabel}" status has been added and is now available for selection.`,
    });
  };

  return (
    <div className="flex flex-wrap gap-1 items-center min-w-0">
      {/* Display current status badges */}
      {currentStatuses.map(status => {
        const statusOption = allStatusOptions.find(opt => opt.value === status);
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
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-2">
            {!showCustomForm ? (
              <>
                <div className="text-xs font-medium text-gray-700 mb-2">Select Status</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {allStatusOptions.map((option) => {
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
                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomForm(true)}
                  className="w-full text-xs"
                >
                  <Palette className="w-3 h-3 mr-1" />
                  Create Custom Status
                </Button>
              </>
            ) : (
              <>
                <div className="text-xs font-medium text-gray-700 mb-2">Create Custom Status</div>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="custom-label" className="text-xs">Status Label</Label>
                    <Input
                      id="custom-label"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="e.g., In Review"
                      className="text-xs h-7"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <div className="grid grid-cols-4 gap-1 mt-1">
                      {colorOptions.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setCustomColor(color.value)}
                          className={`w-8 h-6 rounded border-2 ${color.value} ${
                            customColor === color.value ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                          }`}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreateCustomStatus}
                      className="flex-1 text-xs h-7"
                    >
                      Create
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCustomForm(false);
                        setCustomLabel('');
                        setCustomColor(colorOptions[0].value);
                      }}
                      className="flex-1 text-xs h-7"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}