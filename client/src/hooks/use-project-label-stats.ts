
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { safeFilter, ensureArray } from '@/lib/array-utils';

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
    // Use safe array utilities
    const safeProjects = ensureArray(projects, [], 'useProjectLabelStats.projects');
    const safeAvailableLabels = ensureArray(availableLabels, [], 'useProjectLabelStats.availableLabels');
    const safeAssignments = ensureArray(allProjectLabelAssignments, [], 'useProjectLabelStats.assignments');

    if (!projects || !availableLabels || !allProjectLabelAssignments) {
      return {
        major: 0,
        minor: 0,
        good: 0,
        total: safeProjects.length
      };
    }

    // Find label IDs for MAJOR, MINOR, GOOD (case-insensitive)
    // This will match "MAJOR ISSUE", "MAJOR", "MINOR ISSUE", "MINOR", etc.
    const majorLabel = safeAvailableLabels.find(l => 
      l.name.toUpperCase().includes('MAJOR')
    );
    const minorLabel = safeAvailableLabels.find(l => 
      l.name.toUpperCase().includes('MINOR')
    );
    const goodLabel = safeAvailableLabels.find(l => 
      l.name.toUpperCase().includes('GOOD')
    );

    // Count projects by label using safe filter
    const majorCount = majorLabel ? 
      safeFilter(safeAssignments, assignment => {
        const assignmentLabelId = Number(assignment.labelId);
        const targetLabelId = Number(majorLabel.id);
        return assignmentLabelId === targetLabelId;
      }, 'majorCount').length : 0;
    
    const minorCount = minorLabel ?
      safeFilter(safeAssignments, assignment => {
        const assignmentLabelId = Number(assignment.labelId);
        const targetLabelId = Number(minorLabel.id);
        return assignmentLabelId === targetLabelId;
      }, 'minorCount').length : 0;
      
    const goodCount = goodLabel ?
      safeFilter(safeAssignments, assignment => {
        const assignmentLabelId = Number(assignment.labelId);
        const targetLabelId = Number(goodLabel.id);
        return assignmentLabelId === targetLabelId;
      }, 'goodCount').length : 0;



    return {
      major: majorCount,
      minor: minorCount,
      good: goodCount,
      total: projects.length
    };
  }, [projects, availableLabels, allProjectLabelAssignments]);
}
