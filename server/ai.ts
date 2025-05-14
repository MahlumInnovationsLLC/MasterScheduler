import OpenAI from 'openai';
import { Project, Task, BillingMilestone, ManufacturingSchedule } from '@shared/schema';

// Initialize the OpenAI client if API key is available
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Function to check if OpenAI is available
function isOpenAIAvailable() {
  return !!openai;
}

// This interface defines the structure for project health analysis results
export interface ProjectHealthAnalysis {
  overallHealth: {
    score: number; // 0-100
    status: 'critical' | 'at-risk' | 'caution' | 'healthy' | 'excellent';
    summary: string;
  };
  timeline: {
    status: 'delayed' | 'on-track' | 'ahead';
    score: number; // 0-100
    analysis: string;
    recommendations: string[];
  };
  budget: {
    status: 'over-budget' | 'on-budget' | 'under-budget';
    score: number; // 0-100
    analysis: string;
    recommendations: string[];
  };
  resources: {
    status: 'insufficient' | 'adequate' | 'optimal';
    score: number; // 0-100
    analysis: string;
    recommendations: string[];
  };
  quality: {
    score: number; // 0-100
    analysis: string;
    recommendations: string[];
  };
  risks: {
    severity: 'low' | 'medium' | 'high';
    items: string[];
    mitigation: string[];
  };
  confidenceScore: number; // AI's confidence in its analysis, 0-1
}

export interface AIInsight {
  type: 'timeline' | 'billing' | 'production';
  title: string;
  description: string;
  items: {
    severity: 'danger' | 'warning' | 'success';
    text: string;
    detail?: string;
  }[];
  confidence?: number;
  benefit?: string;
}

/**
 * Analyzes a project's health using OpenAI
 */
