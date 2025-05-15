import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { TeamManagementDialog } from './TeamManagementDialog';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface TeamManagementButtonProps {
  teamName?: string | null;
  bays: ManufacturingBay[];
  isHeaderButton?: boolean;
}

export function TeamManagementButton({ teamName, bays, isHeaderButton = false }: TeamManagementButtonProps) {
  const queryClient = useQueryClient();
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // If there's a teamName, find all bays belonging to this team
  const teamBays = bays.filter(bay => bay.team === teamName);
  const teamBayIds = teamBays.map(bay => bay.id);
  
  // Calculate team aggregates from bay data
  const assemblyStaffCount = teamBays.reduce((sum, bay) => sum + (bay.assemblyStaffCount || 0), 0);
  const electricalStaffCount = teamBays.reduce((sum, bay) => sum + (bay.electricalStaffCount || 0), 0);
  
  // Find the hoursPerPersonPerWeek (should be the same for all bays in a team, but we'll use the first one)
  const hoursPerPersonPerWeek = teamBays.length > 0 
    ? (teamBays[0].hoursPerPersonPerWeek || 29) 
    : 29;
  
  const editingTeam: ManufacturingTeam = {
    name: teamName || '',
    bayIds: teamBayIds,
    assemblyStaffCount,
    electricalStaffCount,
    hoursPerPersonPerWeek
  };
  
  const handleDeleteTeam = async () => {
    try {
      // Update all bays in this team to remove team association
      for (const bayId of teamBayIds) {
        await apiRequest('PUT', `/api/manufacturing-bays/${bayId}`, {
          team: null,
          assemblyStaffCount: 0,
          electricalStaffCount: 0,
          hoursPerPersonPerWeek: 29
        });
      }
      
      // Refresh bay data
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-bays'] });
      
      toast({
        title: 'Success',
        description: `Team "${teamName}" deleted successfully`,
      });
      
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <>
      {isHeaderButton ? (
        // Header button (Add New Team)
        <Button 
          onClick={() => setTeamDialogOpen(true)}
          variant="outline"
          className="ml-auto flex items-center gap-1"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Team</span>
        </Button>
      ) : (
        // Team dropdown button (Edit/Delete existing team)
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Users className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Team Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTeamDialogOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Team
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setDeleteDialogOpen(true)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      
      {/* Team Edit Dialog */}
      <TeamManagementDialog
        isOpen={teamDialogOpen}
        onClose={() => setTeamDialogOpen(false)}
        initialTeam={teamName ? editingTeam : null}
        bays={bays}
      />
      
      {/* Confirm Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the team "{teamName}" and remove all bay associations. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}