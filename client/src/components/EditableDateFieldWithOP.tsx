import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { Check, PencilIcon, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditableDateFieldWithOPProps {
  projectId: number;
  field: string;
  value: string | null;
  opValue: string | null; // Originally Planned date value
  opField: string; // Originally Planned field name (e.g., 'opContractDate')
  className?: string;
}

const EditableDateFieldWithOP: React.FC<EditableDateFieldWithOPProps> = ({ 
  projectId, 
  field, 
  value, 
  opValue, 
  opField, 
  className 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Store the exact date value without any timezone adjustments
  const [dateValue, setDateValue] = useState<string | undefined>(undefined);
  const [textValue, setTextValue] = useState<string>(''); // For PENDING/N/A options
  const [inputMode, setInputMode] = useState<'date' | 'text'>('date');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper function to check if current date is different from OP date
  const isCurrentDateDifferentFromOP = () => {
    if (!value || !opValue || value === 'N/A' || opValue === 'N/A' || value === 'PENDING' || opValue === 'PENDING' || value === 'TBD' || opValue === 'TBD') {
      return false;
    }
    
    try {
      const currentDate = new Date(value);
      const opDate = new Date(opValue);
      // Return true if dates are different (either earlier or later)
      return currentDate.getTime() !== opDate.getTime();
    } catch {
      return false;
    }
  };

  // Calculate if date is different from OP to ensure it updates with pagination
  const isDifferentFromOP = useMemo(() => {
    return isCurrentDateDifferentFromOP();
  }, [value, opValue]);

  // Reset date value when value changes - use direct value without adjustments
  useEffect(() => {
    if (value) {
      // Check if it's a text value like PENDING or N/A
      if (value === 'PENDING' || value === 'N/A' || value === 'TBD') {
        setTextValue(value);
        setInputMode('text');
        setDateValue(undefined);
      } else {
        // For date values, use them exactly as they come from the server
        // If it's already in YYYY-MM-DD format, use it directly
        if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          setDateValue(value);
        } else {
          // If it's a different format, convert it but preserve the date
          try {
            const dateObj = new Date(value + 'T00:00:00'); // Add time to prevent timezone issues
            const localDateString = dateObj.getFullYear() + '-' + 
              String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
              String(dateObj.getDate()).padStart(2, '0');
            setDateValue(localDateString);
          } catch (e) {
            // If parsing fails, treat as text
            setTextValue(value);
            setInputMode('text');
            setDateValue(undefined);
            return;
          }
        }
        setInputMode('date');
        setTextValue('');
      }
    } else {
      setDateValue(undefined);
      setTextValue('');
      setInputMode('date');
    }
  }, [value, field]);

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      // Handle both date and text values
      let valueToSend = null;

      if (inputMode === 'text' && textValue) {
        // Save text values like PENDING or N/A
        valueToSend = textValue;
      } else if (inputMode === 'date' && dateValue) {
        // Save the exact date string that was selected without any modifications
        // This ensures the date stored is exactly what the user selected
        valueToSend = dateValue;
      }

      const response = await apiRequest(
        "PATCH",
        `/api/projects/${projectId}`,
        { [field]: valueToSend }
      );

      if (!response.ok) {
        throw new Error('Failed to update date');
      }

      // Exit editing mode immediately to prevent focus issues
      setIsEditing(false);

      // Re-enable cache invalidation but with a delay to prevent focus issues
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      }, 100);

      toast({
        title: "Field Updated",
        description: "The field has been updated successfully",
        variant: "default"
      });
    } catch (error) {
      console.error("Field update error:", error);
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
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          {inputMode === 'date' ? (
            <input
              type="date"
              className="w-32 px-2 py-1 rounded text-xs bg-background border border-input"
              value={dateValue || ''}
              onChange={(e) => setDateValue(e.target.value)}
            />
          ) : (
            <select
              className="w-32 px-2 py-1 rounded text-xs bg-background border border-input"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
            >
              <option value="">Select...</option>
              <option value="PENDING">PENDING</option>
              <option value="N/A">N/A</option>
              <option value="TBD">TBD</option>
            </select>
          )}
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => setInputMode(inputMode === 'date' ? 'text' : 'date')}
              disabled={isUpdating}
              title="Switch between date and text mode"
            >
              <Calendar className="h-3 w-3" />
            </Button>
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
        
        {/* Show OP date during editing (non-editable) */}
        {opValue && (
          <div className="text-xs text-gray-400 ml-2">
            OP: {(opValue === 'PENDING' || opValue === 'N/A' || opValue === 'TBD') ? opValue : formatDate(opValue)}
          </div>
        )}
      </div>
    );
  }

  // Regular display mode
  return (
    <div className="relative">
      {isUpdating ? (
        <div className="flex flex-col">
          <div className="flex items-center">
            <div className="h-3 w-3 mr-2 animate-spin rounded-full border-2 border-t-transparent border-primary"></div>
            <span>Updating...</span>
          </div>
          {/* Show OP date even during update */}
          {opValue && (
            <div className="text-xs text-gray-400 mt-1">
              OP: {(opValue === 'PENDING' || opValue === 'N/A' || opValue === 'TBD') ? opValue : formatDate(opValue)}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <div 
            className={`text-sm cursor-pointer flex items-center hover:bg-gray-100/10 px-2 py-1 rounded group ${
              isDifferentFromOP ? 'bg-orange-300/30 dark:bg-orange-500/20 border-l-4 border-l-orange-500' : ''
            } ${className || ''}`}
            onClick={() => setIsEditing(true)}
          >
            <span className={value === 'PENDING' ? 'text-orange-600 font-medium' : value === 'N/A' || value === 'TBD' ? 'text-gray-500 italic' : ''}>
              {(value === 'PENDING' || value === 'N/A' || value === 'TBD') ? value : formatDate(value)}
            </span>
            <PencilIcon className="h-3.5 w-3.5 ml-2 text-gray-500 opacity-0 group-hover:opacity-100" />
          </div>
          
          {/* Originally Planned date displayed below the main date */}
          {opValue && (
            <div className="text-xs text-gray-400 mt-1 px-2">
              OP: {(opValue === 'PENDING' || opValue === 'N/A' || opValue === 'TBD') ? opValue : formatDate(opValue)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EditableDateFieldWithOP;