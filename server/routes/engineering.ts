import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, gt, lte, inArray, sql } from 'drizzle-orm';
import { storage } from '../storage';
import { z } from 'zod';
import { 
  insertEngineeringResourceSchema, 
  insertEngineeringTaskSchema,
  insertEngineeringBenchmarkSchema,
  insertProjectEngineeringAssignmentSchema,
  engineeringResources,
  engineeringTasks,
  engineeringBenchmarks,
  projectEngineeringAssignments,
  projects,
  users
} from '../../shared/schema';
import { db } from '../db';

const router = Router();

// GET all engineering resources (real Engineering users from users table)
router.get('/engineering-resources', async (req: Request, res: Response) => {
  try {
    // Get real Engineering users from the users table
    const engineeringUsers = await db.select().from(users).where(eq(users.department, 'Engineering'));
    
    // Convert users to EngineeringResource format
    const resources = engineeringUsers.map((user, index) => ({
      id: index + 1,
      firstName: user.firstName || 'Unknown',
      lastName: user.lastName || 'User', 
      discipline: 'ME' as const, // Default discipline - could be determined from project assignments
      title: 'Engineering Specialist',
      workloadStatus: 'available' as const,
      currentCapacityPercent: 0,
      hourlyRate: 100,
      skillLevel: 'intermediate' as const,
      isActive: user.status === 'active',
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date()
    }));

    res.json(resources);
  } catch (error) {
    console.error("Error fetching engineering resources:", error);
    res.status(500).json({ error: "Failed to fetch engineering resources" });
  }
});

// GET engineering resources by discipline
router.get('/engineering-resources/discipline/:discipline', async (req: Request, res: Response) => {
  try {
    const discipline = req.params.discipline;
    const resources = await storage.getEngineeringResourcesByDiscipline(discipline);
    res.json(resources);
  } catch (error) {
    console.error("Error fetching engineering resources by discipline:", error);
    res.status(500).json({ error: "Failed to fetch engineering resources by discipline" });
  }
});

// GET a specific engineering resource
router.get('/engineering-resources/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const resource = await storage.getEngineeringResourceById(id);
    if (!resource) {
      return res.status(404).json({ error: "Engineering resource not found" });
    }

    res.json(resource);
  } catch (error) {
    console.error("Error fetching engineering resource:", error);
    res.status(500).json({ error: "Failed to fetch engineering resource" });
  }
});

// CREATE a new engineering resource
router.post('/engineering-resources', async (req: Request, res: Response) => {
  try {
    const validationResult = insertEngineeringResourceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid resource data", 
        details: validationResult.error.format() 
      });
    }

    const newResource = await storage.createEngineeringResource(validationResult.data);
    res.status(201).json(newResource);
  } catch (error) {
    console.error("Error creating engineering resource:", error);
    res.status(500).json({ error: "Failed to create engineering resource" });
  }
});

// UPDATE an engineering resource
router.put('/engineering-resources/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const validationResult = insertEngineeringResourceSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid resource data", 
        details: validationResult.error.format() 
      });
    }

    const updatedResource = await storage.updateEngineeringResource(id, validationResult.data);
    if (!updatedResource) {
      return res.status(404).json({ error: "Engineering resource not found" });
    }

    res.json(updatedResource);
  } catch (error) {
    console.error("Error updating engineering resource:", error);
    res.status(500).json({ error: "Failed to update engineering resource" });
  }
});

// DELETE an engineering resource
router.delete('/engineering-resources/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const success = await storage.deleteEngineeringResource(id);
    if (!success) {
      return res.status(404).json({ error: "Engineering resource not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting engineering resource:", error);
    res.status(500).json({ error: "Failed to delete engineering resource" });
  }
});

// GET all engineering tasks
router.get('/engineering-tasks', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const resourceId = req.query.resourceId ? parseInt(req.query.resourceId as string) : undefined;

    let tasks;
    if (projectId && !isNaN(projectId)) {
      tasks = await storage.getEngineeringTasksByProjectId(projectId);
    } else if (resourceId && !isNaN(resourceId)) {
      tasks = await storage.getEngineeringTasksByResourceId(resourceId);
    } else {
      tasks = await storage.getEngineeringTasks();
    }

    res.json(tasks);
  } catch (error) {
    console.error("Error fetching engineering tasks:", error);
    res.status(500).json({ error: "Failed to fetch engineering tasks" });
  }
});

