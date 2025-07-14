
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
    
    // Debug: Check the structure of assignments
    console.log('Sample assignment structure:', allProjectLabelAssignments[0]);
    console.log('All assignment labelIds:', allProjectLabelAssignments.map(a => a.labelId));
    
    // Count projects by label - ensure we're comparing the right data types
    const majorCount = majorLabel ? 
      allProjectLabelAssignments.filter(assignment => {
        const assignmentLabelId = Number(assignment.labelId);
        const targetLabelId = Number(majorLabel.id);
        const matches = assignmentLabelId === targetLabelId;
        if (matches) console.log('Found MAJOR assignment:', assignment);
        return matches;
      }).length : 0;
    
    const minorCount = minorLabel ?
      allProjectLabelAssignments.filter(assignment => {
        const assignmentLabelId = Number(assignment.labelId);
        const targetLabelId = Number(minorLabel.id);
        const matches = assignmentLabelId === targetLabelId;
        if (matches) console.log('Found MINOR assignment:', assignment);
        return matches;
      }).length : 0;
      
    const goodCount = goodLabel ?
      allProjectLabelAssignments.filter(assignment => {
        const assignmentLabelId = Number(assignment.labelId);
        const targetLabelId = Number(goodLabel.id);
        const matches = assignmentLabelId === targetLabelId;
        if (matches) console.log('Found GOOD assignment:', assignment);
        return matches;
      }).length : 0;

    console.log('Label counts calculated:', { major: majorCount, minor: minorCount, good: goodCount });
    console.log('Label IDs being matched:', { 
      majorId: majorLabel?.id, 
      minorId: minorLabel?.id, 
      goodId: goodLabel?.id 
    });
    console.log('Total assignments processed:', allProjectLabelAssignments.length);

    return {
      major: majorCount,
      minor: minorCount,
      good: goodCount,
      total: projects.length
    };
  }, [projects, availableLabels, allProjectLabelAssignments]);
}
