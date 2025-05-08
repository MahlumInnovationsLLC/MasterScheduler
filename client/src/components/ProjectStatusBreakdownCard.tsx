import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Clock, AlertTriangle, CheckCircle, PauseCircle, ActivitySquare } from 'lucide-react';
import { Project } from '@shared/schema';
import { getProjectStatusColor } from '@/lib/utils';

interface ProjectStatusBreakdownCardProps {
  projects: Project[];
}

export function ProjectStatusBreakdownCard({ projects }: ProjectStatusBreakdownCardProps) {
  // Calculate status counts based on both status field and schedule state
  const statusCounts = React.useMemo(() => {
    if (!projects || projects.length === 0) return [];
    
    // Count projects by status
    const counts = {
      'Pending': 0,
      'In Progress': 0,
      'Scheduled': 0,
      'Not Started': 0,
      'Delayed': 0,
      'Critical': 0,
      'Completed': 0,
      'QC': 0
    };
    
    // Helper function to map project and manufacturing schedule status to display status
    const getDisplayStatus = (project: Project) => {
      if (project.status === 'completed') return 'Completed';
      if (project.status === 'critical') return 'Critical';
      if (project.status === 'delayed') return 'Delayed';
      
      // For active projects, determine more specific state
      if (project.status === 'active') {
        const percentComplete = Number(project.percentComplete || 0);
        
        // If QC has started, project is in QC phase
        if (project.qcStartDate && new Date(project.qcStartDate) <= new Date()) {
          return 'QC';
        }
        
        // If project has progress but no manufacturing schedule, it's in design/planning
        if (percentComplete > 0 && percentComplete < 5) {
          return 'Not Started';
        } else if (percentComplete >= 5 && percentComplete < 20) {
          return 'Scheduled';
        } else if (percentComplete >= 20) {
          return 'In Progress';
        }
        
        return 'Pending';
      }
      
      return 'Pending';
    };
    
    // Count projects by their display status
    projects.forEach(project => {
      const status = getDisplayStatus(project);
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    
    // Convert to array format for chart
    return Object.entries(counts)
      .filter(([_, count]) => count > 0) // Only include statuses with projects
      .map(([status, count]) => ({
        status,
        count
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [projects]);
  
  // Define colors for the different statuses
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Completed': return '#22c55e'; // success green
      case 'In Progress': return '#3b82f6'; // primary blue
      case 'Scheduled': return '#6366f1'; // indigo
      case 'Not Started': return '#a1a1aa'; // gray
      case 'Pending': return '#d4d4d8'; // lighter gray
      case 'QC': return '#8b5cf6'; // purple
      case 'Delayed': return '#f97316'; // orange
      case 'Critical': return '#ef4444'; // red
      default: return '#d4d4d8'; // default gray
    }
  };
  
  // Get the icon for each status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'In Progress': return <ActivitySquare className="h-4 w-4 text-blue-500" />;
      case 'Scheduled': return <Clock className="h-4 w-4 text-indigo-500" />;
      case 'Not Started': return <PauseCircle className="h-4 w-4 text-gray-500" />;
      case 'Pending': return <PauseCircle className="h-4 w-4 text-gray-400" />;
      case 'QC': return <ActivitySquare className="h-4 w-4 text-purple-500" />;
      case 'Delayed': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'Critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };
  
  return (
    <Card className="bg-darkCard rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 font-medium">Project Status Breakdown</h3>
      </div>
      
      <div className="space-y-4">
        <div className="h-52">
          {statusCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusCounts}
                layout="vertical"
                margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
              >
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="status" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ 
                    fill: '#9ca3af', 
                    fontSize: 12 
                  }}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '6px'
                  }}
                  itemStyle={{ color: '#e5e7eb' }}
                  labelStyle={{ color: '#e5e7eb', fontWeight: 'bold' }}
                  formatter={(value) => [`${value} projects`, 'Count']}
                />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 4, 4]}
                  background={{ fill: '#374151' }}
                >
                  {statusCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No project data available
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {statusCounts.map((item) => (
            <div 
              key={item.status}
              className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-lg"
            >
              {getStatusIcon(item.status)}
              <div className="flex-1 text-sm text-gray-300">{item.status}</div>
              <div className="text-sm font-medium">{item.count}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default ProjectStatusBreakdownCard;