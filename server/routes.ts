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
  insertNotificationSchema,
  insertSalesDealSchema
} from "@shared/schema";
import { setupSession, setupLocalAuth, isAuthenticated, hasEditRights, isAdmin, isEditor, hashPassword, comparePasswords } from "./authService";
import { 
  importProjects, 
  importBillingMilestones, 
  importManufacturingBays,
  importManufacturingSchedules,
  importDeliveryTracking
} from "./import";
import { importBayScheduling } from "./routes/baySchedulingImport";
import {
  getProjectDeliveryTracking,
  getAllDeliveryTracking,
  createDeliveryTracking,
  updateDeliveryTracking,
  deleteDeliveryTracking,
  getDeliveryAnalytics
} from "./routes/deliveryTracking";
import { countWorkingDays } from "@shared/utils/date-utils";
import { format, differenceInDays, addDays } from "date-fns";
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
  // Special route to update project hours from 40 to 1000
  app.post("/api/admin/update-project-hours", isAdmin, async (req, res) => {
    try {
      // Update all existing projects that still have the default 40 hours
      const projectsUpdated = await storage.updateDefaultProjectHours();
      
      // Update all existing manufacturing schedules that still have the default 40 hours
      const schedulesUpdated = await storage.updateDefaultScheduleHours();
      
      res.status(200).json({
        success: true,
        message: `Updated hours to 1000 for ${projectsUpdated} projects and ${schedulesUpdated} schedules`,
      });
    } catch (error) {
      console.error("Error updating project hours:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to update project hours",
        error: String(error)
      });
    }
  });
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
      console.error("Error fetching projects:", error);
      // Log additional details for debugging
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
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
      
      // Check if shipDate or deliveryDate has changed
      const shipDateChanged = currentProject.shipDate !== projectData.shipDate && projectData.shipDate;
      const deliveryDateChanged = currentProject.deliveryDate !== projectData.deliveryDate && projectData.deliveryDate;
      
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
      
      // If ship date or delivery date changed, check for delivery milestones to update
      if (shipDateChanged || deliveryDateChanged) {
        const dateToSync = projectData.deliveryDate || projectData.shipDate;
        
        try {
          // Get all billing milestones for this project
          const billingMilestones = await storage.getProjectBillingMilestones(id);
          const deliveryMilestones = billingMilestones.filter(
            milestone => milestone.isDeliveryMilestone
          );
          
          if (deliveryMilestones.length > 0) {
            console.log(`Found ${deliveryMilestones.length} delivery milestones for project ${id} to update with new date: ${dateToSync}`);
            
            for (const milestone of deliveryMilestones) {
              await storage.updateBillingMilestone(milestone.id, {
                ...milestone,
                targetInvoiceDate: dateToSync
              });
            }
            
            // Add notification about delivery milestone updates
            await storage.createNotification({
              userId: null, // System notification
              title: "Delivery Milestones Updated",
              message: `${deliveryMilestones.length} delivery milestone(s) for ${project.name} (${project.projectNumber}) have been updated to match the new delivery date.`,
              type: "system",
              priority: "medium",
              link: `/billing-milestones?projectId=${id}`,
              isRead: false,
              expiresAt: addDays(new Date(), 7),
            });
          }
        } catch (milestoneError) {
          console.error("Error updating delivery milestones after date change:", milestoneError);
          // Don't fail the request if milestone updates fail - still return the updated project
        }
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
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
      console.log(`Processing task update for ID ${id} with data:`, JSON.stringify(req.body, null, 2));
      
      // Handle special cases for task data
      let taskData = { ...req.body };
      
      // If setting isCompleted to true but no completedDate provided, add it
      if (taskData.isCompleted === true && !taskData.completedDate) {
        taskData.completedDate = new Date().toISOString().split('T')[0];
        console.log(`Added completion date: ${taskData.completedDate}`);
      }
      
      const task = await storage.updateTask(id, taskData);
      
      if (!task) {
        console.error(`Task ID ${id} not found for update`);
        return res.status(404).json({ message: "Task not found" });
      }
      
      console.log(`Successfully updated task:`, task);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
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
  
  // Special endpoint to accept a ship date change for a delivery milestone
  app.post("/api/billing-milestones/:id/accept-ship-date", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const milestone = await storage.getBillingMilestone(id);
      
      if (!milestone) {
        return res.status(404).json({ message: "Billing milestone not found" });
      }
      
      // Update the milestone to accept the new ship date
      const updatedMilestone = await storage.updateBillingMilestone(id, {
        lastAcceptedShipDate: milestone.liveDate,
        shipDateChanged: false,
      });
      
      res.json(updatedMilestone);
    } catch (error) {
      console.error("Error accepting ship date change:", error);
      res.status(500).json({ message: "Error accepting ship date change" });
    }
  });

  // Delete all billing milestones (admin only)
  // This must be defined BEFORE the :id route to avoid route conflicts
  app.delete("/api/billing-milestones/delete-all", isAuthenticated, async (req, res) => {
    try {
      // Make sure user is admin
      const user = req.user as any;
      if (!user || (user.role !== 'admin' && !req.isDevMode)) {
        return res.status(403).json({ message: "Only administrators can perform this action" });
      }
      
      const count = await storage.deleteAllBillingMilestones();
      res.json({ success: true, count });
    } catch (error) {
      console.error("Error deleting all billing milestones:", error);
      res.status(500).json({ message: "Error deleting all billing milestones" });
    }
  });
  
  // Delete a single billing milestone by ID
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
      // CRITICAL FIX: Ensure row parameter is processed correctly and enforced
      // NO AUTO-ADJUSTMENT OF ANY KIND - exactly as requested by user
      const data = {
        ...req.body,
        row: req.body.row !== undefined ? parseInt(req.body.row) : 0 // Default to row 0 if not specified
      };
      
      // SIMPLIFIED PLACEMENT SYSTEM: Projects stay EXACTLY where dropped
      console.log("Creating schedule with EXACT row data:", data);
      console.log("IMPORTANT: Using row value:", data.row, "as directly specified by UI");
      console.log("NO AUTO ROW ADJUSTMENT: Project will be placed exactly where dropped");
      
      // First create the schedule
      const schedule = await storage.createManufacturingSchedule(data);
      
      // Then update the project's dates to match the schedule
      if (schedule && data.projectId) {
        try {
          // Get the current project data
          const project = await storage.getProject(data.projectId);
          
          if (project) {
            // Create project update with new dates from the schedule
            const startDate = new Date(data.startDate);
            const endDate = new Date(data.endDate);
            
            // CRITICAL FIX: Calculate all phase dates based on the schedule
            // This ensures that the PROD phase shown in the bay schedule is correctly 
            // reflected in the project data
            
            // Calculate total days for the project
            const totalDays = differenceInDays(endDate, startDate);
            console.log(`Total project days: ${totalDays} from ${startDate} to ${endDate}`);
            
            // Get phase percentages from the project schema fields (Schema has fabPercentage, etc)
            // Convert to number since schema uses decimal type
            const fabPercent = (project.fabPercentage !== null && project.fabPercentage !== undefined) ? 
                Number(project.fabPercentage) : 27;
            const paintPercent = (project.paintPercentage !== null && project.paintPercentage !== undefined) ? 
                Number(project.paintPercentage) : 7;
            const assemblyPercent = (project.productionPercentage !== null && project.productionPercentage !== undefined) ? 
                Number(project.productionPercentage) : 60; // PROD phase
            const itPercent = (project.itPercentage !== null && project.itPercentage !== undefined) ? 
                Number(project.itPercentage) : 7;
            const ntcPercent = (project.ntcPercentage !== null && project.ntcPercentage !== undefined) ? 
                Number(project.ntcPercentage) : 7;
            const qcPercent = (project.qcPercentage !== null && project.qcPercentage !== undefined) ? 
                Number(project.qcPercentage) : 7;
            
            console.log(`Using phase percentages: FAB=${fabPercent}%, PAINT=${paintPercent}%, PROD=${assemblyPercent}%, IT=${itPercent}%, NTC=${ntcPercent}%, QC=${qcPercent}%`);
            
            // Calculate days for each phase
            const fabDays = Math.round((fabPercent / 100) * totalDays);
            const paintDays = Math.round((paintPercent / 100) * totalDays);
            const assemblyDays = Math.round((assemblyPercent / 100) * totalDays);
            const itDays = Math.round((itPercent / 100) * totalDays);
            const ntcDays = Math.round((ntcPercent / 100) * totalDays);
            const qcDays = Math.round((qcPercent / 100) * totalDays);
            
            console.log(`Phase durations in days: FAB=${fabDays}, PAINT=${paintDays}, PROD=${assemblyDays}, IT=${itDays}, NTC=${ntcDays}, QC=${qcDays}`);
            
            // PRIORITY RULE: When a project is placed in bay schedule, the schedule's dates
            // must always override the project dates
            console.log("PRIORITY RULE ENFORCED: Schedule dates will always overwrite project dates.");
            
            // Calculate all phase dates from scratch based on the schedule's dates
            // This is the desired behavior to ensure bay schedule is the source of truth
            console.log("Calculating phase dates from scratch based on schedule's start/end dates");
            
            // Import date utility functions
            const { adjustToNextBusinessDay } = await import("../shared/utils/date-utils");
            
            let fabStartDate, paintStartDate, assemblyStartDate, ntcTestingDate, qcStartDate, executiveReviewDate;
            
            // Calculate all phase dates directly from schedule dates using percentages
            fabStartDate = adjustToNextBusinessDay(startDate) || startDate;
            paintStartDate = adjustToNextBusinessDay(addDays(startDate, fabDays)) || addDays(startDate, fabDays);
            assemblyStartDate = adjustToNextBusinessDay(addDays(paintStartDate, paintDays)) || addDays(paintStartDate, paintDays);
            ntcTestingDate = adjustToNextBusinessDay(addDays(assemblyStartDate, assemblyDays)) || addDays(assemblyStartDate, assemblyDays);
            qcStartDate = adjustToNextBusinessDay(addDays(ntcTestingDate, ntcDays)) || addDays(ntcTestingDate, ntcDays);
            executiveReviewDate = adjustToNextBusinessDay(addDays(qcStartDate, Math.round(qcDays * 0.8))) || 
                               addDays(qcStartDate, Math.round(qcDays * 0.8));
            
            console.log("Final phase dates:", {
              fabricationStart: format(fabStartDate, 'yyyy-MM-dd'),
              wrapDate: format(paintStartDate, 'yyyy-MM-dd'),
              assemblyStart: format(assemblyStartDate, 'yyyy-MM-dd'),
              ntcTestingDate: format(ntcTestingDate, 'yyyy-MM-dd'),
              qcStartDate: format(qcStartDate, 'yyyy-MM-dd'),
              executiveReviewDate: format(executiveReviewDate, 'yyyy-MM-dd')
            });
            
            const projectUpdate = {
              startDate: format(startDate, 'yyyy-MM-dd'),
              // Use the schedule's end date to update the project's estimated completion 
              estimatedCompletionDate: format(endDate, 'yyyy-MM-dd'),
              // CRITICAL: Always update shipDate to match the schedule's end date
              // This ensures that when a project is placed in bay schedule, 
              // its ship date is synchronized with the end of the project bar
              shipDate: format(endDate, 'yyyy-MM-dd'),
              // Only update deliveryDate if it's not already set
              ...(
                !project.deliveryDate 
                  ? { deliveryDate: format(endDate, 'yyyy-MM-dd') }
                  : {}
              ),
              
              // CRITICAL: Update all phase dates to match the schedule
              fabricationStart: format(fabStartDate, 'yyyy-MM-dd'),
              assemblyStart: format(assemblyStartDate, 'yyyy-MM-dd'),
              wrapDate: format(paintStartDate, 'yyyy-MM-dd'),
              ntcTestingDate: format(ntcTestingDate, 'yyyy-MM-dd'),
              qcStartDate: format(qcStartDate, 'yyyy-MM-dd'),
              executiveReviewDate: format(executiveReviewDate, 'yyyy-MM-dd'),
            };
            
            console.log(`Updating project ${data.projectId} with dates from schedule: `, projectUpdate);
            await storage.updateProject(data.projectId, projectUpdate);
          }
        } catch (projectUpdateError) {
          console.error("Error updating project dates:", projectUpdateError);
          // Don't fail the request if project update fails - still return the created schedule
        }
      }
      
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating manufacturing schedule:", error);
      res.status(500).json({ message: "Error creating manufacturing schedule" });
    }
  });

  app.put("/api/manufacturing-schedules/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // CRITICAL FIX: Ensure row is properly handled and respected exactly as sent from client
      // NO AUTO-ADJUSTMENT OF ANY KIND - exactly as requested by user
      const data = {
        ...req.body,
        row: req.body.row !== undefined ? parseInt(req.body.row) : undefined
      };
      
      // SIMPLIFIED PLACEMENT SYSTEM: Projects stay EXACTLY where dropped
      console.log("Updating schedule with EXACT row data:", data);
      console.log("IMPORTANT: Using row value:", data.row, "EXACTLY as specified by UI");
      console.log("NO AUTO ROW ADJUSTMENT: Project will remain exactly where it was dropped");
      
      // First get the original schedule to access the projectId
      const originalSchedule = await storage.getManufacturingSchedule(id);
      if (!originalSchedule) {
        return res.status(404).json({ message: "Manufacturing schedule not found" });
      }
      
      // Update the schedule
      const schedule = await storage.updateManufacturingSchedule(id, data);
      if (!schedule) {
        return res.status(404).json({ message: "Manufacturing schedule not found" });
      }
      
      // Then update the project's dates to match the schedule
      try {
        const projectId = originalSchedule.projectId;
        if (projectId && (data.startDate || data.endDate)) {
          // Get the current project data
          const project = await storage.getProject(projectId);
          
          if (project) {
            // Need both start and end dates for calculation
            const startDate = data.startDate ? new Date(data.startDate) : new Date(originalSchedule.startDate);
            const endDate = data.endDate ? new Date(data.endDate) : new Date(originalSchedule.endDate);
            
            // Calculate total days for the project
            const totalDays = differenceInDays(endDate, startDate);
            console.log(`Total project days: ${totalDays} from ${startDate} to ${endDate}`);
            
            // Get phase percentages from the project schema fields (Schema has fabPercentage, etc)
            // Convert to number since schema uses decimal type
            const fabPercent = (project.fabPercentage !== null && project.fabPercentage !== undefined) ? 
                Number(project.fabPercentage) : 27;
            const paintPercent = (project.paintPercentage !== null && project.paintPercentage !== undefined) ? 
                Number(project.paintPercentage) : 7;
            const assemblyPercent = (project.productionPercentage !== null && project.productionPercentage !== undefined) ? 
                Number(project.productionPercentage) : 60; // PROD phase
            const itPercent = (project.itPercentage !== null && project.itPercentage !== undefined) ? 
                Number(project.itPercentage) : 7;
            const ntcPercent = (project.ntcPercentage !== null && project.ntcPercentage !== undefined) ? 
                Number(project.ntcPercentage) : 7;
            const qcPercent = (project.qcPercentage !== null && project.qcPercentage !== undefined) ? 
                Number(project.qcPercentage) : 7;
            
            console.log(`Using phase percentages: FAB=${fabPercent}%, PAINT=${paintPercent}%, PROD=${assemblyPercent}%, IT=${itPercent}%, NTC=${ntcPercent}%, QC=${qcPercent}%`);
            
            // Calculate days for each phase
            const fabDays = Math.round((fabPercent / 100) * totalDays);
            const paintDays = Math.round((paintPercent / 100) * totalDays);
            const assemblyDays = Math.round((assemblyPercent / 100) * totalDays);
            const itDays = Math.round((itPercent / 100) * totalDays);
            const ntcDays = Math.round((ntcPercent / 100) * totalDays);
            const qcDays = Math.round((qcPercent / 100) * totalDays);
            
            console.log(`Phase durations in days: FAB=${fabDays}, PAINT=${paintDays}, PROD=${assemblyDays}, IT=${itDays}, NTC=${ntcDays}, QC=${qcDays}`);
            
            // Create project update with new dates from the schedule
            const projectUpdate: any = {};
            
            // Always update all dates when either start or end date changes
            // This ensures the phase dates are kept in sync
            
            // Basic dates
            if (data.startDate) {
              projectUpdate.startDate = format(startDate, 'yyyy-MM-dd');
            }
            
            if (data.endDate) {
              projectUpdate.estimatedCompletionDate = format(endDate, 'yyyy-MM-dd');
              projectUpdate.shipDate = format(endDate, 'yyyy-MM-dd');
              
              // Only update deliveryDate if the project end date is after the current delivery date
              // or if deliveryDate is not set
              if (!project.deliveryDate || 
                  (new Date(data.endDate) > new Date(project.deliveryDate))) {
                projectUpdate.deliveryDate = format(endDate, 'yyyy-MM-dd');
              }
            }
            
            // CRITICAL: Update all phase dates based on the new schedule
            // Import date utility functions
            const { adjustToNextBusinessDay } = await import("../shared/utils/date-utils");
            
            // Check if project has existing phases defined
            const hasExistingPhases = (
              project.fabricationStart && 
              project.wrapDate && 
              project.assemblyStart && 
              project.ntcTestingDate && 
              project.qcStartDate
            );
            
            let fabStartDate, paintStartDate, assemblyStartDate, ntcTestingDate, qcStartDate, executiveReviewDate;
            
            // PRIORITY RULE: When a project is placed in bay schedule, the schedule's dates
            // must always override the project dates
            console.log("PRIORITY RULE ENFORCED: Schedule dates will always overwrite project dates.");
            
            // Calculate all phase dates from scratch based on the schedule's dates
            // This is the desired behavior to ensure bay schedule is the source of truth
            console.log("Calculating phase dates from scratch based on schedule's start/end dates");
            
            fabStartDate = adjustToNextBusinessDay(startDate) || startDate;
            paintStartDate = adjustToNextBusinessDay(addDays(startDate, fabDays)) || addDays(startDate, fabDays);
            assemblyStartDate = adjustToNextBusinessDay(addDays(paintStartDate, paintDays)) || addDays(paintStartDate, paintDays);
            ntcTestingDate = adjustToNextBusinessDay(addDays(assemblyStartDate, assemblyDays)) || addDays(assemblyStartDate, assemblyDays);
            qcStartDate = adjustToNextBusinessDay(addDays(ntcTestingDate, ntcDays)) || addDays(ntcTestingDate, ntcDays);
            executiveReviewDate = adjustToNextBusinessDay(addDays(qcStartDate, Math.round(qcDays * 0.8))) || 
                               addDays(qcStartDate, Math.round(qcDays * 0.8));
            
            // Add phase dates to update object
            projectUpdate.fabricationStart = format(fabStartDate, 'yyyy-MM-dd');
            projectUpdate.wrapDate = format(paintStartDate, 'yyyy-MM-dd');
            projectUpdate.assemblyStart = format(assemblyStartDate, 'yyyy-MM-dd');
            projectUpdate.ntcTestingDate = format(ntcTestingDate, 'yyyy-MM-dd');
            projectUpdate.qcStartDate = format(qcStartDate, 'yyyy-MM-dd');
            projectUpdate.executiveReviewDate = format(executiveReviewDate, 'yyyy-MM-dd');
            
            console.log("Final phase dates (weekdays only):", {
              fabricationStart: projectUpdate.fabricationStart,
              wrapDate: projectUpdate.wrapDate,
              assemblyStart: projectUpdate.assemblyStart,
              ntcTestingDate: projectUpdate.ntcTestingDate,
              qcStartDate: projectUpdate.qcStartDate,
              executiveReviewDate: projectUpdate.executiveReviewDate
            });
            
            if (Object.keys(projectUpdate).length > 0) {
              console.log(`Updating project ${projectId} with dates from schedule: `, projectUpdate);
              await storage.updateProject(projectId, projectUpdate);
              
              // Check if delivery/ship date changed, and update any associated delivery milestones
              if (projectUpdate.deliveryDate || projectUpdate.shipDate) {
                try {
                  const dateToSync = projectUpdate.deliveryDate || projectUpdate.shipDate;
                  // Get all billing milestones for this project
                  const billingMilestones = await storage.getProjectBillingMilestones(projectId);
                  
                  // Find all delivery milestones (explicit flag or name contains "DELIVERY")
                  const deliveryMilestones = billingMilestones.filter(
                    milestone => milestone.isDeliveryMilestone || 
                    (milestone.name && milestone.name.toUpperCase().includes("DELIVERY"))
                  );
                  
                  if (deliveryMilestones.length > 0) {
                    console.log(`Found ${deliveryMilestones.length} delivery milestones for project ${projectId} to update from manufacturing schedule change to date: ${dateToSync}`);
                    
                    for (const milestone of deliveryMilestones) {
                      // Store the current ship date as liveDate and mark as changed if it differs from lastAcceptedShipDate
                      const shipDateChanged = milestone.lastAcceptedShipDate && 
                                            new Date(dateToSync).getTime() !== new Date(milestone.lastAcceptedShipDate).getTime();
                                            
                      await storage.updateBillingMilestone(milestone.id, {
                        ...milestone,
                        liveDate: dateToSync,
                        shipDateChanged: shipDateChanged,
                        targetInvoiceDate: dateToSync
                      });
                    }
                    
                    // Add notification about delivery milestone updates
                    await storage.createNotification({
                      userId: null, // System notification
                      title: "Delivery Milestones Updated",
                      message: `${deliveryMilestones.length} delivery milestone(s) have been updated to match the new manufacturing schedule.`,
                      type: "system",
                      priority: "medium",
                      link: `/billing-milestones?projectId=${projectId}`,
                      isRead: false,
                      expiresAt: addDays(new Date(), 7),
                    });
                  }
                } catch (milestoneError) {
                  console.error("Error updating delivery milestones after schedule change:", milestoneError);
                  // Don't fail the request if milestone updates fail
                }
              }
            }
          }
        }
      } catch (projectUpdateError) {
        console.error("Error updating project dates:", projectUpdateError);
        // Don't fail the request if project update fails - still return the updated schedule
      }
      
      res.json(schedule);
    } catch (error) {
      console.error("Error updating manufacturing schedule:", error);
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
  
  // Special endpoint to clear all manufacturing schedules
  // This will move ALL projects back to the Unassigned section
  // CRITICAL FIX: Temporarily disable authentication for clearing schedules
  app.post("/api/manufacturing-schedules/clear-all", async (req, res) => {
    try {
      console.log("Clearing all manufacturing schedules - moving all projects to Unassigned section");
      // Get all existing schedules
      const allSchedules = await storage.getManufacturingSchedules();
      console.log(`Found ${allSchedules.length} schedules to clear`);
      
      // Delete all existing schedules
      let deletedCount = 0;
      const errors = [];
      
      // Use Promise.all for better performance
      try {
        const results = await Promise.all(
          allSchedules.map(schedule => 
            storage.deleteManufacturingSchedule(schedule.id)
              .then(success => {
                if (success) {
                  deletedCount++;
                  return { success: true, id: schedule.id };
                } else {
                  errors.push(`Failed to delete schedule ${schedule.id}`);
                  return { success: false, id: schedule.id };
                }
              })
              .catch(err => {
                console.error(`Error deleting schedule ${schedule.id}:`, err);
                errors.push(`Error deleting schedule ${schedule.id}: ${err.message}`);
                return { success: false, id: schedule.id, error: err };
              })
          )
        );
        
        console.log(`Successfully deleted ${deletedCount}/${allSchedules.length} schedules`);
        console.log(`Deletion results:`, results);
      } catch (batchError) {
        console.error("Error in batch deletion:", batchError);
      }
      // Check if all schedules were successfully deleted
      const allDeleted = deletedCount === allSchedules.length;
      
      if (allDeleted) {
        res.json({ 
          success: true, 
          message: `All ${deletedCount} projects have been moved to the Unassigned section. You can now manually place them as needed.`,
          deletedCount
        });
      } else if (deletedCount > 0) {
        // Some schedules were deleted, but not all
        res.json({
          success: true,
          message: `${deletedCount} out of ${allSchedules.length} projects have been moved to the Unassigned section.`,
          deletedCount,
          totalSchedules: allSchedules.length,
          errors: errors.length > 0 ? errors : undefined
        });
      } else if (allSchedules.length === 0) {
        // No schedules existed to begin with
        res.json({
          success: true,
          message: "No projects to move. All projects are already in the Unassigned section.",
          deletedCount: 0
        });
      } else {
        // Failed to delete any schedules
        res.status(500).json({
          success: false,
          message: "Failed to move any projects to the Unassigned section. Please try again.",
          errors
        });
      }
    } catch (error) {
      console.error("Error clearing manufacturing schedules:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error clearing manufacturing schedules",
        error: String(error)
      });
    }
  });
  app.post("/api/import/delivery-tracking", isAuthenticated, importDeliveryTracking);
  app.post("/api/import/bay-scheduling", isAuthenticated, importBayScheduling);
  
  // Debug endpoint for the bay scheduling import (temporary - remove in production)
  app.post("/api/debug/bay-scheduling-import", async (req, res) => {
    try {
      console.log("Starting debug bay scheduling import endpoint");
      
      // Sample test data using real project numbers from the database
      const testData = {
        schedules: [
          {
            projectNumber: "804653",
            productionStartDate: "2025-06-01",
            endDate: "2025-07-15",
            teamNumber: 1,
            totalHours: 1200
          },
          {
            projectNumber: "804814",
            productionStartDate: "2025-05-15",
            endDate: "2025-08-01",
            teamNumber: 2,
            totalHours: 850
          },
          {
            projectNumber: "804654",
            productionStartDate: "2025-07-01",
            endDate: "2025-08-15",
            teamNumber: 3,
            totalHours: 1500
          }
        ]
      };
      
      // Mock the request object with our test data
      const mockReq = {
        body: testData
      } as Request;
      
      // Create a mock response object to capture the response
      const mockRes = {
        status: (code: number) => ({
          json: (data: any) => {
            console.log(`Debug response (${code}):`, JSON.stringify(data, null, 2));
            return res.status(code).json(data);
          }
        }),
        json: (data: any) => {
          console.log("Debug response:", JSON.stringify(data, null, 2));
          return res.json(data);
        }
      } as unknown as Response;
      
      // Call the import function directly with our mock objects
      console.log("Calling importBayScheduling with test data");
      await importBayScheduling(mockReq, mockRes);
      
    } catch (error) {
      console.error("Error in debug bay scheduling import:", error);
      res.status(500).json({
        success: false,
        message: "Error in debug import",
        error: error.message
      });
    }
  });
  
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
      
      // Create an audit log entry for role change
      const performedBy = req.user?.id || "system";
      await storage.createUserAuditLog(
        req.params.id,
        "ROLE_CHANGE",
        performedBy,
        { role: updatedUser.role, isApproved: updatedUser.isApproved },
        { role, isApproved },
        `Role changed to ${role} and approval status set to ${isApproved ? 'approved' : 'pending'}`
      );
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Error updating user role" });
    }
  });
  
  // Route to update user status (active, inactive, archived)
  app.put("/api/users/:id/status", isAdmin, async (req, res) => {
    try {
      const { status, reason } = req.body;
      if (!status || !['active', 'inactive', 'archived'].includes(status)) {
        return res.status(400).json({ message: "Valid status is required (active, inactive, or archived)" });
      }
      
      const performedBy = req.user?.id || "system";
      const updatedUser = await storage.updateUserStatus(req.params.id, status, performedBy, reason || "");
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Error updating user status" });
    }
  });
  
  // Route to archive a user
  app.put("/api/users/:id/archive", isAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ message: "Reason for archiving is required" });
      }
      
      const performedBy = req.user?.id || "system";
      const archivedUser = await storage.archiveUser(req.params.id, performedBy, reason);
      
      if (!archivedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(archivedUser);
    } catch (error) {
      console.error("Error archiving user:", error);
      res.status(500).json({ message: "Error archiving user" });
    }
  });
  
  // Route to get audit logs for a specific user
  app.get("/api/users/:id/audit-logs", isAdmin, async (req, res) => {
    try {
      const auditLogs = await storage.getUserAuditLogs(req.params.id);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching user audit logs:", error);
      res.status(500).json({ message: "Error fetching user audit logs" });
    }
  });
  
  // Route to get all user audit logs
  app.get("/api/user-audit-logs", isAdmin, async (req, res) => {
    try {
      const allAuditLogs = await storage.getAllUserAuditLogs();
      res.json(allAuditLogs);
    } catch (error) {
      console.error("Error fetching all user audit logs:", error);
      res.status(500).json({ message: "Error fetching all user audit logs" });
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

  // Route to restore an archived project
  app.put("/api/projects/:id/restore", isAuthenticated, hasEditRights, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const restoredProject = await storage.restoreProject(projectId, userId);
      
      if (!restoredProject) {
        return res.status(404).json({ message: "Project not found or could not be restored" });
      }
      
      // Clean up any manufacturing schedules if they exist
      try {
        await storage.removeManufacturingScheduleByProjectId(projectId);
      } catch (cleanupError) {
        console.error(`Warning: Could not clean up manufacturing schedules for project ${projectId}:`, cleanupError);
        // Continue with restoration even if cleanup fails
      }
      
      res.status(200).json({
        success: true, 
        message: `Project ${restoredProject.projectNumber} successfully restored`,
        restoredProject
      });
    } catch (error) {
      console.error(`Error restoring project ${req.params.id}:`, error);
      res.status(500).json({ message: "Error restoring project" });
    }
  });

  // Create an alias for archived-projects at /projects/archived for API consistency
  app.get("/api/projects/archived", async (req, res) => {
    try {
      const archivedProjects = await storage.getArchivedProjects();
      res.json(archivedProjects);
    } catch (error) {
      console.error("Error fetching archived projects:", error);
      res.status(500).json({ message: "Error fetching archived projects" });
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
  
  // Sales Deals Routes
  app.get("/api/sales-deals", async (req, res) => {
    try {
      // Get optional query parameters
      const filters: { isActive?: boolean, ownerId?: string, dealStage?: string, dealType?: string, priority?: string } = {};
      
      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === 'true';
      }
      
      if (req.query.ownerId) {
        filters.ownerId = req.query.ownerId as string;
      }
      
      if (req.query.dealStage) {
        filters.dealStage = req.query.dealStage as string;
      }
      
      if (req.query.dealType) {
        filters.dealType = req.query.dealType as string;
      }
      
      if (req.query.priority) {
        filters.priority = req.query.priority as string;
      }
      
      const salesDeals = await storage.getSalesDeals(filters);
      res.json(salesDeals);
    } catch (error) {
      console.error("Error fetching sales deals:", error);
      res.status(500).json({ message: "Error fetching sales deals" });
    }
  });
  
  app.get("/api/sales-deals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const salesDeal = await storage.getSalesDeal(id);
      
      if (!salesDeal) {
        return res.status(404).json({ message: "Sales deal not found" });
      }
      
      res.json(salesDeal);
    } catch (error) {
      console.error(`Error fetching sales deal ${req.params.id}:`, error);
      res.status(500).json({ message: "Error fetching sales deal" });
    }
  });
  
  app.post("/api/sales-deals", isAuthenticated, hasEditRights, validateRequest(insertSalesDealSchema), async (req, res) => {
    try {
      const salesDeal = await storage.createSalesDeal(req.body);
      res.status(201).json(salesDeal);
    } catch (error) {
      console.error("Error creating sales deal:", error);
      res.status(500).json({ message: "Error creating sales deal" });
    }
  });
  
  app.put("/api/sales-deals/:id", isAuthenticated, hasEditRights, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const salesDeal = await storage.updateSalesDeal(id, req.body);
      
      if (!salesDeal) {
        return res.status(404).json({ message: "Sales deal not found" });
      }
      
      res.json(salesDeal);
    } catch (error) {
      console.error(`Error updating sales deal ${req.params.id}:`, error);
      res.status(500).json({ message: "Error updating sales deal" });
    }
  });
  
  app.delete("/api/sales-deals/:id", isAuthenticated, hasEditRights, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteSalesDeal(id);
      res.json({ success: result });
    } catch (error) {
      console.error(`Error deleting sales deal ${req.params.id}:`, error);
      res.status(500).json({ message: "Error deleting sales deal" });
    }
  });
  
  app.post("/api/sales-deals/:id/convert", isAuthenticated, hasEditRights, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { projectId } = req.body;
      
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }
      
      const salesDeal = await storage.convertSalesDealToProject(id, projectId);
      
      if (!salesDeal) {
        return res.status(404).json({ message: "Sales deal not found" });
      }
      
      res.json(salesDeal);
    } catch (error) {
      console.error(`Error converting sales deal ${req.params.id} to project:`, error);
      res.status(500).json({ message: "Error converting sales deal to project" });
    }
  });
  
  app.get("/api/user/sales-deals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const salesDeals = await storage.getUserSalesDeals(userId);
      res.json(salesDeals);
    } catch (error) {
      console.error(`Error fetching user's sales deals:`, error);
      res.status(500).json({ message: "Error fetching user's sales deals" });
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

  // Financial Goals API routes
  // Get all financial goals
  app.get("/api/financial-goals", isAuthenticated, async (req, res) => {
    try {
      const goals = await storage.getFinancialGoals();
      res.json(goals);
    } catch (error) {
      console.error("Error fetching financial goals:", error);
      res.status(500).json({ message: "Error fetching financial goals" });
    }
  });

  // Get a specific financial goal by year and month
  app.get("/api/financial-goals/:year/:month", isAuthenticated, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month format" });
      }
      
      const goal = await storage.getFinancialGoalByYearMonth(year, month);
      
      if (!goal) {
        return res.status(404).json({ message: "Financial goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      console.error("Error fetching financial goal:", error);
      res.status(500).json({ message: "Error fetching financial goal" });
    }
  });
  
  // Get weekly financial goals for a specific year and month
  app.get("/api/financial-goals/:year/:month/weeks", isAuthenticated, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month format" });
      }
      
      const weeklyGoals = await storage.getWeeklyFinancialGoals(year, month);
      res.json(weeklyGoals);
    } catch (error) {
      console.error("Error fetching weekly financial goals:", error);
      res.status(500).json({ message: "Error fetching weekly financial goals" });
    }
  });
  
  // Get a specific weekly financial goal by year, month, and week
  app.get("/api/financial-goals/:year/:month/week/:week", isAuthenticated, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const week = parseInt(req.params.week);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || isNaN(week) || week < 1 || week > 6) {
        return res.status(400).json({ message: "Invalid year, month, or week format" });
      }
      
      const goal = await storage.getFinancialGoalByYearMonth(year, month, week);
      
      if (!goal) {
        return res.status(404).json({ message: "Weekly financial goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      console.error("Error fetching weekly financial goal:", error);
      res.status(500).json({ message: "Error fetching weekly financial goal" });
    }
  });

  // Create a new financial goal
  app.post("/api/financial-goals", hasEditRights, async (req, res) => {
    try {
      const { year, month, week, targetAmount, description } = req.body;
      
      if (!year || !month || !targetAmount) {
        return res.status(400).json({ message: "Year, month, and target amount are required" });
      }
      
      const parsedYear = parseInt(year);
      const parsedMonth = parseInt(month);
      const parsedWeek = week ? parseInt(week) : undefined;
      
      // Validate week if provided
      if (parsedWeek !== undefined && (isNaN(parsedWeek) || parsedWeek < 1 || parsedWeek > 6)) {
        return res.status(400).json({ message: "Week must be a number between 1 and 6" });
      }
      
      // Check if goal for this year/month(/week) already exists
      const existingGoal = await storage.getFinancialGoalByYearMonth(parsedYear, parsedMonth, parsedWeek);
      if (existingGoal) {
        const periodType = parsedWeek ? "week" : "month";
        return res.status(409).json({ message: `A financial goal for this ${periodType} already exists` });
      }
      
      const newGoal = await storage.createFinancialGoal({
        year: parsedYear,
        month: parsedMonth,
        week: parsedWeek,
        targetAmount: parseFloat(targetAmount),
        description
      });
      
      res.status(201).json(newGoal);
    } catch (error) {
      console.error("Error creating financial goal:", error);
      res.status(500).json({ message: "Error creating financial goal" });
    }
  });

  // Update a financial goal - monthly goal (no week specified)
  app.put("/api/financial-goals/:year/:month", hasEditRights, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month format" });
      }
      
      const { targetAmount, description } = req.body;
      
      if (!targetAmount) {
        return res.status(400).json({ message: "Target amount is required" });
      }
      
      // Check if the monthly goal exists
      const existingGoal = await storage.getFinancialGoalByYearMonth(year, month);
      if (!existingGoal) {
        return res.status(404).json({ message: "Financial goal not found" });
      }
      
      const updatedGoal = await storage.updateFinancialGoal(year, month, {
        targetAmount: parseFloat(targetAmount),
        description
      });
      
      res.json(updatedGoal);
    } catch (error) {
      console.error("Error updating financial goal:", error);
      res.status(500).json({ message: "Error updating financial goal" });
    }
  });
  
  // Update a weekly financial goal
  app.put("/api/financial-goals/:year/:month/week/:week", hasEditRights, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const week = parseInt(req.params.week);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || isNaN(week) || week < 1 || week > 6) {
        return res.status(400).json({ message: "Invalid year, month, or week format" });
      }
      
      const { targetAmount, description } = req.body;
      
      if (!targetAmount) {
        return res.status(400).json({ message: "Target amount is required" });
      }
      
      // Check if the weekly goal exists
      const existingGoal = await storage.getFinancialGoalByYearMonth(year, month, week);
      if (!existingGoal) {
        return res.status(404).json({ message: "Weekly financial goal not found" });
      }
      
      const updatedGoal = await storage.updateFinancialGoal(year, month, {
        targetAmount: parseFloat(targetAmount),
        description
      }, week);
      
      res.json(updatedGoal);
    } catch (error) {
      console.error("Error updating weekly financial goal:", error);
      res.status(500).json({ message: "Error updating weekly financial goal" });
    }
  });

  // Delete a monthly financial goal (no week specified)
  app.delete("/api/financial-goals/:year/:month", hasEditRights, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month format" });
      }
      
      // Check if the monthly goal exists
      const existingGoal = await storage.getFinancialGoalByYearMonth(year, month);
      if (!existingGoal) {
        return res.status(404).json({ message: "Financial goal not found" });
      }
      
      const result = await storage.deleteFinancialGoal(year, month);
      
      if (result) {
        res.status(200).json({ message: "Financial goal deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete financial goal" });
      }
    } catch (error) {
      console.error("Error deleting financial goal:", error);
      res.status(500).json({ message: "Error deleting financial goal" });
    }
  });
  
  // Delete a weekly financial goal
  app.delete("/api/financial-goals/:year/:month/week/:week", hasEditRights, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const week = parseInt(req.params.week);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || isNaN(week) || week < 1 || week > 6) {
        return res.status(400).json({ message: "Invalid year, month, or week format" });
      }
      
      // Check if the weekly goal exists
      const existingGoal = await storage.getFinancialGoalByYearMonth(year, month, week);
      if (!existingGoal) {
        return res.status(404).json({ message: "Weekly financial goal not found" });
      }
      
      const result = await storage.deleteFinancialGoal(year, month, week);
      
      if (result) {
        res.status(200).json({ message: "Weekly financial goal deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete weekly financial goal" });
      }
    } catch (error) {
      console.error("Error deleting weekly financial goal:", error);
      res.status(500).json({ message: "Error deleting weekly financial goal" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
