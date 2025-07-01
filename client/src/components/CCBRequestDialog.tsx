import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertTriangle, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface CCBRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: number;
    projectNumber: string;
    name: string;
    fabricationStartDate?: string;
    paintStartDate?: string;
    productionStartDate?: string;
    itStartDate?: string;
    wrapDate?: string;
    ntcTestingDate?: string;
    qcStartDate?: string;
    executiveReviewDate?: string;
    shipDate?: string;
    deliveryDate?: string;
    // OP dates
    opFabricationStartDate?: string;
    opPaintStartDate?: string;
    opProductionStartDate?: string;
    opItStartDate?: string;
    opWrapDate?: string;
    opNtcTestingDate?: string;
    opQcStartDate?: string;
    opExecutiveReviewDate?: string;
    opShipDate?: string;
    opDeliveryDate?: string;
  };
}

interface CCBRequestFormData {
  title: string;
  description: string;
  justification: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  requestedPhases: string[];
  proposedChanges: {
    phase: string;
    currentDate: string;
    proposedDate: string;
    reason: string;
  }[];
}

const MANUFACTURING_PHASES = [
  { key: 'fabricationStartDate', label: 'Fabrication Start', opKey: 'opFabricationStartDate' },
  { key: 'paintStartDate', label: 'PAINT Start', opKey: 'opPaintStartDate' },
  { key: 'productionStartDate', label: 'Production Start', opKey: 'opProductionStartDate' },
  { key: 'itStartDate', label: 'IT Start', opKey: 'opItStartDate' },
  { key: 'wrapDate', label: 'Wrap Date', opKey: 'opWrapDate' },
  { key: 'ntcTestingDate', label: 'NTC Testing', opKey: 'opNtcTestingDate' },
  { key: 'qcStartDate', label: 'QC Start', opKey: 'opQcStartDate' },
  { key: 'executiveReviewDate', label: 'Executive Review', opKey: 'opExecutiveReviewDate' },
  { key: 'shipDate', label: 'Ship Date', opKey: 'opShipDate' },
  { key: 'deliveryDate', label: 'Delivery Date', opKey: 'opDeliveryDate' }
];

