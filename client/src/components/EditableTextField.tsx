import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { Check, PencilIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditableTextFieldProps {
  projectId: number;
  field: string;
  value: string | number | null;
  isPercentage?: boolean;
  maxLength?: number;
}

const EditableTextField: React.FC<EditableTextFieldProps> = ({ 
  projectId, 
  field, 
  value, 
  isPercentage = false,
  maxLength = 100
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [textValue, setTextValue] = useState<string>(value?.toString() || '');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setIsUpdating(true);
    
    // Format value for API request based on field type
    let valueToSave: string | number = textValue;
    
    // If it's a percentage field, convert to number (remove % if present)
    if (isPercentage && textValue) {
      valueToSave = parseInt(textValue.replace('%', ''), 10);
      if (isNaN(valueToSave)) {
        toast({
          title: "Invalid Input",
          description: "Please enter a valid number for percentage",
          variant: "destructive"
        });
        setIsUpdating(false);
        return;
      }
    }
    
    try {
      await apiRequest(
        "PATCH",
        `/api/projects/${projectId}`,
        { [field]: valueToSave }
      );
      
      // Exit editing mode immediately to prevent focus issues
      setIsEditing(false);
      
      // COMPLETELY DISABLE CACHE INVALIDATION TO PREVENT FOCUS LOSS
      // Data will refresh on page reload or manual refresh
      // setTimeout(() => {
      //   queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // }, 500);
      
      toast({
        title: "Updated Successfully",
        description: `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} has been updated`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: `Error updating field: ${(error as Error).message}`,
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
          type="text"
          className="w-32 px-2 py-1 rounded text-xs bg-background border border-input"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          maxLength={maxLength}
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
          <span>{isPercentage && value ? `${value}%` : (value || 'N/A')}</span>
          <PencilIcon className="h-3.5 w-3.5 ml-2 text-gray-500 opacity-0 group-hover:opacity-100" />
        </div>
      )}
    </div>
  );
};

export default EditableTextField;