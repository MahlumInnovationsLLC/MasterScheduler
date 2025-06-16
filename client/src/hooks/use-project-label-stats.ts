
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
    // This will match "MAJOR ISSUE", "MAJOR", "MINOR ISSUE", "MINOR", etc.
    const majorLabel = availableLabels.find(l => {
      const matches = l.name.toUpperCase().includes('MAJOR');
      console.log(`Checking label "${l.name}" for MAJOR: ${matches}`);
      return matches;
    });
    const minorLabel = availableLabels.find(l => {
      const matches = l.name.toUpperCase().includes('MINOR');
      console.log(`Checking label "${l.name}" for MINOR: ${matches}`);
      return matches;
    });
    const goodLabel = availableLabels.find(l => {
      const matches = l.name.toUpperCase().includes('GOOD');
      console.log(`Checking label "${l.name}" for GOOD: ${matches}`);
      return matches;
    });

    console.log('Found labels:', { 
      major: majorLabel ? { id: majorLabel.id, name: majorLabel.name } : null,
      minor: minorLabel ? { id: minorLabel.id, name: minorLabel.name } : null,
      good: goodLabel ? { id: goodLabel.id, name: goodLabel.name } : null
    });

    // Debug: Log all assignments to see the structure
    console.log('All assignments:', allProjectLabelAssignments);
    console.log('Sample assignments:', allProjectLabelAssignments.slice(0, 5));
    
    // Count projects by label
    const majorCount = majorLabel ? 
      allProjectLabelAssignments.filter(assignment => {
        const matches = assignment.labelId === majorLabel.id;
        if (matches) console.log('Found MAJOR assignment:', assignment);
        return matches;
      }).length : 0;
    
    const minorCount = minorLabel ?
      allProjectLabelAssignments.filter(assignment => {
        const matches = assignment.labelId === minorLabel.id;
        if (matches) console.log('Found MINOR assignment:', assignment);
        return matches;
      }).length : 0;
      
    const goodCount = goodLabel ?
      allProjectLabelAssignments.filter(assignment => {
        const matches = assignment.labelId === goodLabel.id;
        if (matches) console.log('Found GOOD assignment:', assignment);
        return matches;
      }).length : 0;

    console.log('Label counts:', { major: majorCount, minor: minorCount, good: goodCount });
    console.log('Label IDs to match:', { 
      majorId: majorLabel?.id, 
      minorId: minorLabel?.id, 
      goodId: goodLabel?.id 
    });

    return {
      major: majorCount,
      minor: minorCount,
      good: goodCount,
      total: projects.length
    };
  }, [projects, availableLabels, allProjectLabelAssignments]);
}
