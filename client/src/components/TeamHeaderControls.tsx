import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Wrench } from 'lucide-react';
import { TeamManagementDialog } from './TeamManagementDialog';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';

interface TeamHeaderControlsProps {
  bays: any[]; // Using any for now, will use ManufacturingBay type from app
}

export function TeamHeaderControls({ bays }: TeamHeaderControlsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  
  // Extract unique teams from bays
  const teams = useMemo(() => {
    const teamSet = new Set<string>();
    bays.forEach(bay => {
      if (bay.team) {
        teamSet.add(bay.team);
      }
    });
    return Array.from(teamSet).sort();
  }, [bays]);
  
  const handleTeamSelect = (teamName: string) => {
    setSelectedTeam(teamName);
    setIsDialogOpen(true);
  };
  
  return (
    <div className="team-header-controls flex items-center space-x-2">
      <div className="flex items-center bg-gray-800 rounded-md p-1">
        <Users className="h-4 w-4 text-gray-400 mr-1 ml-1" />
        <span className="text-xs text-gray-300 mr-2">Teams:</span>
        
        <div className="flex space-x-1">
          {teams.length > 0 ? (
            teams.map(team => (
              <Button
                key={team}
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 py-1 bg-gray-700 hover:bg-gray-600"
                onClick={() => handleTeamSelect(team)}
              >
                {team}
                <Wrench className="h-3 w-3 ml-1 text-gray-400" />
              </Button>
            ))
          ) : (
            <span className="text-xs text-gray-500 italic">No teams defined</span>
          )}
        </div>
      </div>
      
      {/* Team Management Dialog */}
      {selectedTeam && (
        <TeamManagementDialog 
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          teamName={selectedTeam} 
          bays={bays}
        />
      )}
    </div>
  );
}