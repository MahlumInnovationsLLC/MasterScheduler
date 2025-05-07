import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ManufacturingBay } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface EditBayDialogProps {
  bay: ManufacturingBay | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (bayId: number, data: Partial<ManufacturingBay>) => Promise<void>;
  onDelete?: (bayId: number) => Promise<void>;
  isNewBay?: boolean;
}

export function EditBayDialog({ 
  bay, 
  isOpen, 
  onClose, 
  onSave,
  onDelete,
  isNewBay = false
}: EditBayDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState<string>('');
  const [bayNumber, setBayNumber] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [assemblyStaffCount, setAssemblyStaffCount] = useState<number>(0);
  const [electricalStaffCount, setElectricalStaffCount] = useState<number>(0);
  const [hoursPerPersonPerWeek, setHoursPerPersonPerWeek] = useState<number>(32);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Calculate total staff count
  const totalStaffCount = assemblyStaffCount + electricalStaffCount;
  
  // Set initial values when bay changes
  useEffect(() => {
    if (bay) {
      setName(bay.name || '');
      setBayNumber(bay.bayNumber || 0);
      setDescription(bay.description || '');
      setAssemblyStaffCount(bay.assemblyStaffCount || 0);
      setElectricalStaffCount(bay.electricalStaffCount || 0);
      setHoursPerPersonPerWeek(bay.hoursPerPersonPerWeek || 32);
    } else {
      // Default values for a new bay
      setName('');
      setBayNumber(0);
      setDescription('');
      setAssemblyStaffCount(0);
      setElectricalStaffCount(0);
      setHoursPerPersonPerWeek(32);
    }
  }, [bay]);

  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  
  const handleSave = async () => {
    if (!bay && !isNewBay) return;
    
    try {
      setIsSaving(true);
      
      const bayData = {
        name,
        bayNumber,
        description,
        assemblyStaffCount,
        electricalStaffCount,
        staffCount: totalStaffCount, // Set total staff count
        hoursPerPersonPerWeek,
      };
      
      const bayId = bay?.id || 0;
      await onSave(bayId, bayData);
      
      toast({
        title: `Team ${isNewBay ? 'Created' : 'Updated'}`,
        description: `Team ${name} has been ${isNewBay ? 'created' : 'updated'} successfully.`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving bay:', error);
      toast({
        title: "Error",
        description: `Failed to ${isNewBay ? 'create' : 'update'} bay. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!bay || !bay.id || !onDelete) return;
    
    try {
      setIsDeleting(true);
      
      await onDelete(bay.id);
      
      toast({
        title: "Team Deleted",
        description: `Team ${bay.name} has been deleted successfully.`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error deleting bay:', error);
      toast({
        title: "Error",
        description: "Failed to delete bay. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isNewBay ? 'Create New Team' : `Edit Team ${bay?.name}`}</DialogTitle>
          <DialogDescription>
            {isNewBay 
              ? 'Add a new manufacturing team with staff and capacity details.'
              : `Update staff counts and capacity for Team ${bay?.name}.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bayNumber" className="text-right">Team Number</Label>
            <Input
              id="bayNumber"
              type="number"
              min={1}
              value={bayNumber}
              onChange={(e) => setBayNumber(parseInt(e.target.value) || 0)}
              className="col-span-3"
              // Allow editing bay number for all bays
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Team Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="border-t border-gray-700 pt-4 pb-1">
            <h3 className="text-sm font-medium mb-2">Staffing Breakdown</h3>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assemblyStaff" className="text-right">Assembly Staff</Label>
            <Input
              id="assemblyStaff"
              type="number"
              min={0}
              value={assemblyStaffCount}
              onChange={(e) => setAssemblyStaffCount(parseInt(e.target.value) || 0)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="electricalStaff" className="text-right">Electrical Staff</Label>
            <Input
              id="electricalStaff"
              type="number"
              min={0}
              value={electricalStaffCount}
              onChange={(e) => setElectricalStaffCount(parseInt(e.target.value) || 0)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Total Staff</Label>
            <div className="col-span-3 py-2 px-3 bg-muted rounded border">
              {totalStaffCount} staff member{totalStaffCount !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="hoursPerWeek" className="text-right">Hours Per Person/Week</Label>
            <Input
              id="hoursPerWeek"
              type="number"
              min={1}
              max={168}
              value={hoursPerPersonPerWeek}
              onChange={(e) => setHoursPerPersonPerWeek(parseInt(e.target.value) || 32)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Weekly Capacity</Label>
            <div className="col-span-3 py-2 px-3 bg-muted rounded border">
              {totalStaffCount * hoursPerPersonPerWeek} hours per week
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex items-center justify-between">
          <div>
            {!isNewBay && onDelete && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive">Are you sure?</span>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting || isSaving}
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSaving}
                    className="text-destructive border-destructive hover:bg-destructive/10"
                  >
                    Delete Team
                  </Button>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving || isDeleting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || isDeleting || !name || bayNumber <= 0}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}