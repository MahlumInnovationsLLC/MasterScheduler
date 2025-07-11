import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PencilIcon, CalendarIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';

interface EditableBillingDateFieldProps {
  milestoneId: number;
  field: string;
  value: string | null;
  className?: string;
}

const EditableBillingDateField: React.FC<EditableBillingDateFieldProps> = ({ 
  milestoneId, 
  field, 
  value, 
  className 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Store the exact date value without any timezone adjustments
  const [dateValue, setDateValue] = useState<string | undefined>(undefined);
  const [textValue, setTextValue] = useState<string>(''); // For N/A/TBD options
  const [inputMode, setInputMode] = useState<'date' | 'text'>('date');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset date value when value changes - use direct value without adjustments
  useEffect(() => {
    if (value) {
      // Check if it's a text value like N/A or TBD
      if (value === 'N/A' || value === 'TBD') {
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
      setTextValue('N/A');
      setInputMode('text');
    }
  }, [value, field]);

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      // Handle both date and text values
      let valueToSend = null;

      if (inputMode === 'text' && textValue) {
        // Save text values like N/A or TBD
        valueToSend = textValue;
      } else if (inputMode === 'date' && dateValue) {
        // Save the exact date string that was selected without any modifications
        // This ensures the date stored is exactly what the user selected
        valueToSend = dateValue;
      }

      const response = await apiRequest(
        "PATCH",
        `/api/billing-milestones/${milestoneId}`,
        { [field]: valueToSend }
      );

      if (!response.ok) {
        throw new Error(`Failed to update ${field}`);
      }

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones', milestoneId] });

      toast({
        title: "Success",
        description: `${field} updated successfully`,
      });

      setIsEditing(false);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast({
        title: "Error",
        description: `Failed to update ${field}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values
    if (value) {
      if (value === 'N/A' || value === 'TBD') {
        setTextValue(value);
        setInputMode('text');
        setDateValue(undefined);
      } else {
        if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          setDateValue(value);
        } else {
          try {
            const dateObj = new Date(value + 'T00:00:00');
            const localDateString = dateObj.getFullYear() + '-' + 
              String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
              String(dateObj.getDate()).padStart(2, '0');
            setDateValue(localDateString);
          } catch (e) {
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
      setTextValue('N/A');
      setInputMode('text');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // If editing, show the input controls
  if (isEditing) {
    return (
      <div className="flex flex-col space-y-2 p-2 border rounded-md bg-white dark:bg-gray-800 min-w-[200px]">
        {/* Mode toggle buttons */}
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => setInputMode('date')}
            className={`px-2 py-1 text-xs rounded ${
              inputMode === 'date' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Date
          </button>
          <button
            type="button"
            onClick={() => setInputMode('text')}
            className={`px-2 py-1 text-xs rounded ${
              inputMode === 'text' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Text
          </button>
        </div>

        {/* Input field based on mode */}
        {inputMode === 'date' ? (
          <input
            type="date"
            value={dateValue || ''}
            onChange={(e) => setDateValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            autoFocus
          />
        ) : (
          <select
            value={textValue || 'N/A'}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            autoFocus
          >
            <option value="N/A">N/A</option>
            <option value="TBD">TBD</option>
          </select>
        )}

        {/* Action buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {isUpdating ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isUpdating}
            className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
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
          className={`text-sm cursor-pointer flex items-center hover:bg-gray-100/10 px-2 py-1 rounded group ${className || ''}`}
          onClick={() => setIsEditing(true)}
        >
          <span className={value === 'N/A' || value === 'TBD' ? 'text-gray-500 italic' : ''}>
            {(value === 'N/A' || value === 'TBD') ? value : (value ? formatDate(value) : 'N/A')}
          </span>
          <PencilIcon className="h-3.5 w-3.5 ml-2 text-gray-500 opacity-0 group-hover:opacity-100" />
        </div>
      )}
    </div>
  );
};

export default EditableBillingDateField;