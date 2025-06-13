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
        status: schedule.status,
        bayId: schedule.bayId
      }))
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: `You are a project management expert analyzing project health. 
        Return a JSON object with this exact structure:
        {
          "overallHealth": {
            "score": number (0-100),
            "status": "critical" | "at-risk" | "caution" | "healthy" | "excellent",
            "summary": "Brief summary"
          },
          "timeline": {
            "status": "delayed" | "on-track" | "ahead",
            "score": number (0-100),
            "analysis": "Analysis text",
            "recommendations": ["recommendation1", "recommendation2"]
          },
          "budget": {
            "status": "over-budget" | "on-budget" | "under-budget", 
            "score": number (0-100),
            "analysis": "Analysis text",
            "recommendations": ["recommendation1", "recommendation2"]
          },
          "resources": {
            "status": "insufficient" | "adequate" | "optimal",
            "score": number (0-100),
            "analysis": "Analysis text", 
            "recommendations": ["recommendation1", "recommendation2"]
          },
          "quality": {
            "score": number (0-100),
            "analysis": "Analysis text",
            "recommendations": ["recommendation1", "recommendation2"]
          },
          "risks": {
            "severity": "low" | "medium" | "high",
            "items": ["risk1", "risk2"],
            "mitigation": ["mitigation1", "mitigation2"]
          },
          "confidenceScore": number (0-1)
        }

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
    return performRuleBasedAnalysis(project, tasks, billingMilestones, manufacturingSchedules);
  }
}

/**
 * Performs rule-based project health analysis as fallback
 */
function performRuleBasedAnalysis(
  project: Project,
  tasks: Task[] = [],
  billingMilestones: BillingMilestone[] = [],
  manufacturingSchedules: ManufacturingSchedule[] = []
): ProjectHealthAnalysis {
  const today = new Date();

  // Calculate timeline score
  let timelineScore = 75; // Default
  let timelineStatus: 'delayed' | 'on-track' | 'ahead' = 'on-track';

  if (project.estimatedCompletionDate) {
    const dueDate = new Date(project.estimatedCompletionDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const progress = parseFloat(project.percentComplete || '0');

    if (daysUntilDue < 0) {
      timelineScore = 30;
      timelineStatus = 'delayed';
    } else if (daysUntilDue < 7 && progress < 90) {
      timelineScore = 50;
      timelineStatus = 'delayed';
    } else if (progress > 80 && daysUntilDue > 30) {
      timelineScore = 90;
      timelineStatus = 'ahead';
    }
  }

  // Calculate budget score based on billing milestones
  let budgetScore = 70; // Default
  let budgetStatus: 'over-budget' | 'on-budget' | 'under-budget' = 'on-budget';

  if (billingMilestones.length > 0) {
    const totalBudget = billingMilestones.reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);
    const paidAmount = billingMilestones
      .filter(m => m.status === 'paid')
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

    const progress = parseFloat(project.percentComplete || '0');
    const expectedBilling = (progress / 100) * totalBudget;

    if (paidAmount >= expectedBilling * 0.9) {
      budgetScore = 85;
      budgetStatus = 'on-budget';
    } else if (paidAmount < expectedBilling * 0.7) {
      budgetScore = 45;
      budgetStatus = 'under-budget';
    }
  }

  // Calculate resource score based on manufacturing schedules
  let resourceScore = 65; // Default
  let resourceStatus: 'insufficient' | 'adequate' | 'optimal' = 'adequate';

  if (manufacturingSchedules.length > 0) {
    const activeSchedules = manufacturingSchedules.filter(s => s.status === 'in_progress');
    if (activeSchedules.length > 0) {
      resourceScore = 80;
      resourceStatus = 'optimal';
    } else if (manufacturingSchedules.some(s => s.status === 'scheduled')) {
      resourceScore = 70;
      resourceStatus = 'adequate';
    }
  }

  // Calculate quality score based on tasks completion
  let qualityScore = 70; // Default
  if (tasks.length > 0) {
    const completedTasks = tasks.filter(t => t.isCompleted).length;
    qualityScore = Math.round((completedTasks / tasks.length) * 100);
  }

  // Calculate overall score
  const overallScore = Math.round((timelineScore + budgetScore + resourceScore + qualityScore) / 4);

  // Determine overall status
  let overallStatus: 'critical' | 'at-risk' | 'caution' | 'healthy' | 'excellent' = 'healthy';
  if (overallScore < 40) overallStatus = 'critical';
  else if (overallScore < 60) overallStatus = 'at-risk';
  else if (overallScore < 75) overallStatus = 'caution';
  else if (overallScore >= 90) overallStatus = 'excellent';

  // Generate risks
  const risks: string[] = [];
  if (timelineScore < 60) risks.push('Timeline delays may impact delivery');
  if (budgetScore < 60) risks.push('Budget concerns with billing milestones');
  if (resourceScore < 60) risks.push('Resource allocation needs attention');
  if (qualityScore < 70) risks.push('Task completion rate below target');

  return {
    overallHealth: {
      score: overallScore,
      status: overallStatus,
      summary: `Project is ${overallStatus} with a score of ${overallScore}/100. ${risks.length > 0 ? 'Some areas need attention.' : 'Performance is on track.'}`
    },
    timeline: {
      status: timelineStatus,
      score: timelineScore,
      analysis: `Timeline assessment based on completion progress and due dates. Current status: ${timelineStatus}.`,
      recommendations: timelineScore < 60 ? 
        ['Review project schedule', 'Identify bottlenecks', 'Consider resource reallocation'] :
        ['Continue current pace', 'Monitor progress weekly']
    },
    budget: {
      status: budgetStatus,
      score: budgetScore,
      analysis: `Budget analysis based on billing milestone completion. Status: ${budgetStatus}.`,
      recommendations: budgetScore < 60 ?
        ['Review billing schedule', 'Follow up on pending invoices', 'Assess cost overruns'] :
        ['Maintain current billing pace', 'Monitor cash flow']
    },
    resources: {
      status: resourceStatus,
      score: resourceScore,
      analysis: `Resource assessment based on manufacturing schedules and team allocation. Status: ${resourceStatus}.`,
      recommendations: resourceScore < 60 ?
        ['Review resource allocation', 'Consider additional team members', 'Optimize workflows'] :
        ['Maintain resource allocation', 'Monitor team capacity']
    },
    quality: {
      score: qualityScore,
      analysis: `Quality assessment based on task completion rates and project progress. Score: ${qualityScore}/100.`,
      recommendations: qualityScore < 70 ?
        ['Review task completion processes', 'Implement quality checkpoints', 'Provide additional training'] :
        ['Continue quality practices', 'Regular quality reviews']
    },
    risks: {
      severity: risks.length > 2 ? 'high' : risks.length > 0 ? 'medium' : 'low',
      items: risks.length > 0 ? risks : ['No significant risks identified'],
      mitigation: risks.length > 0 ?
        ['Regular status reviews', 'Proactive communication', 'Resource monitoring'] :
        ['Continue monitoring', 'Maintain current practices']
    },
    confidenceScore: 0.8 // High confidence in rule-based analysis
  };
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