export async function analyzeProjectHealth(
  project: Project,
  tasks: Task[] = [],
  billingMilestones: BillingMilestone[] = [],
  manufacturingSchedules: ManufacturingSchedule[] = []
): Promise<ProjectHealthAnalysis> {
  try {
    // Format the data for the AI to analyze
    const projectData = {
      project: {
        id: project.id,
        name: project.name,
        projectNumber: project.projectNumber,
        startDate: project.startDate,
        estimatedCompletionDate: project.estimatedCompletionDate,
        status: project.status,
        percentComplete: project.percentComplete || 0,
        client: project.client || "Unknown",
        priority: project.priority || "medium",
        budget: project.budget || 0,
        description: project.description,
        notes: project.notes
      },
      tasks: tasks.map(task => ({
        name: task.name,
        status: task.isCompleted ? "completed" : "in-progress",
        startDate: task.startDate,
        dueDate: task.dueDate, 
        completedDate: task.completedDate,
        percentComplete: task.isCompleted ? 100 : 0
      })),
      billingMilestones: billingMilestones.map(milestone => ({
        name: milestone.name,
        amount: milestone.amount,
        targetDate: milestone.targetInvoiceDate,
        status: milestone.status,
        invoiceDate: milestone.actualInvoiceDate,
        paymentReceivedDate: milestone.paymentReceivedDate
      })),
      manufacturingSchedules: manufacturingSchedules.map(schedule => ({
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        status: schedule.status
      }))
    };

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert project management AI that specializes in analyzing project health. 
          You will be given project data including tasks, billing milestones, and manufacturing schedules. 
          Your job is to analyze this data and provide a comprehensive health assessment with scores, insights, and recommendations.
          
          When analyzing the project, consider:
          - Timeline: Is the project on schedule? Are milestones being hit?
          - Budget: Is the project tracking to its budget? Are there unexpected costs?
          - Resources: Are resources allocated efficiently?
          - Quality: Are there indicators of quality issues?
          - Risks: What are the biggest risks to project success?
          
          Your analysis should be data-driven, specific, and actionable.
          Respond with your analysis in JSON format with the structure exactly matching the ProjectHealthAnalysis interface.
          
          Provide a numerical score (0-100) for overall health and each category.
          Overall status should be one of: 'critical' (0-20), 'at-risk' (21-40), 'caution' (41-60), 'healthy' (61-80), 'excellent' (81-100).
          The confidenceScore should reflect your certainty in the assessment (0-1).
          Provide specific, actionable recommendations.`
        },
        {
          role: "user",
          content: `Please analyze this project data and provide a comprehensive health assessment:\n${JSON.stringify(projectData, null, 2)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const analysisText = completion.choices[0].message.content;
    if (!analysisText) {
      throw new Error('Empty response from OpenAI');
    }
    
    return JSON.parse(analysisText) as ProjectHealthAnalysis;
  } catch (error) {
    console.error('Error analyzing project health:', error);
    // Return a fallback analysis that indicates the failure
    return {
      overallHealth: {
        score: 50,
        status: 'caution',
        summary: 'Unable to complete AI analysis. Using default assessment.'
      },
      timeline: {
        status: 'on-track',
        score: 50,
        analysis: 'Timeline analysis unavailable.',
        recommendations: ['Review project timeline manually.']
      },
      budget: {
        status: 'on-budget',
        score: 50,
        analysis: 'Budget analysis unavailable.',
        recommendations: ['Review budget status manually.']
      },
      resources: {
        status: 'adequate',
        score: 50,
        analysis: 'Resource analysis unavailable.',
        recommendations: ['Review resource allocation manually.']
      },
      quality: {
        score: 50,
        analysis: 'Quality analysis unavailable.',
        recommendations: ['Review quality metrics manually.']
      },
      risks: {
        severity: 'medium',
        items: ['AI risk assessment unavailable.'],
        mitigation: ['Conduct manual risk assessment.']
      },
      confidenceScore: 0.1
    };
  }
}

/**
 * Generates insights for manufacturing schedule optimization
 */
export async function generateManufacturingInsights(
  projects: Project[],
  manufacturingSchedules: ManufacturingSchedule[]
): Promise<AIInsight> {
  try {
    const data = {
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        projectNumber: project.projectNumber,
        status: project.status,
        priority: project.priority || "medium",
        percentComplete: project.percentComplete || 0,
      })),
      schedules: manufacturingSchedules.map(schedule => ({
        projectId: schedule.projectId,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        status: schedule.status,
        bayId: schedule.bayId,
      }))
    };

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert manufacturing operations AI that specializes in optimizing production schedules.
          You will analyze manufacturing schedules and project data to identify potential bottlenecks, resource conflicts, and opportunities for optimization.
          Your insights should be specific, actionable, and focused on improving manufacturing efficiency.
          
          Respond with your analysis in JSON format with the structure matching the AIInsight interface.
          The 'items' array should contain 3-5 specific insights, each with a severity level ('danger', 'warning', 'success').
          The confidence score should reflect your certainty in the assessment (0-1).`
        },
        {
          role: "user",
          content: `Please analyze this manufacturing data and provide optimization insights:\n${JSON.stringify(data, null, 2)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const analysisText = completion.choices[0].message.content;
    if (!analysisText) {
      throw new Error('Empty response from OpenAI');
    }
    
    return JSON.parse(analysisText) as AIInsight;
  } catch (error) {
    console.error('Error generating manufacturing insights:', error);
    // Return fallback insights
    return {
      type: 'production',
      title: 'Manufacturing Schedule Analysis',
      description: 'Unable to generate AI insights. Here are some standard recommendations:',
      items: [
        {
          severity: 'warning',
          text: 'Check for scheduling conflicts manually',
          detail: 'Review your manufacturing bay schedule for potential overlaps or conflicts.'
        },
        {
          severity: 'warning',
          text: 'Prioritize high-value projects',
          detail: 'Consider adjusting your schedule to prioritize high-value or time-sensitive projects.'
        },
        {
          severity: 'warning',
          text: 'Balance resource allocation',
          detail: 'Ensure your manufacturing resources are distributed efficiently across projects.'
        }
      ],
      confidence: 0.1
    };
  }
}

/**
 * Generates insights for billing and financial aspects
 */
