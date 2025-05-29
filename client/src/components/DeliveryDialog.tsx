import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { Project } from '@shared/schema';

interface DeliveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProject: Project | null;
  deliveryDate: string;
  onDeliveryDateChange: (value: string) => void;
  isLateDelivery: boolean;
  deliveryReason: string;
  onDeliveryReasonChange: (value: string) => void;
  delayResponsibility: string;
  onDelayResponsibilityChange: (value: string) => void;
  responsibilityOptions: string[];
  onSubmit: () => void;
}

export const DeliveryDialog = React.memo(function DeliveryDialog({
  isOpen,
  onClose,
  selectedProject,
  deliveryDate,
  onDeliveryDateChange,
  isLateDelivery,
  deliveryReason,
  onDeliveryReasonChange,
  delayResponsibility,
  onDelayResponsibilityChange,
  responsibilityOptions,
  onSubmit
}: DeliveryDialogProps) {
  console.log("🔄 EXTERNAL DELIVERY DIALOG: Component rendering, isOpen:", isOpen, "project:", selectedProject?.name);
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mark Project as Delivered</DialogTitle>
          <DialogDescription>
            {selectedProject ? (
              <>Mark <strong>{selectedProject.name}</strong> (#{selectedProject.projectNumber}) as delivered</>
            ) : 'Mark project as delivered'}
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
              onChange={(e) => onDeliveryDateChange(e.target.value)}
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
                  onChange={(e) => onDeliveryReasonChange(e.target.value)}
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
                  onChange={(e) => onDelayResponsibilityChange(e.target.value)}
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit}>Mark as Delivered</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});