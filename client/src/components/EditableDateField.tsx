import React, { useState } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { PencilIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface EditableDateFieldProps {
  projectId: number;
  field: string;
  value: string | null;
}

const EditableDateField: React.FC<EditableDateFieldProps> = ({ projectId, field, value }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleUpdate = async (newDate?: Date) => {
    const dateToSave = newDate || date;
    
    setIsUpdating(true);
    try {
      await apiRequest(
        "PATCH",
        `/api/projects/${projectId}`,
        { [field]: dateToSave?.toISOString() || null }
      );
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Date Updated",
        description: "The date has been updated successfully",
        variant: "default"
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: `Error updating date: ${(error as Error).message}`,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative">
      {isUpdating ? (
        <div className="flex items-center">
          <div className="h-3 w-3 mr-2 animate-spin rounded-full border-2 border-t-transparent border-primary"></div>
          <span>Updating...</span>
        </div>
      ) : (
        <Popover open={isEditing} onOpenChange={setIsEditing}>
          <PopoverTrigger asChild>
            <div 
              className="flex items-center cursor-pointer hover:bg-gray-100/10 px-2 py-1 rounded group text-sm"
            >
              <span>{formatDate(value)}</span>
              <PencilIcon className="h-3.5 w-3.5 ml-2 text-gray-500 opacity-0 group-hover:opacity-100" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                if (newDate) {
                  setDate(newDate);
                  handleUpdate(newDate);
                } else {
                  setIsEditing(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default EditableDateField;