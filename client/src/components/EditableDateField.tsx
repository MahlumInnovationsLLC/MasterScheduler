import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { Check, PencilIcon, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditableDateFieldProps {
  projectId: number;
  field: string;
  value: string | null;
}

// Utility to debug exactly what's happening with dates
function debugDate(label: string, dateValue: string | null | undefined) {
  if (!dateValue) {
    console.log(`DEBUG DATE [${label}]: No date value provided`);
    return;
  }
  
  try {
    // Original string representation
    console.log(`DEBUG DATE [${label}]: Original string: "${dateValue}"`);
    
    // JS Date object representation
    const dateObj = new Date(dateValue);
    if (!isNaN(dateObj.getTime())) {
      console.log(`DEBUG DATE [${label}]: JS Date object: ${dateObj.toString()}`);
      console.log(`DEBUG DATE [${label}]: ISO string: ${dateObj.toISOString()}`);
      console.log(`DEBUG DATE [${label}]: Local date string: ${dateObj.toLocaleDateString()}`);
      
      // Examine what would happen with +1 day
      const adjustedDate = new Date(dateObj);
      adjustedDate.setDate(adjustedDate.getDate() + 1);
      console.log(`DEBUG DATE [${label}]: +1 day adjusted: ${adjustedDate.toISOString().split('T')[0]}`);
    } else {
      console.log(`DEBUG DATE [${label}]: Not a valid date`);
    }
  } catch (e) {
    console.log(`DEBUG DATE [${label}]: Error analyzing date:`, e);
  }
}

const EditableDateField: React.FC<EditableDateFieldProps> = ({ projectId, field, value }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // SIMPLE DATE HANDLING - FIXED TIMEZONE ISSUE
  // We use the raw date value for display - no adjustments
  const [dateValue, setDateValue] = useState<string | undefined>(undefined);
  const [textValue, setTextValue] = useState<string>(''); // For PENDING/N/A options
  const [inputMode, setInputMode] = useState<'date' | 'text'>('date');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset date value when value changes - direct display, no adjustment
  useEffect(() => {
    // Log some debug info
    debugDate(`Incoming from server (${field})`, value);
    
    if (value) {
      // Check if it's a text value like PENDING or N/A
      if (value === 'PENDING' || value === 'N/A') {
        setTextValue(value);
        setInputMode('text');
        setDateValue(undefined);
      } else if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Just use the value directly if it's already in YYYY-MM-DD format
        console.log(`DATE DISPLAY: Using direct value: ${value}`);
        setDateValue(value);
        setInputMode('date');
        setTextValue('');
      } else {
        // Create a date object if needed
        const dateObj = new Date(value);
        if (!isNaN(dateObj.getTime())) {
          // Format as YYYY-MM-DD for the input
          const displayDate = dateObj.toISOString().split('T')[0];
          console.log(`DATE DISPLAY: Converted ${value} to ${displayDate}`);
          setDateValue(displayDate);
          setInputMode('date');
          setTextValue('');
        } else {
          // Fallback for unparsable dates - treat as text
          setTextValue(value);
          setInputMode('text');
          setDateValue(undefined);
        }
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
        console.log(`TEXT SAVE: Saving text value: ${textValue}`);
      } else if (inputMode === 'date' && dateValue) {
        // FINAL FIX: Save the exact date that was selected without adjustment
        // This ensures exactly what the user sees is what gets stored
        valueToSend = dateValue;
        console.log(`DATE SAVE: Saving directly as selected: ${dateValue}`);
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
          <span className={value === 'PENDING' ? 'text-orange-600 font-medium' : value === 'N/A' ? 'text-gray-500 italic' : ''}>
            {(value === 'PENDING' || value === 'N/A' || value === 'TBD') ? value : formatDate(value)}
          </span>
          <PencilIcon className="h-3.5 w-3.5 ml-2 text-gray-500 opacity-0 group-hover:opacity-100" />
        </div>
      )}
    </div>
  );
};

export default EditableDateField;