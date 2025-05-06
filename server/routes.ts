import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { ZodError } from "zod";
import crypto from "crypto";
import passport from "passport";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  insertProjectSchema,
  insertTaskSchema,
  insertProjectMilestoneSchema,
  insertBillingMilestoneSchema,
  insertManufacturingBaySchema,
  insertManufacturingScheduleSchema,
  insertUserPreferencesSchema,
  insertNotificationSchema
} from "@shared/schema";
import { setupSession, setupLocalAuth, isAuthenticated, hasEditRights, isAdmin, isEditor, hashPassword, comparePasswords } from "./authService";
import { 
  importProjects, 
  importBillingMilestones, 
  importManufacturingBays,
  importManufacturingSchedules,
  importDeliveryTracking
} from "./import";
import {
  getProjectDeliveryTracking,
  getAllDeliveryTracking,
  createDeliveryTracking,
  updateDeliveryTracking,
  deleteDeliveryTracking,
  getDeliveryAnalytics
} from "./routes/deliveryTracking";
import { countWorkingDays } from "@shared/utils/date-utils";
import {
  analyzeProjectHealth,
  generateBillingInsights,
  generateManufacturingInsights,
  generateTimelineInsights
} from "./ai";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  createNotification,
  generateBillingNotifications,
  generateManufacturingNotifications
} from "./notifications";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupSession(app);
  setupLocalAuth(app);
  
  // Route redirections for backward compatibility
  app.get('/api/login', (req, res) => res.redirect('/api/auth/login'));
  app.get('/api/logout', (req, res) => res.redirect('/api/auth/logout'));

  // Auth routes are already defined in setupLocalAuth
  // All the /api/auth/* routes are handled there
  
  // Add current user endpoint to match the frontend's expected route 
  app.get("/api/user", (req, res) => {
    console.log("DEBUG: Redirecting legacy user info request to /api/auth/user");
    // Forward the request to the proper auth endpoint
    res.redirect(307, '/api/auth/user');
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
      
      // Calculate QC Days for each project based on qcStartDate and shipDate
      const projectsWithQcDays = projects.map(project => {
        if (project.qcStartDate && project.shipDate) {
          const qcDaysCount = countWorkingDays(project.qcStartDate, project.shipDate);
          return { ...project, qcDays: qcDaysCount };
        }
        return project;
      });
      
      res.json(projectsWithQcDays);
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
      
      // Calculate QC Days based on qcStartDate and shipDate (excluding weekends and US holidays)
      if (project.qcStartDate && project.shipDate) {
        const qcDaysCount = countWorkingDays(project.qcStartDate, project.shipDate);
        project.qcDays = qcDaysCount;
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Error fetching project" });
    }
  });

  app.post("/api/projects", isAuthenticated, validateRequest(insertProjectSchema), async (req, res) => {
    try {
      const projectData = req.body;
      
      // Calculate QC Days only if both dates are present
      if (projectData.qcStartDate && projectData.shipDate) {
        const qcDaysCount = countWorkingDays(projectData.qcStartDate, projectData.shipDate);
        // Add the calculated QC Days to the data being created
        projectData.qcDays = qcDaysCount;
        console.log(`Calculated QC Days for new project: ${qcDaysCount} working days`);
      }
      
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ message: "Error creating project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the current project data (with proper dates)
      const currentProject = await storage.getProject(id);
      if (!currentProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get data from request
      const projectData = req.body;
      
      // Calculate QC Days only if both dates are present
      if (projectData.qcStartDate && projectData.shipDate) {
        const qcDaysCount = countWorkingDays(projectData.qcStartDate, projectData.shipDate);
        // Add the calculated QC Days to the data being updated
        projectData.qcDays = qcDaysCount;
        console.log(`Calculated QC Days for project ${id}: ${qcDaysCount} working days`);
      }
      
      // Update the project
      const project = await storage.updateProject(id, projectData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Error updating project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/tasks", isAuthenticated, validateRequest(insertTaskSchema), async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ message: "Error creating task" });
    }
  });

  app.put("/api/tasks/:id", isAuthenticated, async (req, res) => {
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

  app.put("/api/tasks/:id/complete", isAuthenticated, async (req, res) => {
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

  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteTask(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ message: "Error deleting task" });
    }
  });

  // Project Milestone routes
  app.get("/api/projects/:projectId/milestones", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const milestones = await storage.getProjectMilestones(projectId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching project milestones:", error);
      res.status(500).json({ message: "Error fetching project milestones" });
    }
  });

  app.get("/api/project-milestones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const milestone = await storage.getProjectMilestone(id);
      if (!milestone) {
        return res.status(404).json({ message: "Project milestone not found" });
      }
      res.json(milestone);
    } catch (error) {
      console.error("Error fetching project milestone:", error);
      res.status(500).json({ message: "Error fetching project milestone" });
    }
  });

  app.post("/api/project-milestones", isAuthenticated, validateRequest(insertProjectMilestoneSchema), async (req, res) => {
    try {
      const milestone = await storage.createProjectMilestone(req.body);
      res.status(201).json(milestone);
    } catch (error) {
      console.error("Error creating project milestone:", error);
      res.status(500).json({ message: "Error creating project milestone" });
    }
  });

  app.put("/api/project-milestones/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const milestone = await storage.updateProjectMilestone(id, req.body);
      if (!milestone) {
        return res.status(404).json({ message: "Project milestone not found" });
      }
      res.json(milestone);
    } catch (error) {
      console.error("Error updating project milestone:", error);
      res.status(500).json({ message: "Error updating project milestone" });
    }
  });

  app.put("/api/project-milestones/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const milestone = await storage.completeProjectMilestone(id);
      if (!milestone) {
        return res.status(404).json({ message: "Project milestone not found" });
      }
      res.json(milestone);
    } catch (error) {
      console.error("Error completing project milestone:", error);
      res.status(500).json({ message: "Error completing project milestone" });
    }
  });

  app.delete("/api/project-milestones/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteProjectMilestone(id);
      res.json({ success: result });
    } catch (error) {
      console.error("Error deleting project milestone:", error);
      res.status(500).json({ message: "Error deleting project milestone" });
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

  app.post("/api/billing-milestones", isAuthenticated, validateRequest(insertBillingMilestoneSchema), async (req, res) => {
    try {
      const milestone = await storage.createBillingMilestone(req.body);
      res.status(201).json(milestone);
    } catch (error) {
      res.status(500).json({ message: "Error creating billing milestone" });
    }
  });

  app.put("/api/billing-milestones/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/billing-milestones/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/manufacturing-bays", isAuthenticated, validateRequest(insertManufacturingBaySchema), async (req, res) => {
    try {
      const bay = await storage.createManufacturingBay(req.body);
      res.status(201).json(bay);
    } catch (error) {
      res.status(500).json({ message: "Error creating manufacturing bay" });
    }
  });

  app.put("/api/manufacturing-bays/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/manufacturing-bays/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/manufacturing-schedules", isAuthenticated, validateRequest(insertManufacturingScheduleSchema), async (req, res) => {
    try {
      const schedule = await storage.createManufacturingSchedule(req.body);
      res.status(201).json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Error creating manufacturing schedule" });
    }
  });

  app.put("/api/manufacturing-schedules/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/manufacturing-schedules/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteManufacturingSchedule(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ message: "Error deleting manufacturing schedule" });
    }
  });

  // Import routes
  app.post("/api/import/projects", isAuthenticated, importProjects);
  app.post("/api/import/billing-milestones", isAuthenticated, importBillingMilestones);
  app.post("/api/import/manufacturing-bays", isAuthenticated, importManufacturingBays);
  app.post("/api/import/manufacturing-schedules", isAuthenticated, importManufacturingSchedules);
  app.post("/api/import/delivery-tracking", isAuthenticated, importDeliveryTracking);
  
  // Delivery Tracking routes 
  app.get("/api/delivery-tracking", getAllDeliveryTracking);
  app.get("/api/delivery-tracking/analytics", getDeliveryAnalytics);
  app.get("/api/projects/:projectId/delivery-tracking", getProjectDeliveryTracking);
  app.post("/api/delivery-tracking", isAuthenticated, hasEditRights, createDeliveryTracking);
  app.put("/api/delivery-tracking/:id", isAuthenticated, hasEditRights, updateDeliveryTracking);
  app.delete("/api/delivery-tracking/:id", isAuthenticated, hasEditRights, deleteDeliveryTracking);
  
  // User Preferences routes
  app.get("/api/user-preferences", isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from the authenticated user
      const userId = req.user.id;
      const preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        return res.status(404).json({ message: "User preferences not found" });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Error fetching user preferences" });
    }
  });
  
  app.post("/api/user-preferences", isAuthenticated, validateRequest(insertUserPreferencesSchema), async (req: any, res) => {
    try {
      // Get user ID from the authenticated user
      const userId = req.user.id;
      
      // Check if preferences already exist
      const existingPreferences = await storage.getUserPreferences(userId);
      if (existingPreferences) {
        return res.status(400).json({ message: "User preferences already exist. Use PUT to update." });
      }
      
      // Create new preferences
      const preferencesData = {
        ...req.body,
        userId
      };
      
      const preferences = await storage.createUserPreferences(preferencesData);
      res.status(201).json(preferences);
    } catch (error) {
      console.error("Error creating user preferences:", error);
      res.status(500).json({ message: "Error creating user preferences" });
    }
  });
  
  app.put("/api/user-preferences", isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from the authenticated user
      const userId = req.user.id;
      
      // Check if preferences exist, create if they don't
      const existingPreferences = await storage.getUserPreferences(userId);
      
      if (!existingPreferences) {
        // Create new preferences
        const preferencesData = {
          ...req.body,
          userId
        };
        
        const preferences = await storage.createUserPreferences(preferencesData);
        return res.status(201).json(preferences);
      }
      
      // Update existing preferences
      const updatedPreferences = await storage.updateUserPreferences(userId, req.body);
      if (!updatedPreferences) {
        return res.status(500).json({ message: "Failed to update user preferences" });
      }
      
      res.json(updatedPreferences);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Error updating user preferences" });
    }
  });
  
  // Authentication routes
  // Main auth routes are handled in authService.ts under /api/auth/* paths
  
  // Add redirects from legacy paths to the new auth endpoints
  app.post("/api/login", (req, res) => {
    console.log("DEBUG: Redirecting legacy login request to /api/auth/login");
    // Forward the request to the proper auth endpoint
    res.redirect(307, '/api/auth/login');
  });
  
  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    console.log("DEBUG: Redirecting legacy logout request to /api/auth/logout");
    // Forward the request to the proper auth endpoint
    res.redirect(307, '/api/auth/logout');
  });
  
  // Registration endpoint
  app.post("/api/register", (req, res) => {
    console.log("DEBUG: Redirecting legacy register request to /api/auth/register");
    // Forward the request to the proper auth endpoint
    res.redirect(307, '/api/auth/register');
  });
  
  // Get current authenticated user route is already defined in authService.ts
  
  // TEMPORARY: Special development-only route to auto-login as the admin user
  // This will be removed in production
  app.get("/api/dev-login", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ message: "Route not found" });
    }
    
    try {
      // Find the admin user by email
      const [adminUser] = await db.select().from(users).where(eq(users.email, "colter.mahlum@nomadgcs.com"));
      
      if (!adminUser) {
        return res.status(404).json({ message: "Admin user not found" });
      }
      
      console.log("DEV-LOGIN: Found admin user:", adminUser.id);
      
      // Log in the user directly
      req.login(adminUser, (err) => {
        if (err) {
          console.error("DEV-LOGIN ERROR:", err);
          return res.status(500).json({ message: "Login failed", error: err.message });
        }
        
        console.log("DEV-LOGIN: Session after login:", req.session);
        console.log("DEV-LOGIN: User in session:", req.user);
        
        // Return user info without sensitive data
        const { password, passwordResetToken, passwordResetExpires, ...userInfo } = adminUser;
        
        // Send session cookie explicitly
        res.cookie('tier4.sid', req.sessionID, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
        });
        
        return res.json({
          ...userInfo,
          message: "Development auto-login successful",
          sessionID: req.sessionID
        });
      });
    } catch (error) {
      console.error("DEV-LOGIN ERROR:", error);
      res.status(500).json({ message: "Failed to auto-login", error: error.message });
    }
  });

  // TEMPORARY ENDPOINT: Delete all projects - This is for cleanup purposes only
  app.delete("/api/reset-all-projects", isAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getProjects();
      let deletedCount = 0;
      
      for (const project of projects) {
        try {
          // First remove any associated data
          const billingMilestones = await storage.getProjectBillingMilestones(project.id);
          for (const milestone of billingMilestones) {
            await storage.deleteBillingMilestone(milestone.id);
          }
          
          const tasks = await storage.getTasks(project.id);
          for (const task of tasks) {
            await storage.deleteTask(task.id);
          }
          
          const schedules = await storage.getManufacturingSchedules({ projectId: project.id });
          for (const schedule of schedules) {
            await storage.deleteManufacturingSchedule(schedule.id);
          }
          
          // Then delete the project itself
          await storage.deleteProject(project.id);
          deletedCount++;
          console.log(`Deleted project ${project.id}: ${project.name} (${project.projectNumber})`);
        } catch (error) {
          console.error(`Failed to delete project ${project.id}:`, error);
        }
      }
      
      return res.json({ 
        success: true, 
        message: `Successfully deleted ${deletedCount} projects and their associated data`, 
        totalDeleted: deletedCount 
      });
    } catch (error) {
      console.error("Error deleting projects:", error);
      return res.status(500).json({ success: false, message: "Error deleting projects" });
    }
  });

  // AI analysis routes
  app.get("/api/ai/project-health/:projectId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get related data
      const tasks = await storage.getTasks(projectId);
      const billingMilestones = await storage.getProjectBillingMilestones(projectId);
      const manufacturingSchedules = await storage.getManufacturingSchedules({ projectId });
      
      // Generate AI analysis
      const analysis = await analyzeProjectHealth(project, tasks, billingMilestones, manufacturingSchedules);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing project health:", error);
      res.status(500).json({ message: "Error analyzing project health" });
    }
  });

  app.get("/api/ai/billing-insights", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const billingMilestones = await storage.getBillingMilestones();
      
      // Generate AI insights
      const insights = await generateBillingInsights(projects, billingMilestones);
      
      res.json(insights);
    } catch (error) {
      console.error("Error generating billing insights:", error);
      res.status(500).json({ message: "Error generating billing insights" });
    }
  });

  app.get("/api/ai/manufacturing-insights", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const manufacturingSchedules = await storage.getManufacturingSchedules();
      
      // Generate AI insights
      const insights = await generateManufacturingInsights(projects, manufacturingSchedules);
      
      res.json(insights);
    } catch (error) {
      console.error("Error generating manufacturing insights:", error);
      res.status(500).json({ message: "Error generating manufacturing insights" });
    }
  });

  app.get("/api/ai/timeline-insights", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const allTasks = [];
      
      // For timeline insights, we fetch tasks for all projects
      for (const project of projects) {
        const tasks = await storage.getTasks(project.id);
        allTasks.push(...tasks);
      }
      
      // Generate AI insights
      const insights = await generateTimelineInsights(projects, allTasks);
      
      res.json(insights);
    } catch (error) {
      console.error("Error generating timeline insights:", error);
      res.status(500).json({ message: "Error generating timeline insights" });
    }
  });

  // User Management routes (admin only)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  
  app.put("/api/users/:id/role", isAdmin, async (req, res) => {
    try {
      const { role, isApproved } = req.body;
      if (!role || typeof isApproved !== 'boolean') {
        return res.status(400).json({ message: "Role and approval status are required" });
      }
      
      const updatedUser = await storage.updateUserRole(req.params.id, role, isApproved);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Error updating user role" });
    }
  });
  
  // Allowed Email patterns for auto-approval (admin only)
  app.get("/api/allowed-emails", isAdmin, async (req, res) => {
    try {
      const patterns = await storage.getAllowedEmails();
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching allowed email patterns:", error);
      res.status(500).json({ message: "Error fetching allowed email patterns" });
    }
  });
  
  app.post("/api/allowed-emails", isAdmin, async (req, res) => {
    try {
      const { emailPattern, autoApprove, defaultRole } = req.body;
      
      if (!emailPattern) {
        return res.status(400).json({ message: "Email pattern is required" });
      }
      
      const newPattern = await storage.createAllowedEmail({
        emailPattern,
        autoApprove: autoApprove === true,
        defaultRole: defaultRole || "viewer",
      });
      
      res.status(201).json(newPattern);
    } catch (error) {
      console.error("Error creating allowed email pattern:", error);
      res.status(500).json({ message: "Error creating allowed email pattern" });
    }
  });
  
  app.put("/api/allowed-emails/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { emailPattern, autoApprove, defaultRole } = req.body;
      
      const updatedPattern = await storage.updateAllowedEmail(id, {
        emailPattern,
        autoApprove,
        defaultRole,
      });
      
      if (!updatedPattern) {
        return res.status(404).json({ message: "Allowed email pattern not found" });
      }
      
      res.json(updatedPattern);
    } catch (error) {
      console.error("Error updating allowed email pattern:", error);
      res.status(500).json({ message: "Error updating allowed email pattern" });
    }
  });
  
  app.delete("/api/allowed-emails/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteAllowedEmail(id);
      res.json({ success: result });
    } catch (error) {
      console.error("Error deleting allowed email pattern:", error);
      res.status(500).json({ message: "Error deleting allowed email pattern" });
    }
  });

  // Notification Routes
  app.get("/api/notifications", hasEditRights, getNotifications);
  app.get("/api/notifications/unread/count", isAuthenticated, getUnreadNotificationCount);
  app.post("/api/notifications", isAuthenticated, isAdmin, validateRequest(insertNotificationSchema), createNotification);
  app.put("/api/notifications/:id/read", isAuthenticated, markNotificationAsRead);
  app.put("/api/notifications/read-all", isAuthenticated, markAllNotificationsAsRead);
  app.delete("/api/notifications/:id", isAuthenticated, deleteNotification);
  
  // Notification generation routes - typically called via cron, but can be manually triggered
  app.post("/api/notifications/generate/billing", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const count = await generateBillingNotifications();
      res.json({ success: true, count, message: `Generated ${count} billing notifications` });
    } catch (error) {
      console.error("Error generating billing notifications:", error);
      res.status(500).json({ success: false, message: "Error generating billing notifications" });
    }
  });
  
  app.post("/api/notifications/generate/manufacturing", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const count = await generateManufacturingNotifications();
      res.json({ success: true, count, message: `Generated ${count} manufacturing notifications` });
    } catch (error) {
      console.error("Error generating manufacturing notifications:", error);
      res.status(500).json({ success: false, message: "Error generating manufacturing notifications" });
    }
  });

  // Archived Projects Routes
  app.get("/api/archived-projects", async (req, res) => {
    try {
      const archivedProjects = await storage.getArchivedProjects();
      res.json(archivedProjects);
    } catch (error) {
      console.error("Error fetching archived projects:", error);
      res.status(500).json({ message: "Error fetching archived projects" });
    }
  });

  app.get("/api/archived-projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const archivedProject = await storage.getArchivedProject(id);
      
      if (!archivedProject) {
        return res.status(404).json({ message: "Archived project not found" });
      }
      
      res.json(archivedProject);
    } catch (error) {
      console.error(`Error fetching archived project ${req.params.id}:`, error);
      res.status(500).json({ message: "Error fetching archived project" });
    }
  });
  
  // Delivered Projects Routes
  app.get("/api/delivered-projects", async (req, res) => {
    try {
      const deliveredProjects = await storage.getDeliveredProjects();
      res.json(deliveredProjects);
    } catch (error) {
      console.error("Error fetching delivered projects:", error);
      res.status(500).json({ message: "Error fetching delivered projects" });
    }
  });

  app.post("/api/projects/:id/archive", isAuthenticated, hasEditRights, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { reason } = req.body;
      
      const archivedProject = await storage.archiveProject(projectId, userId, reason);
      
      if (!archivedProject) {
        return res.status(404).json({ message: "Project not found or could not be archived" });
      }
      
      res.status(200).json({
        success: true, 
        message: `Project ${archivedProject.projectNumber} successfully archived`,
        archivedProject
      });
    } catch (error) {
      console.error(`Error archiving project ${req.params.id}:`, error);
      res.status(500).json({ message: "Error archiving project" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
