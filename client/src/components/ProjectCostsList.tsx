import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  DollarSign, 
  Download, 
  Upload, 
  FileText, 
  Calculator,
  PieChart,
  Save,
  Edit,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { ProjectCostForm } from './ProjectCostForm';
import { ProjectCostImport } from './ProjectCostImport';
import { ProjectCostExport } from './ProjectCostExport';

type ProjectCostsListProps = {
  projectId: number;
};

interface ProjectCost {
  id: number;
  projectId: number;
  overallCost: string | null;
  useOverallCostOnly: boolean;
  sectionX: string;
  sectionB: string;
  sectionA: string;
  sectionC: string;
  sectionD: string;
  sectionE: string;
  sectionF: string;
  sectionG: string;
  sectionH: string;
  sectionI: string;
  sectionJ: string;
  sectionT: string;
  sectionL: string;
  sectionN: string;
  sectionQ: string;
  sectionU: string;
  notes: string | null;
  lastUpdatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const COST_SECTIONS = [
  { key: 'X', label: 'Section X', description: 'General/Miscellaneous' },
  { key: 'B', label: 'Section B', description: 'Basic Components' },
  { key: 'A', label: 'Section A', description: 'Advanced Systems' },
  { key: 'C', label: 'Section C', description: 'Control Systems' },
  { key: 'D', label: 'Section D', description: 'Drive Systems' },
  { key: 'E', label: 'Section E', description: 'Electrical' },
  { key: 'F', label: 'Section F', description: 'Fabrication' },
  { key: 'G', label: 'Section G', description: 'Gear Systems' },
  { key: 'H', label: 'Section H', description: 'Hydraulics' },
  { key: 'I', label: 'Section I', description: 'Installation' },
  { key: 'J', label: 'Section J', description: 'Jigs & Fixtures' },
  { key: 'T', label: 'Section T', description: 'Testing' },
  { key: 'L', label: 'Section L', description: 'Labor' },
  { key: 'N', label: 'Section N', description: 'Non-Standard' },
  { key: 'Q', label: 'Section Q', description: 'Quality Control' },
  { key: 'U', label: 'Section U', description: 'Utilities' },
];

export function ProjectCostsList({ projectId }: ProjectCostsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCostForm, setShowCostForm] = useState(false);
  const [showImportTool, setShowImportTool] = useState(false);
  const [showExportTool, setShowExportTool] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSections, setEditingSections] = useState<{[key: string]: boolean}>({});

  // Fetch project costs for this project
  const { data: projectCost, isLoading, error } = useQuery({
    queryKey: [`/api/projects/${projectId}/costs`],
    enabled: !!projectId,
  });

  // Create/update project cost mutation
  const saveMutation = useMutation({
    mutationFn: async (costData: any) => {
      const method = projectCost ? 'PUT' : 'POST';
      const url = projectCost ? 
        `/api/project-costs/${projectId}` : 
        '/api/project-costs';
      
      const res = await apiRequest(method, url, {
        ...costData,
        projectId: projectId,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save project costs');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project costs saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/costs`] });
      setIsEditing(false);
      setEditingSections({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate total from sections
  const calculateSectionTotal = (cost: ProjectCost) => {
    const sections = [
      'sectionX', 'sectionB', 'sectionA', 'sectionC', 'sectionD', 'sectionE',
      'sectionF', 'sectionG', 'sectionH', 'sectionI', 'sectionJ', 'sectionT',
      'sectionL', 'sectionN', 'sectionQ', 'sectionU'
    ];
    
    return sections.reduce((total, section) => {
      const value = parseFloat(cost[section as keyof ProjectCost] as string) || 0;
      return total + value;
    }, 0);
  };

  // Handle overall cost toggle
  const handleToggleOverallCost = (useOverallOnly: boolean) => {
    if (!projectCost) return;
    
    saveMutation.mutate({
      ...projectCost,
      useOverallCostOnly: useOverallOnly,
    });
  };

  // Handle section cost update
  const handleSectionUpdate = (sectionKey: string, value: string) => {
    if (!projectCost) return;
    
    const updatedCost = {
      ...projectCost,
      [`section${sectionKey}`]: value,
    };
    
    saveMutation.mutate(updatedCost);
  };

  // Handle overall cost update
  const handleOverallCostUpdate = (value: string) => {
    if (!projectCost) return;
    
    saveMutation.mutate({
      ...projectCost,
      overallCost: value,
    });
  };

  // Handle notes update
  const handleNotesUpdate = (notes: string) => {
    if (!projectCost) return;
    
    saveMutation.mutate({
      ...projectCost,
      notes: notes,
    });
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  if (isLoading) {
    return <div className="space-y-4">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">
      Error loading project costs: {error.message}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Project Cost Management
          </h3>
          <p className="text-sm text-gray-500">
            Track overall project costs or detailed section breakdowns
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportTool(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Tool
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportTool(true)}
            disabled={!projectCost}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {!projectCost && (
            <Button
              size="sm"
              onClick={() => setShowCostForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Setup Costs
            </Button>
          )}
        </div>
      </div>

      {projectCost ? (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sections">Section Details</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">Cost Summary</CardTitle>
                    <CardDescription>
                      Last updated {format(new Date(projectCost.updatedAt), 'MMM dd, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="overall-cost-mode"
                      checked={projectCost.useOverallCostOnly}
                      onCheckedChange={handleToggleOverallCost}
                    />
                    <Label htmlFor="overall-cost-mode" className="text-sm">
                      Overall Cost Only
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {projectCost.useOverallCostOnly ? (
                  <div className="space-y-4">
                    <div className="text-center p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                      <DollarSign className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">
                        {formatCurrency(projectCost.overallCost || 0)}
                      </h3>
                      <p className="text-gray-600">Total Project Cost</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overall-cost">Overall Cost</Label>
                      <div className="flex gap-2">
                        <Input
                          id="overall-cost"
                          type="number"
                          step="0.01"
                          value={projectCost.overallCost || ''}
                          onChange={(e) => handleOverallCostUpdate(e.target.value)}
                          placeholder="Enter total project cost"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleOverallCostUpdate(projectCost.overallCost || '')}
                          disabled={saveMutation.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                        <Calculator className="h-8 w-8 text-green-500 mx-auto mb-3" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">
                          {formatCurrency(calculateSectionTotal(projectCost))}
                        </h3>
                        <p className="text-gray-600">Calculated Total</p>
                      </div>
                      <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                        <PieChart className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">
                          {COST_SECTIONS.length}
                        </h3>
                        <p className="text-gray-600">Cost Sections</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {COST_SECTIONS.slice(0, 8).map((section) => {
                        const value = projectCost[`section${section.key}` as keyof ProjectCost] as string;
                        return (
                          <div key={section.key} className="p-3 border rounded-lg">
                            <div className="text-sm font-medium text-gray-700">{section.label}</div>
                            <div className="text-lg font-semibold text-gray-900">
                              {formatCurrency(value)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {projectCost.notes && (
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{projectCost.notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Section Cost Breakdown</CardTitle>
                <CardDescription>
                  Detailed cost breakdown by manufacturing sections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {COST_SECTIONS.map((section) => {
                    const sectionKey = `section${section.key}`;
                    const value = projectCost[sectionKey as keyof ProjectCost] as string;
                    const isEditingSection = editingSections[section.key];
                    
                    return (
                      <div key={section.key} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{section.key}</Badge>
                            <div>
                              <h4 className="font-medium">{section.label}</h4>
                              <p className="text-sm text-gray-500">{section.description}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isEditingSection ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={value}
                                onChange={(e) => handleSectionUpdate(section.key, e.target.value)}
                                className="w-32"
                                placeholder="0.00"
                              />
                              <Button
                                size="sm"
                                onClick={() => setEditingSections(prev => ({ ...prev, [section.key]: false }))}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="text-lg font-semibold w-32 text-right">
                                {formatCurrency(value)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingSections(prev => ({ ...prev, [section.key]: true }))}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-lg font-semibold">Total (Calculated)</h4>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(calculateSectionTotal(projectCost))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {COST_SECTIONS.map((section) => {
                      const value = parseFloat(projectCost[`section${section.key}` as keyof ProjectCost] as string) || 0;
                      const total = calculateSectionTotal(projectCost);
                      const percentage = total > 0 ? (value / total) * 100 : 0;
                      
                      return (
                        <div key={section.key} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{section.label}</span>
                            <span>{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Cost Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Sections with costs:</span>
                    <span className="font-semibold">
                      {COST_SECTIONS.filter(section => {
                        const value = parseFloat(projectCost[`section${section.key}` as keyof ProjectCost] as string) || 0;
                        return value > 0;
                      }).length} / {COST_SECTIONS.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average section cost:</span>
                    <span className="font-semibold">
                      {formatCurrency(calculateSectionTotal(projectCost) / COST_SECTIONS.length)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Highest section:</span>
                    <span className="font-semibold">
                      {(() => {
                        let maxValue = 0;
                        let maxSection = '';
                        COST_SECTIONS.forEach(section => {
                          const value = parseFloat(projectCost[`section${section.key}` as keyof ProjectCost] as string) || 0;
                          if (value > maxValue) {
                            maxValue = value;
                            maxSection = section.label;
                          }
                        });
                        return maxSection ? `${maxSection} (${formatCurrency(maxValue)})` : 'None';
                      })()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Settings</CardTitle>
                <CardDescription>
                  Configure how project costs are tracked and calculated
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Use Overall Cost Only</h4>
                      <p className="text-sm text-gray-500">
                        Track total project cost without section breakdown
                      </p>
                    </div>
                    <Switch
                      checked={projectCost.useOverallCostOnly}
                      onCheckedChange={handleToggleOverallCost}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="cost-notes">Cost Notes</Label>
                  <Textarea
                    id="cost-notes"
                    value={projectCost.notes || ''}
                    onChange={(e) => handleNotesUpdate(e.target.value)}
                    placeholder="Add notes about project costs, assumptions, or methodology..."
                    rows={4}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCostForm(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Costs
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowExportTool(true)}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cost Data</h3>
            <p className="text-gray-500 text-center mb-6">
              Set up project costs to track overall budget or detailed section breakdowns
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setShowCostForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Setup Costs
              </Button>
              <Button variant="outline" onClick={() => setShowImportTool(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <ProjectCostForm
        open={showCostForm}
        onOpenChange={setShowCostForm}
        projectId={projectId}
        defaultValues={projectCost}
        isEdit={!!projectCost}
      />

      <ProjectCostImport
        open={showImportTool}
        onOpenChange={setShowImportTool}
        projectId={projectId}
      />

      <ProjectCostExport
        open={showExportTool}
        onOpenChange={setShowExportTool}
        projectId={projectId}
        projectCost={projectCost}
      />
    </div>
  );
}