// CREATE a new engineering task
router.post('/engineering-tasks', async (req: Request, res: Response) => {
  try {
    const validationResult = insertEngineeringTaskSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid task data", 
        details: validationResult.error.format() 
      });
    }

    const newTask = await storage.createEngineeringTask(validationResult.data);
    res.status(201).json(newTask);
  } catch (error) {
    console.error("Error creating engineering task:", error);
    res.status(500).json({ error: "Failed to create engineering task" });
  }
});

// UPDATE an engineering task
router.put('/engineering-tasks/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const validationResult = insertEngineeringTaskSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid task data", 
        details: validationResult.error.format() 
      });
    }

    const updatedTask = await storage.updateEngineeringTask(id, validationResult.data);
    if (!updatedTask) {
      return res.status(404).json({ error: "Engineering task not found" });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating engineering task:", error);
    res.status(500).json({ error: "Failed to update engineering task" });
  }
});

// DELETE an engineering task
router.delete('/engineering-tasks/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const success = await storage.deleteEngineeringTask(id);
    if (!success) {
      return res.status(404).json({ error: "Engineering task not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting engineering task:", error);
    res.status(500).json({ error: "Failed to delete engineering task" });
  }
});

// GET all engineering benchmarks
router.get('/engineering-benchmarks', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;

    let benchmarks;
    if (projectId && !isNaN(projectId)) {
      benchmarks = await storage.getEngineeringBenchmarksByProjectId(projectId);
    } else {
      benchmarks = await storage.getEngineeringBenchmarks();
    }

    res.json(benchmarks);
  } catch (error) {
    console.error("Error fetching engineering benchmarks:", error);
    res.status(500).json({ error: "Failed to fetch engineering benchmarks" });
  }
});

// CREATE a new engineering benchmark
router.post('/engineering-benchmarks', async (req: Request, res: Response) => {
  try {
    const validationResult = insertEngineeringBenchmarkSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid benchmark data", 
        details: validationResult.error.format() 
      });
    }

    const newBenchmark = await storage.createEngineeringBenchmark(validationResult.data);
    res.status(201).json(newBenchmark);
  } catch (error) {
    console.error("Error creating engineering benchmark:", error);
    res.status(500).json({ error: "Failed to create engineering benchmark" });
  }
});

// UPDATE an engineering benchmark
router.put('/engineering-benchmarks/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const validationResult = insertEngineeringBenchmarkSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid benchmark data", 
        details: validationResult.error.format() 
      });
    }

    const updatedBenchmark = await storage.updateEngineeringBenchmark(id, validationResult.data);
    if (!updatedBenchmark) {
      return res.status(404).json({ error: "Engineering benchmark not found" });
    }

    res.json(updatedBenchmark);
  } catch (error) {
    console.error("Error updating engineering benchmark:", error);
    res.status(500).json({ error: "Failed to update engineering benchmark" });
  }
});

// DELETE an engineering benchmark
router.delete('/engineering-benchmarks/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const success = await storage.deleteEngineeringBenchmark(id);
    if (!success) {
      return res.status(404).json({ error: "Engineering benchmark not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting engineering benchmark:", error);
    res.status(500).json({ error: "Failed to delete engineering benchmark" });
  }
});

