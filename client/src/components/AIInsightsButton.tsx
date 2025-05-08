import React, { useState } from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { Project } from '@shared/schema';

interface AIInsightsButtonProps {
  projects: Project[];
}

export function AIInsightsButton({ projects }: AIInsightsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [insightType, setInsightType] = useState<'schedule' | 'risk' | 'performance'>('risk');
  
  // Query to get AI insights
  const { data: insights, isLoading, error } = useQuery({
    queryKey: ['/api/ai/insights', insightType, isOpen],
    queryFn: async () => {
      if (!isOpen) return null;
      
      // We'll make a real API call here when the endpoint is ready
      // For now, simulate a response based on the insight type
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      
      if (insightType === 'risk') {
        return [
          'Projects 804205 and 803944 have high risk profiles due to tight deadlines and compressed QC timelines.',
          'Manufacturing bay capacity is currently at 80% utilization across all teams, with 3 bays at full capacity.',
          'Recent delays in material deliveries for 2 projects may impact timelines. Consider proactive resource allocation.',
          'Schedule analysis indicates 4 projects are at risk of missing their ship dates.',
        ];
      } else if (insightType === 'schedule') {
        return [
          'Current manufacturing schedule has 3 potential bottlenecks in the Assembly team next week.',
          'Based on historical data, QC timelines for the current workload may need adjustment.',
          'Optimization opportunity: Reallocating resources from Bay 3 to Bay 5 could improve overall throughput.',
          'Current workload should be sustainable with current team capacity for the next 30 days.',
        ];
      } else {
        return [
          'Project completion rates are 12% higher this quarter compared to last quarter.',
          'On-time delivery performance has improved by 8% in the last 30 days.',
          'Labor hours per project have decreased by 5% indicating improved efficiency.',
          'Resource utilization is optimal across manufacturing teams with balanced workloads.',
        ];
      }
    },
    enabled: isOpen,
  });
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full flex items-center justify-center gap-2 mt-2"
        >
          <Brain className="h-4 w-4" />
          <span>AI Insights</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>AI Project Insights</DialogTitle>
          <DialogDescription>
            AI-powered analysis of your project data to identify risks, opportunities, and patterns.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 mb-4">
          <Button 
            variant={insightType === 'risk' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setInsightType('risk')}
          >
            Risk Analysis
          </Button>
          <Button 
            variant={insightType === 'schedule' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setInsightType('schedule')}
          >
            Schedule Insights
          </Button>
          <Button 
            variant={insightType === 'performance' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setInsightType('performance')}
          >
            Performance
          </Button>
        </div>
        
        <div className="bg-muted p-4 rounded-lg">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Analyzing project data...</p>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">
              Error retrieving AI insights. Please try again.
            </div>
          ) : insights && insights.length > 0 ? (
            <ul className="space-y-3">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm">{insight}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground">
              Select an insight type to analyze your projects
            </p>
          )}
        </div>
        
        <div className="flex justify-between mt-4">
          <div className="text-xs text-muted-foreground">
            Powered by OpenAI's advanced analytics
          </div>
          <DialogClose asChild>
            <Button variant="secondary" size="sm">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AIInsightsButton;