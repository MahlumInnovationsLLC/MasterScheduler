import { Router } from "express";
import type { Request, Response } from "express";
import type { Project, Task, BillingMilestone } from "@shared/schema";
import { DatabaseStorage } from "../storage";

const router = Router();
const storage = new DatabaseStorage();

// Global search endpoint - authentication handled by parent router
router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.q?.toString().toLowerCase() || "";
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (query.length < 2) {
      return res.json({ results: [] });
    }

    const results: any[] = [];

    // Search projects (with permission check)
    const projects = await storage.getProjects();
    const accessibleProjects = projects.filter(project => {
      // Admin can see all projects
      if (userRole === 'admin' || userRole === 'editor') return true;
      
      // Viewers can only see projects they're assigned to
      // This would need to be implemented based on your permission model
      return true; // For now, allowing all authenticated users to see projects
    });

    // Search projects - enhanced with PM owner, engineers, and dates
    accessibleProjects.forEach(project => {
      const projectNumber = project.projectNumber?.toLowerCase() || '';
      const projectName = project.name?.toLowerCase() || '';
      const pmOwner = project.pmOwner?.toLowerCase() || '';
      const meAssigned = project.meAssigned?.toLowerCase() || '';
      const eeAssigned = project.eeAssigned?.toLowerCase() || '';
      const iteAssigned = project.iteAssigned?.toLowerCase() || '';
      
      // Check various fields
      const matchesQuery = 
        projectNumber.includes(query) || 
        projectName.includes(query) ||
        pmOwner.includes(query) ||
        meAssigned.includes(query) ||
        eeAssigned.includes(query) ||
        iteAssigned.includes(query);
      
      // Also check dates if query looks like a date
      const dateMatch = query.match(/\d{1,2}[\/-]\d{1,2}|\d{4}/);
      if (dateMatch && project.shipDate) {
        const shipDate = new Date(project.shipDate).toLocaleDateString().toLowerCase();
        if (shipDate.includes(query)) {
          results.push({
            type: 'project',
            id: project.id,
            title: `${project.projectNumber} - ${project.name}`,
            subtitle: `Ship Date: ${new Date(project.shipDate).toLocaleDateString()} • ${project.team || 'No team'}`,
            status: project.status,
            route: `/project/${project.id}`,
          });
          return;
        }
      }
      
      if (matchesQuery) {
        let subtitle = `${project.team || 'No team'} • ${project.status || 'Active'}`;
        
        // Add context about what matched
        if (pmOwner.includes(query)) {
          subtitle = `PM: ${project.pmOwner} • ${project.team || 'No team'}`;
        } else if (meAssigned.includes(query) || eeAssigned.includes(query) || iteAssigned.includes(query)) {
          const engineers = [];
          if (project.meAssigned) engineers.push(`ME: ${project.meAssigned}`);
          if (project.eeAssigned) engineers.push(`EE: ${project.eeAssigned}`);
          if (project.iteAssigned) engineers.push(`ITE: ${project.iteAssigned}`);
          subtitle = engineers.join(' • ');
        }
        
        results.push({
          type: 'project',
          id: project.id,
          title: `${project.projectNumber} - ${project.name}`,
          subtitle: subtitle,
          status: project.status,
          route: `/project/${project.id}`,
        });
      }
    });

    // Search tasks (only user's own tasks)
    const tasks = await storage.getUserTasks(userId);
    tasks.forEach(task => {
      const taskTitle = task.title?.toLowerCase() || '';
      const taskDescription = task.description?.toLowerCase() || '';
      
      if (taskTitle.includes(query) || taskDescription.includes(query)) {
        results.push({
          type: 'task',
          id: task.id,
          title: task.title,
          subtitle: task.description || 'No description',
          status: task.status,
          route: `/tasks/${task.id}`,
        });
      }
    });

    // Search billing milestones (with project permission check)
    const milestones = await storage.getBillingMilestones();
    const accessibleMilestones = milestones.filter(milestone => {
      const project = accessibleProjects.find(p => p.id === milestone.projectId);
      return !!project;
    });

    accessibleMilestones.forEach(milestone => {
      const milestoneName = milestone.name?.toLowerCase() || '';
      const project = accessibleProjects.find(p => p.id === milestone.projectId);
      
      if (milestoneName.includes(query)) {
        results.push({
          type: 'milestone',
          id: milestone.id,
          title: milestone.name,
          subtitle: project ? `${project.projectNumber} - ${project.name}` : 'Project',
          status: milestone.status,
          route: `/project/${milestone.projectId}?tab=billing`,
        });
      }
    });

    // Limit results to 10
    res.json({ results: results.slice(0, 10) });
  } catch (error) {
    console.error("Error in global search:", error);
    res.status(500).json({ error: "Failed to search" });
  }
});

export { router as searchRouter };