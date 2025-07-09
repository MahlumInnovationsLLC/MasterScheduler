import type { Express, Request, Response } from "express";
import { db } from "../db";
import { projects, manufacturingSchedules, manufacturingBays, billingMilestones, tasks } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function setupAIInsightsRoutes(app: Express, simpleAuth: any) {
  // Get project-specific AI insights
  app.get("/api/ai/project-insights/:projectId", simpleAuth, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      
      // Get project data with separate queries to avoid relation issues
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, parseInt(projectId))
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Get related data separately to avoid relation issues
      const [projectSchedules, projectMilestones, projectTasks] = await Promise.all([
        db.select().from(manufacturingSchedules).where(eq(manufacturingSchedules.projectId, parseInt(projectId))),
        db.select().from(billingMilestones).where(eq(billingMilestones.projectId, parseInt(projectId))),
        db.select().from(tasks).where(eq(tasks.projectId, parseInt(projectId)))
      ]);

      // Combine the data
      const projectWithRelations = {
        ...project,
        manufacturingSchedules: projectSchedules,
        billingMilestones: projectMilestones,
        tasks: projectTasks
      };

      // Generate AI insights for this specific project
      const insights = await generateProjectInsights(projectWithRelations);
      
      res.json(insights);
    } catch (error) {
      console.error("Error generating project insights:", error);
      res.status(500).json({ error: "Failed to generate AI insights" });
    }
  });
}

async function generateProjectInsights(project: any) {
  try {
    // Format dates properly for AI analysis
    const formatDate = (date: any) => {
      if (!date) return 'Not set';
      if (date instanceof Date) return date.toISOString().split('T')[0];
      if (typeof date === 'string') return date.split('T')[0];
      return 'Not set';
    };

    // Prepare project data for AI analysis with properly formatted dates
    const projectData = {
      id: project.id,
      name: project.name,
      projectNumber: project.projectNumber,
      status: project.status,
      priority: project.priority || 'Not set',
      fabricationStart: formatDate(project.fabricationStart),
      paintStart: formatDate(project.paintStart),
      productionStart: formatDate(project.productionStart),
      itStart: formatDate(project.itStart),
      wrapDate: formatDate(project.wrapDate),
      ntcTesting: formatDate(project.ntcTesting),
      qcStart: formatDate(project.qcStart),
      executiveReview: formatDate(project.executiveReview),
      shipDate: formatDate(project.shipDate),
      deliveryDate: formatDate(project.deliveryDate),
      totalHours: project.totalHours || 0,
      fabPercentage: project.fabPercentage || 0,
      paintPercentage: project.paintPercentage || 0,
      productionPercentage: project.productionPercentage || 0,
      itPercentage: project.itPercentage || 0,
      ntcPercentage: project.ntcPercentage || 0,
      qcPercentage: project.qcPercentage || 0,
      manufacturingSchedules: project.manufacturingSchedules || [],
      billingMilestones: project.billingMilestones || [],
      tasks: project.tasks || []
    };

    const currentDate = new Date().toISOString().split('T')[0];
    
    const prompt = `
    Analyze the following manufacturing project data and provide specific insights and recommendations:

    Current Date: ${currentDate}
    Project: ${projectData.name} (${projectData.projectNumber})
    Status: ${projectData.status}
    Priority: ${projectData.priority}
    Total Hours: ${projectData.totalHours}

    Project Timeline (use these exact dates for analysis):
    - Fabrication Start: ${projectData.fabricationStart}
    - PAINT Start: ${projectData.paintStart}
    - Production Start: ${projectData.productionStart}
    - IT Start: ${projectData.itStart}
    - Wrap Date: ${projectData.wrapDate}
    - NTC Testing: ${projectData.ntcTesting}
    - QC Start: ${projectData.qcStart}
    - Executive Review: ${projectData.executiveReview}
    - Ship Date: ${projectData.shipDate}
    - Delivery Date: ${projectData.deliveryDate}

    Phase Percentages:
    - Fabrication: ${projectData.fabPercentage}%
    - PAINT: ${projectData.paintPercentage}%
    - Production: ${projectData.productionPercentage}%
    - IT: ${projectData.itPercentage}%
    - NTC: ${projectData.ntcPercentage}%
    - QC: ${projectData.qcPercentage}%

    Manufacturing Schedules: ${JSON.stringify(projectData.manufacturingSchedules, null, 2)}
    Billing Milestones: ${JSON.stringify(projectData.billingMilestones, null, 2)}
    Tasks: ${JSON.stringify(projectData.tasks, null, 2)}

    IMPORTANT: Use only the timeline dates provided above. Analyze these dates relative to the current date (${currentDate}) to determine:
    - Which phases are overdue, current, or upcoming
    - Timeline gaps or overlaps between phases
    - Critical path issues
    - Resource allocation concerns

    Provide insights in these categories:
    1. Overview - General project health and key insights
    2. Schedule - Timeline analysis and recommendations (use exact dates provided)
    3. Timeline - Critical path analysis and potential delays
    4. Risks - Potential issues and mitigation strategies

    Format your response as JSON with the following structure:
    {
      "overview": {
        "type": "overview",
        "title": "Project Overview",
        "description": "General project health and key insights",
        "items": [
          {
            "severity": "success|warning|danger",
            "text": "Brief insight text",
            "detail": "Detailed explanation"
          }
        ],
        "confidence": 0.85,
        "benefit": "Key benefit statement"
      },
      "manufacturing": {
        "type": "manufacturing",
        "title": "Schedule Analysis",
        "description": "Timeline analysis and recommendations",
        "items": [...],
        "confidence": 0.92,
        "benefit": "Timeline optimization benefit"
      },
      "timeline": {
        "type": "timeline",
        "title": "Timeline Optimization",
        "description": "Critical path analysis and potential delays",
        "items": [...],
        "confidence": 0.78,
        "benefit": "Timeline improvement benefit"
      },
      "production": {
        "type": "production",
        "title": "Risk Analysis",
        "description": "Potential issues and mitigation strategies",
        "items": [...],
        "confidence": 0.88,
        "benefit": "Risk mitigation benefit"
      }
    }

    Focus on actionable insights specific to this project using the exact timeline dates provided.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a manufacturing project analysis expert. Provide specific, actionable insights for manufacturing projects based on the data provided. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const aiResponse = JSON.parse(response.choices[0].message.content || "{}");
    
    // Convert the response to the expected format
    const insights = Object.values(aiResponse).filter(insight => 
      insight && typeof insight === 'object' && insight.type
    );

    return insights;

  } catch (error) {
    console.error("Error calling OpenAI:", error);
    
    // Return fallback insights if OpenAI fails
    return [
      {
        type: 'overview',
        title: 'Project Overview',
        description: 'General project analysis (AI service unavailable)',
        items: [
          {
            severity: 'warning',
            text: 'AI insights are temporarily unavailable',
            detail: 'Please check your OpenAI API configuration or try again later.'
          }
        ],
        confidence: 0.0,
        benefit: 'AI insights will be available once service is restored'
      }
    ];
  }
}