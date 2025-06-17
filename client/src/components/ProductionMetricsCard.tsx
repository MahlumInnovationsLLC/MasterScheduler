import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Database,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users
} from 'lucide-react';

interface ProductionMetrics {
  productionEfficiency: number;
  productionEfficiencyChange: number;
  qualityRate: number;
  qualityRateChange: number;
  oeeScore: number;
  oeeScoreChange: number;
  activeWorkstations: number;
  totalWorkstations: number;
  workstationsInMaintenance: number;
  lastUpdated: string;
  source: string;
  note?: string;
}

interface TeamNeeds {
  teams: Array<{
    id: number;
    name: string;
    currentProjects: number;
    efficiency: number;
    status: string;
  }>;
  pendingNeeds: Array<{
    id: number;
    type: string;
    priority: string;
    description: string;
    team: string;
    estimatedTime: string;
  }>;
  lastUpdated: string;
  source: string;
  note?: string;
}

const ProductionMetricsCard = () => {
  const { data: metrics, isLoading: metricsLoading } = useQuery<ProductionMetrics>({
    queryKey: ['/api/ptn-production-metrics'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: teamNeeds, isLoading: teamLoading } = useQuery<TeamNeeds>({
    queryKey: ['/api/ptn-team-needs'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-gray-500";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (metricsLoading || teamLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-darkCard border-gray-800">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics || !teamNeeds) {
    return (
      <Card className="bg-darkCard border-gray-800">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">
            Production metrics unavailable
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Source Indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Production Metrics</h2>
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-400" />
          <Badge variant="outline" className="text-xs">
            {metrics.source === 'calculated_from_manufacturing_data' ? 'Live Manufacturing Data' : 'PTN API'}
          </Badge>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-darkCard border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Production Efficiency</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">{metrics.productionEfficiency}%</div>
              <div className={`flex items-center gap-1 text-sm ${getChangeColor(metrics.productionEfficiencyChange)}`}>
                {getChangeIcon(metrics.productionEfficiencyChange)}
                {Math.abs(metrics.productionEfficiencyChange)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-darkCard border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Quality Rate</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">{metrics.qualityRate}%</div>
              <div className={`flex items-center gap-1 text-sm ${getChangeColor(metrics.qualityRateChange)}`}>
                {getChangeIcon(metrics.qualityRateChange)}
                {Math.abs(metrics.qualityRateChange)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-darkCard border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">OEE Score</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">{metrics.oeeScore}%</div>
              <div className={`flex items-center gap-1 text-sm ${getChangeColor(metrics.oeeScoreChange)}`}>
                {getChangeIcon(metrics.oeeScoreChange)}
                {Math.abs(metrics.oeeScoreChange)}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workstation Status */}
      <Card className="bg-darkCard border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">Workstation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-xl font-bold text-white">{metrics.activeWorkstations}</div>
                <div className="text-sm text-gray-400">Active Workstations</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-xl font-bold text-white">{metrics.workstationsInMaintenance}</div>
                <div className="text-sm text-gray-400">In Maintenance</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-xl font-bold text-white">{metrics.totalWorkstations}</div>
                <div className="text-sm text-gray-400">Total Workstations</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card className="bg-darkCard border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamNeeds.teams.map((team) => (
              <div key={team.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-400" />
                  <div>
                    <div className="font-medium text-white">{team.name}</div>
                    <div className="text-sm text-gray-400">{team.currentProjects} active projects</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={team.efficiency >= 95 ? 'text-green-400' : team.efficiency >= 90 ? 'text-yellow-400' : 'text-red-400'}>
                    {team.efficiency}% efficiency
                  </Badge>
                  <Badge variant="outline" className={team.status === 'active' ? 'text-green-400' : 'text-gray-400'}>
                    {team.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Needs */}
      {teamNeeds.pendingNeeds.length > 0 && (
        <Card className="bg-darkCard border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Pending Team Needs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamNeeds.pendingNeeds.map((need) => (
                <div key={need.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(need.priority)}`}></div>
                    <div>
                      <div className="font-medium text-white">{need.description}</div>
                      <div className="text-sm text-gray-400">{need.team} • {need.type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">{need.estimatedTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Source Note */}
      {metrics.note && (
        <div className="text-xs text-gray-500 text-center">
          {metrics.note}
        </div>
      )}
    </div>
  );
};

export default ProductionMetricsCard;