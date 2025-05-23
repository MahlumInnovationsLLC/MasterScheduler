import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight, AlertTriangle } from 'lucide-react';

interface Stat {
  label: string;
  value: number | string;
}

interface Change {
  value: string;
  isPositive: boolean;
}

interface ManufacturingCardProps {
  title: string;
  value: string | number;
  type: 'utilization' | 'status' | 'resources' | 'completion';
  subtitle?: string;
  change?: Change;
  stats?: Stat[];
}

export const ManufacturingCard: React.FC<ManufacturingCardProps> = ({
  title,
  value,
  type,
  subtitle,
  change,
  stats
}) => {
  // Helper function to determine the color based on utilization percentage
  // Updated for the simplified bay utilization model:
  // 0% = Available (blue)
  // 50% = Near Capacity (amber)
  // 100% = At Capacity (red)
  const getUtilizationColor = (value: number) => {
    if (value === 0) return 'text-blue-500'; // Available
    if (value === 50) return 'text-amber-500'; // Near Capacity
    if (value === 100) return 'text-red-500'; // At Capacity
    
    // For average values that don't match exactly
    if (value < 25) return 'text-blue-500'; // Mostly Available
    if (value < 75) return 'text-amber-500'; // Mostly Near Capacity
    return 'text-red-500'; // Mostly At Capacity
  };
  
  // Helper function to get status text based on utilization
  const getUtilizationStatus = (value: number) => {
    if (value === 0) return 'Available (0 projects)';
    if (value === 50) return 'Near Capacity (1 project)';
    if (value === 100) return 'At Capacity (2+ projects)';
    
    // For average values across multiple bays
    if (value < 25) return 'Mostly Available';
    if (value < 75) return 'Mostly Near Capacity';
    return 'Mostly At Capacity';
  };
  
  // Utilization card content
  const renderUtilization = () => {
    const numericValue = typeof value === 'string' ? parseInt(value) : value;
    const color = getUtilizationColor(numericValue);
    
    return (
      <>
        <div className="flex items-end space-x-1">
          <span className={`text-2xl font-bold ${color}`}>{numericValue}%</span>
          {change && (
            <div className="flex items-center text-xs mb-1 ml-2">
              {change.isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={change.isPositive ? 'text-green-500' : 'text-red-500'}>
                {change.value}
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {subtitle || getUtilizationStatus(numericValue)}
        </p>
        
        <div className="mt-3 w-full bg-gray-800 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${
              numericValue === 0 ? 'bg-blue-600' : 
              numericValue === 50 ? 'bg-amber-600' :
              numericValue === 100 ? 'bg-red-600' :
              numericValue < 25 ? 'bg-blue-600' :
              numericValue < 75 ? 'bg-amber-600' : 'bg-red-600'
            }`}
            style={{ width: `${Math.max(3, numericValue)}%` }}
          ></div>
        </div>
      </>
    );
  };
  
  // Stats grid for status or resources cards
  const renderStats = () => {
    if (!stats) return null;
    
    return (
      <div className="grid grid-cols-2 gap-2 mt-3">
        {stats.map((stat, index) => (
          <div key={index} className="bg-darkBg p-2 rounded">
            <div className="text-xs text-gray-400">{stat.label}</div>
            <div className="text-xl font-semibold">{stat.value}</div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="bg-darkCard rounded-xl border border-gray-800 p-4 h-full">
      <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
      
      {type === 'utilization' && renderUtilization()}
      {(type === 'status' || type === 'resources') && renderStats()}
      
      {type === 'completion' && (
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{value}</span>
          <ArrowRight className="h-5 w-5 text-gray-500" />
        </div>
      )}
    </div>
  );
};