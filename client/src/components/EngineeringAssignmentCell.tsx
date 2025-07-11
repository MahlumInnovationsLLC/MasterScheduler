import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';

interface EngineeringAssignment {
  id: number;
  projectId: number;
  resourceId: string;
  discipline: 'ME' | 'EE' | 'ITE' | 'NTC';
  percentage: number;
  isLead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EngineeringResource {
  id: string;
  firstName: string;
  lastName: string;
  discipline: 'ME' | 'EE' | 'ITE' | 'NTC';
  title: string;
  workloadStatus: 'available' | 'at_capacity' | 'overloaded' | 'unavailable';
  currentCapacityPercent: number;
  hourlyRate: number;
  skillLevel: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EngineeringAssignmentCellProps {
  projectId: number;
  discipline: 'ME' | 'EE' | 'ITE' | 'NTC';
}

export const EngineeringAssignmentCell: React.FC<EngineeringAssignmentCellProps> = ({ 
  projectId, 
  discipline 
}) => {
  // Fetch engineering assignments for this project
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<EngineeringAssignment[]>({
    queryKey: ['/api/engineering/project-assignments/project', projectId],
    queryFn: () => fetch(`/api/engineering/project-assignments/project/${projectId}`).then(res => res.json()),
    enabled: !!projectId,
  });

  // Fetch engineering resources to get engineer names
  const { data: engineers = [], isLoading: engineersLoading } = useQuery<EngineeringResource[]>({
    queryKey: ['/api/engineering/engineering-resources'],
  });

  if (assignmentsLoading || engineersLoading) {
    return <div className="text-xs text-gray-500">Loading...</div>;
  }

  // Filter assignments for this project and discipline
  const disciplineAssignments = assignments.filter(
    assignment => assignment.projectId === projectId && assignment.discipline === discipline
  );

  if (disciplineAssignments.length === 0) {
    return <div className="text-xs text-gray-400">Unassigned</div>;
  }

  // Get engineer names for assignments
  const assignedEngineers = disciplineAssignments.map(assignment => {
    const engineer = engineers.find(eng => eng.id === assignment.resourceId);
    return {
      ...assignment,
      name: engineer ? `${engineer.firstName} ${engineer.lastName}` : 'Unknown',
      shortName: engineer ? `${engineer.firstName.charAt(0)}${engineer.lastName.charAt(0)}` : 'UK'
    };
  });

  return (
    <div className="flex flex-col gap-1">
      {assignedEngineers.map(assignment => (
        <div key={assignment.id} className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-300"
            title={assignment.name}
          >
            {assignment.shortName}
          </Badge>
          {assignment.percentage > 0 && (
            <span className="text-xs text-gray-600">{assignment.percentage}%</span>
          )}
        </div>
      ))}
    </div>
  );
};