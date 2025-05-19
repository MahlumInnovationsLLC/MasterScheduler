import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, gt, lte, inArray } from 'drizzle-orm';
import { storage } from '../storage';
import { z } from 'zod';
import { 
  insertSupplyChainBenchmarkSchema, 
  insertProjectSupplyChainBenchmarkSchema,
  supplyChainBenchmarks,
  projectSupplyChainBenchmarks,
  projects
} from '../../shared/schema';

const router = Router();

// GET all supply chain benchmarks
router.get('/supply-chain-benchmarks', async (req: Request, res: Response) => {
  try {
    const benchmarks = await storage.getSupplyChainBenchmarks();
    res.json(benchmarks);
  } catch (error) {
    console.error("Error fetching supply chain benchmarks:", error);
    res.status(500).json({ error: "Failed to fetch supply chain benchmarks" });
  }
});

// GET a specific supply chain benchmark
router.get('/supply-chain-benchmarks/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    const benchmark = await storage.getSupplyChainBenchmarkById(id);
    if (!benchmark) {
      return res.status(404).json({ error: "Benchmark not found" });
    }
    
    res.json(benchmark);
  } catch (error) {
    console.error("Error fetching supply chain benchmark:", error);
    res.status(500).json({ error: "Failed to fetch supply chain benchmark" });
  }
});

// CREATE a new supply chain benchmark
router.post('/supply-chain-benchmarks', async (req: Request, res: Response) => {
  try {
    const validationResult = insertSupplyChainBenchmarkSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid benchmark data", 
        details: validationResult.error.format() 
      });
    }
    
    const benchmarkData = validationResult.data;
    const newBenchmark = await storage.createSupplyChainBenchmark(benchmarkData);
    
    // If this is a default benchmark, automatically add it to all active projects
    if (benchmarkData.isDefault) {
      const activeProjects = await storage.getActiveProjects();
      
      for (const project of activeProjects) {
        await storage.createProjectSupplyChainBenchmark({
          projectId: project.id,
          benchmarkId: newBenchmark.id,
          name: newBenchmark.name,
          description: newBenchmark.description,
          weeksBeforePhase: newBenchmark.weeksBeforePhase,
          targetPhase: newBenchmark.targetPhase,
          isCompleted: false
        });
      }
    }
    
    res.status(201).json(newBenchmark);
  } catch (error) {
    console.error("Error creating supply chain benchmark:", error);
    res.status(500).json({ error: "Failed to create supply chain benchmark" });
  }
});

// UPDATE a supply chain benchmark
router.patch('/supply-chain-benchmarks/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    const benchmark = await storage.getSupplyChainBenchmarkById(id);
    if (!benchmark) {
      return res.status(404).json({ error: "Benchmark not found" });
    }
    
    // Partial update schema
    const updateSchema = insertSupplyChainBenchmarkSchema.partial();
    const validationResult = updateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid benchmark data", 
        details: validationResult.error.format() 
      });
    }
    
    const updateData = validationResult.data;
    const updatedBenchmark = await storage.updateSupplyChainBenchmark(id, updateData);
    
    res.json(updatedBenchmark);
  } catch (error) {
    console.error("Error updating supply chain benchmark:", error);
    res.status(500).json({ error: "Failed to update supply chain benchmark" });
  }
});

// DELETE a supply chain benchmark
router.delete('/supply-chain-benchmarks/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    const benchmark = await storage.getSupplyChainBenchmarkById(id);
    if (!benchmark) {
      return res.status(404).json({ error: "Benchmark not found" });
    }
    
    // Delete the benchmark and its associated project benchmarks
    await storage.deleteSupplyChainBenchmarkWithRelated(id);
    
    res.json({ success: true, message: "Benchmark deleted successfully" });
  } catch (error) {
    console.error("Error deleting supply chain benchmark:", error);
    res.status(500).json({ error: "Failed to delete supply chain benchmark" });
  }
});

// GET all project supply chain benchmarks
router.get('/project-supply-chain-benchmarks', async (req: Request, res: Response) => {
  try {
    // Handle optional filtering by project ID
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    
    // Handle including project data
    const includeProject = req.query.include === 'project';
    
    let benchmarks = await storage.getProjectSupplyChainBenchmarks();
    
    // Filter by project if specified
    if (projectId && !isNaN(projectId)) {
      benchmarks = benchmarks.filter(benchmark => benchmark.projectId === projectId);
    }
    
    // Include project data if requested
    if (includeProject) {
      const projectIds = benchmarks.map(benchmark => benchmark.projectId);
      const projectsData = await storage.getProjectsByIds(projectIds);
      
      const projectsMap = new Map(projectsData.map(project => [project.id, project]));
      
      benchmarks = benchmarks.map(benchmark => ({
        ...benchmark,
        project: projectsMap.get(benchmark.projectId)
      }));
    }
    
    res.json(benchmarks);
  } catch (error) {
    console.error("Error fetching project supply chain benchmarks:", error);
    res.status(500).json({ error: "Failed to fetch project supply chain benchmarks" });
  }
});

