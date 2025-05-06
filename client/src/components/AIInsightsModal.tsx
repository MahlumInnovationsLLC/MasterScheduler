import React, { useState } from 'react';
import { 
  Lightbulb, 
  AlertTriangle, 
  Check, 
  X, 
  ChevronRight, 
  Info, 
  BrainCircuit 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AIInsight } from '@shared/schema';

export function AIInsightsModal() {
  const [open, setOpen] = useState(false);
  
  // Placeholder AI insights - in a real implementation, these would come from the AI service
  const insights: AIInsight[] = [
    {
      type: 'manufacturing',
      title: 'Manufacturing Capacity Optimization',
      description: 'Optimize bay allocations based on project timelines and bay capacity.',
      items: [
        {
          severity: 'warning',
          text: 'Bay 3 is currently over-allocated by 35 hours next week',
          detail: 'Consider reassigning Project T4-223 to Bay 5 which has excess capacity.'
        },
        {
          severity: 'danger',
          text: 'Resource bottleneck detected in Electronics section',
          detail: 'Three high-priority projects are scheduled simultaneously with only 2 technicians available.'
        },
        {
          severity: 'success',
          text: 'Optimal bay allocation achieved for Bay 1 and Bay 2',
          detail: 'Current scheduling efficiently utilizes available resources.'
        },
      ],
      confidence: 0.87,
      benefit: 'Potential 15% increase in manufacturing throughput'
    },
    {
      type: 'timeline',
      title: 'Timeline Optimization',
      description: 'Identify scheduling conflicts and suggest improved project timelines.',
      items: [
        {
          severity: 'warning',
          text: 'Project T4-256 has scheduling conflict with Bay 2 maintenance',
          detail: 'Scheduled maintenance on May 15 overlaps with critical assembly phase.'
        },
        {
          severity: 'success',
          text: 'Rescheduling Projects T4-298 and T4-301 creates 3-day efficiency gain',
          detail: 'Swapping these projects optimizes equipment utilization.'
        },
        {
          severity: 'danger',
          text: 'Critical staffing gap identified for May 22-26',
          detail: 'Four simultaneous projects requiring specialized technicians.'
        }
      ],
      confidence: 0.92,
      benefit: 'Potential 8 day reduction in overall delivery timeline'
    },
    {
      type: 'production',
      title: 'Production Insights',
      description: 'Identify ways to optimize production flow and reduce bottlenecks.',
      items: [
        {
          severity: 'warning',
          text: 'Bay 4 is consistently underutilized by ~20%',
          detail: 'Consider reallocating resources or adjusting staffing.'
        },
        {
          severity: 'success',
          text: 'Redistributing current project load could free capacity for 2 new projects',
          detail: 'Moving Project T4-267 from Bay 6 to Bay 4 optimizes resource usage.'
        },
        {
          severity: 'warning',
          text: 'Team specialization causing bottlenecks between departments',
          detail: 'Cross-training opportunities identified for Bay 2 and Bay 3 staff.'
        }
      ],
      confidence: 0.85,
      benefit: 'Potential 12% increase in production capacity'
    }
  ];
  
  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'danger':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  
  const getSeverityClass = (severity: string) => {
    switch(severity) {
      case 'danger':
        return 'bg-red-900/20 border-red-900/30 text-red-400';
      case 'warning':
        return 'bg-amber-900/20 border-amber-900/30 text-amber-400';
      case 'success':
        return 'bg-green-900/20 border-green-900/30 text-green-400';
      default:
        return 'bg-blue-900/20 border-blue-900/30 text-blue-400';
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="bg-primary/10 hover:bg-primary/20 border-none">
          <BrainCircuit className="mr-2 h-4 w-4 text-primary" />
          <span>AI Insights</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <BrainCircuit className="mr-2 h-5 w-5 text-primary" />
            AI Manufacturing Insights
          </DialogTitle>
          <p className="text-sm text-gray-400 mt-2">
            Intelligent recommendations to optimize manufacturing schedules and bay allocation
          </p>
        </DialogHeader>
        
        <Tabs defaultValue="manufacturing" className="mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="manufacturing">
              <Lightbulb className="h-4 w-4 mr-2" /> Bay Utilization
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Lightbulb className="h-4 w-4 mr-2" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="production">
              <Lightbulb className="h-4 w-4 mr-2" /> Production
            </TabsTrigger>
          </TabsList>
          
          {insights.map((insight) => (
            <TabsContent key={insight.type} value={insight.type} className="space-y-4">
              <div className="bg-darkCard border border-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium">{insight.title}</h3>
                <p className="text-sm text-gray-400 mb-3">{insight.description}</p>
                <div className="space-y-3 mt-4">
                  {insight.items.map((item, i) => (
                    <div 
                      key={i} 
                      className={`border ${getSeverityClass(item.severity)} rounded-md p-3 flex items-start`}
                    >
                      <div className="shrink-0 mr-3 mt-0.5">
                        {getSeverityIcon(item.severity)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.text}</p>
                        <p className="text-xs text-gray-400 mt-1">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-4 text-xs text-gray-400">
                  <div className="flex items-center">
                    <span>AI Confidence: </span>
                    <div className="ml-2 bg-gray-800 rounded-full h-1.5 w-24">
                      <div 
                        className="bg-primary h-1.5 rounded-full" 
                        style={{ width: `${insight.confidence ? insight.confidence * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="ml-2">{insight.confidence ? Math.round(insight.confidence * 100) : 0}%</span>
                  </div>
                  <Badge variant="outline" className="ml-2 text-xs bg-primary/10">
                    {insight.benefit}
                  </Badge>
                </div>
              </div>
              
              <div className="p-4 bg-darkCard border border-primary/20 rounded-lg">
                <h4 className="text-sm font-medium flex items-center text-primary">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Why This Matters
                </h4>
                <p className="text-sm text-gray-400 mt-2">
                  Optimizing bay allocation and manufacturing schedules can significantly reduce production time, 
                  increase capacity utilization, and improve on-time delivery performance. These insights are based 
                  on historical project data and current manufacturing capacity metrics.
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
                <Button size="sm">
                  Apply Recommendations <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}