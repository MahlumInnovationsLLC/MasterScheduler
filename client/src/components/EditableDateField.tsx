import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { Check, PencilIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditableDateFieldProps {
  projectId: number;
  field: string;
  value: string | null;
}

const EditableDateField: React.FC<EditableDateFieldProps> = ({ projectId, field, value }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dateValue, setDateValue] = useState<string | undefined>(
    value ? new Date(value).toISOString().split('T')[0] : undefined
  );
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset date value when value changes
  useEffect(() => {
    if (value) {
      setDateValue(new Date(value).toISOString().split('T')[0]);
    } else {
      setDateValue(undefined);
    }
  }, [value]);

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      // Handle both setting and clearing dates
      const dateToSend = dateValue 
        ? new Date(dateValue).toISOString().split('T')[0] // Just send the date portion (YYYY-MM-DD)
        : null; // Send null to clear the date
        
      const response = await apiRequest(
        "PATCH",
        `/api/projects/${projectId}`,
        { [field]: dateToSend }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update date');
      }
      
      // Wait for the invalidation to complete
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      toast({
        title: "Date Updated",
        description: "The date has been updated successfully",
        variant: "default"
      });
      
      // Set editing state to false after successful update
      setIsEditing(false);
    } catch (error) {
      console.error("Date update error:", error);
      toast({
        title: "Update Failed",
        description: `Error updating date: ${(error as Error).message}`,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Display editor if in edit mode
  if (isEditing) {
    return (
      <div className="flex items-center space-x-2">
        <input
          type="date"
          className="w-32 px-2 py-1 rounded text-xs bg-background border border-input"
          value={dateValue || ''}
          onChange={(e) => setDateValue(e.target.value)}
        />
        <div className="flex space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={handleSave}
            disabled={isUpdating}
          >
            {isUpdating ? 
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent border-primary"></div> : 
              <Check className="h-3 w-3 text-success" />
            }
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => setIsEditing(false)}
            disabled={isUpdating}
          >
            <X className="h-3 w-3 text-danger" />
          </Button>
        </div>
      </div>
    );
  }

  // Regular display mode
  return (
    <div className="relative">
      {isUpdating ? (
        <div className="flex items-center">
          <div className="h-3 w-3 mr-2 animate-spin rounded-full border-2 border-t-transparent border-primary"></div>
          <span>Updating...</span>
        </div>
      ) : (
        <div 
          className="text-sm cursor-pointer flex items-center hover:bg-gray-100/10 px-2 py-1 rounded group"
          onClick={() => setIsEditing(true)}
        >
          <span>{formatDate(value)}</span>
          <PencilIcon className="h-3.5 w-3.5 ml-2 text-gray-500 opacity-0 group-hover:opacity-100" />
        </div>
      )}
    </div>
  );
};

export default EditableDateField;