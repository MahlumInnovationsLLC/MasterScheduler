import React from 'react';
import { AlertTriangle, Calendar, ArrowRight, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { Project } from '@shared/schema';

interface HighRiskProjectsCardProps {
  projects: Project[];
}

export function HighRiskProjectsCard({ projects }: HighRiskProjectsCardProps) {
  // Filter projects with ship dates within the next 2 weeks
  const upcomingShipDates = React.useMemo(() => {
    if (!projects || projects.length === 0) return [];
    
    const today = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(today.getDate() + 14);
    
    return projects
      .filter(project => {
        if (!project.shipDate) return false;
        const shipDate = new Date(project.shipDate);
        return shipDate >= today && shipDate <= twoWeeksLater;
      })
      .sort((a, b) => {
        const dateA = new Date(a.shipDate || '');
        const dateB = new Date(b.shipDate || '');
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5); // Limit to top 5 projects
  }, [projects]);
  
  // Count for the badge
  const riskCount = upcomingShipDates.length;
  
  return (
    <Card className="bg-darkCard rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-400 font-medium">
          At-Risk Ship Dates
          {riskCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-900 text-red-100">
              {riskCount}
            </span>
          )}
        </h3>
        <div className="p-2 rounded-lg bg-red-500/10 flex items-center justify-center w-9 h-9">
          <AlertTriangle className="text-red-500 h-5 w-5" />
        </div>
      </div>
      
      <div>
        {riskCount === 0 ? (
          <div className="py-3 text-center text-gray-400 text-sm">
            No at-risk ship dates in the next 2 weeks
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {upcomingShipDates.map(project => (
              <li key={project.id} className="py-2">
                <div className="flex items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white line-clamp-1">
                      {project.projectNumber}
                    </p>
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {project.name}
                    </p>
                    <div className="flex items-center mt-1 text-xs text-amber-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>Ships: {formatDate(project.shipDate)}</span>
                    </div>
                  </div>
                  <div className="ml-2 flex items-center">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-red-900/50 text-red-300">
                      <Clock className="h-3 w-3 mr-1" />
                      {getDaysUntilShip(project.shipDate)} days
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {riskCount > 0 && (
        <div className="mt-3 text-right">
          <a href="/project-status" className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center">
            View all at-risk projects <ArrowRight className="h-3 w-3 ml-1" />
          </a>
        </div>
      )}
    </Card>
  );
}

// Helper function to calculate days until ship date
function getDaysUntilShip(shipDateStr: string | null | undefined): number {
  if (!shipDateStr) return 0;
  
  try {
    const shipDate = new Date(shipDateStr);
    const today = new Date();
    
    // Reset time portion to compare dates only
    today.setHours(0, 0, 0, 0);
    shipDate.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(shipDate.getTime() - today.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    console.error("Error calculating days until ship:", e);
    return 0;
  }
}

export default HighRiskProjectsCard;