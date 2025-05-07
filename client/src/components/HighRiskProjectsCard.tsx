import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { addDays, format, isWithinInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Project } from '@shared/schema';

interface HighRiskProjectsCardProps {
  projects: Project[];
}

export const HighRiskProjectsCard: React.FC<HighRiskProjectsCardProps> = ({ projects }) => {
  const next2Weeks = {
    start: new Date(),
    end: addDays(new Date(), 14)
  };

  // Filter for high-risk projects starting within the next 2 weeks
  const highRiskProjects = projects
    .filter(project => {
      // Check if project has a start date
      if (!project.startDate) return false;
      
      // Convert string date to Date object
      const startDate = new Date(project.startDate);
      
      // Check if project starts within the next 2 weeks
      return isWithinInterval(startDate, next2Weeks);
    })
    // Sort by risk level (high to low) and then by start date (soonest first)
    .sort((a, b) => {
      // First sort by risk level
      // Handle the case where riskLevel might not be defined
      const getRiskValue = (project: Project) => {
        if (!project.riskLevel) return 2; // medium
        return project.riskLevel === 'high' ? 3 : project.riskLevel === 'medium' ? 2 : 1;
      };
      
      const riskCompare = getRiskValue(b) - getRiskValue(a);
      
      if (riskCompare !== 0) return riskCompare;
      
      // Then sort by start date
      return new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
    })
    .slice(0, 3); // Take top 3 high risk projects

  return (
    <div className="bg-darkCard rounded-xl border border-gray-800 p-4 h-full">
      <h3 className="text-sm font-medium text-gray-400 mb-3">High Risk Projects</h3>
      <p className="text-xs text-gray-400 mb-3">Projects requiring immediate attention in the next 2 weeks</p>
      
      {highRiskProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[100px] text-center">
          <div className="text-green-500 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <p className="text-sm text-gray-400">No high-risk projects in the next 2 weeks</p>
        </div>
      ) : (
        <div className="space-y-3">
          {highRiskProjects.map((project) => (
            <div key={project.id} className="bg-red-900/10 border border-red-900/30 rounded-md p-3">
              <div className="flex items-start justify-between">
                <div className="flex">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{project.projectNumber}: {project.name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Starts {format(new Date(project.startDate || ''), 'MMM d, yyyy')}
                    </p>
                    {project.pmOwner && (
                      <p className="text-xs text-gray-400">PM: {project.pmOwner}</p>
                    )}
                  </div>
                </div>
                <a href={`/project/${project.id}`}>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          ))}
          
          {highRiskProjects.length > 0 && (
            <a href="/projects?filter=high-risk" className="text-xs text-primary hover:underline block text-center mt-2">
              View all high-risk projects
            </a>
          )}
        </div>
      )}
    </div>
  );
};