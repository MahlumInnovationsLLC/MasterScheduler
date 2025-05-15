import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface TeamManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialTeam?: ManufacturingTeam | null;
  bays: ManufacturingBay[];
}

interface ManufacturingBay {
  id: number;
  name: string;
  team: string | null;
  bayNumber: number;
  assemblyStaffCount: number | null;
  electricalStaffCount: number | null;
  hoursPerPersonPerWeek: number | null;
}

interface ManufacturingTeam {
  id?: number;
  name: string;
  bayIds: number[];
  assemblyStaffCount: number;
  electricalStaffCount: number;
  hoursPerPersonPerWeek: number;
}

export function TeamManagementDialog({ isOpen, onClose, initialTeam, bays }: TeamManagementDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [team, setTeam] = useState<ManufacturingTeam>({
    name: '',
    bayIds: [],
    assemblyStaffCount: 0,
    electricalStaffCount: 0,
    hoursPerPersonPerWeek: 29 // Default to 29 hours as requested
  });

  // Initialize form with initial team data if available
  useEffect(() => {
    if (initialTeam) {
      setTeam(initialTeam);
    } else {
      // Reset form for new team
      setTeam({
        name: '',
        bayIds: [],
        assemblyStaffCount: 0,
        electricalStaffCount: 0,
        hoursPerPersonPerWeek: 29
      });
    }
  }, [initialTeam, isOpen]);

  const handleSaveTeam = async () => {
    if (!team.name) {
      toast({
        title: 'Error',
        description: 'Team name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Update each bay with the team information
      for (const bayId of team.bayIds) {
        await apiRequest('PUT', `/api/manufacturing-bays/${bayId}`, {
          team: team.name,
          assemblyStaffCount: team.assemblyStaffCount,
          electricalStaffCount: team.electricalStaffCount,
          hoursPerPersonPerWeek: team.hoursPerPersonPerWeek
        });
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-bays'] });
      
      toast({
        title: 'Success',
        description: initialTeam ? 'Team updated successfully' : 'Team created successfully',
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving team:', error);
      toast({
        title: 'Error',
        description: 'Failed to save team. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBaySelectionChange = (bayId: string) => {
    const id = parseInt(bayId, 10);
    // If already selected, remove it; otherwise, add it
    if (team.bayIds.includes(id)) {
      setTeam({
        ...team,
        bayIds: team.bayIds.filter(b => b !== id)
      });
    } else {
      // Limit to 2 bays per team
      if (team.bayIds.length < 2) {
        setTeam({
          ...team,
          bayIds: [...team.bayIds, id]
        });
      } else {
        toast({
          title: 'Info',
          description: 'A team can have a maximum of 2 bays',
        });
      }
    }
  };

  // Find which bays are available (not already in another team, except the current team's bays)
  const availableBays = bays.filter(bay => {
    // Bay is available if it's not assigned to any team or is part of the current team
    return !bay.team || (initialTeam && bay.team === initialTeam.name);
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
          <DialogDescription>
            {initialTeam 
              ? 'Modify the team details below.' 
              : 'Create a new team and assign bays to it. Each team can have up to 2 bays.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="team-name" className="text-right">
              Team Name
            </Label>
            <Input
              id="team-name"
              value={team.name}
              onChange={(e) => setTeam({ ...team, name: e.target.value })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Select Bays</Label>
            <div className="col-span-3 space-y-2">
              {availableBays.length > 0 ? (
                availableBays.map((bay) => (
                  <div key={bay.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`bay-${bay.id}`}
                      checked={team.bayIds.includes(bay.id)}
                      onChange={() => handleBaySelectionChange(bay.id.toString())}
                    />
                    <Label htmlFor={`bay-${bay.id}`}>
                      {bay.name} (Bay {bay.bayNumber})
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No available bays. Bays must be created first or freed from other teams.</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assembly-staff" className="text-right">
              Assembly Staff
            </Label>
            <Input
              id="assembly-staff"
              type="number"
              min="0"
              value={team.assemblyStaffCount}
              onChange={(e) => setTeam({ ...team, assemblyStaffCount: parseInt(e.target.value) || 0 })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="electrical-staff" className="text-right">
              Electrical Staff
            </Label>
            <Input
              id="electrical-staff"
              type="number"
              min="0"
              value={team.electricalStaffCount}
              onChange={(e) => setTeam({ ...team, electricalStaffCount: parseInt(e.target.value) || 0 })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="hours-per-week" className="text-right">
              Hours Per Person/Week
            </Label>
            <Input
              id="hours-per-week"
              type="number"
              min="1"
              max="60"
              value={team.hoursPerPersonPerWeek}
              onChange={(e) => setTeam({ ...team, hoursPerPersonPerWeek: parseInt(e.target.value) || 29 })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Weekly Capacity</Label>
            <div className="col-span-3">
              <div className="font-medium">
                {(team.assemblyStaffCount + team.electricalStaffCount) * team.hoursPerPersonPerWeek} hours/week
              </div>
              <div className="text-sm text-gray-500">
                Assembly: {team.assemblyStaffCount * team.hoursPerPersonPerWeek} hours | 
                Electrical: {team.electricalStaffCount * team.hoursPerPersonPerWeek} hours
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSaveTeam} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (initialTeam ? 'Update Team' : 'Create Team')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}