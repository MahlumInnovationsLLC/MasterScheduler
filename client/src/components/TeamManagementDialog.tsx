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
import { safeFilter } from '@/lib/array-utils';

// Define the ManufacturingBay interface based on schema
interface ManufacturingBay {
  id: number;
  bayNumber: number;
  name: string;
  description?: string | null;
  equipment?: string | null;
  team?: string | null;
  location?: string | null;
  status?: 'active' | 'inactive' | 'maintenance';
  staffCount?: number;
  assemblyStaffCount?: number;
  electricalStaffCount?: number;
  hoursPerPersonPerWeek?: number;
  capacityTonn?: number | null;
  maxWidth?: number | null;
  maxHeight?: number | null;
  maxLength?: number | null;
  teamId?: number | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

interface TeamManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName: string | null;
  bays: ManufacturingBay[]; 
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
    if (open) {
      // Extract actual team name and bay IDs from the combined string (if using the new format)
      let actualTeamName = teamName || "";
      let bayIds: number[] = [];
      
      if (teamName && teamName.includes('::')) {
        const [extractedName, idsString] = teamName.split('::');
        actualTeamName = extractedName;
        bayIds = idsString.split(',').map(id => parseInt(id, 10));
      }
      
      // Set team name for the dialog
      setNewTeamName(actualTeamName);
      
      // Always fetch the latest data from the API when dialog opens
      const fetchLatestBays = async () => {
        try {
          console.log("Fetching latest bay data for team dialog");
          const response = await fetch('/api/manufacturing-bays');
          if (response.ok) {
            const latestBays = await response.json();
            
            // Get team bays either by ID (if we have specific IDs) or by name
            let teamBays: ManufacturingBay[] = [];
            if (bayIds.length > 0) {
              // Filter to only the specific bays we want to edit
              teamBays = safeFilter(latestBays, (bay: ManufacturingBay) => bayIds.includes(bay.id), 'TeamManagementDialog.teamBays1');
            } else {
              // Fallback to the old behavior if we don't have specific bay IDs
              teamBays = safeFilter(latestBays, (bay: ManufacturingBay) => bay.team === actualTeamName, 'TeamManagementDialog.teamBays2');
            }
            
            if (teamBays.length > 0) {
              const firstBay = teamBays[0];
              console.log("Found latest bay data:", firstBay);
              setDescription(firstBay.description || "");
              setStatus(firstBay.status || "active");
              setLocation(firstBay.location || "");
              setAssemblyStaff(firstBay.assemblyStaffCount || 2);
              setElectricalStaff(firstBay.electricalStaffCount || 1);
              setHoursPerWeek(firstBay.hoursPerPersonPerWeek || 29);
            } else {
              console.log("No team bays found, using fallback data");
              // Fallback if no bays found
              setDescription("");
              setStatus("active");
              setLocation("");
              setAssemblyStaff(2);
              setElectricalStaff(1);
              setHoursPerWeek(29);
            }
          }
        } catch (error) {
          console.error("Error fetching latest bay data:", error);
          // If API fetch fails, use the provided bay data
          const teamBays = bayIds.length > 0 
            ? safeFilter(bays, (bay: ManufacturingBay) => bayIds.includes(bay.id), 'TeamManagementDialog.teamBays3')
            : safeFilter(bays, (bay: ManufacturingBay) => bay.team === actualTeamName, 'TeamManagementDialog.teamBays4');
          
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
      };
      
      fetchLatestBays();
    }
  }, [teamName, open]); // Removed bays from dependencies to prevent stale data

  const handleSave = async () => {
    try {
      if (!teamName) return;
      
      console.log("Starting team update process");
      
      // Extract actual team name and bay IDs from the combined string (if using the new format)
      let actualTeamName = teamName;
      let bayIds: number[] = [];
      
      if (teamName.includes('::')) {
        const [extractedName, idsString] = teamName.split('::');
        actualTeamName = extractedName;
        bayIds = idsString.split(',').map(id => parseInt(id, 10));
      }
      
      // Fetch latest bays from API to ensure we're working with current data
      console.log("Fetching latest bay data for team update");
      let teamBays = [];
      
      try {
        const response = await fetch('/api/manufacturing-bays');
        if (response.ok) {
          const latestBays = await response.json();
          
          if (bayIds.length > 0) {
            // Only update the specific bays that were clicked on
            teamBays = safeFilter(latestBays, (bay: ManufacturingBay) => bayIds.includes(bay.id), 'TeamManagementDialog.teamBays5');
          } else {
            // Fallback to old behavior if no specific bay IDs
            teamBays = safeFilter(latestBays, (bay: ManufacturingBay) => bay.team === actualTeamName, 'TeamManagementDialog.teamBays6');
          }
          
          console.log(`Found ${teamBays.length} bays to update for team ${actualTeamName}`);
        }
      } catch (error) {
        console.error("Error fetching latest bay data for update:", error);
        // Fallback to the provided bays if API fetch fails
        if (bayIds.length > 0) {
          teamBays = safeFilter(bays, bay => bayIds.includes(bay.id), 'TeamManagementDialog.teamBays7');
        } else {
          teamBays = safeFilter(bays, bay => bay.team === actualTeamName, 'TeamManagementDialog.teamBays8');
        }
      }
      
      if (teamBays.length === 0) {
        console.warn("No team bays found to update!");
        toast({
          title: 'Warning',
          description: 'No bays found for this team. Changes may not be applied correctly.',
          variant: 'destructive',
        });
      }
      
      // Calculate staffCount from assembly and electrical staff
      const staffCount = assemblyStaff + electricalStaff;
      
      // Update only the specific bays with the new capacity settings, team name, and additional fields
      console.log("Updating team bays in database...");
      const updatePromises = teamBays.map((bay: ManufacturingBay) => 
        fetch(`/api/manufacturing-bays/${bay.id}`, {
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
            staffCount: staffCount,
            hoursPerPersonPerWeek: hoursPerWeek
          })
        })
      );
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      console.log(`Updated ${updatePromises.length} bays in database`);
      
      // Call the onTeamUpdate callback if provided
      if (onTeamUpdate) {
        console.log("Calling parent onTeamUpdate callback");
        await onTeamUpdate(actualTeamName, newTeamName, description, assemblyStaff, electricalStaff, hoursPerWeek);
      }
      
      const teamNameChanged = actualTeamName !== newTeamName;
      
      toast({
        title: 'Team updated',
        description: `Team ${teamNameChanged ? `renamed from ${actualTeamName} to ${newTeamName}` : newTeamName} now has ${assemblyStaff} assembly and ${electricalStaff} electrical staff at ${hoursPerWeek} hours per week (${weeklyCapacity} total hours/week).`,
      });
      
      // Close the dialog
      onOpenChange(false);
      
      // The parent's onTeamUpdate will trigger a page refresh to show the latest data
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
            <span>Edit Team{teamName ? `: ${teamName}` : ""}</span>
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