export default function CCBRequestDialog({ isOpen, onClose, project }: CCBRequestDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<CCBRequestFormData>({
    title: '',
    description: '',
    justification: '',
    impactLevel: 'medium',
    requestedPhases: [],
    proposedChanges: []
  });

  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [proposedDate, setProposedDate] = useState<string>('');
  const [changeReason, setChangeReason] = useState<string>('');

  const createCCBRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      const response = await fetch('/api/ccb-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create CCB request');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "CCB Request Submitted",
        description: "Your schedule change request has been submitted for departmental review.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ccb-requests'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit CCB request. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      justification: '',
      impactLevel: 'medium',
      requestedPhases: [],
      proposedChanges: []
    });
    setSelectedPhase('');
    setProposedDate('');
    setChangeReason('');
    onClose();
  };

  const addProposedChange = () => {
    if (!selectedPhase || !proposedDate || !changeReason) {
      toast({
        title: "Incomplete Change",
        description: "Please fill in all fields for the proposed change.",
        variant: "destructive"
      });
      return;
    }

    const phaseInfo = MANUFACTURING_PHASES.find(p => p.key === selectedPhase);
    if (!phaseInfo) return;

    const currentDate = project[selectedPhase as keyof typeof project] as string;
    
    const newChange = {
      phase: phaseInfo.label,
      currentDate: currentDate || 'Not set',
      proposedDate,
      reason: changeReason
    };

    setFormData(prev => ({
      ...prev,
      proposedChanges: [...prev.proposedChanges, newChange],
      requestedPhases: [...prev.requestedPhases, selectedPhase]
    }));

    setSelectedPhase('');
    setProposedDate('');
    setChangeReason('');
  };

  const removeProposedChange = (index: number) => {
    setFormData(prev => ({
      ...prev,
      proposedChanges: prev.proposedChanges.filter((_, i) => i !== index),
      requestedPhases: prev.requestedPhases.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description || !formData.justification || formData.proposedChanges.length === 0) {
      toast({
        title: "Incomplete Request",
        description: "Please fill in all required fields and add at least one proposed change.",
        variant: "destructive"
      });
      return;
    }

    const requestData = {
      projectId: project.id,
      title: formData.title,
      description: formData.description,
      justification: formData.justification,
      impactLevel: formData.impactLevel,
      requestedPhases: formData.requestedPhases,
      proposedChanges: formData.proposedChanges,
      status: 'pending_review'
    };

    createCCBRequestMutation.mutate(requestData);
  };

  // Calculate phases with variances (orange highlights)
  const getPhasesWithVariances = () => {
    return MANUFACTURING_PHASES.filter(phase => {
      const currentDate = project[phase.key as keyof typeof project] as string;
      const opDate = project[phase.opKey as keyof typeof project] as string;
      
      if (!currentDate || !opDate) return false;
      
      const current = new Date(currentDate);
      const original = new Date(opDate);
      
      return current.getTime() !== original.getTime();
    });
  };

  const phasesWithVariances = getPhasesWithVariances();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submit Schedule Change Control Board Request
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Project: {project.projectNumber} - {project.name}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Overview */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Project Overview</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Project Number:</span> {project.projectNumber}
              </div>
              <div>
                <span className="font-medium">Project Name:</span> {project.name}
              </div>
            </div>
            
            {phasesWithVariances.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-600">Phases with Date Variances</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {phasesWithVariances.map(phase => (
                    <Badge key={phase.key} variant="outline" className="border-orange-600 text-orange-600">
                      {phase.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Request Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Request Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief title for the schedule change request"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the requested schedule changes"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="justification">Business Justification *</Label>
              <Textarea
                id="justification"
                value={formData.justification}
                onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                placeholder="Explain why this schedule change is necessary and the business impact"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="impact-level">Impact Level</Label>
              <Select value={formData.impactLevel} onValueChange={(value: any) => setFormData(prev => ({ ...prev, impactLevel: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor adjustments</SelectItem>
                  <SelectItem value="medium">Medium - Moderate schedule changes</SelectItem>
                  <SelectItem value="high">High - Significant timeline impact</SelectItem>
                  <SelectItem value="critical">Critical - Major project restructuring</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Add Proposed Changes */}
          <div className="space-y-4">
            <h4 className="font-medium">Proposed Schedule Changes</h4>
            
            <div className="border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="phase-select">Manufacturing Phase</Label>
                  <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      {MANUFACTURING_PHASES.map(phase => (
                        <SelectItem key={phase.key} value={phase.key}>
                          {phase.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="proposed-date">Proposed New Date</Label>
                  <Input
                    id="proposed-date"
                    type="datetime-local"
                    value={proposedDate}
                    onChange={(e) => setProposedDate(e.target.value)}
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={addProposedChange} className="w-full">
                    Add Change
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="change-reason">Reason for Change</Label>
                <Input
                  id="change-reason"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Explain why this date change is needed"
                />
              </div>
            </div>

            {/* Current Proposed Changes */}
            {formData.proposedChanges.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium">Current Proposed Changes:</h5>
                {formData.proposedChanges.map((change, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                    <div className="flex-1">
                      <div className="font-medium">{change.phase}</div>
                      <div className="text-sm text-muted-foreground">
                        <span>Current: {change.currentDate === 'Not set' ? 'Not set' : format(new Date(change.currentDate), 'MMM dd, yyyy')}</span>
                        <span className="mx-2">→</span>
                        <span>Proposed: {format(new Date(change.proposedDate), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Reason: {change.reason}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeProposedChange(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createCCBRequestMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createCCBRequestMutation.isPending ? "Submitting..." : "Submit CCB Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}