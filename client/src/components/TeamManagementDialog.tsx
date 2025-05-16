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
import { Users, UserPlus, Clock, Edit } from 'lucide-react';

interface TeamManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName: string | null;
  bays: any[]; // Will type this properly based on ManufacturingBay from your existing code
  onTeamUpdate?: (teamName: string, newTeamName: string, description: string, assemblyStaff: number, electricalStaff: number, hoursPerWeek: number) => Promise<void>;
}

export function TeamManagementDialog({
  open,
  onOpenChange,
  teamName,
  bays,
  onTeamUpdate
}: TeamManagementDialogProps) {
  const [newTeamName, setNewTeamName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [status, setStatus] = useState<string>("active");
  const [location, setLocation] = useState<string>("");
  const [assemblyStaff, setAssemblyStaff] = useState<number>(2);
  const [electricalStaff, setElectricalStaff] = useState<number>(1);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(29);
  const { toast } = useToast();
  
  // Calculate weekly team capacity
  const weeklyCapacity = (assemblyStaff + electricalStaff) * hoursPerWeek;

  // Find the bays belonging to this team to get current staff counts and other information
  useEffect(() => {
    if (teamName && open) {
      // Extract actual team name and bay IDs from the combined string (if using the new format)
      let actualTeamName = teamName;
      let bayIds: number[] = [];
      
      if (teamName.includes('::')) {
        const [extractedName, idsString] = teamName.split('::');
        actualTeamName = extractedName;
        bayIds = idsString.split(',').map(id => parseInt(id, 10));
      }
      
      // Set team name for the dialog
      setNewTeamName(actualTeamName);
      
      // Get team bays either by ID (if we have specific IDs) or by name
      let teamBays = [];
      if (bayIds.length > 0) {
        // Filter to only the specific bays we want to edit
        teamBays = bays.filter(bay => bayIds.includes(bay.id));
      } else {
        // Fallback to the old behavior if we don't have specific bay IDs
        teamBays = bays.filter(bay => bay.team === actualTeamName);
      }
      
      if (teamBays.length > 0) {
        const firstBay = teamBays[0];
        setDescription(firstBay.description || "");
        setStatus(firstBay.status || "active");
        setLocation(firstBay.location || "");
        setAssemblyStaff(firstBay.assemblyStaffCount || 2);
        setElectricalStaff(firstBay.electricalStaffCount || 1);
        setHoursPerWeek(firstBay.hoursPerPersonPerWeek || 29);
      }
    }
  }, [teamName, bays, open]);

  const handleSave = async () => {
    try {
      if (!teamName) return;
      
      // Extract actual team name and bay IDs from the combined string (if using the new format)
      let actualTeamName = teamName;
      let bayIds: number[] = [];
      
      if (teamName.includes('::')) {
        const [extractedName, idsString] = teamName.split('::');
        actualTeamName = extractedName;
        bayIds = idsString.split(',').map(id => parseInt(id, 10));
      }
      
      // Get team bays - either by specific IDs or by team name
      let teamBays = [];
      if (bayIds.length > 0) {
        // Only update the specific bays that were clicked on
        teamBays = bays.filter(bay => bayIds.includes(bay.id));
      } else {
        // Fallback to old behavior if no specific bay IDs
        teamBays = bays.filter(bay => bay.team === actualTeamName);
      }
      
      // Update only the specific bays with the new capacity settings, team name, and additional fields
      for (const bay of teamBays) {
        await fetch(`/api/manufacturing-bays/${bay.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            team: newTeamName,
            description: description,
            status: status,
            location: location,
            assemblyStaffCount: assemblyStaff,
            electricalStaffCount: electricalStaff,
            hoursPerPersonPerWeek: hoursPerWeek
          })
        });
      }
      
      // Call the onTeamUpdate callback if provided
      if (onTeamUpdate) {
        await onTeamUpdate(actualTeamName, newTeamName, description, assemblyStaff, electricalStaff, hoursPerWeek);
      }
      
      const teamNameChanged = actualTeamName !== newTeamName;
      
      // Get the bay IDs as a string to find matching elements
      const bayIdsString = bayIds.join(',');
      
      console.log(`Using targeted bay-id attribute selector with bay IDs=${bayIdsString}`);
      
      if (bayIds.length > 0) {
        // *** KEY CHANGE: Use the bay IDs to PRECISELY target just the header elements for these bays ***
        // This ensures we don't update ALL elements with the same team name
        
        // Find team name elements that match EXACTLY these bay IDs
        const nameSelector = `.bay-header-team-name[data-bay-id="${bayIdsString}"]`;
        console.log(`Looking for elements with name selector: ${nameSelector}`);
        document.querySelectorAll(nameSelector).forEach(element => {
          if (element instanceof HTMLElement) {
            console.log(`Updating specific team name element from ${element.innerText} to ${newTeamName}`);
            element.innerText = newTeamName;
            element.dataset.team = newTeamName;
          }
        });
        
        // Find team description elements that match EXACTLY these bay IDs
        const descSelector = `.bay-header-team-description[data-bay-id="${bayIdsString}"]`;
        console.log(`Looking for elements with description selector: ${descSelector}`);
        document.querySelectorAll(descSelector).forEach(element => {
          if (element instanceof HTMLElement) {
            console.log(`Updating specific team description element from ${element.innerText} to ${description}`);
            element.innerText = description;
            element.dataset.team = newTeamName;
          }
        });
      } else {
        // Fallback: If no specific bay IDs provided, use the old approach with multiple safeguards
        console.log(`FALLBACK: Using team attribute approach with team=${actualTeamName}`);
        
        // Find the section that contains this team first
        const teamSections = document.querySelectorAll(`[data-team-section="${teamName}"]`);
        console.log(`Found ${teamSections.length} matching team sections`);
        
        // Only update the targeted section (if we have it)
        teamSections.forEach(section => {
          if (section instanceof HTMLElement) {
            const nameEl = section.querySelector('.bay-header-team-name');
            const descEl = section.querySelector('.bay-header-team-description');
            
            if (nameEl instanceof HTMLElement) {
              nameEl.innerText = newTeamName;
              nameEl.dataset.team = newTeamName;
            }
            
            if (descEl instanceof HTMLElement) {
              descEl.innerText = description;
              descEl.dataset.team = newTeamName;
            }
          }
        });
      }
      
      toast({
        title: 'Team updated',
        description: `Team ${teamNameChanged ? `renamed from ${actualTeamName} to ${newTeamName}` : newTeamName} now has ${assemblyStaff} assembly and ${electricalStaff} electrical staff at ${hoursPerWeek} hours per week (${weeklyCapacity} total hours/week).`,
      });
      
      // Close the dialog
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span>Edit Team: {teamName}</span>
          </DialogTitle>
          <DialogDescription>
            Update team information and capacity settings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teamName" className="text-right col-span-1">
              Name
            </Label>
            <Input
              id="teamName"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right col-span-1">
              Status
            </Label>
            <Input
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right col-span-1">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right col-span-1">
              Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="border-t pt-4 mt-2">
            <h3 className="text-md font-medium mb-2">Team Capacity Settings</h3>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assemblyStaff" className="text-right col-span-1">
              Assembly Staff
            </Label>
            <Input
              id="assemblyStaff"
              type="number"
              min="0"
              value={assemblyStaff}
              onChange={(e) => setAssemblyStaff(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="electricalStaff" className="text-right col-span-1">
              Electrical Staff
            </Label>
            <Input
              id="electricalStaff"
              type="number"
              min="0"
              value={electricalStaff}
              onChange={(e) => setElectricalStaff(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="hoursPerWeek" className="text-right col-span-1">
              Hours per Week
            </Label>
            <Input
              id="hoursPerWeek"
              type="number"
              min="1"
              max="168"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-2">
            <div className="font-semibold text-blue-800 mb-1">Weekly Team Capacity</div>
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 px-3 py-2 rounded-md text-blue-800 font-bold text-lg">
                {weeklyCapacity} hours per week
              </div>
              <div className="text-sm text-blue-600">
                ({assemblyStaff} Assembly + {electricalStaff} Electrical) × {hoursPerWeek} hours
              </div>
            </div>
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