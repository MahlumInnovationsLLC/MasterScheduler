import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { ZodError } from "zod";
import {
  insertProjectSchema,
  insertTaskSchema,
  insertBillingMilestoneSchema,
  insertManufacturingBaySchema,
  insertManufacturingScheduleSchema,
} from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  importProjects, 
  importBillingMilestones, 
  importManufacturingBays, 
  importManufacturingSchedules 
} from "./import";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Error handling middleware for Zod validation
  const validateRequest = (schema: z.ZodSchema<any>) => {
    return (req: Request, res: Response, next: any) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        } else {
          next(error);
        }
      }
    };
  };

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Error fetching projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Error fetching project" });
    }
  });

  app.post("/api/projects", validateRequest(insertProjectSchema), async (req, res) => {
    try {
      const project = await storage.createProject(req.body);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ message: "Error creating project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.updateProject(id, req.body);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Error updating project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteProject(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ message: "Error deleting project" });
    }
  });

  // Task routes
  app.get("/api/projects/:projectId/tasks", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const tasks = await storage.getTasks(projectId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Error fetching task" });
    }
  });

  app.post("/api/tasks", validateRequest(insertTaskSchema), async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ message: "Error creating task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.updateTask(id, req.body);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Error updating task" });
    }
  });

  app.put("/api/tasks/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const completedDate = req.body.completedDate ? new Date(req.body.completedDate) : new Date();
      const task = await storage.completeTask(id, completedDate);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Error completing task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteTask(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ message: "Error deleting task" });
    }
  });

  // Billing Milestone routes
  app.get("/api/billing-milestones", async (req, res) => {
    try {
      const milestones = await storage.getBillingMilestones();
      res.json(milestones);
    } catch (error) {
      res.status(500).json({ message: "Error fetching billing milestones" });
    }
  });

  app.get("/api/projects/:projectId/billing-milestones", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const milestones = await storage.getProjectBillingMilestones(projectId);
      res.json(milestones);
    } catch (error) {
      res.status(500).json({ message: "Error fetching project billing milestones" });
    }
  });

  app.get("/api/billing-milestones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const milestone = await storage.getBillingMilestone(id);
      if (!milestone) {
        return res.status(404).json({ message: "Billing milestone not found" });
      }
      res.json(milestone);
    } catch (error) {
      res.status(500).json({ message: "Error fetching billing milestone" });
    }
  });

  app.post("/api/billing-milestones", validateRequest(insertBillingMilestoneSchema), async (req, res) => {
    try {
      const milestone = await storage.createBillingMilestone(req.body);
      res.status(201).json(milestone);
    } catch (error) {
      res.status(500).json({ message: "Error creating billing milestone" });
    }
  });

  app.put("/api/billing-milestones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const milestone = await storage.updateBillingMilestone(id, req.body);
      if (!milestone) {
        return res.status(404).json({ message: "Billing milestone not found" });
      }
      res.json(milestone);
    } catch (error) {
      res.status(500).json({ message: "Error updating billing milestone" });
    }
  });

  app.delete("/api/billing-milestones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteBillingMilestone(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ message: "Error deleting billing milestone" });
    }
  });

  // Manufacturing Bay routes
  app.get("/api/manufacturing-bays", async (req, res) => {
    try {
      const bays = await storage.getManufacturingBays();
      res.json(bays);
    } catch (error) {
      res.status(500).json({ message: "Error fetching manufacturing bays" });
    }
  });

  app.get("/api/manufacturing-bays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bay = await storage.getManufacturingBay(id);
      if (!bay) {
        return res.status(404).json({ message: "Manufacturing bay not found" });
      }
      res.json(bay);
    } catch (error) {
      res.status(500).json({ message: "Error fetching manufacturing bay" });
    }
  });

  app.post("/api/manufacturing-bays", validateRequest(insertManufacturingBaySchema), async (req, res) => {
    try {
      const bay = await storage.createManufacturingBay(req.body);
      res.status(201).json(bay);
    } catch (error) {
      res.status(500).json({ message: "Error creating manufacturing bay" });
    }
  });

  app.put("/api/manufacturing-bays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bay = await storage.updateManufacturingBay(id, req.body);
      if (!bay) {
        return res.status(404).json({ message: "Manufacturing bay not found" });
      }
      res.json(bay);
    } catch (error) {
      res.status(500).json({ message: "Error updating manufacturing bay" });
    }
  });

  app.delete("/api/manufacturing-bays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteManufacturingBay(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ message: "Error deleting manufacturing bay" });
    }
  });

  // Manufacturing Schedule routes
  app.get("/api/manufacturing-schedules", async (req, res) => {
    try {
      const filters: {
        bayId?: number;
        projectId?: number;
        startDate?: Date;
        endDate?: Date;
      } = {};

      if (req.query.bayId) {
        filters.bayId = parseInt(req.query.bayId as string);
      }

      if (req.query.projectId) {
        filters.projectId = parseInt(req.query.projectId as string);
      }

      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const schedules = await storage.getManufacturingSchedules(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Error fetching manufacturing schedules" });
    }
  });

  app.get("/api/manufacturing-schedules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const schedule = await storage.getManufacturingSchedule(id);
      if (!schedule) {
        return res.status(404).json({ message: "Manufacturing schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Error fetching manufacturing schedule" });
    }
  });

  app.post("/api/manufacturing-schedules", validateRequest(insertManufacturingScheduleSchema), async (req, res) => {
    try {
      const schedule = await storage.createManufacturingSchedule(req.body);
      res.status(201).json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Error creating manufacturing schedule" });
    }
  });

  app.put("/api/manufacturing-schedules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const schedule = await storage.updateManufacturingSchedule(id, req.body);
      if (!schedule) {
        return res.status(404).json({ message: "Manufacturing schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Error updating manufacturing schedule" });
    }
  });

  app.delete("/api/manufacturing-schedules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteManufacturingSchedule(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ message: "Error deleting manufacturing schedule" });
    }
  });

  // Import routes
  app.post("/api/import/projects", importProjects);
  app.post("/api/import/billing-milestones", importBillingMilestones);
  app.post("/api/import/manufacturing-bays", importManufacturingBays);
  app.post("/api/import/manufacturing-schedules", importManufacturingSchedules);

  const httpServer = createServer(app);
  return httpServer;
}
