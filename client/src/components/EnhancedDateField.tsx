import React, { useState } from 'react';
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
}

export function EnhancedDateField({ label, value, onChange, placeholder, description }: EnhancedDateFieldProps) {
  // Determine current value type and set initial mode based on value
  const isTextValue = typeof value === 'string' && (value === 'PENDING' || value === 'N/A');
  const [inputMode, setInputMode] = useState<'date' | 'text'>(isTextValue ? 'text' : 'date');
  
  // Convert date to string for input
  const dateValueString = value instanceof Date ? 
    value.toISOString().split('T')[0] : 
    (typeof value === 'string' && value !== 'PENDING' && value !== 'N/A') ? value : '';
  
  const textValue = isTextValue ? value as string : '';

  const handleDateChange = (dateString: string) => {
    if (dateString) {
      const date = new Date(dateString);
      onChange(date);
    } else {
      onChange(undefined);
    }
  };

  const handleTextChange = (textValue: string) => {
    if (textValue) {
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
              <SelectItem value="">Clear</SelectItem>
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