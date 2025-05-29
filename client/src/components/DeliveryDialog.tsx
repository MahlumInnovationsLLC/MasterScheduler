import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Project } from "@shared/schema";

interface DeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

const responsibilityOptions = [
  'client_modification',
  'third_party_equipment_install',
  'vendor_fault',
  'weather',
  'client_requested_delay',
  'other'
];

export const DeliveryDialog = memo(({ open, onOpenChange, project }: DeliveryDialogProps) => {
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryReason, setDeliveryReason] = useState("");
  const [delayResponsibility, setDelayResponsibility] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Stable callbacks to prevent re-renders
  const handleDeliveryDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🔥 DELIVERY DIALOG: Date change - value:", e.target.value);
    setDeliveryDate(e.target.value);
  }, []);

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log("🔥 DELIVERY DIALOG: Reason change - value:", e.target.value, "cursor at:", e.target.selectionStart);
    setDeliveryReason(e.target.value);
  }, []);

  const handleResponsibilityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log("🔥 DELIVERY DIALOG: Responsibility change - value:", e.target.value);
    setDelayResponsibility(e.target.value);
  }, []);

  // Calculate if delivery is late - memoized to prevent re-calculations
  const isLateDelivery = useMemo(() => {
    if (!project?.contractDate || !deliveryDate) return false;
    return new Date(deliveryDate) > new Date(project.contractDate);
  }, [project?.contractDate, deliveryDate]);

  // Initialize delivery date when dialog opens
  useEffect(() => {
    if (open && project) {
      console.log("🔥 DELIVERY DIALOG: Initializing for project", project.projectNumber);
      // Use project's existing delivery date if available, otherwise use today
      const initialDate = project.deliveryDate || new Date().toISOString().split('T')[0];
      setDeliveryDate(initialDate);
      setDeliveryReason("");
      setDelayResponsibility("");
    }
  }, [open, project]);

  const markDeliveredMutation = useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number, data: any }) => {
      console.log("🔥 DELIVERY DIALOG: Starting delivery mutation for project", projectId);
      const response = await fetch(`/api/projects/${projectId}/deliver`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Failed to mark project as delivered');
      }
      return response.json();
    },
    onSuccess: () => {
      console.log("🔥 DELIVERY DIALOG: Delivery mutation successful");
      toast({
        title: "Project Delivered",
        description: "Project has been marked as delivered and moved to delivered projects.",
      });
      
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/delivered-projects'] });
      
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("🔥 DELIVERY DIALOG: Delivery mutation failed", error);
      toast({
        title: "Error",
        description: "Failed to mark project as delivered. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async () => {
    if (!project) return;
    
    console.log("🔥 DELIVERY DIALOG: Submit clicked for project", project.projectNumber);
    
    if (isLateDelivery && (!deliveryReason.trim() || !delayResponsibility)) {
      toast({
        title: "Missing Information",
        description: "Please provide both delay reason and responsibility for late deliveries.",
        variant: "destructive"
      });
      return;
    }

    const deliveryData = {
      deliveryDate,
      ...(isLateDelivery && {
        deliveryReason: deliveryReason.trim(),
        delayResponsibility
      })
    };

    markDeliveredMutation.mutate({ projectId: project.id, data: deliveryData });
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mark Project as Delivered</DialogTitle>
          <DialogDescription>
            Mark <strong>{project.name}</strong> (#{project.projectNumber}) as delivered
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="delivery-date" className="text-right">
              Delivery Date
            </Label>
            <Input
              id="delivery-date"
              type="date"
              value={deliveryDate}
              onChange={handleDeliveryDateChange}
              className="col-span-3"
            />
          </div>
          
          {isLateDelivery && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right col-span-4">
                  <div className="text-amber-600 font-semibold flex items-center justify-end">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Late Delivery Detected
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This delivery is after the contracted delivery date
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="delay-reason" className="text-right">
                  Delay Reason
                </Label>
                <Textarea
                  id="delay-reason"
                  value={deliveryReason}
                  onChange={handleReasonChange}
                  onFocus={() => console.log("🔥 DELIVERY DIALOG: Reason textarea focused")}
                  onBlur={() => console.log("🔥 DELIVERY DIALOG: Reason textarea blurred")}
                  placeholder="Explain why the delivery was delayed"
                  className="col-span-3"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="delay-responsibility" className="text-right">
                  Responsibility
                </Label>
                <select
                  id="delay-responsibility"
                  value={delayResponsibility}
                  onChange={handleResponsibilityChange}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Select responsibility --</option>
                  {responsibilityOptions.map(option => (
                    <option key={option} value={option}>
                      {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={markDeliveredMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={markDeliveredMutation.isPending}>
            {markDeliveredMutation.isPending ? "Marking..." : "Mark as Delivered"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

DeliveryDialog.displayName = "DeliveryDialog";