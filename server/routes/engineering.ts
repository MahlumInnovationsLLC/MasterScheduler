import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, gt, lte, inArray, sql } from 'drizzle-orm';
import { storage } from '../storage';
import { z } from 'zod';
import { 
  insertEngineeringResourceSchema, 
  insertEngineeringTaskSchema,
  insertEngineeringBenchmarkSchema,
  insertBenchmarkTemplateSchema,
  insertProjectEngineeringAssignmentSchema,
  engineeringResources,
  engineeringTasks,
  engineeringBenchmarks,
  benchmarkTemplates,
  projectEngineeringAssignments,
  projects,
  users
} from '../../shared/schema';
import { db } from '../db';

const router = Router();

// Engineering routes use the main authentication middleware
// This will be applied when mounting the router in the main routes file

// GET all engineering resources (real Engineering users from users table ONLY)
router.get('/engineering-resources', async (req: Request, res: Response) => {
  console.log('🔍 SERVER DEBUG: *** ENGINEERING RESOURCES REQUEST RECEIVED ***');
  console.log('🔍 SERVER DEBUG: Request URL:', req.url);
  console.log('🔍 SERVER DEBUG: Request method:', req.method);
  console.log('🔍 SERVER DEBUG: Starting engineering resources query...');
  
  try {
    // Get ONLY real Engineering users from the users table
    const engineeringUsers = await db.select().from(users).where(eq(users.department, 'engineering'));
    
    console.log('🔍 SERVER DEBUG: Found engineering users:', engineeringUsers.length);
    console.log('🔍 SERVER DEBUG: First few users:', engineeringUsers.slice(0, 3));
    
    // Return only actual users, using user IDs for consistency
    // Create a discipline mapping for different engineers for demonstration
    const disciplineMap: { [key: string]: string } = {
      '029521e7-8aae-4c5a-923b-423c12d7b928': 'ME', // Jordan Boyenga
      '38468008': 'ME', // Colter P Mahlum
      '93cb4a30-e9b4-409e-9196-7f5464484922': 'EE', // Engineering user
      '0bf8f4c2-a7e3-4217-8469-2a9fec5d9b76': 'EE', // Engineering user
      'ece3b30f-d2df-450d-88dc-fe8bc388906d': 'ITE', // Engineering user
      '457a12dd-6cf5-40ce-8fcb-69be01898efb': 'ITE', // Engineering user
      '76840151-bb8e-4915-9686-a43dd395091c': 'NTC', // Engineering user
      '9ccddf13-92a7-4484-a68b-986baf96b903': 'NTC', // Engineering user
      'ef136e5c-f059-469d-b858-c90b11de43d6': 'ME', // Engineering user
      '0bbf4a86-6080-419a-9448-e2b414353b2c': 'EE', // Trevor Jobst
      '1b2eee23-9c1d-4400-a5c5-1c3d0a7a8254': 'ME', // Ethan Sauer
      'ecd2b7a9-2f0b-4ecc-9652-e5fd9e11477a': 'EE', // Finn Simonson
      '914890a7-9cd8-46e5-83d4-530011311f8c': 'ITE', // Sean Mcgee
      'af41a446-9f1a-4b3c-a685-5151ea757d65': 'ME', // Will Busching
      'bc1837b7-016d-46d8-a556-b709d30ec853': 'NTC', // Scott Barker
      '4408dabc-c27a-475c-870d-565e5a251722': 'EE', // Austin Guth
      '9c7048d1-b9f9-4cb2-8f13-7e4edc88e8b1': 'ME' // Michael Klassen
    };
    
    // Get all engineering resource customizations
    const engineeringResourceCustomizations = await db.select().from(engineeringResources);
    
    const resources = engineeringUsers.map(user => {
      console.log('🔍 SERVER DEBUG: Processing user:', { id: user.id, firstName: user.firstName, lastName: user.lastName });
      
      // Find any existing customizations for this user
      const customization = engineeringResourceCustomizations.find(resource => resource.userId === user.id);
      
      return {
        id: user.id, // Use actual user ID for assignment mapping
        firstName: user.firstName || 'Unknown',
        lastName: user.lastName || 'User',
        discipline: customization?.discipline || disciplineMap[user.id] || 'ME', // Use saved customization first, then default mapping
        title: customization?.title || 'Engineering Specialist',
        workloadStatus: customization?.workloadStatus || 'available',
        currentCapacityPercent: customization?.currentCapacityPercent || 0,
        hourlyRate: customization?.hourlyRate || 100,
        skillLevel: customization?.skillLevel || 'intermediate',
        isActive: user.status === 'active',
        createdAt: customization?.createdAt || user.createdAt || new Date(),
        updatedAt: customization?.updatedAt || user.updatedAt || new Date()
      };
    });

    console.log('🔍 SERVER DEBUG: Returning resources:', resources.length);
    console.log('🔍 SERVER DEBUG: Sample resources:', resources.slice(0, 2));
    
    // Add cache-busting headers
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    res.json(resources);
  } catch (error) {
    console.error("🔍 SERVER DEBUG: Error fetching engineering resources:", error);
    console.error("🔍 SERVER DEBUG: Error stack:", error);
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
    const id = req.params.id;
    if (!id) {
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

// UPDATE an engineering resource (create or update in engineering_resources table)
router.put('/engineering-resources/:id', async (req: Request, res: Response) => {
  try {
    const resourceId = req.params.id;
    if (!resourceId) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const { discipline, title, hourlyRate, skillLevel, workloadStatus } = req.body;

    // Verify the user exists in engineering department
    const userToUpdate = await db.select()
      .from(users)
      .where(and(eq(users.id, resourceId), eq(users.department, 'engineering')))
      .limit(1);
    
    if (userToUpdate.length === 0) {
      return res.status(404).json({ error: "Engineering resource not found" });
    }

    const user = userToUpdate[0];
    
    // Check if an engineering resource record already exists for this user
    const existingResource = await db.select()
      .from(engineeringResources)
      .where(eq(engineeringResources.userId, resourceId))
      .limit(1);

    let updatedResource;
    
    if (existingResource.length > 0) {
      // Update existing engineering resource record
      const [updated] = await db.update(engineeringResources)
        .set({
          discipline: discipline || existingResource[0].discipline,
          title: title || existingResource[0].title,
          hourlyRate: hourlyRate || existingResource[0].hourlyRate,
          skillLevel: skillLevel || existingResource[0].skillLevel,
          workloadStatus: workloadStatus || existingResource[0].workloadStatus,
          updatedAt: new Date()
        })
        .where(eq(engineeringResources.userId, resourceId))
        .returning();
      
      updatedResource = {
        id: resourceId,
        firstName: user.firstName || 'Unknown',
        lastName: user.lastName || 'User', 
        discipline: updated.discipline,
        title: updated.title,
        workloadStatus: updated.workloadStatus,
        currentCapacityPercent: updated.currentCapacityPercent,
        hourlyRate: updated.hourlyRate,
        skillLevel: updated.skillLevel,
        isActive: user.status === 'active',
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      };
    } else {
      // Create new engineering resource record
      const [created] = await db.insert(engineeringResources)
        .values({
          userId: resourceId,
          firstName: user.firstName || 'Unknown',
          lastName: user.lastName || 'User',
          discipline: discipline || 'ME',
          title: title || 'Engineering Specialist', 
          hourlyRate: hourlyRate || 100,
          skillLevel: skillLevel || 'intermediate',
          workloadStatus: workloadStatus || 'available',
          currentCapacityPercent: 0,
          isActive: user.status === 'active'
        })
        .returning();
      
      updatedResource = {
        id: resourceId,
        firstName: user.firstName || 'Unknown',
        lastName: user.lastName || 'User',
        discipline: created.discipline,
        title: created.title,
        workloadStatus: created.workloadStatus,
        currentCapacityPercent: created.currentCapacityPercent,
        hourlyRate: created.hourlyRate,
        skillLevel: created.skillLevel,
        isActive: user.status === 'active',
        createdAt: created.createdAt,
        updatedAt: created.updatedAt
      };
    }

    console.log('✅ Engineering resource updated successfully:', updatedResource);
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

// AUTO-COMPLETE benchmarks for delivered projects
// UPDATE PROJECT MANUAL PERCENTAGES
router.put('/projects/:projectId/manual-percentages', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const { meManualPercent, eeManualPercent, iteManualPercent, ntcManualPercent } = req.body;

    // Update the project with manual percentage overrides
    const [updatedProject] = await db
      .update(projects)
      .set({
        meManualPercent: meManualPercent === null ? null : meManualPercent,
        eeManualPercent: eeManualPercent === null ? null : eeManualPercent,
        iteManualPercent: iteManualPercent === null ? null : iteManualPercent,
        ntcManualPercent: ntcManualPercent === null ? null : ntcManualPercent,
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId))
      .returning();

    if (!updatedProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ 
      success: true, 
      message: "Manual percentages updated successfully",
      project: updatedProject
    });

  } catch (error) {
    console.error("Error updating project manual percentages:", error);
    res.status(500).json({ error: "Failed to update project manual percentages" });
  }
});

router.post('/auto-complete-delivered-benchmarks', async (req: Request, res: Response) => {
  try {
    console.log('🔍 SERVER DEBUG: Auto-completing benchmarks for delivered projects...');
    
    // Get all projects with "delivered" status (lowercase)
    const deliveredProjects = await db.select().from(projects).where(eq(projects.status, 'delivered'));
    console.log('🔍 SERVER DEBUG: Found delivered projects:', deliveredProjects.length);
    
    if (deliveredProjects.length === 0) {
      return res.json({ success: true, message: 'No delivered projects found', updated: 0 });
    }
    
    const deliveredProjectIds = deliveredProjects.map(p => p.id);
    
    // Update all benchmarks for delivered projects to 100% complete
    const updateResult = await db.update(engineeringBenchmarks)
      .set({ 
        progressPercentage: 100,
        isCompleted: true,
        updatedAt: new Date()
      })
      .where(inArray(engineeringBenchmarks.projectId, deliveredProjectIds))
      .returning();
    
    console.log('🔍 SERVER DEBUG: Updated benchmarks:', updateResult.length);
    
    res.json({ 
      success: true, 
      message: `Auto-completed ${updateResult.length} benchmarks for ${deliveredProjects.length} delivered projects`,
      updated: updateResult.length
    });
  } catch (error) {
    console.error("Error auto-completing delivered benchmarks:", error);
    res.status(500).json({ error: "Failed to auto-complete delivered benchmarks" });
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

// Generate standard benchmarks for all projects
router.post('/generate-standard-benchmarks', async (req: Request, res: Response) => {
  try {
    console.log('🔍 SERVER DEBUG: Generating standard benchmarks for all projects...');
    
    // Get all projects with fabrication and production start dates
    const allProjects = await db.select({
      id: projects.id,
      name: projects.name,
      projectNumber: projects.projectNumber,
      fabricationStart: projects.fabricationStart,
      productionStart: projects.productionStart
    }).from(projects);
    
    console.log(`🔍 SERVER DEBUG: Found ${allProjects.length} projects to process`);
    
    // Clear existing benchmarks first
    await db.delete(engineeringBenchmarks);
    console.log('🔍 SERVER DEBUG: Cleared existing benchmarks');
    
    const benchmarksToCreate = [];
    
    for (const project of allProjects) {
      // Only create benchmarks for projects that have the required dates
      if (project.fabricationStart && project.productionStart) {
        // Calculate Section X CAD Complete date (30 days before fabrication start)
        const fabStartDate = new Date(project.fabricationStart);
        const sectionXDate = new Date(fabStartDate);
        sectionXDate.setDate(sectionXDate.getDate() - 30);
        
        // Calculate CAD Complete date (3 months before production start)
        const prodStartDate = new Date(project.productionStart);
        const cadCompleteDate = new Date(prodStartDate);
        cadCompleteDate.setMonth(cadCompleteDate.getMonth() - 3);
        
        // Create Section X CAD Complete benchmark
        benchmarksToCreate.push({
          projectId: project.id,
          discipline: 'ME',
          benchmarkName: 'Section X CAD Complete',
          description: `Section X CAD completion for ${project.name}`,
          targetDate: sectionXDate.toISOString().split('T')[0],
          isCompleted: false,
          commitmentLevel: 'high',
          notes: 'Auto-generated standard benchmark - 30 days before fabrication start'
        });
        
        // Create CAD Complete benchmark
        benchmarksToCreate.push({
          projectId: project.id,
          discipline: 'ME',
          benchmarkName: 'CAD COMPLETE',
          description: `CAD completion for ${project.name}`,
          targetDate: cadCompleteDate.toISOString().split('T')[0],
          isCompleted: false,
          commitmentLevel: 'critical',
          notes: 'Auto-generated standard benchmark - 3 months before production start'
        });
      }
    }
    
    console.log(`🔍 SERVER DEBUG: Creating ${benchmarksToCreate.length} benchmarks`);
    
    // Insert all benchmarks
    if (benchmarksToCreate.length > 0) {
      await db.insert(engineeringBenchmarks).values(benchmarksToCreate);
    }
    
    console.log('🔍 SERVER DEBUG: Successfully created standard benchmarks');
    
    res.json({ 
      success: true, 
      message: `Generated ${benchmarksToCreate.length} standard benchmarks for ${allProjects.length} projects`,
      benchmarksCreated: benchmarksToCreate.length
    });
    
  } catch (error) {
    console.error("Error generating standard benchmarks:", error);
    res.status(500).json({ error: "Failed to generate standard benchmarks" });
  }
});

// Benchmark Template routes
router.get('/benchmark-templates', async (req: Request, res: Response) => {
  try {
    const templates = await storage.getBenchmarkTemplates();
    res.json(templates);
  } catch (error) {
    console.error("Error fetching benchmark templates:", error);
    res.status(500).json({ error: "Failed to fetch benchmark templates" });
  }
});

router.post('/benchmark-templates', async (req: Request, res: Response) => {
  try {
    const validationResult = insertBenchmarkTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid template data", 
        details: validationResult.error.format() 
      });
    }

    const newTemplate = await storage.createBenchmarkTemplate(validationResult.data);
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Error creating benchmark template:", error);
    res.status(500).json({ error: "Failed to create benchmark template" });
  }
});

router.put('/benchmark-templates/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const validationResult = insertBenchmarkTemplateSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid template data", 
        details: validationResult.error.format() 
      });
    }

    const updatedTemplate = await storage.updateBenchmarkTemplate(id, validationResult.data);
    if (!updatedTemplate) {
      return res.status(404).json({ error: "Benchmark template not found" });
    }

    res.json(updatedTemplate);
  } catch (error) {
    console.error("Error updating benchmark template:", error);
    res.status(500).json({ error: "Failed to update benchmark template" });
  }
});

