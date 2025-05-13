import { useState, useEffect, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ManufacturingBay } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

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
  const [rowCount, setRowCount] = useState<number>(4); // Default to 4 rows
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Calculate total staff count
  const totalStaffCount = assemblyStaffCount + electricalStaffCount;

  // Check if this is bay number 7 or 8
  const isBay7Or8 = useMemo(() => {
    return bayNumber === 7 || bayNumber === 8;
  }, [bayNumber]);
  
  // Set initial values when bay changes
  useEffect(() => {
    if (bay) {
      setName(bay.name || '');
      setBayNumber(bay.bayNumber || 0);
      setDescription(bay.description || '');
      setAssemblyStaffCount(bay.assemblyStaffCount || 0);
      setElectricalStaffCount(bay.electricalStaffCount || 0);
      setHoursPerPersonPerWeek(bay.hoursPerPersonPerWeek || 32);
      
      // For Bay 7 & 8, use 20 rows by default regardless of name
      if (bay.bayNumber === 7 || bay.bayNumber === 8) {
        setRowCount(20);
      } else {
        setRowCount(4); // Default for other bays
      }
    } else {
      // Default values for a new bay
      setName('');
      setBayNumber(0);
      setDescription('');
      setAssemblyStaffCount(0);
      setElectricalStaffCount(0);
      setHoursPerPersonPerWeek(32);
      setRowCount(4);
    }
  }, [bay]);

  // Update row count if bay 7 or 8 is selected
  useEffect(() => {
    if (isBay7Or8 && rowCount !== 20) {
      setRowCount(20);
    }
  }, [isBay7Or8, rowCount]);

  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  
  const handleSave = async () => {
    if (!bay && !isNewBay) return;
    
    try {
      setIsSaving(true);
      
      // Enhance description to include row count info for Bay 7 & 8
      const enhancedDescription = description + (isBay7Or8 ? 
        (description ? ' ' : '') + `(Special configuration with ${rowCount} rows)` : '');
      
      const bayData = {
        name,
        bayNumber,
        description: enhancedDescription,
        assemblyStaffCount,
        electricalStaffCount,
        staffCount: totalStaffCount, // Set total staff count
        hoursPerPersonPerWeek
      };
      
      const bayId = bay?.id || 0;
      await onSave(bayId, bayData);
      
      toast({
        title: `Bay ${isNewBay ? 'Created' : 'Updated'}`,
        description: `Bay ${name} has been ${isNewBay ? 'created' : 'updated'} successfully.`,
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
        title: "Bay Deleted",
        description: `Bay ${bay.name} has been deleted successfully.`,
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
          <DialogTitle>{isNewBay ? 'Create New Bay' : `Edit Bay ${bay?.name}`}</DialogTitle>
          <DialogDescription>
            {isNewBay 
              ? 'Add a new manufacturing bay with staff and capacity details.'
              : `Update staff counts and capacity for Bay ${bay?.name}.`}
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
              // Allow editing bay number for all bays
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
          
          {/* Row Count Configuration */}
          <div className="border-t border-gray-700 pt-4 pb-1">
            <h3 className="text-sm font-medium mb-2">Layout Configuration</h3>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rowCount" className="text-right">Row Count</Label>
            <div className="col-span-3">
              <Select 
                value={rowCount.toString()} 
                onValueChange={(val) => setRowCount(parseInt(val))}
                disabled={isBay7Or8} // Lock to 20 rows for Bay 7 & 8
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select row count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 rows (standard)</SelectItem>
                  <SelectItem value="8">8 rows</SelectItem>
                  <SelectItem value="12">12 rows</SelectItem>
                  <SelectItem value="16">16 rows</SelectItem>
                  <SelectItem value="20">20 rows</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Add note about Bay 7 & 8 special requirement */}
              {isBay7Or8 && (
                <div className="flex items-center mt-2 text-amber-400 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Bay number 7 and 8 must use 20 rows by system requirement
                </div>
              )}
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
                    Delete Bay
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