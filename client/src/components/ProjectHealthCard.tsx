import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AIInsightsModal, ProjectHealthAnalysis } from './AIInsightsModal';
import { AlertCircle, Check, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProjectHealthCardProps {
  projectId: number;
}

export function ProjectHealthCard({ projectId }: ProjectHealthCardProps) {
  const { data: health, isLoading, isError, refetch, error } = useQuery({
    queryKey: [`/api/ai/project-health/${projectId}`],
    enabled: !!projectId,
    retry: 2,
    retryDelay: 1000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-500';
      case 'at-risk':
      case 'caution':
        return 'bg-amber-500';
      case 'healthy':
        return 'bg-green-500';
      case 'excellent':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
      case 'at-risk':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'caution':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'healthy':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'excellent':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex justify-between items-center">
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-6 w-[100px]" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-full mt-2" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !health) {
    const errorMessage = error?.message || 'Unknown error occurred';
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Project Health</CardTitle>
          <CardDescription>Unable to analyze project health</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            We couldn't generate a health analysis for this project. This could be due to missing data or a temporary API issue.
          </p>
          {errorMessage.includes('API key') && (
            <p className="text-sm text-red-500 mb-4">
              AI analysis requires an OpenAI API key to be configured.
            </p>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            {isLoading ? 'Retrying...' : 'Try Again'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const projectHealth = health as ProjectHealthAnalysis;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Project Health</CardTitle>
          <Badge 
            className={`${getStatusColor(projectHealth.overallHealth.status)} text-white`}
          >
            {projectHealth.overallHealth.status.toUpperCase()}
          </Badge>
        </div>
        <CardDescription>{projectHealth.overallHealth.summary}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Health Score</span>
              <span className="font-medium">{projectHealth.overallHealth.score}/100</span>
            </div>
            <Progress value={projectHealth.overallHealth.score} />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <ScoreCard
              title="Timeline"
              score={projectHealth.timeline.score}
              status={projectHealth.timeline.status}
            />
            <ScoreCard
              title="Budget"
              score={projectHealth.budget.score}
              status={projectHealth.budget.status}
            />
            <ScoreCard
              title="Resources"
              score={projectHealth.resources.score}
              status={projectHealth.resources.status}
            />
            <ScoreCard
              title="Quality"
              score={projectHealth.quality.score}
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <h4 className="text-sm font-medium">Top Risks</h4>
            <ul className="text-sm space-y-1">
              {projectHealth.risks.items.slice(0, 2).map((risk, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between items-center pt-0">
        <span className="text-xs text-muted-foreground">
          AI Confidence: {Math.round(projectHealth.confidenceScore * 100)}%
        </span>
        <AIInsightsModal 
          projectId={projectId} 
          trigger={
            <Button variant="ghost" size="sm">
              <Zap className="mr-2 h-4 w-4" />
              Full Analysis
            </Button>
          } 
        />
      </CardFooter>
    </Card>
  );
}

interface ScoreCardProps {
  title: string;
  score: number;
  status?: string;
}

function ScoreCard({ title, score, status }: ScoreCardProps) {
  const getStatusColor = (score: number) => {
    if (score >= 80) return 'bg-blue-500';
    if (score >= 60) return 'bg-green-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium">{title}</h4>
        {status && (
          <Badge variant="outline" className="text-xs capitalize">
            {status}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className={`${getStatusColor(score)} h-2 w-2 rounded-full`} />
        <span className="text-sm font-medium">{score}</span>
      </div>
    </div>
  );
}