router.delete('/benchmark-templates/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const success = await storage.deleteBenchmarkTemplate(id);
    if (!success) {
      return res.status(404).json({ error: "Benchmark template not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting benchmark template:", error);
    res.status(500).json({ error: "Failed to delete benchmark template" });
  }
});

// Apply template to projects
router.post('/apply-benchmark-template', async (req: Request, res: Response) => {
  try {
    const { templateId, projectIds, applyToAll } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: "Template ID is required" });
    }
    
    // Get the template
    const template = await db.select().from(benchmarkTemplates).where(eq(benchmarkTemplates.id, templateId)).limit(1);
    if (template.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const benchmarkTemplate = template[0];
    
    // Get projects to apply to
    let targetProjects;
    if (applyToAll) {
      targetProjects = await db.select({
        id: projects.id,
        name: projects.name,
        fabricationStart: projects.fabricationStart,
        productionStart: projects.productionStart
      }).from(projects);
    } else {
      targetProjects = await db.select({
        id: projects.id,
        name: projects.name,
        fabricationStart: projects.fabricationStart,
        productionStart: projects.productionStart
      }).from(projects).where(inArray(projects.id, projectIds));
    }
    
    const benchmarksToCreate = [];
    
    for (const project of targetProjects) {
      // Calculate target date based on template
      let targetDate;
      if (benchmarkTemplate.referencePhase === 'fabrication_start' && project.fabricationStart) {
        const baseDate = new Date(project.fabricationStart);
        targetDate = new Date(baseDate);
        targetDate.setDate(targetDate.getDate() - benchmarkTemplate.daysBefore);
      } else if (benchmarkTemplate.referencePhase === 'production_start' && project.productionStart) {
        const baseDate = new Date(project.productionStart);
        targetDate = new Date(baseDate);
        targetDate.setDate(targetDate.getDate() - benchmarkTemplate.daysBefore);
      }
      
      if (targetDate) {
        benchmarksToCreate.push({
          projectId: project.id,
          discipline: benchmarkTemplate.discipline,
          benchmarkName: benchmarkTemplate.name,
          description: benchmarkTemplate.description.replace('{{project_name}}', project.name),
          targetDate: targetDate.toISOString().split('T')[0],
          isCompleted: false,
          commitmentLevel: benchmarkTemplate.commitmentLevel,
          notes: `Applied from template: ${benchmarkTemplate.name}`
        });
      }
    }
    
    if (benchmarksToCreate.length > 0) {
      await db.insert(engineeringBenchmarks).values(benchmarksToCreate);
    }
    
    res.json({ 
      success: true, 
      message: `Applied template to ${benchmarksToCreate.length} projects`,
      benchmarksCreated: benchmarksToCreate.length
    });
    
  } catch (error) {
    console.error("Error applying benchmark template:", error);
    res.status(500).json({ error: "Failed to apply benchmark template" });
  }
});

