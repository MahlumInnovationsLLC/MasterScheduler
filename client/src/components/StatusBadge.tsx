import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CellHighlighter } from '@/components/CellHighlighter';

interface StatusBadgeProps {
  status: string;
  highlight?: boolean;
  indicator?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, highlight, indicator }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-600/20 text-green-400 border-green-800 hover:bg-green-600/30';
      case 'delayed':
        return 'bg-amber-600/20 text-amber-400 border-amber-800 hover:bg-amber-600/30';
      case 'critical':
        return 'bg-red-600/20 text-red-400 border-red-800 hover:bg-red-600/30';
      case 'completed':
        return 'bg-blue-600/20 text-blue-400 border-blue-800 hover:bg-blue-600/30';
      case 'archived':
        return 'bg-gray-600/20 text-gray-400 border-gray-800 hover:bg-gray-600/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-800 hover:bg-gray-600/30';
    }
  };

  const statusText = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A';
  const statusClass = getStatusColor(status);

  return (
    <div className="flex items-center">
      <Badge className={`${statusClass} ${highlight ? 'ring-2 ring-primary' : ''}`}>
        <CellHighlighter value={statusText} highlight={highlight} indicator={indicator} />
      </Badge>
    </div>
  );
};