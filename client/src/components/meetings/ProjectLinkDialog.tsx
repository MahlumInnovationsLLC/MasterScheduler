import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LinkIcon, UnlinkIcon, FolderIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, Meeting } from "@shared/schema";

interface ProjectLinkDialogProps {
  meeting: Meeting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectLinkDialog({ meeting, open, onOpenChange }: ProjectLinkDialogProps) {
  const [selectedProjects, setSelectedProjects] = useState<number[]>(meeting.relatedProjects || []);
  const { toast } = useToast();

  const { data: projects = [], isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: open
  });

  const linkProjectsMutation = useMutation({
    mutationFn: async (projectIds: number[]) => {
      return apiRequest(`/api/meetings/${meeting.id}/link-projects`, {
        method: "POST",
        body: JSON.stringify({ projectIds })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meeting.id] });
      toast({
        title: "Success",
        description: "Projects linked to meeting successfully"
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to link projects to meeting",
        variant: "destructive"
      });
    }
  });

  const unlinkProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest(`/api/meetings/${meeting.id}/projects/${projectId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meeting.id] });
      toast({
        title: "Success",
        description: "Project unlinked from meeting successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unlink project from meeting",
        variant: "destructive"
      });
    }
  });

  const handleProjectToggle = (projectId: number, checked: boolean) => {
    if (checked) {
      setSelectedProjects(prev => [...prev, projectId]);
    } else {
      setSelectedProjects(prev => prev.filter(id => id !== projectId));
    }
  };

  const handleSave = () => {
    linkProjectsMutation.mutate(selectedProjects);
  };

  const handleUnlinkProject = (projectId: number) => {
    unlinkProjectMutation.mutate(projectId);
    setSelectedProjects(prev => prev.filter(id => id !== projectId));
  };

  const getProjectStatus = (status: string) => {
    const statusColors = {
      active: "bg-green-100 text-green-800",
      delayed: "bg-yellow-100 text-yellow-800",
      completed: "bg-blue-100 text-blue-800",
      critical: "bg-red-100 text-red-800",
      archived: "bg-gray-100 text-gray-800"
    };
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Link Projects to Meeting
          </DialogTitle>
          <DialogDescription>
            Select projects to link with "{meeting.title}". Linked projects will automatically sync tasks and activities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Currently Linked Projects */}
          {selectedProjects.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Currently Linked Projects</h4>
              <div className="grid gap-2">
                {projects
                  .filter(project => selectedProjects.includes(project.id))
                  .map(project => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <FolderIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-sm text-muted-foreground">#{project.projectNumber}</div>
                        </div>
                        <Badge className={getProjectStatus(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkProject(project.id)}
                        disabled={unlinkProjectMutation.isPending}
                      >
                        <UnlinkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Available Projects */}
          <div>
            <h4 className="text-sm font-medium mb-3">Available Projects</h4>
            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-4 space-y-2">
                {loadingProjects ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading projects...
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No projects available
                  </div>
                ) : (
                  projects.map(project => (
                    <div key={project.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                      <Checkbox
                        id={`project-${project.id}`}
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={(checked) => handleProjectToggle(project.id, checked as boolean)}
                      />
                      <label
                        htmlFor={`project-${project.id}`}
                        className="flex-1 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-sm text-muted-foreground">#{project.projectNumber}</div>
                        </div>
                        <Badge className={getProjectStatus(project.status)}>
                          {project.status}
                        </Badge>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={linkProjectsMutation.isPending}
          >
            {linkProjectsMutation.isPending ? "Linking..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}