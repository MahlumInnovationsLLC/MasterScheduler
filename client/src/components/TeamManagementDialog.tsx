import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Clock } from 'lucide-react';
import { useApiRequest } from '@/lib/queryClient';

interface TeamManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName: string | null;
  bays: any[]; // Will type this properly based on ManufacturingBay from your existing code
  onTeamUpdate?: (teamName: string, assemblyStaff: number, electricalStaff: number, hoursPerWeek: number) => Promise<void>;
}

export function TeamManagementDialog({
  open,
  onOpenChange,
  teamName,
  bays,
  onTeamUpdate
}: TeamManagementDialogProps) {
  const [assemblyStaff, setAssemblyStaff] = useState<number>(2);
  const [electricalStaff, setElectricalStaff] = useState<number>(1);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(29);
  const { toast } = useToast();
  const apiRequest = useApiRequest();

  // Find the bays belonging to this team to get current staff counts
  useEffect(() => {
    if (teamName && open) {
      const teamBays = bays.filter(bay => bay.team === teamName);
      if (teamBays.length > 0) {
        const firstBay = teamBays[0];
        setAssemblyStaff(firstBay.assemblyStaffCount || 2);
        setElectricalStaff(firstBay.electricalStaffCount || 1);
        setHoursPerWeek(firstBay.hoursPerPersonPerWeek || 29);
      }
    }
  }, [teamName, bays, open]);

  const handleSave = async () => {
    try {
      if (!teamName) return;
      
      // Find all bays for this team
      const teamBays = bays.filter(bay => bay.team === teamName);
      
      // Update all bays with the new capacity settings
      for (const bay of teamBays) {
        await fetch(`/api/manufacturing-bays/${bay.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            assemblyStaffCount: assemblyStaff,
            electricalStaffCount: electricalStaff,
            hoursPerPersonPerWeek: hoursPerWeek
          })
        });
      }
      
      // Call the onTeamUpdate callback if provided
      if (onTeamUpdate) {
        await onTeamUpdate(teamName, assemblyStaff, electricalStaff, hoursPerWeek);
      }
      
      toast({
        title: 'Team capacity updated',
        description: `Team ${teamName} now has ${assemblyStaff} assembly and ${electricalStaff} electrical staff at ${hoursPerWeek} hours per week.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating team capacity:', error);
      toast({
        title: 'Update failed',
        description: 'Could not update team capacity. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span>Team {teamName} Capacity</span>
          </DialogTitle>
          <DialogDescription>
            Update team capacity to calculate accurate production timelines.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assemblyStaff" className="text-right col-span-2 flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              Assembly Staff
            </Label>
            <Input
              id="assemblyStaff"
              type="number"
              min="0"
              value={assemblyStaff}
              onChange={(e) => setAssemblyStaff(Number(e.target.value))}
              className="col-span-2"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="electricalStaff" className="text-right col-span-2 flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              Electrical Staff
            </Label>
            <Input
              id="electricalStaff"
              type="number"
              min="0"
              value={electricalStaff}
              onChange={(e) => setElectricalStaff(Number(e.target.value))}
              className="col-span-2"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="hoursPerWeek" className="text-right col-span-2 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Hours per Week
            </Label>
            <Input
              id="hoursPerWeek"
              type="number"
              min="1"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="col-span-2"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}