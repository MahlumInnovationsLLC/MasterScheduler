import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calendar,
  Info,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';

interface CashFlowData {
  period: string;
  outstanding: number;
  invoiced: number;
  paid: number;
  projected: number;
}

interface CashFlowInsight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

interface EnhancedCashFlowWidgetProps {
  billingMilestones: any[];
}

export function EnhancedCashFlowWidget({ billingMilestones }: EnhancedCashFlowWidgetProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'historical' | 'future'>('future');
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [insights, setInsights] = useState<CashFlowInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Generate AI insights using OpenAI
  const generateAIInsights = async (data: CashFlowData[]) => {
    setIsGeneratingInsights(true);
    try {
      const response = await fetch('/api/ai/cash-flow-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cashFlowData: data,
          period: selectedPeriod,
          timeframe: selectedTimeframe
        }),
      });

      if (response.ok) {
        const aiInsights = await response.json();
        setInsights(aiInsights.insights || []);
      }
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Calculate cash flow data based on selected period and timeframe
  useEffect(() => {
    if (!billingMilestones || billingMilestones.length === 0) return;

    const now = new Date();
    const data: CashFlowData[] = [];

    // Generate periods based on selection
    const periods = selectedTimeframe === 'historical' ? 
      generateHistoricalPeriods(now, selectedPeriod) : 
      generateFuturePeriods(now, selectedPeriod);

    periods.forEach(period => {
      const periodMilestones = billingMilestones.filter(milestone => {
        const targetDate = new Date(milestone.targetInvoiceDate || milestone.liveDate);
        return targetDate >= period.start && targetDate <= period.end;
      });

      const totalPeriodAmount = periodMilestones
        .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

      const invoiced = periodMilestones
        .filter(m => m.status === 'invoiced' || m.status === 'billed')
        .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

      const paid = periodMilestones
        .filter(m => m.status === 'paid')
        .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

      const upcomingDelayed = periodMilestones
        .filter(m => m.status === 'upcoming' || m.status === 'delayed')
        .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

      // For historical periods: outstanding = total - invoiced, no paid category
      // For future periods: outstanding becomes projected
      let outstanding = 0;
      let projected = 0;
      let historicalPaid = 0;

      if (selectedTimeframe === 'historical') {
        outstanding = totalPeriodAmount - invoiced;
        // Don't show paid category for historical
        historicalPaid = 0;
      } else {
        projected = upcomingDelayed;
        historicalPaid = paid;
      }

      data.push({
        period: period.label,
        outstanding,
        invoiced,
        paid: historicalPaid,
        projected
      });
    });

    setCashFlowData(data);
    
    // Generate AI insights when data changes
    if (data.length > 0) {
      generateAIInsights(data);
    }
  }, [billingMilestones, selectedPeriod, selectedTimeframe]);

  const generateHistoricalPeriods = (now: Date, period: string) => {
    const periods = [];
    const count = period === 'week' ? 12 : period === 'month' ? 12 : period === 'quarter' ? 8 : 3;

    for (let i = count - 1; i >= 0; i--) {
      let start: Date, end: Date, label: string;

      if (period === 'week') {
        start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        label = `Week of ${format(start, 'MMM d')}`;
      } else if (period === 'month') {
        const monthDate = subMonths(now, i);
        start = startOfMonth(monthDate);
        end = endOfMonth(monthDate);
        label = format(monthDate, 'MMM yyyy');
      } else if (period === 'quarter') {
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - i * 3, 1);
        start = quarterStart;
        end = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
        label = `Q${Math.floor(quarterStart.getMonth() / 3) + 1} ${quarterStart.getFullYear()}`;
      } else { // year
        start = new Date(now.getFullYear() - i, 0, 1);
        end = new Date(now.getFullYear() - i, 11, 31);
        label = (now.getFullYear() - i).toString();
      }

      periods.push({ start, end, label });
    }

    return periods;
  };

  const generateFuturePeriods = (now: Date, period: string) => {
    const periods = [];
    const count = period === 'week' ? 12 : period === 'month' ? 12 : period === 'quarter' ? 8 : 3;

    for (let i = 0; i < count; i++) {
      let start: Date, end: Date, label: string;

      if (period === 'week') {
        start = new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000);
        end = new Date(now.getTime() + (i + 1) * 7 * 24 * 60 * 60 * 1000);
        label = `Week of ${format(start, 'MMM d')}`;
      } else if (period === 'month') {
        const monthDate = addMonths(now, i);
        start = startOfMonth(monthDate);
        end = endOfMonth(monthDate);
        label = format(monthDate, 'MMM yyyy');
      } else if (period === 'quarter') {
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + i * 3, 1);
        start = quarterStart;
        end = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
        label = `Q${Math.floor(quarterStart.getMonth() / 3) + 1} ${quarterStart.getFullYear()}`;
      } else { // year
        start = new Date(now.getFullYear() + i, 0, 1);
        end = new Date(now.getFullYear() + i, 11, 31);
        label = (now.getFullYear() + i).toString();
      }

      periods.push({ start, end, label });
    }

    return periods;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getInsightBadgeColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const maxValue = Math.max(...cashFlowData.map(d => 
    Math.max(d.outstanding, d.invoiced, d.paid, d.projected)
  ), 1);

  return (
    <Card className="bg-card rounded-xl border border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <DollarSign className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">Enhanced Cash Flow Analysis</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Comprehensive cash flow insights with AI-powered analysis
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateAIInsights(cashFlowData)}
            disabled={isGeneratingInsights}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isGeneratingInsights ? 'Analyzing...' : 'Refresh Insights'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Time Period and Timeframe Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Time Period</label>
            <Tabs value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="quarter">Quarter</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Timeframe</label>
            <Tabs value={selectedTimeframe} onValueChange={(value: any) => setSelectedTimeframe(value)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="historical">Historical</TabsTrigger>
                <TabsTrigger value="future">Future</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Cash Flow Chart */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Cash Flow Overview
          </h3>
          
          <div className="grid gap-3">
            {cashFlowData.map((data, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">{data.period}</span>
                  <div className="flex gap-2 text-xs">
                    {selectedTimeframe === 'historical' ? (
                      <>
                        <span className="text-blue-400">Invoiced: {formatCurrency(data.invoiced)}</span>
                        <span className="text-orange-400">Outstanding: {formatCurrency(data.outstanding)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-purple-400">Projected: {formatCurrency(data.projected)}</span>
                        <span className="text-blue-400">Invoiced: {formatCurrency(data.invoiced)}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                  {selectedTimeframe === 'historical' ? (
                    <>
                      <div 
                        className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${(data.invoiced / maxValue) * 100}%` }}
                      />
                      <div 
                        className="absolute top-0 h-full bg-orange-500 transition-all duration-300"
                        style={{ 
                          left: `${(data.invoiced / maxValue) * 100}%`,
                          width: `${(data.outstanding / maxValue) * 100}%` 
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <div 
                        className="absolute top-0 left-0 h-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${(data.projected / maxValue) * 100}%` }}
                      />
                      <div 
                        className="absolute top-0 h-full bg-blue-500 transition-all duration-300"
                        style={{ 
                          left: `${(data.projected / maxValue) * 100}%`,
                          width: `${(data.invoiced / maxValue) * 100}%` 
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs">
            {selectedTimeframe === 'historical' ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Invoiced</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>Outstanding</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span>Projected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Invoiced</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            AI Cash Flow Insights
          </h3>
          
          {isGeneratingInsights ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <span className="ml-3 text-muted-foreground">Analyzing cash flow patterns...</span>
            </div>
          ) : insights.length > 0 ? (
            <div className="grid gap-3">
              {insights.map((insight, index) => (
                <div 
                  key={index} 
                  className="p-4 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getInsightIcon(insight.type)}
                      <div className="space-y-1">
                        <h4 className="font-medium text-foreground">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                    <Badge className={getInsightBadgeColor(insight.impact)}>
                      {insight.impact.charAt(0).toUpperCase() + insight.impact.slice(1)} Impact
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>Click "Refresh Insights" to generate AI-powered cash flow analysis</p>
            </div>
          )}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-border">
          {selectedTimeframe === 'historical' ? (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {formatCurrency(cashFlowData.reduce((sum, d) => sum + d.invoiced, 0))}
                </div>
                <div className="text-xs text-muted-foreground">Total Invoiced</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {formatCurrency(cashFlowData.reduce((sum, d) => sum + d.outstanding, 0))}
                </div>
                <div className="text-xs text-muted-foreground">Total Outstanding</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {formatCurrency(cashFlowData.reduce((sum, d) => sum + d.invoiced + d.outstanding, 0))}
                </div>
                <div className="text-xs text-muted-foreground">Total Volume</div>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {formatCurrency(cashFlowData.reduce((sum, d) => sum + d.projected, 0))}
                </div>
                <div className="text-xs text-muted-foreground">Total Projected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {formatCurrency(cashFlowData.reduce((sum, d) => sum + d.invoiced, 0))}
                </div>
                <div className="text-xs text-muted-foreground">Already Invoiced</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {((cashFlowData.reduce((sum, d) => sum + d.invoiced, 0) / 
                     Math.max(cashFlowData.reduce((sum, d) => sum + d.projected + d.invoiced, 0), 1)) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Invoiced Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {formatCurrency(cashFlowData.reduce((sum, d) => sum + d.projected + d.invoiced, 0))}
                </div>
                <div className="text-xs text-muted-foreground">Total Pipeline</div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default EnhancedCashFlowWidget;