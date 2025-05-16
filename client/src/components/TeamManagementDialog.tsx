import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, Wrench } from 'lucide-react';

interface TeamBay {
  id: number;
  name: string;
  team: string | null;
  assemblyStaffCount: number | null;
  electricalStaffCount: number | null;
  hoursPerPersonPerWeek: number | null;
}

interface TeamManagementDialogProps {
  teamName: string;
  bays: any[]; // Will use the Bay type from the app
  onClose: () => void;
}

export function TeamManagementDialog({ teamName, bays, onClose }: TeamManagementDialogProps) {
  const { toast } = useToast();
  
  // Find all bays in this team
  const teamBays = bays.filter(bay => bay.team === teamName);
  
  // Group team staff counts
  const [assemblyStaff, setAssemblyStaff] = useState<number>(1);
  const [electricalStaff, setElectricalStaff] = useState<number>(1);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(29);
  const [isLoading, setIsLoading] = useState(false);
  
  // Calculate total capacity
  const totalStaff = assemblyStaff + electricalStaff;
  const totalCapacity = totalStaff * hoursPerWeek;
  
  // Set initial values from bays
  useEffect(() => {
    if (teamBays.length > 0) {
      // Find the first bay with values
      const bayWithValues = teamBays.find(
        bay => bay.assemblyStaffCount || bay.electricalStaffCount || bay.hoursPerPersonPerWeek
      );
      
      // Set values from bay or defaults
      if (bayWithValues) {
        setAssemblyStaff(bayWithValues.assemblyStaffCount || 1);
        setElectricalStaff(bayWithValues.electricalStaffCount || 1);
        setHoursPerWeek(bayWithValues.hoursPerPersonPerWeek || 29);
      }
    }
  }, [teamBays]);
  
  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // Update all bays in this team with the same staff counts
      const promises = teamBays.map(bay => 
        apiRequest('/api/manufacturing-bays/' + bay.id, {
          method: 'PATCH',
          data: {
            assemblyStaffCount: assemblyStaff,
            electricalStaffCount: electricalStaff,
            hoursPerPersonPerWeek: hoursPerWeek
          }
        })
      );
      
      await Promise.all(promises);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-bays'] });
      
      toast({
        title: "Team capacity updated",
        description: `Updated capacity settings for ${teamName}`
      });
      
      // Close dialog
      onClose();
    } catch (error) {
      console.error('Error updating team capacity:', error);
      toast({
        title: "Error updating team",
        description: "There was a problem updating the team capacity. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="py-4">
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team {teamName} Capacity
          </CardTitle>
          <CardDescription>
            Configure team capacity for accurate production scheduling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-center">
            <div className="bg-primary-50 text-primary rounded-lg px-3 py-1 font-medium">
              {totalCapacity} hours/week total capacity
            </div>
            <div className="text-sm text-gray-500">
              ({totalStaff} staff × {hoursPerWeek} hours/week)
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="assemblyStaff">Assembly Staff</Label>
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-600" />
              <Input
                id="assemblyStaff"
                type="number"
                value={assemblyStaff}
                min={0}
                onChange={(e) => setAssemblyStaff(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="electricalStaff">Electrical Staff</Label>
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-yellow-600" />
              <Input
                id="electricalStaff"
                type="number"
                value={electricalStaff}
                min={0}
                onChange={(e) => setElectricalStaff(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="hoursPerWeek">Hours Per Person Per Week</Label>
          <Input
            id="hoursPerWeek"
            type="number"
            value={hoursPerWeek}
            min={1}
            max={168}
            onChange={(e) => setHoursPerWeek(parseInt(e.target.value) || 29)}
          />
        </div>
      </div>
      
      <Alert className="mb-6">
        <AlertDescription>
          Changes to team capacity will affect production phase length calculation for all projects in this team.
        </AlertDescription>
      </Alert>
      
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogFooter>
    </div>
  );
}