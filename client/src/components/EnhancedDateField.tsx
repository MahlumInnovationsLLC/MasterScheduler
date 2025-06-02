import React, { useState, useEffect } from 'react';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EnhancedDateFieldProps {
  label: string;
  value: Date | string | undefined;
  onChange: (value: Date | string | undefined) => void;
  placeholder?: string;
  description?: string;
  fieldName?: string; // Add field name for localStorage key
}

export function EnhancedDateField({ label, value, onChange, placeholder, description, fieldName }: EnhancedDateFieldProps) {
  // Check localStorage for saved text selection
  const getStoredTextValue = () => {
    if (!fieldName) return null;
    try {
      const stored = localStorage.getItem(`dateField_${fieldName}`);
      return stored && (stored === 'PENDING' || stored === 'N/A') ? stored : null;
    } catch {
      return null;
    }
  };

  // Determine if current value is a text value or if we should restore from localStorage
  const storedTextValue = getStoredTextValue();
  const isTextValue = typeof value === 'string' && (value === 'PENDING' || value === 'N/A');
  const shouldShowStoredText = !value && storedTextValue; // If database has null but localStorage has text
  
  const [inputMode, setInputMode] = useState<'date' | 'text'>(
    isTextValue || shouldShowStoredText ? 'text' : 'date'
  );
  
  // Convert date to string for input
  const dateValueString = value instanceof Date ? 
    value.toISOString().split('T')[0] : 
    (typeof value === 'string' && value !== 'PENDING' && value !== 'N/A') ? value : '';
  
  // Handle text value display - prioritize stored text if database has null
  const textValue = isTextValue ? (value as string) : (shouldShowStoredText ? storedTextValue : '');

  const handleDateChange = (dateString: string) => {
    if (dateString) {
      // Parse date as local time to avoid timezone shifts
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      onChange(date);
    } else {
      onChange(undefined);
    }
  };

  const handleTextChange = (textValue: string) => {
    // Save text selection to localStorage
    if (fieldName && (textValue === 'PENDING' || textValue === 'N/A')) {
      try {
        localStorage.setItem(`dateField_${fieldName}`, textValue);
      } catch (error) {
        console.warn('Failed to save text selection to localStorage:', error);
      }
    } else if (fieldName && textValue === "CLEAR") {
      // Clear localStorage when user clears field
      try {
        localStorage.removeItem(`dateField_${fieldName}`);
      } catch (error) {
        console.warn('Failed to clear text selection from localStorage:', error);
      }
    }
    
    if (textValue === "CLEAR") {
      onChange(undefined);
    } else if (textValue) {
      onChange(textValue);
    } else {
      onChange(undefined);
    }
  };

  const toggleMode = () => {
    const newMode = inputMode === 'date' ? 'text' : 'date';
    setInputMode(newMode);
    
    // Clear value when switching modes
    onChange(undefined);
  };

  return (
    <FormItem>
      <div className="flex items-center justify-between">
        <FormLabel>{label}</FormLabel>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleMode}
          className="h-6 px-2 text-xs"
        >
          {inputMode === 'date' ? (
            <>
              <Calendar className="h-3 w-3 mr-1" />
              Date
            </>
          ) : (
            <>
              <ToggleLeft className="h-3 w-3 mr-1" />
              Text
            </>
          )}
        </Button>
      </div>
      
      <FormControl>
        {inputMode === 'date' ? (
          <Input
            type="date"
            value={dateValueString}
            onChange={(e) => handleDateChange(e.target.value)}
            placeholder={placeholder}
          />
        ) : (
          <Select
            value={textValue}
            onValueChange={handleTextChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CLEAR">Clear</SelectItem>
              <SelectItem value="PENDING">PENDING</SelectItem>
              <SelectItem value="N/A">N/A</SelectItem>
            </SelectContent>
          </Select>
        )}
      </FormControl>
      
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      
      <FormMessage />
    </FormItem>
  );
}