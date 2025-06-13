import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, gt, lte, inArray, sql } from 'drizzle-orm';
import { storage } from '../storage';
import { z } from 'zod';
import { 
  insertSupplyChainBenchmarkSchema, 
  insertProjectSupplyChainBenchmarkSchema,
  supplyChainBenchmarks,
  projectSupplyChainBenchmarks,
  projects
} from '../../shared/schema';
import { db } from '../db';

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

// PATCH /api/project-supply-chain-benchmarks/:id
router.patch('/project-supply-chain-benchmarks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log("Update benchmark request:", updateData);

    // Convert string dates to Date objects for Drizzle
    const processedData = { ...updateData };
    if (processedData.completedDate) {
      if (typeof processedData.completedDate === 'string') {
        processedData.completedDate = new Date(processedData.completedDate);
      }
    }
    if (processedData.targetDate) {
      if (typeof processedData.targetDate === 'string') {
        processedData.targetDate = new Date(processedData.targetDate);
      }
    }

    console.log("Processed data for DB:", processedData);

    const updatedBenchmark = await db
      .update(projectSupplyChainBenchmarks)
      .set(processedData)
      .where(eq(projectSupplyChainBenchmarks.id, parseInt(id)))
      .returning();

    console.log("Updated benchmark:", updatedBenchmark);

    if (!updatedBenchmark || updatedBenchmark.length === 0) {
      return res.status(404).json({ error: "Benchmark not found" });
    }

    res.json({
      success: true,
      benchmark: updatedBenchmark[0]
    });
  } catch (error) {
    console.error("Error updating project supply chain benchmark:", error);
    res.status(500).json({ error: "Failed to update benchmark completion status" });
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

    // Directly update the benchmark using known columns
    if (isCompleted) {
      // Mark as completed
      await db.update(projectSupplyChainBenchmarks)
        .set({
          isCompleted: true,
          completedDate: new Date(),
          completedBy: completedBy || null,
          updatedAt: new Date()
        })
        .where(eq(projectSupplyChainBenchmarks.id, id));
    } else {
      // Mark as incomplete
      await db.update(projectSupplyChainBenchmarks)
        .set({
          isCompleted: false,
          completedDate: null,
          completedBy: null,
          updatedAt: new Date()
        })
        .where(eq(projectSupplyChainBenchmarks.id, id));
    }

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

// Generate PDF report of all projects with their benchmarks
router.get('/benchmarks/pdf-report', async (req: Request, res: Response) => {
  try {
    // Get all active projects
    const projects = await storage.getActiveProjects();

    // Get all project benchmarks
    const allProjectBenchmarks = await storage.getProjectSupplyChainBenchmarks();

    // Create a map of project benchmarks by project ID
    const benchmarksByProject = new Map<number, any[]>();
    allProjectBenchmarks.forEach(benchmark => {
      if (!benchmarksByProject.has(benchmark.projectId)) {
        benchmarksByProject.set(benchmark.projectId, []);
      }
      benchmarksByProject.get(benchmark.projectId)!.push(benchmark);
    });

    // Generate HTML content for the PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Benchmarks Report</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                color: #333; 
                line-height: 1.4;
            }
            .header { 
                text-align: center; 
                border-bottom: 2px solid #333; 
                padding-bottom: 10px; 
                margin-bottom: 30px; 
            }
            .project { 
                margin-bottom: 40px; 
                page-break-inside: avoid; 
            }
            .project-header { 
                background-color: #f5f5f5; 
                padding: 10px; 
                border: 1px solid #ddd; 
                margin-bottom: 10px; 
            }
            .project-title { 
                font-size: 16px; 
                font-weight: bold; 
                margin: 0; 
            }
            .project-number { 
                color: #666; 
                margin: 0; 
            }
            .benchmarks-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 10px; 
            }
            .benchmarks-table th, .benchmarks-table td { 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: left; 
                font-size: 12px; 
            }
            .benchmarks-table th { 
                background-color: #f9f9f9; 
                font-weight: bold; 
            }
            .status-completed { 
                color: #22c55e; 
                font-weight: bold; 
            }
            .status-pending { 
                color: #f59e0b; 
            }
            .status-overdue { 
                color: #ef4444; 
                font-weight: bold; 
            }
            .no-benchmarks { 
                color: #666; 
                font-style: italic; 
                text-align: center; 
                padding: 20px; 
            }
            .summary { 
                background-color: #f0f9ff; 
                padding: 15px; 
                border: 1px solid #bae6fd; 
                margin-bottom: 30px; 
            }
            .page-break { 
                page-break-before: always; 
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Benchmarks Report</h1>
            <p>Generated on ${new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
        </div>

        <div class="summary">
            <h2>Summary</h2>
            <p><strong>Total Active Projects:</strong> ${projects.length}</p>
            <p><strong>Total Benchmarks:</strong> ${allProjectBenchmarks.length}</p>
            <p><strong>Completed Benchmarks:</strong> ${allProjectBenchmarks.filter(b => b.isCompleted).length}</p>
            <p><strong>Pending Benchmarks:</strong> ${allProjectBenchmarks.filter(b => !b.isCompleted).length}</p>
        </div>

        ${projects.map((project, index) => {
          const projectBenchmarks = benchmarksByProject.get(project.id) || [];
          const completedCount = projectBenchmarks.filter(b => b.isCompleted).length;

          return `
            <div class="project ${index > 0 && index % 3 === 0 ? 'page-break' : ''}">
                <div class="project-header">
                    <h3 class="project-title">${project.name}</h3>
                    <p class="project-number">Project Number: ${project.projectNumber}</p>
                    <p class="project-number">Status: ${project.status} | Benchmarks: ${completedCount}/${projectBenchmarks.length} completed</p>
                </div>

                ${projectBenchmarks.length > 0 ? `
                    <table class="benchmarks-table">
                        <thead>
                            <tr>
                                <th>Benchmark Name</th>
                                <th>Target Phase</th>
                                <th>Timeline</th>
                                <th>Target Date</th>
                                <th>Status</th>
                                <th>Completed Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${projectBenchmarks.map(benchmark => {
                              const targetDate = benchmark.targetDate 
                                ? new Date(benchmark.targetDate).toLocaleDateString()
                                : 'Not set';
                              const completedDate = benchmark.completedDate 
                                ? new Date(benchmark.completedDate).toLocaleDateString()
                                : '';

                              let statusClass = 'status-pending';
                              let statusText = 'Pending';

                              if (benchmark.isCompleted) {
                                statusClass = 'status-completed';
                                statusText = 'Completed';
                              } else if (benchmark.targetDate && new Date(benchmark.targetDate) < new Date()) {
                                statusClass = 'status-overdue';
                                statusText = 'Overdue';
                              }

                              return `
                                <tr>
                                    <td>${benchmark.name}</td>
                                    <td>${benchmark.targetPhase}</td>
                                    <td>${benchmark.weeksBeforePhase} weeks before</td>
                                    <td>${targetDate}</td>
                                    <td class="${statusClass}">${statusText}</td>
                                    <td>${completedDate}</td>
                                </tr>
                              `;
                            }).join('')}
                        </tbody>
                    </table>
                ` : `
                    <div class="no-benchmarks">
                        No benchmarks defined for this project
                    </div>
                `}
            </div>
          `;
        }).join('')}
    </body>
    </html>
    `;

    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="benchmarks-report-${new Date().toISOString().split('T')[0]}.pdf"`);

    // For now, we'll send the HTML content. In a production environment, 
    // you would use a library like puppeteer or similar to convert HTML to PDF
    // Since we're in a simple environment, we'll return HTML that can be printed as PDF
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);

  } catch (error) {
    console.error("Error generating PDF report:", error);
    res.status(500).json({ error: "Failed to generate PDF report" });
  }
});

export default router;