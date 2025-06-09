import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const createMeetingSchema = z.object({
  title: z.string().min(1, "Meeting title is required"),
  datetime: z.string().min(1, "Date and time is required"),
  location: z.string().optional(),
  virtualLink: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  agenda: z.array(z.string()).default([]),
  attendeeIds: z.array(z.string()).default([]),
});

type CreateMeetingForm = z.infer<typeof createMeetingSchema>;

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface MeetingTemplate {
  id: number;
  name: string;
  description?: string;
  agendaItems: string[];
  defaultDuration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CreateMeetingDialog({ open, onOpenChange }: CreateMeetingDialogProps) {
  const [agendaItems, setAgendaItems] = useState<string[]>([]);
  const [newAgendaItem, setNewAgendaItem] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users for attendee selection
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Fetch meeting templates
  const { data: templates = [] } = useQuery<MeetingTemplate[]>({
    queryKey: ['/api/meeting-templates'],
  });

  const form = useForm<CreateMeetingForm>({
    resolver: zodResolver(createMeetingSchema),
    defaultValues: {
      title: "",
      datetime: "",
      location: "",
      virtualLink: "",
      description: "",
      agenda: [],
      attendeeIds: [],
    },
  });

  const createMeetingMutation = useMutation({
    mutationFn: (data: CreateMeetingForm) => {
      const meetingData = {
        ...data,
        agenda: agendaItems,
        datetime: new Date(data.datetime).toISOString(),
      };
      return apiRequest('/api/meetings', {
        method: 'POST',
        body: JSON.stringify(meetingData),
      });
    },
    onSuccess: async (meeting) => {
      // Add attendees
      if (selectedAttendees.length > 0) {
        await Promise.all(
          selectedAttendees.map(userId =>
            apiRequest(`/api/meetings/${meeting.id}/attendees`, {
              method: 'POST',
              body: JSON.stringify({ userId }),
            })
          )
        );
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({ title: "Meeting created successfully" });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create meeting", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const resetForm = () => {
    form.reset();
    setAgendaItems([]);
    setNewAgendaItem("");
    setSelectedAttendees([]);
    setSelectedTemplate("");
  };

  const applyTemplate = (templateId: string) => {
    if (templateId === "none") {
      // Clear form when "No template" is selected
      form.setValue('title', '');
      form.setValue('description', '');
      setAgendaItems([]);
      setSelectedTemplate("");
      return;
    }
    
    const template = templates.find(t => t.id.toString() === templateId);
    if (template) {
      form.setValue('title', template.name);
      form.setValue('description', template.description || "");
      setAgendaItems(template.agendaItems || []);
      setSelectedTemplate(templateId);
    }
  };

  const addAgendaItem = () => {
    if (newAgendaItem.trim()) {
      setAgendaItems([...agendaItems, newAgendaItem.trim()]);
      setNewAgendaItem("");
    }
  };

  const removeAgendaItem = (index: number) => {
    setAgendaItems(agendaItems.filter((_, i) => i !== index));
  };

  const addAttendee = (userId: string) => {
    if (!selectedAttendees.includes(userId)) {
      setSelectedAttendees([...selectedAttendees, userId]);
    }
  };

  const removeAttendee = (userId: string) => {
    setSelectedAttendees(selectedAttendees.filter(id => id !== userId));
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.email || 'Unknown User';
  };

  const onSubmit = (data: CreateMeetingForm) => {
    createMeetingMutation.mutate({
      ...data,
      agenda: agendaItems,
      attendeeIds: selectedAttendees,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Meeting</DialogTitle>
          <DialogDescription>
            Set up a new meeting with agenda items and attendees
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Weekly Team Standup" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Template Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Use Template (Optional)</label>
              <Select value={selectedTemplate} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template to start from..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground">
                  Template applied. You can modify the fields below as needed.
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="datetime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date and Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Conference Room A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="virtualLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Virtual Link (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://zoom.us/j/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the meeting purpose..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Agenda Items */}
            <div className="space-y-2">
              <FormLabel>Agenda Items</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add agenda item..."
                  value={newAgendaItem}
                  onChange={(e) => setNewAgendaItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAgendaItem())}
                />
                <Button type="button" variant="outline" onClick={addAgendaItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {agendaItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{item}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAgendaItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendees */}
            <div className="space-y-2">
              <FormLabel>Attendees</FormLabel>
              <Select onValueChange={addAttendee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select attendees..." />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(user => !selectedAttendees.includes(user.id))
                    .map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {getUserDisplayName(user)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2">
                {selectedAttendees.map(userId => {
                  const user = users.find(u => u.id === userId);
                  if (!user) return null;
                  return (
                    <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                      {getUserDisplayName(user)}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeAttendee(userId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMeetingMutation.isPending}>
                {createMeetingMutation.isPending ? "Creating..." : "Create Meeting"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}