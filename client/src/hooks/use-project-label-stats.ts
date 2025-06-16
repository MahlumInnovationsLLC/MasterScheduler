
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export function useProjectLabelStats() {
  // Fetch all projects with their label assignments
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Fetch all available labels to identify MAJOR, MINOR, GOOD
  const { data: availableLabels } = useQuery({
    queryKey: ['/api/project-labels']
  });

  // Fetch all project label assignments
  const { data: allProjectLabelAssignments } = useQuery({
    queryKey: ['/api/all-project-label-assignments'],
    enabled: !!projects && projects.length > 0
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

    // Debug: Log available labels
    console.log('Available labels:', availableLabels.map(l => ({ id: l.id, name: l.name })));
    console.log('Project label assignments:', allProjectLabelAssignments.length);

    // Find label IDs for MAJOR, MINOR, GOOD (case-insensitive)
    const majorLabel = availableLabels.find(l => l.name.toUpperCase().includes('MAJOR'));
    const minorLabel = availableLabels.find(l => l.name.toUpperCase().includes('MINOR')); 
    const goodLabel = availableLabels.find(l => l.name.toUpperCase().includes('GOOD'));

    console.log('Found labels:', { 
      major: majorLabel ? { id: majorLabel.id, name: majorLabel.name } : null,
      minor: minorLabel ? { id: minorLabel.id, name: minorLabel.name } : null,
      good: goodLabel ? { id: goodLabel.id, name: goodLabel.name } : null
    });

    // Count projects by label
    const majorCount = majorLabel ? 
      allProjectLabelAssignments.filter(assignment => assignment.labelId === majorLabel.id).length : 0;
    
    const minorCount = minorLabel ?
      allProjectLabelAssignments.filter(assignment => assignment.labelId === minorLabel.id).length : 0;
      
    const goodCount = goodLabel ?
      allProjectLabelAssignments.filter(assignment => assignment.labelId === goodLabel.id).length : 0;

    console.log('Label counts:', { major: majorCount, minor: minorCount, good: goodCount });

    return {
      major: majorCount,
      minor: minorCount,
      good: goodCount,
      total: projects.length
    };
  }, [projects, availableLabels, allProjectLabelAssignments]);
}
