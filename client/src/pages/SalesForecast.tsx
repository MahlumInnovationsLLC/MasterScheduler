import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  Calendar as CalendarIcon, 
  Check, 
  ChevronDown, 
  Pencil, 
  Plus, 
  Table, 
  Grid, 
  Trash2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SalesDeal } from "@shared/schema";
import { Loading } from "@/components/ui/loading";
import { SalesDealsTable } from "@/components/SalesDealsTable";

// Component to create or edit a sales deal
function SalesDealForm({ 
  onClose, 
  existingDeal = null 
}: { 
  onClose: () => void;
  existingDeal?: SalesDeal | null;
}) {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const isEditing = !!existingDeal;
  
  const [formData, setFormData] = useState({
    dealNumber: existingDeal?.dealNumber || `8-${Date.now().toString().slice(-6)}`,
    name: existingDeal?.name || "",
    description: existingDeal?.description || "",
    clientName: existingDeal?.clientName || "",
    clientLocation: existingDeal?.clientLocation || "",
    clientContactName: existingDeal?.clientContactName || "",
    clientContactEmail: existingDeal?.clientContactEmail || "",
    value: existingDeal?.value?.toString() || "",
    currency: existingDeal?.currency || "USD",
    dealType: existingDeal?.dealType || "new_business",
    dealStage: existingDeal?.dealStage || "prospecting",
    priority: existingDeal?.priority || "medium",
    probability: existingDeal?.probability?.toString() || "50",
    notes: existingDeal?.notes || "",
    vertical: existingDeal?.vertical || "East", // Default to "East" instead of "Fast"
    expectedCloseDate: existingDeal?.expectedCloseDate ? new Date(existingDeal.expectedCloseDate) : null,
    lastContactDate: existingDeal?.lastContactDate ? new Date(existingDeal.lastContactDate) : null,
  });
  
  const [isExpectedCloseDateOpen, setIsExpectedCloseDateOpen] = useState(false);
  const [isLastContactDateOpen, setIsLastContactDateOpen] = useState(false);
  
  const createSalesDealMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await apiRequest("POST", "/api/sales-deals", {
        ...formData,
        ownerId: user?.id,
        ownerName: user?.name || user?.username,
        value: formData.value ? parseFloat(formData.value) : null,
        probability: formData.probability ? parseInt(formData.probability) : 50,
        expectedCloseDate: formData.expectedCloseDate ? format(formData.expectedCloseDate, "yyyy-MM-dd") : null,
        lastContactDate: formData.lastContactDate ? format(formData.lastContactDate, "yyyy-MM-dd") : null,
        isActive: true,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-deals"] });
      toast({
        title: "Success",
        description: "Sales deal created successfully",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create sales deal: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const updateSalesDealMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/sales-deals/${existingDeal?.id}`, {
        ...data,
        value: data.value ? parseFloat(data.value) : null,
        probability: data.probability ? parseInt(data.probability) : 50,
        expectedCloseDate: data.expectedCloseDate ? format(data.expectedCloseDate, "yyyy-MM-dd") : null,
        lastContactDate: data.lastContactDate ? format(data.lastContactDate, "yyyy-MM-dd") : null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-deals"] });
      toast({
        title: "Success",
        description: "Sales deal updated successfully",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update sales deal: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.clientName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (isEditing) {
      updateSalesDealMutation.mutate(formData);
    } else {
      createSalesDealMutation.mutate(formData);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dealNumber">Deal Number</Label>
          <Input
            id="dealNumber"
            name="dealNumber"
            value={formData.dealNumber}
            onChange={handleInputChange}
            disabled
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="name">Deal Name *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description || ""}
          onChange={handleInputChange}
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clientName">Client Name *</Label>
          <Input
            id="clientName"
            name="clientName"
            value={formData.clientName}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="clientLocation">Client Location</Label>
          <Input
            id="clientLocation"
            name="clientLocation"
            value={formData.clientLocation || ""}
            onChange={handleInputChange}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clientContactName">Contact Name</Label>
          <Input
            id="clientContactName"
            name="clientContactName"
            value={formData.clientContactName || ""}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="clientContactEmail">Contact Email</Label>
          <Input
            id="clientContactEmail"
            name="clientContactEmail"
            type="email"
            value={formData.clientContactEmail || ""}
            onChange={handleInputChange}
          />
        </div>
      </div>
      
      <Separator />
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value">Deal Value</Label>
          <div className="flex">
            <Select
              value={formData.currency}
              onValueChange={(value) => handleSelectChange("currency", value)}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="USD" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="JPY">JPY</SelectItem>
              </SelectContent>
            </Select>
            <Input
              id="value"
              name="value"
              type="number"
              value={formData.value}
              onChange={handleInputChange}
              className="flex-1 ml-2"
              placeholder="Amount"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="probability">Probability (%)</Label>
          <Input
            id="probability"
            name="probability"
            type="number"
            min="0"
            max="100"
            value={formData.probability}
            onChange={handleInputChange}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dealType">Deal Type</Label>
          <Select
            value={formData.dealType}
            onValueChange={(value) => handleSelectChange("dealType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unsolicited_bid">Unsolicited Bid</SelectItem>
              <SelectItem value="unfinanced_restrict">Unfinanced Restrict</SelectItem>
              <SelectItem value="developed_direct">Developed Direct</SelectItem>
              <SelectItem value="developed_public_bid">Developed Public Bid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="dealStage">Deal Stage</Label>
          <Select
            value={formData.dealStage}
            onValueChange={(value) => handleSelectChange("dealStage", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="verbal_commit">Verbal Commit</SelectItem>
              <SelectItem value="project_launch">Project Launch</SelectItem>
              <SelectItem value="site_core_activity">Site Core Activity</SelectItem>
              <SelectItem value="submit_decide">Submit & Decide</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => handleSelectChange("priority", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Expected Close Date</Label>
          <Popover open={isExpectedCloseDateOpen} onOpenChange={setIsExpectedCloseDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.expectedCloseDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.expectedCloseDate ? format(formData.expectedCloseDate, "PP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.expectedCloseDate || undefined}
                onSelect={(date) => {
                  setFormData(prev => ({ ...prev, expectedCloseDate: date }));
                  setIsExpectedCloseDateOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-2">
          <Label>Last Contact Date</Label>
          <Popover open={isLastContactDateOpen} onOpenChange={setIsLastContactDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.lastContactDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.lastContactDate ? format(formData.lastContactDate, "PP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.lastContactDate || undefined}
                onSelect={(date) => {
                  setFormData(prev => ({ ...prev, lastContactDate: date }));
                  setIsLastContactDateOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <Label htmlFor="vertical">Vertical</Label>
          <Select
            value={formData.vertical || "East"}
            onValueChange={(value) => handleSelectChange("vertical", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vertical" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="East">East</SelectItem>
              <SelectItem value="West">West</SelectItem>
              <SelectItem value="North">North</SelectItem>
              <SelectItem value="South">South</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes || ""}
          onChange={handleInputChange}
          rows={4}
        />
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createSalesDealMutation.isPending || updateSalesDealMutation.isPending}>
          {createSalesDealMutation.isPending || updateSalesDealMutation.isPending ? (
            <Loading size="sm" />
          ) : isEditing ? (
            "Update Deal"
          ) : (
            "Create Deal"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Component for a single sales deal card
function SalesDealCard({ deal, onEdit, onDelete, onConvert }: { 
  deal: SalesDeal; 
  onEdit: (deal: SalesDeal) => void;
  onDelete: (id: number) => void;
  onConvert: (deal: SalesDeal) => void;
}) {
  // Function to get color based on priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-gray-100 text-gray-800";
      case "medium": return "bg-blue-100 text-blue-800";
      case "high": return "bg-amber-100 text-amber-800";
      case "urgent": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  // Function to get color based on deal stage
  const getStageColor = (stage: string) => {
    switch (stage) {
      case "verbal_commit": return "bg-slate-100 text-slate-800";
      case "project_launch": return "bg-blue-100 text-blue-800";
      case "site_core_activity": return "bg-cyan-100 text-cyan-800";
      case "submit_decide": return "bg-teal-100 text-teal-800";
      case "not_started": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  // Function to format stage name for display
  const formatStage = (stage: string) => {
    return stage.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  // Function to format deal type for display
  const formatDealType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  // Function to determine if the deal is convertible to a project
  const isConvertible = deal.dealStage === "submit_decide" && !deal.isConverted;
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{deal.name}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              {deal.dealNumber}
              {deal.isConverted && (
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                  Converted to Project
                </Badge>
              )}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(deal)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {isConvertible && (
                <DropdownMenuItem onClick={() => onConvert(deal)}>
                  <Check className="mr-2 h-4 w-4" />
                  Convert to Project
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDelete(deal.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="secondary" className={cn("font-normal", getPriorityColor(deal.priority))}>
            {deal.priority.charAt(0).toUpperCase() + deal.priority.slice(1)} Priority
          </Badge>
          <Badge variant="secondary" className={cn("font-normal", getStageColor(deal.dealStage))}>
            {formatStage(deal.dealStage)}
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Client:</span>
            <span className="font-medium">{deal.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deal Type:</span>
            <span>{formatDealType(deal.dealType)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Value:</span>
            <span className="font-medium">
              {deal.value ? new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: deal.currency || 'USD',
                maximumFractionDigits: 0
              }).format(Number(deal.value)) : "Not specified"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Probability:</span>
            <span>{deal.probability}%</span>
          </div>
          {deal.expectedCloseDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Close:</span>
              <span>{format(new Date(deal.expectedCloseDate), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>
        
        {deal.description && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-muted-foreground line-clamp-2">{deal.description}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <div className="w-full text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Owner: {deal.ownerName || "Unassigned"}</span>
            <span>Last updated: {format(new Date(deal.updatedAt || deal.createdAt), "MMM d")}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

// Component for converting a sales deal to a project
function ConvertDealDialog({ 
  isOpen,
  onClose,
  onConfirm,
  dealId
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (projectId: number, dealId: number) => void;
  dealId: number | null;
}) {
  const { toast } = useToast();
  const [projectNumber, setProjectNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  
  // Query to get list of existing projects for reference
  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isOpen,
  });
  
  // Mutation to create new project
  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return await res.json();
    },
    onSuccess: (data) => {
      if (dealId) {
        onConfirm(data.id, dealId);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create project: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectNumber || !projectName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    // Check if project number already exists
    if (projects?.find((p: any) => p.projectNumber === projectNumber)) {
      toast({
        title: "Validation Error",
        description: "Project number already exists",
        variant: "destructive",
      });
      return;
    }
    
    createProjectMutation.mutate({
      projectNumber,
      name: projectName,
      status: "active",
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to Project</DialogTitle>
          <DialogDescription>
            Create a new project based on this sales deal. Once created, the deal will be marked as converted.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="projectNumber">Project Number *</Label>
            <Input
              id="projectNumber"
              value={projectNumber}
              onChange={(e) => setProjectNumber(e.target.value)}
              required
              placeholder="Enter a unique project number"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name *</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              placeholder="Enter project name"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending ? <Loading size="sm" /> : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Main component for the Sales Forecast page
export default function SalesForecast() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<SalesDeal | null>(null);
  const [dealToConvert, setDealToConvert] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [filter, setFilter] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("table"); // Toggle between card and table views, default to table view
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query to fetch sales deals
  const { data: salesDeals, isLoading } = useQuery({
    queryKey: ["/api/sales-deals"],
  });
  
  // Mutation to delete a sales deal
  const deleteDealMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sales-deals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-deals"] });
      toast({
        title: "Success",
        description: "Sales deal deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete sales deal: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to convert a sales deal to a project
  const convertDealMutation = useMutation({
    mutationFn: async ({ dealId, projectId }: { dealId: number; projectId: number }) => {
      const res = await apiRequest("POST", `/api/sales-deals/${dealId}/convert`, { projectId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Sales deal converted to project successfully",
      });
      setIsConvertDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to convert sales deal: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handler for editing a deal
  const handleEditDeal = (deal: SalesDeal) => {
    setSelectedDeal(deal);
    setIsCreateDialogOpen(true);
  };
  
  // Handler for deleting a deal
  const handleDeleteDeal = (id: number) => {
    if (window.confirm("Are you sure you want to delete this sales deal?")) {
      deleteDealMutation.mutate(id);
    }
  };
  
  // Handler for initiating deal conversion
  const handleConvertDeal = (deal: SalesDeal) => {
    setDealToConvert(deal.id);
    setIsConvertDialogOpen(true);
  };
  
  // Handler for confirming deal conversion
  const handleConfirmConvert = (projectId: number, dealId: number) => {
    convertDealMutation.mutate({ dealId, projectId });
  };
  
  // Filter deals based on search and active tab
  const filteredDeals = salesDeals
    ? salesDeals.filter((deal: SalesDeal) => {
        // Text search filter
        const matchesFilter =
          !filter ||
          deal.name.toLowerCase().includes(filter.toLowerCase()) ||
          deal.dealNumber.toLowerCase().includes(filter.toLowerCase()) ||
          deal.clientName.toLowerCase().includes(filter.toLowerCase());
        
        // Tab filter
        switch (activeTab) {
          case "early_stage":
            return matchesFilter && 
              ["verbal_commit", "project_launch"].includes(deal.dealStage);
          case "mid_stage":
            return matchesFilter && 
              ["site_core_activity"].includes(deal.dealStage);
          case "late_stage":
            return matchesFilter && 
              ["submit_decide"].includes(deal.dealStage);
          case "converted":
            return matchesFilter && deal.isConverted;
          case "all":
          default:
            return matchesFilter;
        }
      })
    : [];
  
  // Calculate statistics
  const totalDeals = salesDeals?.length || 0;
  const earlyStageCount = salesDeals?.filter((d: SalesDeal) => 
    ["verbal_commit", "project_launch"].includes(d.dealStage)).length || 0;
  const midStageCount = salesDeals?.filter((d: SalesDeal) => 
    ["site_core_activity"].includes(d.dealStage)).length || 0;
  const lateStageCount = salesDeals?.filter((d: SalesDeal) => 
    ["submit_decide"].includes(d.dealStage)).length || 0;
  const convertedCount = salesDeals?.filter((d: SalesDeal) => d.isConverted).length || 0;
  
  // Calculate pipeline value
  const pipelineValue = salesDeals
    ? salesDeals
        .filter((d: SalesDeal) => !d.isConverted && d.value)
        .reduce((sum: number, deal: SalesDeal) => 
          sum + (deal.value ? Number(deal.value) * (deal.probability / 100) : 0), 0)
    : 0;
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Forecast</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your sales pipeline
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setSelectedDeal(null);
              setIsCreateDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" /> New Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedDeal ? "Edit Deal" : "Create New Deal"}</DialogTitle>
              <DialogDescription>
                {selectedDeal 
                  ? "Update the details for this sales deal" 
                  : "Enter information to create a new sales deal"}
              </DialogDescription>
            </DialogHeader>
            <SalesDealForm 
              onClose={() => setIsCreateDialogOpen(false)} 
              existingDeal={selectedDeal}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pipeline Value
            </CardTitle>
            <CardDescription className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: 'USD',
                maximumFractionDigits: 0
              }).format(pipelineValue)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Weighted by probability
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Active Deals
            </CardTitle>
            <CardDescription className="text-2xl font-bold">
              {totalDeals}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center">
              {convertedCount > 0 && (
                <span className="flex items-center text-green-600">
                  <Check className="h-3 w-3 mr-1" /> {convertedCount} converted
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Early Stage
            </CardTitle>
            <CardDescription className="text-2xl font-bold">
              {earlyStageCount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Verbal Commit/Project Launch
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mid Stage
            </CardTitle>
            <CardDescription className="text-2xl font-bold">
              {midStageCount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Site Core Activity
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Late Stage
            </CardTitle>
            <CardDescription className="text-2xl font-bold">
              {lateStageCount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Submit & Decide
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full">
          <Tabs 
            defaultValue="all" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full md:w-auto"
          >
            <TabsList className="grid grid-cols-5 w-full md:w-auto">
              <TabsTrigger value="all">All Deals</TabsTrigger>
              <TabsTrigger value="early_stage">Early Stage</TabsTrigger>
              <TabsTrigger value="mid_stage">Mid Stage</TabsTrigger>
              <TabsTrigger value="late_stage">Late Stage</TabsTrigger>
              <TabsTrigger value="converted">Converted</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="hidden md:flex border rounded-md p-1">
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("card")}
              className="px-2"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="px-2"
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="w-full md:w-auto flex items-center gap-2">
          <Input
            placeholder="Search deals..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full md:w-[300px]"
          />
          <div className="flex md:hidden border rounded-md p-1">
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("card")}
              className="px-2"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="px-2"
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loading size="lg" />
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No deals found</h3>
          <p className="text-muted-foreground mt-1">
            {filter 
              ? "Try adjusting your search or filter criteria"
              : "Get started by creating a new sales deal"}
          </p>
          {filter && (
            <Button variant="outline" className="mt-4" onClick={() => setFilter("")}>
              Clear Search
            </Button>
          )}
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeals.map((deal: SalesDeal) => (
            <SalesDealCard
              key={deal.id}
              deal={deal}
              onEdit={handleEditDeal}
              onDelete={handleDeleteDeal}
              onConvert={handleConvertDeal}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-md shadow">
          <SalesDealsTable deals={filteredDeals} onDelete={handleDeleteDeal} />
        </div>
      )}
      
      <ConvertDealDialog
        isOpen={isConvertDialogOpen}
        onClose={() => setIsConvertDialogOpen(false)}
        onConfirm={handleConfirmConvert}
        dealId={dealToConvert}
      />
    </div>
  );
}