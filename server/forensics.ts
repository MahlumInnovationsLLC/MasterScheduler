import { db } from "./db";
import { 
  projectForensics,
  type ProjectForensics,
  type InsertProjectForensics,
  forensicsActionEnum,
  forensicsEntityEnum
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Request } from "express";

interface ForensicsContext {
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
}

interface ChangeDetail {
  field: string;
  previousValue: any;
  newValue: any;
  displayName?: string;
}

/**
 * Creates a forensics record for project-related data changes
 */
export async function createForensicsRecord(
  projectId: number,
  entityType: typeof forensicsEntityEnum.enumValues[number],
  entityId: number,
  action: typeof forensicsActionEnum.enumValues[number],
  changes: ChangeDetail[],
  context: ForensicsContext = {},
  affectedEntities?: any[]
): Promise<ProjectForensics> {
  
  const changedFields = changes.map(c => c.field);
  const previousValues = changes.reduce((acc, c) => {
    acc[c.field] = c.previousValue;
    return acc;
  }, {} as Record<string, any>);
  
  const newValues = changes.reduce((acc, c) => {
    acc[c.field] = c.newValue;
    return acc;
  }, {} as Record<string, any>);

  // Generate human-readable description
  const changeDescription = generateChangeDescription(entityType, action, changes);
  
  const forensicsData: InsertProjectForensics = {
    projectId,
    entityType,
    entityId,
    action,
    userId: context.userId,
    username: context.username,
    changedFields,
    previousValues,
    newValues,
    changeDescription,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    source: context.source || "manual",
    affectedEntities,
    cascadeChanges: affectedEntities && affectedEntities.length > 0
  };

  const [forensicsRecord] = await db
    .insert(projectForensics)
    .values(forensicsData)
    .returning();

  return forensicsRecord;
}

/**
 * Tracks changes by comparing old and new objects
 */
export function trackChanges(oldData: any, newData: any, fieldMappings?: Record<string, string>): ChangeDetail[] {
  const changes: ChangeDetail[] = [];
  
  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
  
  for (const key of allKeys) {
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];
    
    // Skip certain fields that shouldn't be tracked
    if (key === 'updatedAt' || key === 'createdAt' || key === 'id') {
      continue;
    }
    
    // Check if values are different
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        previousValue: oldValue,
        newValue: newValue,
        displayName: fieldMappings?.[key] || formatFieldName(key)
      });
    }
  }
  
  return changes;
}

/**
 * Gets forensics records for a specific project
 */
export async function getProjectForensics(
  projectId: number,
  limit: number = 50,
  offset: number = 0
): Promise<ProjectForensics[]> {
  return await db
    .select()
    .from(projectForensics)
    .where(eq(projectForensics.projectId, projectId))
    .orderBy(desc(projectForensics.timestamp))
    .limit(limit)
    .offset(offset);
}

/**
 * Gets forensics records for a specific entity
 */
export async function getEntityForensics(
  projectId: number,
  entityType: typeof forensicsEntityEnum.enumValues[number],
  entityId: number
): Promise<ProjectForensics[]> {
  return await db
    .select()
    .from(projectForensics)
    .where(
      and(
        eq(projectForensics.projectId, projectId),
        eq(projectForensics.entityType, entityType),
        eq(projectForensics.entityId, entityId)
      )
    )
    .orderBy(desc(projectForensics.timestamp));
}

/**
 * Extracts forensics context from Express request
 */
export function getForensicsContext(req: Request, user?: any): ForensicsContext {
  return {
    userId: user?.id,
    username: user?.username,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    source: req.headers['x-forensics-source'] as string || "manual"
  };
}

/**
 * Generates human-readable description of changes
 */
function generateChangeDescription(
  entityType: string,
  action: string,
  changes: ChangeDetail[]
): string {
  const entityName = formatEntityName(entityType);
  
  switch (action) {
    case 'create':
      return `Created new ${entityName}`;
    case 'delete':
      return `Deleted ${entityName}`;
    case 'archive':
      return `Archived ${entityName}`;
    case 'restore':
      return `Restored ${entityName}`;
    case 'import':
      return `Imported ${entityName}`;
    case 'export':
      return `Exported ${entityName}`;
    case 'bulk_update':
      return `Bulk updated ${entityName}`;
    case 'update':
      if (changes.length === 1) {
        const change = changes[0];
        return `Updated ${entityName}: ${change.displayName || change.field}`;
      } else if (changes.length <= 3) {
        const fieldNames = changes.map(c => c.displayName || c.field).join(', ');
        return `Updated ${entityName}: ${fieldNames}`;
      } else {
        return `Updated ${entityName}: ${changes.length} fields changed`;
      }
    default:
      return `${action} ${entityName}`;
  }
}

/**
 * Formats entity type for display
 */
function formatEntityName(entityType: string): string {
  const mapping: Record<string, string> = {
    'project': 'Project',
    'task': 'Task',
    'billing_milestone': 'Billing Milestone',
    'manufacturing_schedule': 'Manufacturing Schedule',
    'manufacturing_bay': 'Manufacturing Bay',
    'project_cost': 'Project Cost',
    'delivery_tracking': 'Delivery Tracking',
    'sales_deal': 'Sales Deal',
    'supply_chain_benchmark': 'Supply Chain Benchmark',
    'project_supply_chain_benchmark': 'Project Supply Chain Benchmark'
  };
  
  return mapping[entityType] || entityType;
}

/**
 * Formats field names for display
 */
function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, str => str.toUpperCase()); // Capitalize each word
}

/**
 * Helper to create forensics middleware for route handlers
 */
export function withForensics(
  projectId: number | (() => number),
  entityType: typeof forensicsEntityEnum.enumValues[number],
  entityId: number | (() => number),
  action: typeof forensicsActionEnum.enumValues[number]
) {
  return (req: Request, res: any, next: any) => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // Store forensics context in res.locals for use in route handlers
      res.locals.forensicsContext = {
        projectId: typeof projectId === 'function' ? projectId() : projectId,
        entityType,
        entityId: typeof entityId === 'function' ? entityId() : entityId,
        action,
        context: getForensicsContext(req, req.user)
      };
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}