// GET engineering overview analytics
router.get('/engineering-overview', async (req: Request, res: Response) => {
  try {
    // Get all projects and their engineering data
    const projects = await storage.getProjects();
    
    // Get real Engineering users from the users table
    const engineeringUsers = await db.select().from(users).where(eq(users.department, 'Engineering'));
    
    const tasks = await storage.getEngineeringTasks();
    const benchmarks = await storage.getEngineeringBenchmarks();

    // Calculate workload statistics based on real Engineering users
    const workloadStats = {
      totalEngineers: engineeringUsers.length,
      availableEngineers: engineeringUsers.length, // Default all to available since we don't have workload status
      atCapacityEngineers: 0,
      overloadedEngineers: 0,
      unavailableEngineers: 0,
    };

    // Calculate discipline distribution - we'll use ME, EE, ITE, NTC as placeholders
    // since we don't have discipline data for real users
    const disciplineStats = {
      'ME': Math.ceil(engineeringUsers.length * 0.4),
      'EE': Math.ceil(engineeringUsers.length * 0.3), 
      'ITE': Math.floor(engineeringUsers.length * 0.2),
      'NTC': Math.floor(engineeringUsers.length * 0.1)
    };

    // Calculate task statistics
    const taskStats = {
      totalTasks: tasks.length,
      notStarted: tasks.filter(t => t.status === 'not_started').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      underReview: tasks.filter(t => t.status === 'under_review').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      onHold: tasks.filter(t => t.status === 'on_hold').length,
    };

    // Calculate benchmark statistics
    const benchmarkStats = {
      totalBenchmarks: benchmarks.length,
      completed: benchmarks.filter(b => b.isCompleted).length,
      pending: benchmarks.filter(b => !b.isCompleted).length,
    };

    // Get projects with engineering data
    const projectsWithEngineering = projects.map(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const projectBenchmarks = benchmarks.filter(b => b.projectId === project.id);
      
      return {
        ...project,
        engineeringTasks: projectTasks.length,
        completedTasks: projectTasks.filter(t => t.status === 'completed').length,
        engineeringBenchmarks: projectBenchmarks.length,
        completedBenchmarks: projectBenchmarks.filter(b => b.isCompleted).length,
        meAssigned: project.meAssigned,
        eeAssigned: project.eeAssigned,
        iteAssigned: project.iteAssigned,
        meDesignOrdersPercent: project.meDesignOrdersPercent,
        eeDesignOrdersPercent: project.eeDesignOrdersPercent,
        itDesignOrdersPercent: project.itDesignOrdersPercent,
        itPercentage: project.itPercentage,
        ntcPercentage: project.ntcPercentage,
      };
    });

    res.json({
      workloadStats,
      disciplineStats,
      taskStats,
      benchmarkStats,
      projects: projectsWithEngineering,
      resources,
      recentTasks: tasks.slice(0, 10), // Latest 10 tasks
      upcomingBenchmarks: benchmarks.filter(b => !b.isCompleted).slice(0, 10),
    });
  } catch (error) {
    console.error("Error fetching engineering overview:", error);
    res.status(500).json({ error: "Failed to fetch engineering overview" });
  }
});

// Project Engineering Assignment Routes

// GET all project engineering assignments
router.get('/project-assignments', async (req: Request, res: Response) => {
  try {
    const assignments = await storage.getProjectEngineeringAssignments();
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching project engineering assignments:", error);
    res.status(500).json({ error: "Failed to fetch project engineering assignments" });
  }
});

// GET project assignments by project ID
router.get('/project-assignments/project/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID format" });
    }

    const assignments = await storage.getProjectEngineeringAssignmentsByProjectId(projectId);
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching project assignments by project ID:", error);
    res.status(500).json({ error: "Failed to fetch project assignments" });
  }
});

// GET project assignments by resource ID
router.get('/project-assignments/resource/:resourceId', async (req: Request, res: Response) => {
  try {
    const resourceId = parseInt(req.params.resourceId);
    if (isNaN(resourceId)) {
      return res.status(400).json({ error: "Invalid resource ID format" });
    }

    const assignments = await storage.getProjectEngineeringAssignmentsByResourceId(resourceId);
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching project assignments by resource ID:", error);
    res.status(500).json({ error: "Failed to fetch project assignments" });
  }
});

// CREATE a new project engineering assignment
router.post('/project-assignments', async (req: Request, res: Response) => {
  try {
    const validationResult = insertProjectEngineeringAssignmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid assignment data", 
        details: validationResult.error.format() 
      });
    }

    const newAssignment = await storage.createProjectEngineeringAssignment(validationResult.data);
    res.status(201).json(newAssignment);
  } catch (error) {
    console.error("Error creating project engineering assignment:", error);
    res.status(500).json({ error: "Failed to create project engineering assignment" });
  }
});

// UPDATE a project engineering assignment
router.put('/project-assignments/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const validationResult = insertProjectEngineeringAssignmentSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid assignment data", 
        details: validationResult.error.format() 
      });
    }

    const updatedAssignment = await storage.updateProjectEngineeringAssignment(id, validationResult.data);
    if (!updatedAssignment) {
      return res.status(404).json({ error: "Project engineering assignment not found" });
    }

    res.json(updatedAssignment);
  } catch (error) {
    console.error("Error updating project engineering assignment:", error);
    res.status(500).json({ error: "Failed to update project engineering assignment" });
  }
});

// DELETE a project engineering assignment
router.delete('/project-assignments/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const success = await storage.deleteProjectEngineeringAssignment(id);
    if (!success) {
      return res.status(404).json({ error: "Project engineering assignment not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting project engineering assignment:", error);
    res.status(500).json({ error: "Failed to delete project engineering assignment" });
  }
});

export default router;