// GET engineering overview analytics
router.get('/engineering-overview', async (req: Request, res: Response) => {
  try {
    console.log('🔍 DEBUG: Engineering overview endpoint called');
    
    // Get all projects and their engineering data
    const projectsData = await storage.getProjects();
    console.log(`🔍 DEBUG: Retrieved ${projectsData.length} projects from storage`);
    
    // Get real Engineering users from the users table
    const engineeringUsers = await db.select().from(users).where(eq(users.department, 'engineering'));
    
    const tasks = await storage.getEngineeringTasks();
    
    // Get benchmarks directly
    const benchmarksData = await db.select().from(engineeringBenchmarks).orderBy(asc(engineeringBenchmarks.targetDate));
    
    // Get projects info for benchmarks - simplified query
    const projectsInfo = await db.select().from(projects);
    
    // Create a lookup map for projects
    const projectLookup = new Map(projectsInfo.map(p => [p.id, p]));
    
    // Transform benchmarks with project info
    const benchmarks = benchmarksData.map(benchmark => {
      const project = projectLookup.get(benchmark.projectId);
      return {
        ...benchmark,
        projectNumber: project?.projectNumber || '',
        projectName: project?.name || ''
      };
    });

    // Use the same discipline mapping and resources structure as the engineering-resources endpoint
    const disciplineMap: { [key: string]: string } = {
      '029521e7-8aae-4c5a-923b-423c12d7b928': 'ME', // Jordan Boyenga
      '38468008': 'ME', // Colter P Mahlum
      '93cb4a30-e9b4-409e-9196-7f5464484922': 'EE', // Jon Kuntz
      '0bf8f4c2-a7e3-4217-8469-2a9fec5d9b76': 'EE', // Roger Fingar
      'ece3b30f-d2df-450d-88dc-fe8bc388906d': 'ITE', // Mark Musick
      '457a12dd-6cf5-40ce-8fcb-69be01898efb': 'ITE', // Andrew Burgess
      '76840151-bb8e-4915-9686-a43dd395091c': 'NTC', // Calvin Campbell
      '9ccddf13-92a7-4484-a68b-986baf96b903': 'NTC', // Dustin Hulse
      'ef136e5c-f059-469d-b858-c90b11de43d6': 'ME', // William Janoch
      '0bbf4a86-6080-419a-9448-e2b414353b2c': 'EE', // Trevor Jobst
      '1b2eee23-9c1d-4400-a5c5-1c3d0a7a8254': 'ME', // Ethan Sauer
      'ecd2b7a9-2f0b-4ecc-9652-e5fd9e11477a': 'EE', // Finn Simonson
      '914890a7-9cd8-46e5-83d4-530011311f8c': 'ITE', // Sean Mcgee
      'af41a446-9f1a-4b3c-a685-5151ea757d65': 'ME', // Will Busching
      'bc1837b7-016d-46d8-a556-b709d30ec853': 'NTC', // Scott Barker
      '4408dabc-c27a-475c-870d-565e5a251722': 'EE', // Austin Guth
      '9c7048d1-b9f9-4cb2-8f13-7e4edc88e8b1': 'ME' // Michael Klassen
    };
    
    // Get engineering resource customizations for the overview
    const engineeringResourceCustomizations = await db.select().from(engineeringResources);
    
    // Create resource objects that match the engineering resources format
    const resources = engineeringUsers.map(user => {
      const customization = engineeringResourceCustomizations.find(resource => resource.userId === user.id);
      
      return {
        id: user.id,
        firstName: user.firstName || 'Unknown',
        lastName: user.lastName || 'User',
        discipline: customization?.discipline || disciplineMap[user.id] || 'ME',
        title: customization?.title || 'Engineering Specialist',
        workloadStatus: customization?.workloadStatus || 'available',
        currentCapacityPercent: customization?.currentCapacityPercent || 0,
        hourlyRate: customization?.hourlyRate || 100,
        skillLevel: customization?.skillLevel || 'intermediate',
        isActive: user.status === 'active',
        createdAt: customization?.createdAt || user.createdAt || new Date(),
        updatedAt: customization?.updatedAt || user.updatedAt || new Date()
      };
    });
    
    // Calculate workload statistics based on real engineering users
    const workloadStats = {
      totalEngineers: resources.length,
      availableEngineers: resources.filter(r => r.workloadStatus === 'available').length,
      atCapacityEngineers: resources.filter(r => r.workloadStatus === 'at_capacity').length,
      overloadedEngineers: resources.filter(r => r.workloadStatus === 'overloaded').length,
      unavailableEngineers: resources.filter(r => r.workloadStatus === 'unavailable').length,
    };

    // Calculate discipline distribution based on real engineering users
    const disciplineStats = {
      'ME': resources.filter(r => r.discipline === 'ME').length,
      'EE': resources.filter(r => r.discipline === 'EE').length,
      'ITE': resources.filter(r => r.discipline === 'ITE').length,
      'NTC': resources.filter(r => r.discipline === 'NTC').length
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
    console.log(`🔍 DEBUG: Processing ${projectsData.length} projects for engineering data`);
    console.log(`🔍 DEBUG: Total benchmarks available: ${benchmarks.length}`);
    
    const projectsWithEngineering = projectsData.map(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const projectBenchmarks = benchmarks.filter(b => b.projectId === project.id);
      
      // Calculate discipline-specific completion percentages
      const meBenchmarks = projectBenchmarks.filter(b => b.discipline === 'ME');
      const eeBenchmarks = projectBenchmarks.filter(b => b.discipline === 'EE');
      const iteBenchmarks = projectBenchmarks.filter(b => b.discipline === 'ITE');
      const ntcBenchmarks = projectBenchmarks.filter(b => b.discipline === 'NTC');
      
      // Debug specific projects
      if (project.projectNumber && ['805349', '805347', '805348', '803944'].includes(project.projectNumber)) {
        console.log(`🔍 DEBUG: Project ${project.projectNumber} has ${meBenchmarks.length} ME benchmarks, ${eeBenchmarks.length} EE benchmarks`);
      }
      
      // Use manual percentage if set, otherwise calculate from benchmarks
      const calculatedMePercent = meBenchmarks.length > 0 
        ? Math.round((meBenchmarks.reduce((sum, b) => sum + (b.progressPercentage || 0), 0) / meBenchmarks.length)) 
        : 0;
      const meCompletionPercent = project.meManualPercent ?? calculatedMePercent;
      
      const calculatedEePercent = eeBenchmarks.length > 0 
        ? Math.round((eeBenchmarks.reduce((sum, b) => sum + (b.progressPercentage || 0), 0) / eeBenchmarks.length)) 
        : 0;
      const eeCompletionPercent = project.eeManualPercent ?? calculatedEePercent;
      
      const calculatedItePercent = iteBenchmarks.length > 0 
        ? Math.round((iteBenchmarks.reduce((sum, b) => sum + (b.progressPercentage || 0), 0) / iteBenchmarks.length)) 
        : 0;
      const iteCompletionPercent = project.iteManualPercent ?? calculatedItePercent;
      
      const calculatedNtcPercent = ntcBenchmarks.length > 0 
        ? Math.round((ntcBenchmarks.reduce((sum, b) => sum + (b.progressPercentage || 0), 0) / ntcBenchmarks.length)) 
        : 0;
      const ntcCompletionPercent = project.ntcManualPercent ?? calculatedNtcPercent;
      
      return {
        ...project,
        engineeringTasks: projectTasks.length,
        completedTasks: projectTasks.filter(t => t.status === 'completed').length,
        engineeringBenchmarks: projectBenchmarks.length,
        completedBenchmarks: projectBenchmarks.filter(b => b.isCompleted).length,
        meAssigned: project.meAssigned,
        eeAssigned: project.eeAssigned,
        iteAssigned: project.iteAssigned,
        meDesignOrdersPercent: meCompletionPercent,
        eeDesignOrdersPercent: eeCompletionPercent,
        itDesignOrdersPercent: iteCompletionPercent,
        itPercentage: project.itPercentage,
        ntcPercentage: project.ntcPercentage,
        // Add discipline-specific benchmark counts
        meBenchmarks: meBenchmarks.length,
        eeBenchmarks: eeBenchmarks.length,
        iteBenchmarks: iteBenchmarks.length,
        ntcBenchmarks: ntcBenchmarks.length,
        // Add discipline-specific completion percentages
        meCompletionPercent,
        eeCompletionPercent,
        iteCompletionPercent,
        ntcCompletionPercent,
      };
    });

    console.log(`🔍 DEBUG: Final response will have ${projectsWithEngineering.length} projects`);
    console.log(`🔍 DEBUG: Sample project with benchmarks:`, 
      projectsWithEngineering.find(p => p.meBenchmarks > 0) ? 
      {
        projectNumber: projectsWithEngineering.find(p => p.meBenchmarks > 0)?.projectNumber,
        meBenchmarks: projectsWithEngineering.find(p => p.meBenchmarks > 0)?.meBenchmarks,
        meCompletionPercent: projectsWithEngineering.find(p => p.meBenchmarks > 0)?.meCompletionPercent
      } : 'No projects with ME benchmarks found'
    );

    res.json({
      workloadStats,
      disciplineStats,
      taskStats,
      benchmarkStats,
      projects: projectsWithEngineering,
      resources: resources, // Use engineering resources data that matches workload stats calculations
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
    console.log('🔍 SERVER DEBUG: Retrieved project assignments:', assignments.length, 'assignments');
    console.log('🔍 SERVER DEBUG: Sample assignments:', assignments.slice(0, 3));
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
    const resourceId = req.params.resourceId;
    if (!resourceId) {
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
    console.log('🔍 SERVER DEBUG: Creating project assignment with data:', req.body);
    console.log('🔍 SERVER DEBUG: Request body keys:', Object.keys(req.body));
    console.log('🔍 SERVER DEBUG: Request body types:', Object.entries(req.body).map(([k, v]) => [k, typeof v]));
    
    const validationResult = insertProjectEngineeringAssignmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('🔍 SERVER DEBUG: Validation failed:', validationResult.error.format());
      return res.status(400).json({ 
        error: "Invalid assignment data", 
        details: validationResult.error.format() 
      });
    }

    console.log('🔍 SERVER DEBUG: Validated data:', validationResult.data);
    console.log('🔍 SERVER DEBUG: Validated data keys:', Object.keys(validationResult.data));
    console.log('🔍 SERVER DEBUG: Validated data types:', Object.entries(validationResult.data).map(([k, v]) => [k, typeof v]));
    
    // Check for existing assignment before creating
    console.log('🔍 SERVER DEBUG: Checking for existing assignments...');
    const existingAssignments = await storage.getProjectEngineeringAssignmentsByResourceId(validationResult.data.resourceId);
    console.log('🔍 SERVER DEBUG: Existing assignments for resource:', existingAssignments);
    
    const conflictingAssignment = existingAssignments.find(a => 
      a.projectId === validationResult.data.projectId && 
      a.discipline === validationResult.data.discipline
    );
    if (conflictingAssignment) {
      console.log('🔍 SERVER DEBUG: Conflicting assignment found:', conflictingAssignment);
      return res.status(409).json({ error: "Assignment already exists for this project and discipline" });
    }
    
    // Additional logging for the storage call
    console.log('🔍 SERVER DEBUG: Calling storage.createProjectEngineeringAssignment...');
    const newAssignment = await storage.createProjectEngineeringAssignment(validationResult.data);
    console.log('🔍 SERVER DEBUG: Storage returned:', newAssignment);
    console.log('🔍 SERVER DEBUG: Assignment ID:', newAssignment?.id);
    
    if (!newAssignment || !newAssignment.id) {
      console.error('🔍 SERVER DEBUG: Assignment creation failed - no assignment returned');
      return res.status(500).json({ error: "Failed to create assignment - no data returned" });
    }
    
    console.log('🔍 SERVER DEBUG: Successfully created assignment with ID:', newAssignment.id);
    res.status(201).json(newAssignment);
  } catch (error) {
    console.error("🔍 SERVER DEBUG: Error creating project engineering assignment:", error);
    console.error("🔍 SERVER DEBUG: Error message:", error instanceof Error ? error.message : 'Unknown error');
    console.error("🔍 SERVER DEBUG: Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    // Check if it's a unique constraint error
    if (error instanceof Error && error.message.includes('unique')) {
      console.error("🔍 SERVER DEBUG: Unique constraint violation detected");
      return res.status(409).json({ error: "Assignment already exists for this project and discipline" });
    }
    
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

// ==== BENCHMARK TEMPLATE ROUTES ====

// GET all benchmark templates
router.get('/benchmark-templates', async (req: Request, res: Response) => {
  try {
    const templates = await storage.getBenchmarkTemplates();
    res.json(templates);
  } catch (error) {
    console.error("Error fetching benchmark templates:", error);
    res.status(500).json({ error: "Failed to fetch benchmark templates" });
  }
});

// GET benchmark templates by discipline
router.get('/benchmark-templates/discipline/:discipline', async (req: Request, res: Response) => {
  try {
    const discipline = req.params.discipline;
    const templates = await storage.getBenchmarkTemplatesByDiscipline(discipline);
    res.json(templates);
  } catch (error) {
    console.error("Error fetching benchmark templates by discipline:", error);
    res.status(500).json({ error: "Failed to fetch benchmark templates by discipline" });
  }
});

// CREATE a new benchmark template
router.post('/benchmark-templates', async (req: Request, res: Response) => {
  try {
    const validationResult = insertBenchmarkTemplateSchema.safeParse({
      ...req.body,
      createdBy: req.user?.id
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid template data", 
        details: validationResult.error.format() 
      });
    }

    const newTemplate = await storage.createBenchmarkTemplate(validationResult.data);
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Error creating benchmark template:", error);
    res.status(500).json({ error: "Failed to create benchmark template" });
  }
});

// UPDATE a benchmark template
router.put('/benchmark-templates/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const validationResult = insertBenchmarkTemplateSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid template data", 
        details: validationResult.error.format() 
      });
    }

    const updatedTemplate = await storage.updateBenchmarkTemplate(id, validationResult.data);
    if (!updatedTemplate) {
      return res.status(404).json({ error: "Benchmark template not found" });
    }

    res.json(updatedTemplate);
  } catch (error) {
    console.error("Error updating benchmark template:", error);
    res.status(500).json({ error: "Failed to update benchmark template" });
  }
});

// DELETE a benchmark template (soft delete)
router.delete('/benchmark-templates/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const success = await storage.deleteBenchmarkTemplate(id);
    if (!success) {
      return res.status(404).json({ error: "Benchmark template not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting benchmark template:", error);
    res.status(500).json({ error: "Failed to delete benchmark template" });
  }
});

// APPLY benchmark templates to a project
router.post('/benchmark-templates/apply', async (req: Request, res: Response) => {
  try {
    const { projectId, templateIds } = req.body;
    
    if (!projectId || !Array.isArray(templateIds) || templateIds.length === 0) {
      return res.status(400).json({ error: "Project ID and template IDs are required" });
    }

    const createdBenchmarks = await storage.applyBenchmarkTemplatesToProject(projectId, templateIds);
    res.json({ 
      success: true, 
      createdBenchmarks,
      count: createdBenchmarks.length 
    });
  } catch (error) {
    console.error("Error applying benchmark templates:", error);
    res.status(500).json({ error: "Failed to apply benchmark templates" });
  }
});

export default router;