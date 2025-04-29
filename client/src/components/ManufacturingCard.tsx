import React from 'react';
import { 
  Building2,
  CheckSquare,
  Calendar,
  Users
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ManufacturingCardProps {
  title: string;
  value: string | number;
  type: 'utilization' | 'status' | 'schedule' | 'resources';
  change?: {
    value: string | number;
    isPositive: boolean;
  };
  stats?: {
    label: string;
    value: string | number;
    color?: string;
  }[];
  calendar?: {
    months: string[];
    values: ('success' | 'warning' | 'gray')[];
  };
}

export function ManufacturingCard({
  title,
  value,
  type,
  change,
  stats,
  calendar
}: ManufacturingCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'utilization':
        return <Building2 className="text-primary" />;
      case 'status':
        return <CheckSquare className="text-success" />;
      case 'schedule':
        return <Calendar className="text-accent" />;
      case 'resources':
        return <Users className="text-secondary" />;
      default:
        return <Building2 className="text-primary" />;
    }
  };

  const getColorClass = (colorName: string) => {
    switch (colorName) {
      case 'success':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      case 'gray':
        return 'bg-gray-700';
      default:
        return 'bg-gray-700';
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
      
      {type === 'status' && stats ? (
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className={`text-center p-2 rounded-lg ${
                stat.color || (
                  index === 0 ? 'bg-success bg-opacity-10' : 
                  index === 1 ? 'bg-gray-700 bg-opacity-30' : 
                  index === 2 ? 'bg-warning bg-opacity-10' : 
                  'bg-danger bg-opacity-10'
                )
              }`}
            >
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className={`text-xs ${
                index === 0 ? 'text-success' :
                index === 1 ? 'text-gray-400' :
                index === 2 ? 'text-warning' :
                'text-danger'
              }`}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      ) : type === 'schedule' && calendar ? (
        <>
          <div className="flex items-end">
            <span className="text-2xl font-bold font-sans">{value}</span>
            <span className="ml-2 text-sm text-gray-400">projects in queue</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1 h-10">
            {calendar.values.map((val, idx) => (
              <div key={idx} className={getColorClass(val)}></div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-4 text-center text-xs text-gray-400">
            {calendar.months.map((month, idx) => (
              <div key={idx}>{month}</div>
            ))}
          </div>
        </>
      ) : type === 'resources' && stats ? (
        <div className="space-y-3">
          {stats.map((stat, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm">{stat.label}</span>
              <span className={`font-bold ${
                parseFloat(stat.value.toString()) > 90 ? 'text-success' :
                parseFloat(stat.value.toString()) > 70 ? 'text-warning' :
                'text-danger'
              }`}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-end">
            <span className="text-3xl font-bold font-sans">{value}</span>
            {change && (
              <span className={`ml-2 text-xs ${change.isPositive ? 'text-success' : 'text-warning'} flex items-center`}>
                {change.isPositive ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
                )}
                {change.value}
              </span>
            )}
          </div>
          
          <div className="mt-3 flex items-center">
            <Progress value={parseFloat(value.toString())} className="w-full bg-gray-800 h-2" />
          </div>
        </>
      )}
    </Card>
  );
}

export default ManufacturingCard;
