
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export function useProjectLabelStats() {
  // Fetch all projects with their label assignments
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Fetch all available labels to identify MAJOR, MINOR, GOOD
  const { data: availableLabels } = useQuery({
    queryKey: ['/api/project-labels'],
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Fetch all project label assignments
  const { data: allProjectLabelAssignments } = useQuery({
    queryKey: ['/api/all-project-label-assignments'],
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  return useMemo(() => {
    if (!projects || !availableLabels || !allProjectLabelAssignments) {
      return {
        major: 0,
        minor: 0,
        good: 0,
        total: projects?.length || 0
      };
    }

    // Remove debug logs to prevent console spam

    // Find label IDs for MAJOR, MINOR, GOOD (case-insensitive)
    // This will match "MAJOR ISSUE", "MAJOR", "MINOR ISSUE", "MINOR", etc.
    const majorLabel = availableLabels.find(l => 
      l.name.toUpperCase().includes('MAJOR')
    );
    const minorLabel = availableLabels.find(l => 
      l.name.toUpperCase().includes('MINOR')
    );
    const goodLabel = availableLabels.find(l => 
      l.name.toUpperCase().includes('GOOD')
    );


    
    // Count projects by label - ensure we're comparing the right data types
    const majorCount = majorLabel ? 
      allProjectLabelAssignments.filter(assignment => {
        const assignmentLabelId = Number(assignment.labelId);
        const targetLabelId = Number(majorLabel.id);
        return assignmentLabelId === targetLabelId;
      }).length : 0;
    
    const minorCount = minorLabel ?
      allProjectLabelAssignments.filter(assignment => {
        const assignmentLabelId = Number(assignment.labelId);
        const targetLabelId = Number(minorLabel.id);
        return assignmentLabelId === targetLabelId;
      }).length : 0;
      
    const goodCount = goodLabel ?
      allProjectLabelAssignments.filter(assignment => {
        const assignmentLabelId = Number(assignment.labelId);
        const targetLabelId = Number(goodLabel.id);
        return assignmentLabelId === targetLabelId;
      }).length : 0;



    return {
      major: majorCount,
      minor: minorCount,
      good: goodCount,
      total: projects.length
    };
  }, [projects, availableLabels, allProjectLabelAssignments]);
}
