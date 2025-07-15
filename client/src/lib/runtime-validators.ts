import { z } from 'zod';

// Runtime validators for API responses to ensure data integrity

export const ProjectSchema = z.object({
  id: z.number(),
  projectNumber: z.string(),
  name: z.string(),
  pmOwner: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  // Add other fields as needed
}).passthrough(); // Allow additional fields

export const ProjectsResponseSchema = z.array(ProjectSchema);

export const LabelAssignmentSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  labelId: z.number(),
  labelName: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
}).passthrough();

export const LabelAssignmentsResponseSchema = z.array(LabelAssignmentSchema);

export const ManufacturingScheduleSchema = z.object({
  id: z.number(),
  bayId: z.number(),
  projectId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
}).passthrough();

export const ManufacturingSchedulesResponseSchema = z.array(ManufacturingScheduleSchema);

export const BillingMilestoneSchema = z.object({
  id: z.number(),
  projectId: z.number().nullable(),
  name: z.string(),
}).passthrough();

export const BillingMilestonesResponseSchema = z.array(BillingMilestoneSchema);

export const ManufacturingBaySchema = z.object({
  id: z.number(),
  bayNumber: z.number(),
  name: z.string(),
}).passthrough();

export const ManufacturingBaysResponseSchema = z.array(ManufacturingBaySchema);

export const ProjectLabelSchema = z.object({
  id: z.number(),
  name: z.string(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
}).passthrough();

export const ProjectLabelsResponseSchema = z.array(ProjectLabelSchema);

export const CCBRequestSchema = z.object({
  id: z.number(),
  projectId: z.number(),
}).passthrough();

export const CCBRequestsResponseSchema = z.array(CCBRequestSchema);

// Helper function to safely parse and validate API responses
export function safeParseArray<T>(
  data: unknown,
  schema: z.ZodArray<z.ZodTypeAny>,
  fallback: T[] = []
): T[] {
  try {
    const parsed = schema.safeParse(data);
    if (parsed.success) {
      return parsed.data as T[];
    }
    console.warn('Data validation failed:', parsed.error);
    return fallback;
  } catch (error) {
    console.error('Runtime validation error:', error);
    return fallback;
  }
}