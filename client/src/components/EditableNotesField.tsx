import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { Check, PencilIcon, X } from 'lucide-react';

interface EditableNotesFieldProps {
  projectId: number;
  value: string | null;
}

const EditableNotesField: React.FC<EditableNotesFieldProps> = ({ projectId, value }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [noteValue, setNoteValue] = useState(value || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      await apiRequest(
        "PATCH",
        `/api/projects/${projectId}`,
        { notes: noteValue }
      );
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Notes Updated",
        description: "The notes have been updated successfully",
        variant: "default"
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: `Error updating notes: ${(error as Error).message}`,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col space-y-2 py-1">
        <Textarea
          className="w-full text-xs"
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
          placeholder="Add notes here..."
        />
        <div className="flex justify-end space-x-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6" 
            onClick={handleSave}
            disabled={isUpdating}
          >
            {isUpdating ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent border-primary"></div> : <Check className="h-3 w-3 text-success mr-1" />}
            Save
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6" 
            onClick={() => setIsEditing(false)}
            disabled={isUpdating}
          >
            <X className="h-3 w-3 text-danger mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-start cursor-pointer hover:bg-gray-100/10 px-2 py-1 rounded group"
      onClick={() => setIsEditing(true)}
    >
      <div className="flex-1 text-sm">
        {value ? 
          <div className="line-clamp-2" title={value}>{value}</div>
          : <span className="text-gray-400 italic">Add notes...</span>
        }
      </div>
      <PencilIcon className="h-3.5 w-3.5 ml-2 text-gray-500 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100" />
    </div>
  );
};

export default EditableNotesField;