// GET a specific project supply chain benchmark
router.get('/project-supply-chain-benchmarks/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    const benchmark = await storage.getProjectSupplyChainBenchmarkById(id);
    if (!benchmark) {
      return res.status(404).json({ error: "Project benchmark not found" });
    }
    
    // Handle including project data
    if (req.query.include === 'project') {
      const project = await storage.getProjectById(benchmark.projectId);
      
      if (project) {
        return res.json({
          ...benchmark,
          project: project
        });
      }
    }
    
    res.json(benchmark);
  } catch (error) {
    console.error("Error fetching project supply chain benchmark:", error);
    res.status(500).json({ error: "Failed to fetch project supply chain benchmark" });
  }
});

// CREATE a new project supply chain benchmark
router.post('/project-supply-chain-benchmarks', async (req: Request, res: Response) => {
  try {
    const validationResult = insertProjectSupplyChainBenchmarkSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid project benchmark data", 
        details: validationResult.error.format() 
      });
    }
    
    const benchmarkData = validationResult.data;
    
    // Verify the project exists
    const project = await storage.getProjectById(benchmarkData.projectId);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const newBenchmark = await storage.createProjectSupplyChainBenchmark(benchmarkData);
    res.status(201).json(newBenchmark);
  } catch (error) {
    console.error("Error creating project supply chain benchmark:", error);
    res.status(500).json({ error: "Failed to create project supply chain benchmark" });
  }
});

// UPDATE a project supply chain benchmark
router.patch('/project-supply-chain-benchmarks/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    const benchmark = await storage.getProjectSupplyChainBenchmarkById(id);
    if (!benchmark) {
      return res.status(404).json({ error: "Project benchmark not found" });
    }
    
    // Log the request data for debugging
    console.log("Update benchmark request:", JSON.stringify(req.body, null, 2));
    
    // Extract data directly without schema validation
    // since we're having issues with the partial schema
    const updateData: any = {
      isCompleted: req.body.isCompleted
    };
    
    // Only set these fields if they are present
    if (req.body.completedDate !== undefined) {
      updateData.completedDate = req.body.completedDate;
    }
    
    if (req.body.completedBy !== undefined) {
      updateData.completedBy = req.body.completedBy;
    }
    
    // Other fields that might be updated
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.targetDate !== undefined) updateData.targetDate = req.body.targetDate;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    
    // Update the benchmark
    const updatedBenchmark = await storage.updateProjectSupplyChainBenchmark(id, updateData);
    
    // Log the updated benchmark for verification
    console.log("Updated benchmark:", JSON.stringify(updatedBenchmark, null, 2));
    
    res.json(updatedBenchmark);
  } catch (error) {
    console.error("Error updating project supply chain benchmark:", error);
    res.status(500).json({ error: "Failed to update project supply chain benchmark" });
  }
});

// DELETE a project supply chain benchmark
router.delete('/project-supply-chain-benchmarks/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    const benchmark = await storage.getProjectSupplyChainBenchmarkById(id);
    if (!benchmark) {
      return res.status(404).json({ error: "Project benchmark not found" });
    }
    
    await storage.deleteProjectSupplyChainBenchmark(id);
    
    res.json({ success: true, message: "Project benchmark deleted successfully" });
  } catch (error) {
    console.error("Error deleting project supply chain benchmark:", error);
    res.status(500).json({ error: "Failed to delete project supply chain benchmark" });
  }
});

// TOGGLE completion status of a project supply chain benchmark
router.post('/project-supply-chain-benchmarks/:id/toggle-completion', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    const benchmark = await storage.getProjectSupplyChainBenchmarkById(id);
    if (!benchmark) {
      return res.status(404).json({ error: "Project benchmark not found" });
    }
    
    const { isCompleted, completedBy } = req.body;
    
    // Execute the SQL function we created
    await storage.executeSql(
      "SELECT toggle_benchmark_completion($1, $2, $3)", 
      [id, isCompleted, completedBy || null]
    );
    
    // Get the updated benchmark
    const updatedBenchmark = await storage.getProjectSupplyChainBenchmarkById(id);
    
    res.json({
      success: true,
      message: isCompleted ? "Benchmark marked as completed" : "Benchmark marked as incomplete",
      benchmark: updatedBenchmark
    });
  } catch (error) {
    console.error("Error toggling benchmark completion:", error);
    res.status(500).json({ error: "Failed to update benchmark completion status" });
  }
});

// Add default benchmarks to a project
router.post('/project-supply-chain-benchmarks/add-defaults/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID format" });
    }
    
    // Verify the project exists
    const project = await storage.getProjectById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Get all default benchmarks
    const defaultBenchmarks = await storage.getDefaultSupplyChainBenchmarks();
    
    // Add each default benchmark to the project
    const createdBenchmarks = [];
    for (const benchmark of defaultBenchmarks) {
      const projectBenchmark = await storage.createProjectSupplyChainBenchmark({
        projectId,
        benchmarkId: benchmark.id,
        name: benchmark.name,
        description: benchmark.description,
        weeksBeforePhase: benchmark.weeksBeforePhase,
        targetPhase: benchmark.targetPhase,
        isCompleted: false
      });
      
      createdBenchmarks.push(projectBenchmark);
    }
    
    res.status(201).json({
      success: true,
      message: `${createdBenchmarks.length} default benchmarks added to project`,
      benchmarks: createdBenchmarks
    });
  } catch (error) {
    console.error("Error adding default benchmarks to project:", error);
    res.status(500).json({ error: "Failed to add default benchmarks to project" });
  }
});

export default router;