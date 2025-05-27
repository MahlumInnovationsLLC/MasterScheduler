import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DollarSign, Calculator } from 'lucide-react';

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

const projectCostSchema = z.object({
  overallCost: z.string().optional(),
  useOverallCostOnly: z.boolean(),
  sectionX: z.string().default('0'),
  sectionB: z.string().default('0'),
  sectionA: z.string().default('0'),
  sectionC: z.string().default('0'),
  sectionD: z.string().default('0'),
  sectionE: z.string().default('0'),
  sectionF: z.string().default('0'),
  sectionG: z.string().default('0'),
  sectionH: z.string().default('0'),
  sectionI: z.string().default('0'),
  sectionJ: z.string().default('0'),
  sectionT: z.string().default('0'),
  sectionL: z.string().default('0'),
  sectionN: z.string().default('0'),
  sectionQ: z.string().default('0'),
  sectionU: z.string().default('0'),
  notes: z.string().optional(),
});

type ProjectCostFormData = z.infer<typeof projectCostSchema>;

interface ProjectCostFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  defaultValues?: any;
  isEdit?: boolean;
}

export function ProjectCostForm({
  open,
  onOpenChange,
  projectId,
  defaultValues,
  isEdit = false,
}: ProjectCostFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProjectCostFormData>({
    resolver: zodResolver(projectCostSchema),
    defaultValues: {
      overallCost: defaultValues?.overallCost || '',
      useOverallCostOnly: defaultValues?.useOverallCostOnly || false,
      sectionX: defaultValues?.sectionX || '0',
      sectionB: defaultValues?.sectionB || '0',
      sectionA: defaultValues?.sectionA || '0',
      sectionC: defaultValues?.sectionC || '0',
      sectionD: defaultValues?.sectionD || '0',
      sectionE: defaultValues?.sectionE || '0',
      sectionF: defaultValues?.sectionF || '0',
      sectionG: defaultValues?.sectionG || '0',
      sectionH: defaultValues?.sectionH || '0',
      sectionI: defaultValues?.sectionI || '0',
      sectionJ: defaultValues?.sectionJ || '0',
      sectionT: defaultValues?.sectionT || '0',
      sectionL: defaultValues?.sectionL || '0',
      sectionN: defaultValues?.sectionN || '0',
      sectionQ: defaultValues?.sectionQ || '0',
      sectionU: defaultValues?.sectionU || '0',
      notes: defaultValues?.notes || '',
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ProjectCostFormData) => {
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? 
        `/api/project-costs/${projectId}` : 
        '/api/project-costs';
      
      const res = await apiRequest(method, url, {
        ...data,
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
        description: `Project costs ${isEdit ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/costs`] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const useOverallCostOnly = form.watch('useOverallCostOnly');

  const calculateSectionTotal = () => {
    const values = form.getValues();
    const sections = [
      'sectionX', 'sectionB', 'sectionA', 'sectionC', 'sectionD', 'sectionE',
      'sectionF', 'sectionG', 'sectionH', 'sectionI', 'sectionJ', 'sectionT',
      'sectionL', 'sectionN', 'sectionQ', 'sectionU'
    ];
    
    return sections.reduce((total, section) => {
      const value = parseFloat(values[section as keyof ProjectCostFormData] as string) || 0;
      return total + value;
    }, 0);
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const onSubmit = (data: ProjectCostFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {isEdit ? 'Edit Project Costs' : 'Setup Project Costs'}
          </DialogTitle>
          <DialogDescription>
            Configure project cost tracking with overall budget or detailed section breakdown
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Cost Mode Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cost Tracking Mode</CardTitle>
                <CardDescription>
                  Choose how you want to track project costs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="useOverallCostOnly"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center space-x-4">
                        <FormControl>
                          <input
                            type="radio"
                            checked={field.value}
                            onChange={() => field.onChange(true)}
                            className="h-4 w-4 text-blue-600"
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="text-base font-medium">
                            Overall Cost Only
                          </FormLabel>
                          <FormDescription>
                            Track total project cost without section breakdown
                          </FormDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-4">
                        <FormControl>
                          <input
                            type="radio"
                            checked={!field.value}
                            onChange={() => field.onChange(false)}
                            className="h-4 w-4 text-blue-600"
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="text-base font-medium">
                            Section Breakdown
                          </FormLabel>
                          <FormDescription>
                            Track costs by individual manufacturing sections
                          </FormDescription>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Tabs value={useOverallCostOnly ? "overall" : "sections"} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overall" disabled={!useOverallCostOnly}>
                  Overall Cost
                </TabsTrigger>
                <TabsTrigger value="sections" disabled={useOverallCostOnly}>
                  Section Breakdown
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overall" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Project Cost</CardTitle>
                    <CardDescription>
                      Enter the total project cost without section breakdown
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="overallCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Project Cost</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-10"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Enter the total project cost in USD
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sections" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Section Cost Breakdown</CardTitle>
                        <CardDescription>
                          Enter costs for each manufacturing section
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Calculated Total</div>
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(calculateSectionTotal())}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {COST_SECTIONS.map((section) => (
                        <FormField
                          key={section.key}
                          control={form.control}
                          name={`section${section.key}` as keyof ProjectCostFormData}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Badge variant="outline">{section.key}</Badge>
                                {section.label}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="pl-10"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Add notes about cost calculations, assumptions, or methodology..."
                          rows={4}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional notes about the project costs
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : (isEdit ? 'Update Costs' : 'Save Costs')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}