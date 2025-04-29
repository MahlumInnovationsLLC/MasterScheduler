import React from 'react';
import { 
  DollarSign,
  Flag,
  LineChart,
  Banknote
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface BillingStatusCardProps {
  title: string;
  value: string | number;
  type: 'revenue' | 'milestones' | 'forecast' | 'cashflow';
  change?: {
    value: string | number;
    isPositive: boolean;
  };
  progress?: {
    value: number;
    label: string;
  };
  stats?: {
    label: string;
    value: string | number;
    color?: string;
  }[];
  chart?: {
    labels: string[];
    values: number[];
  };
}

export function BillingStatusCard({
  title,
  value,
  type,
  change,
  progress,
  stats,
  chart
}: BillingStatusCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'revenue':
        return <DollarSign className="text-success" />;
      case 'milestones':
        return <Flag className="text-primary" />;
      case 'forecast':
        return <LineChart className="text-secondary" />;
      case 'cashflow':
        return <Banknote className="text-accent" />;
      default:
        return <DollarSign className="text-success" />;
    }
  };

  return (
    <Card className="bg-darkCard rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-400 font-medium">{title}</h3>
        <div className="p-2 rounded-lg bg-opacity-10" style={{ backgroundColor: 'rgba(var(--chart-1), 0.1)' }}>
          {getIcon()}
        </div>
      </div>
      
      {type === 'milestones' && stats ? (
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className={`text-center p-2 rounded-lg ${
                stat.color || (
                  index === 0 ? 'bg-success bg-opacity-10' : 
                  index === 1 ? 'bg-warning bg-opacity-10' : 
                  index === 2 ? 'bg-danger bg-opacity-10' : 
                  'bg-gray-700 bg-opacity-30'
                )
              }`}
            >
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className={`text-xs ${
                index === 0 ? 'text-success' :
                index === 1 ? 'text-warning' :
                index === 2 ? 'text-danger' :
                'text-gray-400'
              }`}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      ) : type === 'forecast' && chart ? (
        <>
          <div className="flex items-end">
            <span className="text-2xl font-bold font-sans">{value}</span>
            <span className="ml-2 text-sm text-gray-400">next 30 days</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1 h-12">
            {chart.values.map((val, idx) => (
              <div key={idx} className="bg-primary bg-opacity-20 relative rounded-sm">
                <div 
                  className="absolute bottom-0 w-full bg-primary rounded-sm" 
                  style={{ height: `${(val / Math.max(...chart.values)) * 100}%` }}
                ></div>
                <div className="absolute -top-5 w-full text-center text-xs text-gray-400">
                  {chart.labels[idx]}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : type === 'cashflow' && stats ? (
        <div className="space-y-3">
          {stats.map((stat, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm">{stat.label}</span>
              <span className={`font-bold ${index === 2 ? 'text-success' : ''}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-end">
            <span className="text-3xl font-bold font-sans">{value}</span>
            {change && (
              <span className={`ml-2 text-xs ${change.isPositive ? 'text-success' : 'text-danger'} flex items-center`}>
                {change.isPositive ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-down"><path d="m19 12-7 7-7-7"></path><path d="M12 5v14"></path></svg>
                )}
                {change.value}
              </span>
            )}
          </div>
          
          {progress && (
            <div className="mt-3 flex items-center">
              <Progress value={progress.value} className="w-full bg-gray-800 h-2" />
              <span className="ml-2 text-xs text-gray-400">{progress.label}</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default BillingStatusCard;
