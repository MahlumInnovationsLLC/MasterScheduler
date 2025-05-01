import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, AlertTriangle, Check, Clock, Info, TrendingDown, TrendingUp, Zap } from 'lucide-react';

export interface AIInsight {
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

export interface ProjectHealthAnalysis {
  overallHealth: {
    score: number; // 0-100
    status: 'critical' | 'at-risk' | 'caution' | 'healthy' | 'excellent';
    summary: string;
  };
  timeline: {
    status: 'delayed' | 'on-track' | 'ahead';
    score: number; // 0-100
    analysis: string;
    recommendations: string[];
  };
  budget: {
    status: 'over-budget' | 'on-budget' | 'under-budget';
    score: number; // 0-100
    analysis: string;
    recommendations: string[];
  };
  resources: {
    status: 'insufficient' | 'adequate' | 'optimal';
    score: number; // 0-100
    analysis: string;
    recommendations: string[];
  };
  quality: {
    score: number; // 0-100
    analysis: string;
    recommendations: string[];
  };
  risks: {
    severity: 'low' | 'medium' | 'high';
    items: string[];
    mitigation: string[];
  };
  confidenceScore: number; // AI's confidence in its analysis, 0-1
}

interface AIInsightsModalProps {
  trigger?: React.ReactNode;
  projectId?: number;
}

export const AIInsightsModal: React.FC<AIInsightsModalProps> = ({ trigger, projectId }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(projectId ? 'project-health' : 'insights');
  
  const { data: billingInsights, isLoading: billingLoading } = useQuery({
    queryKey: ['/api/ai/billing-insights'],
    enabled: open && activeTab === 'insights',
  });
  
  const { data: manufacturingInsights, isLoading: manufacturingLoading } = useQuery({
    queryKey: ['/api/ai/manufacturing-insights'],
    enabled: open && activeTab === 'insights',
  });
  
  const { data: timelineInsights, isLoading: timelineLoading } = useQuery({
    queryKey: ['/api/ai/timeline-insights'],
    enabled: open && activeTab === 'insights',
  });
  
  const { data: projectHealth, isLoading: projectHealthLoading } = useQuery({
    queryKey: ['/api/ai/project-health', projectId],
    enabled: open && !!projectId && activeTab === 'project-health',
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
      case 'over-budget':
      case 'delayed':
      case 'insufficient':
      case 'high':
        return 'bg-red-500';
      case 'at-risk':
      case 'caution':
      case 'medium':
        return 'bg-amber-500';
      case 'healthy':
      case 'on-budget':
      case 'on-track':
      case 'adequate':
      case 'low':
        return 'bg-green-500';
      case 'excellent':
      case 'under-budget':
      case 'ahead':
      case 'optimal':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'danger':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'success':
        return <Check className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
      case 'over-budget':
      case 'delayed':
      case 'insufficient':
      case 'high':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'at-risk':
      case 'caution':
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'healthy':
      case 'on-budget':
      case 'on-track':
      case 'adequate':
      case 'low':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'excellent':
      case 'under-budget':
      case 'ahead':
      case 'optimal':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderInsightsTab = () => {
    const isLoading = billingLoading || manufacturingLoading || timelineLoading;
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Zap className="h-10 w-10 text-blue-500 mx-auto animate-pulse" />
            <p className="mt-4 text-muted-foreground">Generating AI insights...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {timelineInsights && typeof timelineInsights === 'object' && (
          <InsightCard insight={timelineInsights as AIInsight} />
        )}
        {billingInsights && typeof billingInsights === 'object' && (
          <InsightCard insight={billingInsights as AIInsight} />
        )}
        {manufacturingInsights && typeof manufacturingInsights === 'object' && (
          <InsightCard insight={manufacturingInsights as AIInsight} />
        )}
      </div>
    );
  };

  const renderProjectHealthTab = () => {
    if (projectHealthLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Zap className="h-10 w-10 text-blue-500 mx-auto animate-pulse" />
            <p className="mt-4 text-muted-foreground">Analyzing project health...</p>
          </div>
        </div>
      );
    }

    if (!projectHealth) {
      return (
        <div className="text-center py-10">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
          <p className="mt-4 text-muted-foreground">Unable to load project health data</p>
        </div>
      );
    }

    const health = projectHealth as ProjectHealthAnalysis;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>Overall Health</CardTitle>
              <Badge 
                className={`${getStatusColor(health.overallHealth.status)} text-white`}
              >
                {health.overallHealth.status.toUpperCase()}
              </Badge>
            </div>
            <CardDescription>{health.overallHealth.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Score</span>
                <span className="font-medium">{health.overallHealth.score}/100</span>
              </div>
              <Progress value={health.overallHealth.score} />
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            AI Confidence: {Math.round(health.confidenceScore * 100)}%
          </CardFooter>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <HealthCategoryCard 
            title="Timeline" 
            status={health.timeline.status}
            score={health.timeline.score}
            analysis={health.timeline.analysis}
            recommendations={health.timeline.recommendations}
          />
          <HealthCategoryCard 
            title="Budget" 
            status={health.budget.status}
            score={health.budget.score}
            analysis={health.budget.analysis}
            recommendations={health.budget.recommendations}
          />
          <HealthCategoryCard 
            title="Resources" 
            status={health.resources.status}
            score={health.resources.score}
            analysis={health.resources.analysis}
            recommendations={health.resources.recommendations}
          />
          <HealthCategoryCard 
            title="Quality" 
            status=""
            score={health.quality.score}
            analysis={health.quality.analysis}
            recommendations={health.quality.recommendations}
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Risk Assessment</CardTitle>
              <Badge 
                className={`${getStatusColor(health.risks.severity)} text-white`}
              >
                {health.risks.severity.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Identified Risks</h4>
                <ul className="space-y-1">
                  {health.risks.items.map((risk, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Mitigation Strategies</h4>
                <ul className="space-y-1">
                  {health.risks.mitigation.map((strategy, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{strategy}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Zap className="mr-2 h-4 w-4" />
            AI Insights
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI-Powered Insights</DialogTitle>
          <DialogDescription>
            Analysis and recommendations powered by artificial intelligence
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="insights">General Insights</TabsTrigger>
            <TabsTrigger value="project-health" disabled={!projectId}>Project Health Score</TabsTrigger>
          </TabsList>
          <TabsContent value="insights" className="py-4">
            {renderInsightsTab()}
          </TabsContent>
          <TabsContent value="project-health" className="py-4">
            {renderProjectHealthTab()}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

interface InsightCardProps {
  insight: AIInsight;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{insight.title}</CardTitle>
        <CardDescription>{insight.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {insight.items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              {getSeverityIcon(item.severity)}
              <div>
                <p className="font-medium text-sm">{item.text}</p>
                {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      {insight.confidence && (
        <CardFooter className="text-xs text-muted-foreground flex justify-between">
          <span>AI Confidence: {Math.round(insight.confidence * 100)}%</span>
          {insight.benefit && <span>{insight.benefit}</span>}
        </CardFooter>
      )}
    </Card>
  );
};

interface HealthCategoryCardProps {
  title: string;
  status: string;
  score: number;
  analysis: string;
  recommendations: string[];
}

const HealthCategoryCard: React.FC<HealthCategoryCardProps> = ({ 
  title, 
  status, 
  score, 
  analysis, 
  recommendations 
}) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          {status && (
            <Badge 
              className={`${status ? getStatusColor(status) : 'bg-gray-500'} text-white`}
            >
              {status.toUpperCase()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Score</span>
              <span className="font-medium">{score}/100</span>
            </div>
            <Progress value={score} />
          </div>
          <p className="text-sm">{analysis}</p>
          <div>
            <h4 className="text-sm font-medium mb-2">Recommendations</h4>
            <ul className="space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'critical':
    case 'over-budget':
    case 'delayed':
    case 'insufficient':
    case 'high':
      return 'bg-red-500';
    case 'at-risk':
    case 'caution':
    case 'medium':
      return 'bg-amber-500';
    case 'healthy':
    case 'on-budget':
    case 'on-track':
    case 'adequate':
    case 'low':
      return 'bg-green-500';
    case 'excellent':
    case 'under-budget':
    case 'ahead':
    case 'optimal':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
}

function getSeverityIcon(severity: 'danger' | 'warning' | 'success') {
  switch (severity) {
    case 'danger':
      return <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />;
    case 'success':
      return <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />;
    default:
      return <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />;
  }
}