export async function generateBillingInsights(
  projects: Project[],
  billingMilestones: BillingMilestone[]
): Promise<AIInsight> {
  try {
    const data = {
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        projectNumber: project.projectNumber,
        status: project.status,
        budget: project.budget || 0,
        percentComplete: project.percentComplete || 0,
        estimatedCompletionDate: project.estimatedCompletionDate
      })),
      milestones: billingMilestones.map(milestone => ({
        projectId: milestone.projectId,
        name: milestone.name,
        amount: milestone.amount,
        status: milestone.status,
        targetDate: milestone.targetInvoiceDate,
        invoiceDate: milestone.actualInvoiceDate,
        paymentReceivedDate: milestone.paymentReceivedDate
      }))
    };

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert financial analyst AI that specializes in project billing optimization.
          You will analyze project financial data and billing milestones to identify potential revenue issues, cash flow concerns, and opportunities for financial optimization.
          Your insights should be specific, actionable, and focused on improving financial performance.
          
          Respond with your analysis in JSON format with the structure matching the AIInsight interface.
          The 'items' array should contain 3-5 specific insights, each with a severity level ('danger', 'warning', 'success').
          The confidence score should reflect your certainty in the assessment (0-1).`
        },
        {
          role: "user",
          content: `Please analyze this billing data and provide financial insights:\n${JSON.stringify(data, null, 2)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const analysisText = completion.choices[0].message.content;
    if (!analysisText) {
      throw new Error('Empty response from OpenAI');
    }
    
    return JSON.parse(analysisText) as AIInsight;
  } catch (error) {
    console.error('Error generating billing insights:', error);
    // Return fallback insights
    return {
      type: 'billing',
      title: 'Billing & Financial Analysis',
      description: 'Unable to generate AI insights. Here are some standard recommendations:',
      items: [
        {
          severity: 'warning',
          text: 'Review upcoming payment milestones',
          detail: 'Ensure all upcoming billing milestones are properly scheduled and tracked.'
        },
        {
          severity: 'warning',
          text: 'Check invoice status',
          detail: 'Verify that all completed milestones have been properly invoiced.'
        },
        {
          severity: 'warning',
          text: 'Monitor cash flow projections',
          detail: 'Review your expected cash flow based on milestone payment schedules.'
        }
      ],
      confidence: 0.1
    };
  }
}

/**
 * Generates timeline and scheduling insights
 */
export async function generateTimelineInsights(
  projects: Project[],
  tasks: Task[] = []
): Promise<AIInsight> {
  try {
    const data = {
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        projectNumber: project.projectNumber,
        startDate: project.startDate,
        estimatedCompletionDate: project.estimatedCompletionDate,
        status: project.status,
        percentComplete: project.percentComplete,
        priority: project.priority
      })),
      tasks: tasks.map(task => ({
        projectId: task.projectId,
        name: task.name,
        status: task.status,
        startDate: task.startDate,
        dueDate: task.dueDate,
        completedDate: task.completedDate,
        percentComplete: task.percentComplete
      }))
    };

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert project management AI that specializes in timeline optimization.
          You will analyze project schedules and task data to identify potential delays, timeline risks, and opportunities for schedule optimization.
          Your insights should be specific, actionable, and focused on improving project delivery timelines.
          
          Respond with your analysis in JSON format with the structure matching the AIInsight interface.
          The 'items' array should contain 3-5 specific insights, each with a severity level ('danger', 'warning', 'success').
          The confidence score should reflect your certainty in the assessment (0-1).`
        },
        {
          role: "user",
          content: `Please analyze this project timeline data and provide scheduling insights:\n${JSON.stringify(data, null, 2)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const analysisText = completion.choices[0].message.content;
    if (!analysisText) {
      throw new Error('Empty response from OpenAI');
    }
    
    return JSON.parse(analysisText) as AIInsight;
  } catch (error) {
    console.error('Error generating timeline insights:', error);
    // Return fallback insights
    return {
      type: 'timeline',
      title: 'Project Timeline Analysis',
      description: 'Unable to generate AI insights. Here are some standard recommendations:',
      items: [
        {
          severity: 'warning',
          text: 'Review critical path tasks',
          detail: 'Identify and closely monitor tasks on the critical path to prevent project delays.'
        },
        {
          severity: 'warning',
          text: 'Check for resource bottlenecks',
          detail: 'Ensure resources are not overallocated across multiple concurrent tasks.'
        },
        {
          severity: 'warning',
          text: 'Monitor progress vs. plan',
          detail: 'Compare actual progress against planned progress and address any significant variances.'
        }
      ],
      confidence: 0.1
    };
  }
}