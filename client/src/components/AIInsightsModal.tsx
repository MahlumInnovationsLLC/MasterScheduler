import React, { useState } from 'react';
import { X, AlertTriangle, DollarSign, Building2, Brain } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AIInsight {
  type: 'timeline' | 'billing' | 'production';
  title: string;
  description: string;
  items: {
    severity: 'danger' | 'warning' | 'success';
    text: string;
    detail?: string;
  }[];
  confidence?: number;
  benefit?: string;
}

interface AIInsightsModalProps {
  trigger?: React.ReactNode;
}

export const AIInsightsModal: React.FC<AIInsightsModalProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false);
  
  // These would ideally come from API calls to your AI insights backend
  const insights: AIInsight[] = [
    {
      type: 'timeline',
      title: 'Timeline Risk Assessment',
      description: 'Based on recent progress and historical data, the following projects are at risk of delays:',
      items: [
        {
          severity: 'danger',
          text: 'PT-1025 (Gamma Network)',
          detail: 'Likely to exceed timeline by 7-10 days'
        },
        {
          severity: 'warning',
          text: 'PT-1024 (Beta Platform)',
          detail: 'May require additional resources to meet deadline'
        }
      ],
      confidence: 85,
    },
    {
      type: 'billing',
      title: 'Billing Optimization',
      description: 'The following billing adjustments could improve cash flow:',
      items: [
        {
          severity: 'success',
          text: 'Restructure PT-1024 milestones to align with production phases'
        },
        {
          severity: 'success',
          text: 'Follow up on PT-1022 final payment (currently 9 days past due)'
        }
      ],
      benefit: 'Improve Q2 cash flow by ~$320K',
    },
    {
      type: 'production',
      title: 'Production Efficiency',
      description: 'Manufacturing bay utilization could be optimized by:',
      items: [
        {
          severity: 'success',
          text: 'Shifting PT-1027 (Omega Controller) production forward by 3 days'
        },
        {
          severity: 'success',
          text: 'Consolidating PT-1029 (Tau Connector) and PT-1026 (Critical Fix) in Bay 4'
        }
      ],
      confidence: 88,
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'timeline':
        return <AlertTriangle className="text-warning mr-2" />;
      case 'billing':
        return <DollarSign className="text-success mr-2" />;
      case 'production':
        return <Building2 className="text-primary mr-2" />;
      default:
        return null;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Brain className="mr-2 h-4 w-4" />
            AI Insights
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-darkCard border border-gray-700 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl font-bold">
            <Brain className="text-accent mr-2" />
            AI Insights
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {insights.map((insight, idx) => (
            <div key={idx} className="p-4 bg-darkInput rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                {getIcon(insight.type)}
                {insight.title}
              </h4>
              <p className="text-sm mb-3">
                {insight.description}
              </p>
              <ul className="space-y-2">
                {insight.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-center text-sm">
                    <div className={`h-2 w-2 rounded-full bg-${item.severity} mr-2`}></div>
                    <span className="font-medium">{item.text}</span>
                    {item.detail && (
                      <span className="text-gray-400 ml-2">- {item.detail}</span>
                    )}
                  </li>
                ))}
              </ul>
              {insight.confidence && (
                <div className="mt-3 text-xs text-right text-gray-400">
                  Confidence: {insight.confidence}%
                </div>
              )}
              {insight.benefit && (
                <div className="mt-3 text-sm text-success font-medium">
                  Potential benefit: {insight.benefit}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end">
          <Button className="bg-accent hover:bg-indigo-600 text-white">
            Apply Recommendations
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIInsightsModal;
