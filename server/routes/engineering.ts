import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, gt, lte, inArray, sql } from 'drizzle-orm';
import { storage } from '../storage';
import { z } from 'zod';
import { 
  insertEngineeringResourceSchema, 
  insertEngineeringTaskSchema,
  insertEngineeringBenchmarkSchema,
  engineeringResources,
  engineeringTasks,
  engineeringBenchmarks,
  projects
} from '../../shared/schema';
import { db } from '../db';

const router = Router();

// GET all engineering resources
router.get('/engineering-resources', async (req: Request, res: Response) => {
  try {
    const resources = await storage.getEngineeringResources();
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
    const resources = await storage.getEngineeringResources();
    const tasks = await storage.getEngineeringTasks();
    const benchmarks = await storage.getEngineeringBenchmarks();

    // Calculate workload statistics
    const workloadStats = {
      totalEngineers: resources.length,
      availableEngineers: resources.filter(r => r.workloadStatus === 'available').length,
      atCapacityEngineers: resources.filter(r => r.workloadStatus === 'at_capacity').length,
      overloadedEngineers: resources.filter(r => r.workloadStatus === 'overloaded').length,
      unavailableEngineers: resources.filter(r => r.workloadStatus === 'unavailable').length,
    };

    // Calculate discipline distribution
    const disciplineStats = resources.reduce((acc, resource) => {
      acc[resource.discipline] = (acc[resource.discipline] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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

export default router;