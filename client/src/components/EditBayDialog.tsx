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
  isNewBay?: boolean;
}

export function EditBayDialog({ 
  bay, 
  isOpen, 
  onClose, 
  onSave,
  isNewBay = false
}: EditBayDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState<string>('');
  const [bayNumber, setBayNumber] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [assemblyStaffCount, setAssemblyStaffCount] = useState<number>(0);
  const [electricalStaffCount, setElectricalStaffCount] = useState<number>(0);
  const [hoursPerPersonPerWeek, setHoursPerPersonPerWeek] = useState<number>(40);
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
      setHoursPerPersonPerWeek(bay.hoursPerPersonPerWeek || 40);
    } else {
      // Default values for a new bay
      setName('');
      setBayNumber(0);
      setDescription('');
      setAssemblyStaffCount(0);
      setElectricalStaffCount(0);
      setHoursPerPersonPerWeek(40);
    }
  }, [bay]);

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
        title: `Bay ${isNewBay ? 'Created' : 'Updated'}`,
        description: `Bay ${bayNumber}: ${name} has been ${isNewBay ? 'created' : 'updated'} successfully.`,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isNewBay ? 'Create New Bay' : `Edit Bay ${bay?.bayNumber}`}</DialogTitle>
          <DialogDescription>
            {isNewBay 
              ? 'Add a new manufacturing bay with staff and capacity details.'
              : `Update staff counts and capacity for ${bay?.name}.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bayNumber" className="text-right">Bay Number</Label>
            <Input
              id="bayNumber"
              type="number"
              min={1}
              value={bayNumber}
              onChange={(e) => setBayNumber(parseInt(e.target.value) || 0)}
              className="col-span-3"
              disabled={!isNewBay} // Only allow changing bay number for new bays
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Bay Name</Label>
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
              onChange={(e) => setHoursPerPersonPerWeek(parseInt(e.target.value) || 40)}
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
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name || bayNumber <= 0}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}