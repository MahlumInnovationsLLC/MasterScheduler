import React, { useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { addWeeks } from 'date-fns';

interface Project {
  id: number;
  name: string;
  projectNumber: string;
  status: string;
  description: string | null;
  team: string | null;
  createdAt: Date | null;
  startDate: Date | null;
  shipDate: Date | null;
  totalHours?: number;
}

interface ManufacturingBay {
  id: number;
  name: string;
  bayNumber: number;
  status: 'active' | 'inactive' | 'maintenance';
  description: string | null;
  location: string | null;
  team: string | null;
  capacityTonn: number | null;
  maxWidth: number | null;
  maxHeight: number | null;
  maxLength: number | null;
  teamId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  assemblyStaffCount?: number | null;
  electricalStaffCount?: number | null;
  hoursPerPersonPerWeek?: number | null;
}

interface DurationCalculatorProps {
  projectId: number;
  bayId: number;
  projects: Project[];
  bays: ManufacturingBay[];
  onDurationCalculated: (weeks: number, endDate?: Date) => void;
}

export const DurationCalculator: React.FC<DurationCalculatorProps> = ({ 
  projectId, 
  bayId, 
  projects, 
  bays, 
  onDurationCalculated 
}) => {
  const selectedProject = projects.find(p => p.id === projectId);
  const selectedBay = bays.find(b => b.id === bayId);
  
  useEffect(() => {
    // Calculate and set the recommended duration when project or bay changes
    if (selectedProject && selectedBay && selectedProject.totalHours) {
      // Calculate team's capacity (hours per week)
      const teamCapacity = (
        (selectedBay.assemblyStaffCount || 4) + 
        (selectedBay.electricalStaffCount || 2)
      ) * (selectedBay.hoursPerPersonPerWeek || 40);
      
      // Get phase percentages from the project or use defaults
      const prodPercentage = 60; // Default production percentage
      const itPercentage = 7;    // Default IT percentage
      const ntcPercentage = 7;   // Default NTC percentage
      const qcPercentage = 7;    // Default QC percentage
      
      // Calculate total production-related percentage (exclude FAB and PAINT)
      const productionRelatedPercentage = prodPercentage + itPercentage + ntcPercentage + qcPercentage;
      
      // Calculate production hours
      const productionHours = selectedProject.totalHours * (productionRelatedPercentage / 100);
      
      // Calculate recommended duration based on production hours
      const recommendedWeeks = Math.ceil(productionHours / teamCapacity);
      
      // Generate an end date based on the calculated duration
      const startDate = new Date();
      const endDate = addWeeks(startDate, recommendedWeeks);
      
      // Call the callback with the calculated duration
      onDurationCalculated(recommendedWeeks, endDate);
    }
  }, [projectId, bayId, selectedProject, selectedBay, onDurationCalculated]);
  
  if (!selectedProject || !selectedBay || !selectedProject.totalHours) {
    return null;
  }
  
  // Calculate team's capacity (hours per week)
  const teamCapacity = (
    (selectedBay.assemblyStaffCount || 4) + 
    (selectedBay.electricalStaffCount || 2)
  ) * (selectedBay.hoursPerPersonPerWeek || 40);
  
  // Get phase percentages from the schedule bar or use defaults
  const prodPercentage = 60; // Default production percentage
  const itPercentage = 7;    // Default IT percentage
  const ntcPercentage = 7;   // Default NTC percentage
  const qcPercentage = 7;    // Default QC percentage
  
  // Calculate total production-related percentage (exclude FAB and PAINT)
  const productionRelatedPercentage = prodPercentage + itPercentage + ntcPercentage + qcPercentage;
  
  // Calculate production hours
  const productionHours = selectedProject.totalHours * (productionRelatedPercentage / 100);
  
  // Calculate recommended duration based on production hours
  const recommendedWeeks = Math.ceil(productionHours / teamCapacity);
  
  return (
    <div className="rounded-md bg-blue-50 p-2 text-xs text-blue-800 font-medium border border-blue-200">
      <div className="flex items-center">
        <Calculator className="h-3.5 w-3.5 mr-1.5" />
        <span>Recommended Duration Calculation:</span>
      </div>
      <div className="mt-1 pl-5">
        <p>Project Total Hours: {selectedProject.totalHours} hrs</p>
        <p>Production-Related Phases: {productionRelatedPercentage}%</p>
        <p>Production Hours: {Math.round(productionHours)} hrs</p>
        <p>Team Weekly Capacity: {teamCapacity} hrs/week</p>
        <p className="font-bold mt-1">
          Recommended Duration: {recommendedWeeks} weeks
        </p>
      </div>
    </div>
  );
};

export default DurationCalculator;