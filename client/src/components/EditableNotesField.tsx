import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Pencil as PencilIcon, PlusCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditableNotesFieldProps {
  projectId: number;
  value: string | null;
}

const EditableNotesField: React.FC<EditableNotesFieldProps> = ({ projectId, value }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [noteValue, setNoteValue] = useState<string>(value || '');
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
      
      // Exit editing mode immediately to prevent focus issues
      setIsEditing(false);
      
      // Re-enable cache invalidation with a delay to prevent focus issues
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      }, 100);
      
      toast({
        title: "Notes Updated",
        description: "Notes have been updated successfully",
        variant: "default"
      });
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

  // Display editor if in edit mode
  if (isEditing) {
    return (
      <div className="flex flex-col space-y-2 py-1">
        <textarea
          className="w-full h-24 px-2 py-1 rounded text-xs bg-background border border-input"
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

  // Regular display mode
  return (
    <div 
      className="text-sm cursor-pointer hover:underline flex items-center min-h-[32px] relative group"
      onClick={() => setIsEditing(true)}
    >
      {noteValue ? (
        <>
          <div className="line-clamp-2">{noteValue}</div>
          <PencilIcon className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 absolute right-0 top-0" />
        </>
      ) : (
        <div className="text-gray-400 flex items-center">
          <span>Add notes</span>
          <PlusCircle className="h-3 w-3 ml-1" />
        </div>
      )}
    </div>
  );
};

export default EditableNotesField;