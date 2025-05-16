import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { TeamManagementDialog } from './TeamManagementDialog';

interface TeamManagementButtonProps {
  teamName: string | null;
  bays: any[]; // Will use the Bay type from the actual app
  isHeaderButton?: boolean;
}

export function TeamManagementButton({ teamName, bays, isHeaderButton = true }: TeamManagementButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!teamName) {
    return null; // Don't show button if no team is assigned
  }

  return (
    <>
      {isHeaderButton ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1"
        >
          <Users className="h-4 w-4" />
          <span>Team Capacity</span>
        </Button>
      ) : (
        // Small icon-only button for bay labels
        <button 
          className="p-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
          onClick={() => setIsOpen(true)}
        >
          <Users className="h-3 w-3" />
        </button>
      )}

      <TeamManagementDialog 
        open={isOpen}
        onOpenChange={setIsOpen}
        teamName={teamName} 
        bays={bays} 
      />
    </>
  );
}