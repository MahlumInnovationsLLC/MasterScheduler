import {
  users,
  projects,
  tasks,
  billingMilestones,
  projectCosts,
  manufacturingBays,
  manufacturingSchedules,
  userPreferences,
  allowedEmails,
  notifications,
  archivedProjects,
  deliveryTracking,
  salesDeals,
  userAuditLogs,
  financialGoals,
  supplyChainBenchmarks,
  projectSupplyChainBenchmarks,
  rolePermissions,
  userPermissions,
  projectMilestoneIcons,
  projectLabels,
  projectLabelAssignments,
  userModuleVisibility,
  projectForensics,
  meetings,
  meetingAttendees,
  meetingNotes,
  meetingTasks,
  meetingTemplates,
  meetingEmailNotifications,
  // Quality Assurance tables
  nonConformanceReports,
  correctiveActions,
  supplierCorrectiveActions,
  audits,
  auditFindings,
  qualityDocuments,
  documentAcknowledgments,
  trainingModules,
  trainingAssignments,
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type BillingMilestone,
  type InsertBillingMilestone,
  type ProjectCost,
  type InsertProjectCost,
  type ManufacturingBay,
  type InsertManufacturingBay,
  type ManufacturingSchedule,
  type InsertManufacturingSchedule,
  type UserPreference,
  type InsertUserPreference,
  type AllowedEmail,
  type InsertAllowedEmail,
  type Notification,
  type InsertNotification,
  type ArchivedProject,
  type InsertArchivedProject,
  type DeliveryTracking,
  type InsertDeliveryTracking,
  type SalesDeal,
  type InsertSalesDeal,
  type UserAuditLog,
  type InsertUserAuditLog,
  type RolePermission,
  type InsertRolePermission,
  type ProjectMilestoneIcon,
  type InsertProjectMilestoneIcon,
  type FinancialGoal,
  type InsertFinancialGoal,
  type SupplyChainBenchmark,
  type InsertSupplyChainBenchmark,
  type ProjectSupplyChainBenchmark,
  type InsertProjectSupplyChainBenchmark,
  type ProjectForensics,
  type InsertProjectForensics,
  type Meeting,
  type InsertMeeting,
  type MeetingAttendee,
  type InsertMeetingAttendee,
  type MeetingNote,
  type InsertMeetingNote,
  type MeetingTask,
  type InsertMeetingTask,
  type MeetingTemplate,
  type InsertMeetingTemplate,
  type MeetingEmailNotification,
  type InsertMeetingEmailNotification,
  type ProjectLabel,
  type InsertProjectLabel,
  type ProjectLabelAssignment,
  type InsertProjectLabelAssignment,
  // Quality Assurance types
  type NonConformanceReport,
  type InsertNonConformanceReport,
  type CorrectiveAction,
  type InsertCorrectiveAction,
  type SupplierCorrectiveAction,
  type InsertSupplierCorrectiveAction,
  type Audit,
  type InsertAudit,
  type AuditFinding,
  type InsertAuditFinding,
  type QualityDocument,
  type InsertQualityDocument,
  type DocumentAcknowledgment,
  type InsertDocumentAcknowledgment,
  type TrainingModule,
  type InsertTrainingModule,
  type TrainingAssignment,
  type InsertTrainingAssignment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, like, sql, desc, asc, count, ilike, SQL, isNull, isNotNull, or, inArray, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import * as schemaBackup from "../shared/schema-backup";
import { PgSelectBase } from "drizzle-orm/pg-core";

/**
 * Helper functions to safely execute database queries and return results with proper typing
 * Used to address TypeScript errors with Drizzle's query builder types
 */

// For safely casting SQL query results to the expected type
function castSqlResult<T>(result: any[]): T[] {
  return result as T[];
}

// For safely casting a single SQL query result to the expected type
function castSingleResult<T>(result: any[]): T | undefined {
  return result[0] as T | undefined;
}

// For queries returning an array of items
async function safeQuery<T>(queryCallback: () => Promise<any>): Promise<T[]> {
  try {
    // Execute the query and cast the result
    const results = await queryCallback();
    return castSqlResult<T>(results);
  } catch (error) {
    console.error("Database query error:", error);
    return [];
  }
}

// For queries potentially returning a single item (may be undefined)
async function safeSingleQuery<T>(queryCallback: () => Promise<any>): Promise<T | undefined> {
  try {
    // Execute the query and cast the first result
    const results = await queryCallback();
    return castSingleResult<T>(results);
  } catch (error) {
    console.error("Database single item query error:", error);
    return undefined;
  }
}

export interface IStorage {
  // System info methods
  getProjectCount(): Promise<number>;
  getUserCount(): Promise<number>;

  // Database backup methods
  createBackupRecord(data: { filename: string, size: number, createdAt: Date }): Promise<any>;
  getLatestBackup(): Promise<{ filename: string, createdAt: Date } | null>;
  getBackups(): Promise<any[]>;
  createRestoreRecord(data: { filename: string, restoredAt: Date }): Promise<any>;
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: InsertUser): Promise<User>;
  updateUserRole(id: string, role: string, isApproved: boolean): Promise<User | undefined>;
  updateUserLastLogin(id: string): Promise<User | undefined>;
  updateUser(id: string, userData: Partial<User>): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined>;
  setPasswordResetToken(email: string, token: string, expires: Date): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(id: string): Promise<User | undefined>;

  // Role permissions methods
  getRolePermissions(role?: string): Promise<RolePermission[]>;
  getRolePermissionsByCategory(role: string, category: string): Promise<RolePermission[]>;
  getRolePermission(id: number): Promise<RolePermission | undefined>;
  createRolePermission(permission: InsertRolePermission): Promise<RolePermission>;
  updateRolePermission(id: number, permission: Partial<RolePermission>): Promise<RolePermission | undefined>;
  deleteRolePermission(id: number): Promise<boolean>;
  bulkUpdateRolePermissions(role: string, permissions: Partial<InsertRolePermission>[]): Promise<number>;

  // User archiving and audit logs
  updateUserStatus(id: string, status: string, performedBy: string, details: string): Promise<User | undefined>;
  archiveUser(id: string, performedBy: string, reason: string): Promise<User | undefined>;
  getUserAuditLogs(userId: string): Promise<any[]>;
  getAllUserAuditLogs(): Promise<any[]>;
  createUserAuditLog(userId: string, action: string, performedBy: string, previousData?: any, newData?: any, details?: string): Promise<any>;

  // User Module Visibility methods
  getUserModuleVisibility(userId: string): Promise<any[]>;
  updateUserModuleVisibility(userId: string, moduleId: string, visible: boolean): Promise<boolean>;

  // User Preferences methods
  getUserPreferences(userId: string): Promise<UserPreference | undefined>;
  createUserPreferences(preferences: InsertUserPreference): Promise<UserPreference>;
  updateUserPreferences(userId: string, preferences: Partial<InsertUserPreference>): Promise<UserPreference | undefined>;
  deleteUser(userId: string): Promise<boolean>;
  deleteUserPreferences(userId: string): Promise<boolean>;

  // Access Control - Allowed Emails
  getAllowedEmails(): Promise<AllowedEmail[]>;
  getAllowedEmail(id: number): Promise<AllowedEmail | undefined>;
  createAllowedEmail(allowedEmail: InsertAllowedEmail): Promise<AllowedEmail>;
  updateAllowedEmail(id: number, allowedEmail: Partial<InsertAllowedEmail>): Promise<AllowedEmail | undefined>;
  deleteAllowedEmail(id: number): Promise<boolean>;
  checkIsEmailAllowed(email: string): Promise<{ allowed: boolean, autoApprove: boolean, defaultRole: string } | undefined>;

  // Project methods
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectByNumber(projectNumber: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Task methods
  getTasks(projectId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  completeTask(id: number, completedDate: Date): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;

  // Project Milestone methods - removed (table does not exist)

  // Billing Milestone methods
  getBillingMilestones(): Promise<BillingMilestone[]>;
  getProjectBillingMilestones(projectId: number): Promise<BillingMilestone[]>;
  getBillingMilestone(id: number): Promise<BillingMilestone | undefined>;
  createBillingMilestone(milestone: InsertBillingMilestone): Promise<BillingMilestone>;
  updateBillingMilestone(id: number, milestone: Partial<InsertBillingMilestone>): Promise<BillingMilestone | undefined>;
  deleteBillingMilestone(id: number): Promise<boolean>;
  deleteAllBillingMilestones(): Promise<number>;

  // Project Costs methods
  getProjectCosts(): Promise<ProjectCost[]>;
  getProjectCost(projectId: number): Promise<ProjectCost | undefined>;
  createProjectCost(cost: InsertProjectCost): Promise<ProjectCost>;
  updateProjectCost(projectId: number, cost: Partial<InsertProjectCost>): Promise<ProjectCost | undefined>;
  deleteProjectCost(projectId: number): Promise<boolean>;

  // Manufacturing Bay methods
  getManufacturingBays(): Promise<ManufacturingBay[]>;
  getManufacturingBay(id: number): Promise<ManufacturingBay | undefined>;
  createManufacturingBay(bay: InsertManufacturingBay): Promise<ManufacturingBay>;
  updateManufacturingBay(id: number, bay: Partial<InsertManufacturingBay>): Promise<ManufacturingBay | undefined>;
  deleteManufacturingBay(id: number): Promise<boolean>;

  // Manufacturing Schedule methods
  getManufacturingSchedules(filters?: { bayId?: number, projectId?: number, startDate?: Date, endDate?: Date }): Promise<ManufacturingSchedule[]>;
  getManufacturingSchedule(id: number): Promise<ManufacturingSchedule | undefined>;
  createManufacturingSchedule(schedule: InsertManufacturingSchedule & { forcedRowIndex?: number }): Promise<ManufacturingSchedule>;
  updateManufacturingSchedule(id: number, schedule: Partial<InsertManufacturingSchedule> & { forcedRowIndex?: number }): Promise<ManufacturingSchedule | undefined>;
  deleteManufacturingSchedule(id: number): Promise<boolean>;
  getBayManufacturingSchedules(bayId: number): Promise<ManufacturingSchedule[]>;
  getProjectManufacturingSchedules(projectId: number): Promise<ManufacturingSchedule[]>;

  // Sales Deals methods
  getSalesDeals(filters?: { isActive?: boolean, ownerId?: string, dealStage?: string, dealType?: string, priority?: string }): Promise<SalesDeal[]>;
  getSalesDeal(id: number): Promise<SalesDeal | undefined>;
  getSalesDealByNumber(dealNumber: string): Promise<SalesDeal | undefined>;
  createSalesDeal(deal: InsertSalesDeal): Promise<SalesDeal>;
  updateSalesDeal(id: number, deal: Partial<InsertSalesDeal>): Promise<SalesDeal | undefined>;
  deleteSalesDeal(id: number): Promise<boolean>;
  convertSalesDealToProject(id: number, projectId: number): Promise<SalesDeal | undefined>;
  getUserSalesDeals(userId: string): Promise<SalesDeal[]>;

  // Notification methods
  getNotifications(userId?: string, options?: { unreadOnly?: boolean, limit?: number }): Promise<Notification[]>;
  getNotificationById(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  deleteAllNotifications(userId: string): Promise<boolean>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  // Archived Projects methods
  getArchivedProjects(): Promise<ArchivedProject[]>;
  getArchivedProject(id: number): Promise<ArchivedProject | undefined>;
  archiveProject(projectId: number, userId: string, reason?: string): Promise<ArchivedProject | undefined>;
  restoreProject(projectId: number, userId: string): Promise<Project | undefined>;
  removeManufacturingScheduleByProjectId(projectId: number): Promise<boolean>;

  // Delivered Projects methods
  getDeliveredProjects(): Promise<any[]>;

  // Delivery Tracking methods
  getDeliveryTrackings(): Promise<DeliveryTracking[]>;
  getProjectDeliveryTrackings(projectId: number): Promise<DeliveryTracking[]>;
  getDeliveryTracking(id: number): Promise<DeliveryTracking | undefined>;
  createDeliveryTracking(tracking: InsertDeliveryTracking): Promise<DeliveryTracking>;

  // Supply Chain Benchmark methods
  getSupplyChainBenchmarks(): Promise<SupplyChainBenchmark[]>;
  getSupplyChainBenchmarkById(id: number): Promise<SupplyChainBenchmark | undefined>;
  createSupplyChainBenchmark(benchmark: InsertSupplyChainBenchmark): Promise<SupplyChainBenchmark>;
  updateSupplyChainBenchmark(id: number, benchmark: Partial<InsertSupplyChainBenchmark>): Promise<SupplyChainBenchmark | undefined>;
  deleteSupplyChainBenchmark(id: number): Promise<boolean>;

  // Project Supply Chain Benchmark methods
  getProjectSupplyChainBenchmarks(): Promise<ProjectSupplyChainBenchmark[]>;
  getProjectSupplyChainBenchmarkById(id: number): Promise<ProjectSupplyChainBenchmark | undefined>;
  getProjectSupplyChainBenchmarksByProjectId(projectId: number): Promise<ProjectSupplyChainBenchmark[]>;
  createProjectSupplyChainBenchmark(benchmark: InsertProjectSupplyChainBenchmark): Promise<ProjectSupplyChainBenchmark>;
  updateProjectSupplyChainBenchmark(id: number, benchmark: Partial<InsertProjectSupplyChainBenchmark>): Promise<ProjectSupplyChainBenchmark | undefined>;
  deleteProjectSupplyChainBenchmark(id: number): Promise<boolean>;

  // Project Milestone Icons methods
  getProjectMilestoneIcons(projectId: number): Promise<ProjectMilestoneIcon[]>;
  getProjectMilestoneIcon(id: number): Promise<ProjectMilestoneIcon | undefined>;
  createProjectMilestoneIcon(icon: InsertProjectMilestoneIcon): Promise<ProjectMilestoneIcon>;
  updateProjectMilestoneIcon(id: number, icon: Partial<InsertProjectMilestoneIcon>): Promise<ProjectMilestoneIcon | undefined>;
  deleteProjectMilestoneIcon(id: number): Promise<boolean>;

  // Project Labels methods
  getProjectLabels(): Promise<ProjectLabel[]>;
  getProjectLabel(id: number): Promise<ProjectLabel | undefined>;
  createProjectLabel(label: InsertProjectLabel): Promise<ProjectLabel>;
  updateProjectLabel(id: number, label: Partial<InsertProjectLabel>): Promise<ProjectLabel | undefined>;
  deleteProjectLabel(id: number): Promise<boolean>;

  // Project Label Assignments methods
  getProjectLabelAssignments(projectId: number): Promise<ProjectLabelAssignment[]>;
  assignLabelToProject(projectId: number, labelId: number): Promise<ProjectLabelAssignment>;
  removeLabelFromProject(projectId: number, labelId: number): Promise<boolean>;

  // Data migration methods
  updateDefaultProjectHours(): Promise<number>; // Returns count of updated records
  updateDefaultScheduleHours(): Promise<number>; // Returns count of updated records

  // Forensics methods
  getProjectForensics(projectId: number, limit?: number, offset?: number): Promise<ProjectForensics[]>;
  getEntityForensics(projectId: number, entityType: string, entityId: number): Promise<ProjectForensics[]>;
  createProjectForensics(forensics: InsertProjectForensics): Promise<ProjectForensics>;

  // Meeting methods
  getMeetings(): Promise<Meeting[]>;
  getMeeting(id: number): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: number): Promise<boolean>;

  // Meeting Attendees methods
  getMeetingAttendees(meetingId: number): Promise<MeetingAttendee[]>;
  addMeetingAttendee(attendee: InsertMeetingAttendee): Promise<MeetingAttendee>;
  removeMeetingAttendee(meetingId: number, userId: string): Promise<boolean>;
  updateAttendeeStatus(meetingId: number, userId: string, attended: boolean): Promise<MeetingAttendee | undefined>;

  // Meeting Notes methods
  getMeetingNotes(meetingId: number): Promise<MeetingNote[]>;
  createMeetingNote(note: InsertMeetingNote): Promise<MeetingNote>;
  updateMeetingNote(id: number, note: Partial<InsertMeetingNote>): Promise<MeetingNote | undefined>;
  deleteMeetingNote(id: number): Promise<boolean>;

  // Meeting Tasks methods
  getMeetingTasks(meetingId?: number): Promise<MeetingTask[]>;
  getMeetingTask(id: number): Promise<MeetingTask | undefined>;
  createMeetingTask(task: InsertMeetingTask): Promise<MeetingTask>;
  updateMeetingTask(id: number, task: Partial<InsertMeetingTask>): Promise<MeetingTask | undefined>;
  deleteMeetingTask(id: number): Promise<boolean>;
  getUserMeetingTasks(userId: string): Promise<MeetingTask[]>;

  // Meeting Templates methods
  getMeetingTemplates(): Promise<MeetingTemplate[]>;
  getMeetingTemplate(id: number): Promise<MeetingTemplate | undefined>;
  createMeetingTemplate(template: InsertMeetingTemplate): Promise<MeetingTemplate>;
  updateMeetingTemplate(id: number, template: Partial<InsertMeetingTemplate>): Promise<MeetingTemplate | undefined>;
  deleteMeetingTemplate(id: number): Promise<boolean>;

  // Meeting Email Notifications methods
  getMeetingEmailNotifications(meetingId?: number): Promise<MeetingEmailNotification[]>;
  createMeetingEmailNotification(notification: InsertMeetingEmailNotification): Promise<MeetingEmailNotification>;
  updateMeetingEmailNotificationStatus(id: number, status: string, errorMessage?: string): Promise<MeetingEmailNotification | undefined>;
  getPendingEmailNotifications(): Promise<MeetingEmailNotification[]>;

  // Project-Meeting Sync methods
  getMeetingsByProject(projectId: number): Promise<Meeting[]>;
  getMeetingTasksByProjectTask(projectTaskId: number): Promise<MeetingTask[]>;
  updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined>;
}

export class DatabaseStorage implements IStorage {
  // System info methods
  async getProjectCount(): Promise<number> {
    try {
      const result = await db.select({ count: count() }).from(projects);
      return result[0]?.count || 0;
    } catch (err) {
      console.error("Error getting project count:", err);
      return 0;
    }
  }

  async getUserCount(): Promise<number> {
    try {
      const result = await db.select({ count: count() }).from(users);
      return result[0]?.count || 0;
    } catch (err) {
      console.error("Error getting user count:", err);
      return 0;
    }
  }

  // Database backup methods
  async createBackupRecord(data: { filename: string, size: number, createdAt: Date }) {
    try {
      const result = await db.insert(schemaBackup.databaseBackups).values(data).returning();
      return result[0];
    } catch (err) {
      console.error("Error creating backup record:", err);
      throw err;
    }
  }

  async getLatestBackup() {
    try {
      const backups = await db.select().from(schemaBackup.databaseBackups).orderBy(desc(schemaBackup.databaseBackups.createdAt)).limit(1);
      return backups.length > 0 ? backups[0] : null;
    } catch (err) {
      console.error("Error getting latest backup:", err);
      return null;
    }
  }

  async getBackups() {
    try {
      return await db.select().from(schemaBackup.databaseBackups).orderBy(desc(schemaBackup.databaseBackups.createdAt));
    } catch (err) {
      console.error("Error getting backups:", err);
      return [];
    }
  }

  async createRestoreRecord(data: { filename: string, restoredAt: Date }) {
    try {
      const result = await db.insert(schemaBackup.databaseRestores).values(data).returning();
      return result[0];
    } catch (err) {
      console.error("Error creating restore record:", err);
      throw err;
    }
  }
  // Role Permissions Methods
  async getRolePermissions(role?: string): Promise<RolePermission[]> {
    try {
      let query;
      if (role) {
        query = db.select().from(rolePermissions).where(eq(rolePermissions.role, role));
      } else {
        query = db.select().from(rolePermissions);
      }

      const results = await query;
      return results;
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      return [];
    }
  }

  async getRolePermissionsByCategory(role: string, category: string): Promise<RolePermission[]> {
    try {
      const results = await db.select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.role, role),
          eq(rolePermissions.category, category as any)
        ));

      return results;
    } catch (error) {
      console.error(`Error fetching role permissions for ${role} in category ${category}:`, error);
      return [];
    }
  }

  async getRolePermission(id: number): Promise<RolePermission | undefined> {
    try {
      const results = await db.select()
        .from(rolePermissions)
        .where(eq(rolePermissions.id, id))
        .limit(1);

      return results[0];
    } catch (error) {
      console.error(`Error fetching role permission with ID ${id}:`, error);
      return undefined;
    }
  }

  async createRolePermission(permission: InsertRolePermission): Promise<RolePermission> {
    try {
      const results = await db.insert(rolePermissions)
        .values(permission)
        .returning();

      return results[0];
    } catch (error) {
      console.error("Error creating role permission:", error);
      throw error;
    }
  }

  async updateRolePermission(id: number, permission: Partial<RolePermission>): Promise<RolePermission | undefined> {
    try {
      const results = await db.update(rolePermissions)
        .set(permission)
        .where(eq(rolePermissions.id, id))
        .returning();

      return results[0];
    } catch (error) {
      console.error(`Error updating role permission with ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteRolePermission(id: number): Promise<boolean> {
    try {
      const results = await db.delete(rolePermissions)
        .where(eq(rolePermissions.id, id))
        .returning();

      return results.length > 0;
    } catch (error) {
      console.error(`Error deleting role permission with ID ${id}:`, error);
      return false;
    }
  }

  async bulkUpdateRolePermissions(role: string, permissions: Partial<InsertRolePermission>[]): Promise<number> {
    try {
      let updatedCount = 0;

      // Process each permission in the array
      for (const permission of permissions) {
        // We need both role and category/feature to find the right permission to update
        if (!permission.category || !permission.feature) {
          console.error("Missing category or feature for permission update");
          continue;
        }

        // Try to find existing permission
        const existingPermissions = await db.select()
          .from(rolePermissions)
          .where(and(
            eq(rolePermissions.role, role),
            eq(rolePermissions.category, permission.category as any),
            eq(rolePermissions.feature, permission.feature)
          ));

        if (existingPermissions.length > 0) {
          // Update existing permission
          const updated = await db.update(rolePermissions)
            .set(permission)
            .where(eq(rolePermissions.id, existingPermissions[0].id))
            .returning();

          if (updated.length > 0) updatedCount++;
        } else {
          // Create new permission with the role parameter
          const created = await db.insert(rolePermissions)
            .values({
              ...permission,
              role: role
            } as InsertRolePermission)
            .returning();

          if (created.length > 0) updatedCount++;
        }
      }

      return updatedCount;
    } catch (error) {
      console.error(`Error bulk updating role permissions for role ${role}:`, error);
      throw error;
    }
  }

  // Supply Chain Benchmark methods
  async getSupplyChainBenchmarks(): Promise<SupplyChainBenchmark[]> {
    return await safeQuery<SupplyChainBenchmark>(() =>
      db.select().from(supplyChainBenchmarks).orderBy(asc(supplyChainBenchmarks.name))
    );
  }

  async getSupplyChainBenchmarkById(id: number): Promise<SupplyChainBenchmark | undefined> {
    return await safeSingleQuery<SupplyChainBenchmark>(() =>
      db.select().from(supplyChainBenchmarks).where(eq(supplyChainBenchmarks.id, id))
    );
  }

  async createSupplyChainBenchmark(benchmark: InsertSupplyChainBenchmark): Promise<SupplyChainBenchmark> {
    try {
      const [newBenchmark] = await db.insert(supplyChainBenchmarks).values({
        ...benchmark,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      return newBenchmark;
    } catch (error) {
      console.error("Error creating supply chain benchmark:", error);
      throw error;
    }
  }

  async updateSupplyChainBenchmark(id: number, benchmark: Partial<InsertSupplyChainBenchmark>): Promise<SupplyChainBenchmark | undefined> {
    try {
      const [updatedBenchmark] = await db
        .update(supplyChainBenchmarks)
        .set({
          ...benchmark,
          updatedAt: new Date()
        })
        .where(eq(supplyChainBenchmarks.id, id))
        .returning();
      return updatedBenchmark;
    } catch (error) {
      console.error("Error updating supply chain benchmark:", error);
      return undefined;
    }
  }

  async deleteSupplyChainBenchmark(id: number): Promise<boolean> {
    try {
      await db
        .delete(supplyChainBenchmarks)
        .where(eq(supplyChainBenchmarks.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting supply chain benchmark:", error);
      return false;
    }
  }

  async deleteSupplyChainBenchmarkWithRelated(id: number): Promise<boolean> {
    try {
      // Delete related project benchmarks first
      await db
        .delete(projectSupplyChainBenchmarks)
        .where(eq(projectSupplyChainBenchmarks.benchmarkId, id));

      // Then delete the main benchmark
      await db
        .delete(supplyChainBenchmarks)
        .where(eq(supplyChainBenchmarks.id, id));

      return true;
    } catch (error) {
      console.error("Error deleting supply chain benchmark with related records:", error);
      return false;
    }
  }

  async getDefaultSupplyChainBenchmarks(): Promise<SupplyChainBenchmark[]> {
    return await safeQuery<SupplyChainBenchmark>(() =>
      db.select()
        .from(supplyChainBenchmarks)
        .where(eq(supplyChainBenchmarks.isDefault, true))
        .orderBy(asc(supplyChainBenchmarks.name))
    );
  }

  async getActiveProjects(): Promise<Project[]> {
    return await safeQuery<Project>(() =>
      db.select()
        .from(projects)
        .where(ne(projects.status, 'delivered'))
    );
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    return await safeSingleQuery<Project>(() =>
      db.select()
        .from(projects)
        .where(eq(projects.id, id))
    );
  }

  async getProjectsByIds(projectIds: number[]): Promise<Project[]> {
    if (!projectIds.length) return [];

    return await safeQuery<Project>(() =>
      db.select()
        .from(projects)
        .where(inArray(projects.id, projectIds))
    );
  }

  // Project Supply Chain Benchmark methods
  async getProjectSupplyChainBenchmarks(): Promise<ProjectSupplyChainBenchmark[]> {
    return await safeQuery<ProjectSupplyChainBenchmark>(() =>
      db.select().from(projectSupplyChainBenchmarks)
    );
  }

  async getProjectSupplyChainBenchmarkById(id: number): Promise<ProjectSupplyChainBenchmark | undefined> {
    return await safeSingleQuery<ProjectSupplyChainBenchmark>(() =>
      db.select().from(projectSupplyChainBenchmarks).where(eq(projectSupplyChainBenchmarks.id, id))
    );
  }

  async getProjectSupplyChainBenchmarksByProjectId(projectId: number): Promise<ProjectSupplyChainBenchmark[]> {
    return await safeQuery<ProjectSupplyChainBenchmark>(() =>
      db.select().from(projectSupplyChainBenchmarks)
        .where(eq(projectSupplyChainBenchmarks.projectId, projectId))
        .orderBy(asc(projectSupplyChainBenchmarks.targetDate))
    );
  }

  async createProjectSupplyChainBenchmark(benchmark: InsertProjectSupplyChainBenchmark): Promise<ProjectSupplyChainBenchmark> {
    try {
      const [newBenchmark] = await db.insert(projectSupplyChainBenchmarks).values({
        ...benchmark,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      return newBenchmark;
    } catch (error) {
      console.error("Error creating project supply chain benchmark:", error);
      throw error;
    }
  }

  async updateProjectSupplyChainBenchmark(id: number, benchmark: Partial<InsertProjectSupplyChainBenchmark>): Promise<ProjectSupplyChainBenchmark | undefined> {
    try {
      const [updatedBenchmark] = await db
        .update(projectSupplyChainBenchmarks)
        .set({
          ...benchmark,
          updatedAt: new Date()
        })
        .where(eq(projectSupplyChainBenchmarks.id, id))
        .returning();
      return updatedBenchmark;
    } catch (error) {
      console.error("Error updating project supply chain benchmark:", error);
      return undefined;
    }
  }

  async deleteProjectSupplyChainBenchmark(id: number): Promise<boolean> {
    try {
      await db
        .delete(projectSupplyChainBenchmarks)
        .where(eq(projectSupplyChainBenchmarks.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting project supply chain benchmark:", error);
      return false;
    }
  }
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return await safeSingleQuery<User>(() => 
      db.select().from(users).where(eq(users.id, id))
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await safeSingleQuery<User>(() =>
      db.select().from(users).where(eq(users.username, username))
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await safeSingleQuery<User>(() =>
      db.select().from(users).where(eq(users.email, email))
    );
  }

  async getUsers(): Promise<User[]> {
    return await safeQuery<User>(() =>
      db.select().from(users).orderBy(desc(users.updatedAt))
    );
  }

  async getAllUsers(): Promise<User[]> {
    return await safeQuery<User>(() =>
      db.select().from(users).orderBy(desc(users.updatedAt))
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async upsertUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string, isApproved: boolean, status?: string): Promise<User | undefined> {
    try {
      // Log the update attempt for debugging
      console.log(`Updating user ${id} with role=${role}, isApproved=${isApproved}, status=${status || 'unchanged'}`);

      // Create the update object
      const updateObj: any = {
        role: role,
        isApproved: isApproved,
        updatedAt: new Date()
      };

      // Only add status to the update if it was provided
      if (status) {
        updateObj.status = status;
        console.log(`Including status=${status} in the update`);
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateObj)
        .where(eq(users.id, id))
        .returning();

      console.log("User updated successfully:", updatedUser);
      return updatedUser;
    } catch (error) {
      console.error("Error updating user role:", error);
      return undefined;
    }
  }

  async updateUserLastLogin(id: string): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          lastLogin: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("Error updating user last login:", error);
      return undefined;
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
    try {
      // Log the update attempt for debugging
      console.log(`Updating user ${id} with data:`, userData);

      // Remove any fields that shouldn't be directly updated
      // FIXED: Allow status and isApproved to be updated for proper user approval/rejection
      const { id: _, createdAt, updatedAt, lastLogin, ...safeUserData } = userData as any;

      // Add the updatedAt timestamp
      const updateData = {
        ...safeUserData,
        updatedAt: new Date()
      };

      console.log("Final update data:", updateData);

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      return undefined;
    }
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error(`Error updating password for user ${id}:`, error);
      return undefined;
    }
  }

  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          passwordResetToken: token,
          passwordResetExpires: expires,
          updatedAt: new Date()
        })
        .where(eq(users.email, email))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error(`Error setting password reset token for ${email}:`, error);
      return undefined;
    }
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    try {
      const user = await safeSingleQuery<User>(() =>
        db.select().from(users).where(eq(users.passwordResetToken, token))
      );

      // Check if token has expired
      if (user && user.passwordResetExpires && new Date() > user.passwordResetExpires) {
        // Clear expired token
        await this.clearPasswordResetToken(user.id);
        return undefined;
      }

      return user;
    } catch (error) {
      console.error("Error getting user by password reset token:", error);
      return undefined;
    }
  }

  async clearPasswordResetToken(id: string): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          passwordResetToken: null,
          passwordResetExpires: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error(`Error clearing password reset token for user ${id}:`, error);
      return undefined;
    }
  }

  // User archiving and audit logs methods
  async updateUserStatus(id: string, status: string, performedBy: string, details: string): Promise<User | undefined> {
    try {
      // First get the existing user data for audit logging
      const currentUser = await this.getUser(id);
      if (!currentUser) {
        return undefined;
      }

      // Update the user's status
      const [updatedUser] = await db
        .update(users)
        .set({
          status: status,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();

      // Create an audit log entry
      await this.createUserAuditLog(
        id,
        "STATUS_CHANGE",
        performedBy,
        { status: currentUser.status },
        { status: status },
        details
      );

      return updatedUser;
    } catch (error) {
      console.error("Error updating user status:", error);
      return undefined;
    }
  }

  async archiveUser(id: string, performedBy: string, reason: string): Promise<User | undefined> {
    try {
      // First get the existing user data for audit logging
      const currentUser = await this.getUser(id);
      if (!currentUser) {
        return undefined;
      }

      // Update the user's status to archived and set isApproved to false
      const [updatedUser] = await db
        .update(users)
        .set({
          status: 'archived',
          isApproved: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();

      // Create an audit log entry for status change
      await this.createUserAuditLog(
        id,
        "STATUS_CHANGE",
        performedBy,
        { 
          status: currentUser.status,
          isApproved: currentUser.isApproved 
        },
        { 
          status: 'archived',
          isApproved: false 
        },
        reason
      );

      return updatedUser;
    } catch (error) {
      console.error("Error archiving user:", error);
      return undefined;
    }
  }

  async getUserAuditLogs(userId: string): Promise<UserAuditLog[]> {
    return await safeQuery<UserAuditLog>(() =>
      db.select()
        .from(userAuditLogs)
        .where(eq(userAuditLogs.userId, userId))
        .orderBy(desc(userAuditLogs.timestamp))
    );
  }

  async getAllUserAuditLogs(): Promise<UserAuditLog[]> {
    return await safeQuery<UserAuditLog>(() =>
      db.select()
        .from(userAuditLogs)
        .orderBy(desc(userAuditLogs.timestamp))
    );
  }

  async createUserAuditLog(
    userId: string, 
    action: string, 
    performedBy: string, 
    previousData?: any, 
    newData?: any, 
    details?: string
  ): Promise<UserAuditLog> {
    try {
      const [log] = await db
        .insert(userAuditLogs)
        .values({
          userId,
          action,
          performedBy,
          previousData: previousData ? JSON.stringify(previousData) : null,
          newData: newData ? JSON.stringify(newData) : null,
          details,
          timestamp: new Date()
        })
        .returning();
      return log;
    } catch (error) {
      console.error("Error creating user audit log:", error);
      throw error;
    }
  }

  // User Module Visibility methods
  async getUserModuleVisibility(userId: string): Promise<any[]> {
    try {
      const visibility = await db
        .select()
        .from(userModuleVisibility)
        .where(eq(userModuleVisibility.userId, userId));
      return visibility;
    } catch (error) {
      console.error("Error fetching user module visibility:", error);
      return [];
    }
  }

  async updateUserModuleVisibility(userId: string, moduleId: string, visible: boolean): Promise<boolean> {
    try {
      console.log(`Updating module visibility for user ${userId}, module ${moduleId} to ${visible}`);
      
      // Try to update existing record first
      const [updated] = await db
        .update(userModuleVisibility)
        .set({ 
          visible,
          updatedAt: new Date()
        })
        .where(and(
          eq(userModuleVisibility.userId, userId),
          eq(userModuleVisibility.moduleId, moduleId)
        ))
        .returning();

      if (updated) {
        console.log(`Updated existing module visibility record`);
        return true;
      }

      // If no record exists, create a new one
      const [created] = await db
        .insert(userModuleVisibility)
        .values({
          userId,
          moduleId,
          visible,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (created) {
        console.log(`Created new module visibility record`);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error updating user module visibility:", error);
      return false;
    }
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreference | undefined> {
    try {
      const [preferences] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId));
      return preferences;
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      return undefined;
    }
  }

  async createUserPreferences(preferences: InsertUserPreference): Promise<UserPreference> {
    try {
      const [newPreferences] = await db
        .insert(userPreferences)
        .values(preferences)
        .returning();
      return newPreferences;
    } catch (error) {
      console.error("Error creating user preferences:", error);
      throw error;
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<InsertUserPreference>): Promise<UserPreference | undefined> {
    try {
      console.log(`STORAGE: Updating preferences for user ${userId}:`, preferences);

      const [updatedPreferences] = await db
        .update(userPreferences)
        .set({ 
          ...preferences, 
          updatedAt: new Date() 
        })
        .where(eq(userPreferences.userId, userId))
        .returning();

      console.log("STORAGE: Updated preferences result:", updatedPreferences);
      return updatedPreferences;
    } catch (error) {
      console.error("Error updating user preferences:", error);
      return undefined;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      console.log(`STORAGE: Deleting user ${userId}`);
      
      const result = await db
        .delete(users)
        .where(eq(users.id, userId));

      console.log("STORAGE: User deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  async deleteUserPreferences(userId: string): Promise<boolean> {
    try {
      console.log(`STORAGE: Deleting preferences for user ${userId}`);
      
      const result = await db
        .delete(userPreferences)
        .where(eq(userPreferences.userId, userId));

      console.log("STORAGE: User preferences deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting user preferences:", error);
      throw error;
    }
  }

  // Project methods
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.updatedAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectByNumber(projectNumber: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.projectNumber, projectNumber));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    console.log("Creating project with data:", JSON.stringify(project, null, 2));
    try {
      const [newProject] = await db.insert(projects).values(project).returning();
      console.log("Project created successfully:", newProject.id, newProject.projectNumber);
      return newProject;
    } catch (error) {
      console.error("Error creating project:", error);
      // Log the specific error for debugging
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw error;
    }
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    console.log(`Updating project ID ${id} with data:`, JSON.stringify(project, null, 2));
    try {
      const [updatedProject] = await db
        .update(projects)
        .set({ ...project, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();

      if (!updatedProject) {
        console.error(`No project found with ID ${id} for update`);
        return undefined;
      }

      console.log(`Project ${id} updated successfully:`, updatedProject.projectNumber);
      return updatedProject;
    } catch (error) {
      console.error(`Error updating project ${id}:`, error);
      // Log the specific error for debugging
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      return undefined;
    }
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return true;
  }

  // Task methods
  async getTasks(projectId: number): Promise<Task[]> {
    try {
      // Get regular project tasks
      const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
      
      // Get meeting tasks linked to this project with user information
      let meetingTasksQuery = [];
      try {
        const assignedUser = alias(users, 'assignedUser');
        const completedUser = alias(users, 'completedUser');
        
        meetingTasksQuery = await db
          .select({
            id: meetingTasks.id,
            description: meetingTasks.description,
            projectId: meetingTasks.projectId,
            dueDate: meetingTasks.dueDate,
            status: meetingTasks.status,
            createdAt: meetingTasks.createdAt,
            assignedToId: meetingTasks.assignedToId,
            completedDate: meetingTasks.completedDate,
            completedByUserId: meetingTasks.completedByUserId,
            assignedToUser: {
              id: assignedUser.id,
              firstName: assignedUser.firstName,
              lastName: assignedUser.lastName,
              email: assignedUser.email,
            },
            completedByUser: {
              id: completedUser.id,
              firstName: completedUser.firstName,
              lastName: completedUser.lastName,
              email: completedUser.email,
            },
          })
          .from(meetingTasks)
          .leftJoin(assignedUser, eq(meetingTasks.assignedToId, assignedUser.id))
          .leftJoin(completedUser, eq(meetingTasks.completedByUserId, completedUser.id))
          .where(eq(meetingTasks.projectId, projectId));
      } catch (meetingError) {
        console.warn('Could not fetch meeting tasks:', meetingError);
        meetingTasksQuery = [];
      }
      
      // Convert meeting tasks to match Task interface
      const convertedMeetingTasks = meetingTasksQuery.map(task => ({
        id: task.id,
        name: `Meeting Task: ${task.description}`,
        description: task.description,
        projectId: task.projectId,
        milestoneId: null,
        startDate: null,
        dueDate: task.dueDate,
        completedDate: task.completedDate,
        completedByUserId: task.completedByUserId,
        assignedToUserId: task.assignedToId,
        isCompleted: task.status === 'completed',
        createdAt: task.createdAt,
        assignedToUser: task.assignedToUser,
        completedByUser: task.completedByUser,
        isMeetingTask: true // Add flag to identify meeting tasks
      }));
      
      // For each task, fetch user details if available
      const tasksWithUsers = await Promise.all(
        projectTasks.map(async (task) => {
          let assignedToUser = null;
          let completedByUser = null;
          
          if (task.assignedToUserId) {
            try {
              const [assigned] = await db.select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
              }).from(users).where(eq(users.id, task.assignedToUserId));
              assignedToUser = assigned || null;
            } catch (e) {
              console.warn('Could not fetch assigned user:', e);
            }
          }
          
          if (task.completedByUserId) {
            try {
              const [completed] = await db.select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
              }).from(users).where(eq(users.id, task.completedByUserId));
              completedByUser = completed || null;
            } catch (e) {
              console.warn('Could not fetch completed by user:', e);
            }
          }
          
          return {
            ...task,
            assignedToUser,
            completedByUser
          };
        })
      );
      
      // Combine both arrays
      return [...tasksWithUsers, ...convertedMeetingTasks];
    } catch (error) {
      console.error("Error fetching tasks for project:", error);
      // Fallback to just project tasks without user joins
      try {
        return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
      } catch (fallbackError) {
        console.error("Error fetching fallback tasks:", fallbackError);
        return [];
      }
    }
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    try {
      console.log(`Updating task ID ${id} with data:`, JSON.stringify(task, null, 2));

      // Handle completedDate if isCompleted is being set to true
      let updateData = { ...task };
      if (task.isCompleted === true && !task.completedDate) {
        updateData.completedDate = new Date().toISOString().split('T')[0];
        console.log(`Adding completion date: ${updateData.completedDate}`);
      }

      const [updatedTask] = await db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, id))
        .returning();

      console.log(`Task ${id} updated successfully:`, updatedTask);
      return updatedTask;
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      // Log the specific error for debugging
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      return undefined;
    }
  }

  async completeTask(id: number, completedDate: Date): Promise<Task | undefined> {
    try {
      console.log(`Completing task ID ${id} with date ${completedDate}`);

      const [updatedTask] = await db
        .update(tasks)
        .set({ 
          isCompleted: true, 
          completedDate: completedDate.toISOString().split('T')[0]
        })
        .where(eq(tasks.id, id))
        .returning();

      console.log(`Task ${id} completed successfully:`, updatedTask);
      return updatedTask;
    } catch (error) {
      console.error(`Error completing task ${id}:`, error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      return undefined;
    }
  }

  async deleteTask(id: number): Promise<boolean> {
    await db.delete(tasks).where(eq(tasks.id, id));
    return true;
  }

  // Project Milestone methods

  // Billing Milestone methods
  async getBillingMilestones(): Promise<BillingMilestone[]> {
    try {
      return await db.select().from(billingMilestones).orderBy(billingMilestones.targetInvoiceDate);
    } catch (error) {
      console.error("Error in getBillingMilestones:", error);
      return [];
    }
  }

  async getBillingMilestone(id: number): Promise<BillingMilestone | undefined> {
    try {
      const [milestone] = await db.select().from(billingMilestones).where(eq(billingMilestones.id, id));
      return milestone;
    } catch (error) {
      console.error("Error in getBillingMilestone:", error);
      return undefined;
    }
  }

  async getProjectBillingMilestones(projectId: number): Promise<BillingMilestone[]> {
    return await db
      .select()
      .from(billingMilestones)
      .where(eq(billingMilestones.projectId, projectId))
      .orderBy(billingMilestones.targetInvoiceDate);
  }

  async getBillingMilestone(id: number): Promise<BillingMilestone | undefined> {
    const [milestone] = await db.select().from(billingMilestones).where(eq(billingMilestones.id, id));
    return milestone;
  }

  async createBillingMilestone(milestone: InsertBillingMilestone): Promise<BillingMilestone> {
    const [newMilestone] = await db.insert(billingMilestones).values(milestone).returning();
    return newMilestone;
  }

  async updateBillingMilestone(id: number, milestone: Partial<InsertBillingMilestone>): Promise<BillingMilestone | undefined> {
    const [updatedMilestone] = await db
      .update(billingMilestones)
      .set({ ...milestone, updatedAt: new Date() })
      .where(eq(billingMilestones.id, id))
      .returning();
    return updatedMilestone;
  }

  async deleteBillingMilestone(id: number): Promise<boolean> {
    await db.delete(billingMilestones).where(eq(billingMilestones.id, id));
    return true;
  }

  async deleteAllBillingMilestones(): Promise<number> {
    const result = await db.delete(billingMilestones);
    return result.count || 0;
  }

  // Project Costs methods
  async getProjectCosts(): Promise<ProjectCost[]> {
    try {
      return await db.select().from(projectCosts).orderBy(desc(projectCosts.updatedAt));
    } catch (error) {
      console.error("Error fetching project costs:", error);
      return [];
    }
  }

  async getProjectCost(projectId: number): Promise<ProjectCost | undefined> {
    try {
      const [cost] = await db.select().from(projectCosts).where(eq(projectCosts.projectId, projectId));
      return cost;
    } catch (error) {
      console.error(`Error fetching project cost for project ${projectId}:`, error);
      return undefined;
    }
  }

  async createProjectCost(cost: InsertProjectCost): Promise<ProjectCost> {
    try {
      const [newCost] = await db.insert(projectCosts).values(cost).returning();
      console.log("Project cost created successfully:", newCost.id);
      return newCost;
    } catch (error) {
      console.error("Error creating project cost:", error);
      throw error;
    }
  }

  async updateProjectCost(projectId: number, cost: Partial<InsertProjectCost>): Promise<ProjectCost | undefined> {
    try {
      const [updatedCost] = await db
        .update(projectCosts)
        .set({ ...cost, updatedAt: new Date() })
        .where(eq(projectCosts.projectId, projectId))
        .returning();

      if (!updatedCost) {
        console.error(`No project cost found for project ${projectId} for update`);
        return undefined;
      }

      console.log(`Project cost for project ${projectId} updated successfully`);
      return updatedCost;
    } catch (error) {
      console.error(`Error updating project cost for project ${projectId}:`, error);
      return undefined;
    }
  }

  async deleteProjectCost(projectId: number): Promise<boolean> {
    try {
      await db.delete(projectCosts).where(eq(projectCosts.projectId, projectId));
      return true;
    } catch (error) {
      console.error(`Error deleting project cost for project ${projectId}:`, error);
      return false;
    }
  }

  // Manufacturing Bay methods
  async getManufacturingBays(): Promise<ManufacturingBay[]> {
    return await db.select().from(manufacturingBays).orderBy(manufacturingBays.bayNumber);
  }

  async getManufacturingBay(id: number): Promise<ManufacturingBay | undefined> {
    const [bay] = await db.select().from(manufacturingBays).where(eq(manufacturingBays.id, id));
    return bay;
  }

  async createManufacturingBay(bay: InsertManufacturingBay): Promise<ManufacturingBay> {
    const [newBay] = await db.insert(manufacturingBays).values(bay).returning();
    return newBay;
  }

  async updateManufacturingBay(id: number, bay: Partial<InsertManufacturingBay>): Promise<ManufacturingBay | undefined> {
    try {
      console.log(`Storage: Updating manufacturing bay ${id} with data:`, JSON.stringify(bay));

      // Add validation for critical fields
      if (bay.team !== undefined) {
        console.log(`Storage: Team name being set to "${bay.team}"`);
      }

      if (bay.description !== undefined) {
        console.log(`Storage: Description being set to "${bay.description}"`);
      }

      // Make sure staffCount is consistent with staff counts if provided
      if (bay.assemblyStaffCount !== undefined && bay.electricalStaffCount !== undefined) {
        const calculatedTotal = (bay.assemblyStaffCount || 0) + (bay.electricalStaffCount || 0);

        // Only update staffCount if it's not explicitly set or doesn't match the calculation
        if (bay.staffCount === undefined || bay.staffCount !== calculatedTotal) {
          bay.staffCount = calculatedTotal;
          console.log(`Storage: Auto-corrected staffCount to ${bay.staffCount}`);
        }
      }

      // Perform the database update, ensuring we get all fields returned
      const [updatedBay] = await db
        .update(manufacturingBays)
        .set(bay)
        .where(eq(manufacturingBays.id, id))
        .returning();

      console.log(`Storage: Successfully updated bay ${id}:`, updatedBay ? 
        JSON.stringify({
          id: updatedBay.id, 
          name: updatedBay.name, 
          team: updatedBay.team, 
          description: updatedBay.description
        }) : "No bay returned");

      return updatedBay;
    } catch (error) {
      console.error(`Storage: Error updating manufacturing bay ${id}:`, error);
      throw error;
    }
  }

  async deleteManufacturingBay(id: number): Promise<boolean> {
    await db.delete(manufacturingBays).where(eq(manufacturingBays.id, id));
    return true;
  }

  // Manufacturing Schedule methods
  async getManufacturingSchedules(filters?: { bayId?: number, projectId?: number, startDate?: Date, endDate?: Date }): Promise<ManufacturingSchedule[]> {
    try {
      // Base query
      let baseQuery = db.select().from(manufacturingSchedules);

      if (filters) {
        const conditions = [];

        // Add bay filter
        if (filters.bayId !== undefined) {
          conditions.push(eq(manufacturingSchedules.bayId, filters.bayId));
        }

        // Add project filter
        if (filters.projectId !== undefined) {
          conditions.push(eq(manufacturingSchedules.projectId, filters.projectId));
        }

        // Add date range filters
        if (filters.startDate && filters.endDate) {
          // Find schedules that overlap with the given range
          conditions.push(
            sql`${manufacturingSchedules.startDate} <= ${filters.endDate.toISOString().split('T')[0]} AND ${manufacturingSchedules.endDate} >= ${filters.startDate.toISOString().split('T')[0]}`
          );
        } else if (filters.startDate) {
          conditions.push(sql`${manufacturingSchedules.startDate} >= ${filters.startDate.toISOString().split('T')[0]}`);
        } else if (filters.endDate) {
          conditions.push(sql`${manufacturingSchedules.endDate} <= ${filters.endDate.toISOString().split('T')[0]}`);
        }

        // Apply all conditions
        if (conditions.length > 0) {
          baseQuery = baseQuery.where(and(...conditions));
        }
      }

      // Execute query with sorting
      const results = await baseQuery.orderBy(manufacturingSchedules.startDate);

      // Cast and return the results
      return castSqlResult<ManufacturingSchedule>(results);
    } catch (error) {
      console.error("Error fetching manufacturing schedules:", error);
      return [];
    }
  }

  async getManufacturingSchedule(id: number): Promise<ManufacturingSchedule | undefined> {
    return await safeSingleQuery<ManufacturingSchedule>(() =>
      db.select().from(manufacturingSchedules).where(eq(manufacturingSchedules.id, id))
    );
  }

  async createManufacturingSchedule(schedule: InsertManufacturingSchedule & { forcedRowIndex?: number }): Promise<ManufacturingSchedule> {
    try {
      // 🚨 MAY 17 2025 - EMERGENCY ROW PLACEMENT ENHANCEMENT
      // HIGHEST PRIORITY PLACEMENT LOGIC - Guaranteed exact positioning

      // Add extended debug output for forcing row values
      console.log(`🔴🔴🔴 CRITICAL ROW DEBUG - All row values in createManufacturingSchedule:`);
      console.log(`- Original schedule.forcedRowIndex: ${schedule.forcedRowIndex}`);
      console.log(`- Original schedule.rowIndex: ${schedule.rowIndex}`);
      console.log(`- Original schedule.row: ${schedule.row}`);

      // CRITICAL: Calculate the best row value from all available sources
      // Priority: forcedRowIndex > rowIndex > row > 0 (default)
      const bestRowValue = 
        schedule.forcedRowIndex !== undefined ? Number(schedule.forcedRowIndex) :
        (schedule.rowIndex !== undefined ? Number(schedule.rowIndex) :
        (schedule.row !== undefined ? Number(schedule.row) : 0));

      // CRITICAL: Use this final calculated value for BOTH row fields to ensure consistency
      const scheduleWithRows = {
        ...schedule,
        // 🔴 CRITICAL: Force BOTH row values to be exactly the same
        row: bestRowValue,
        rowIndex: bestRowValue
        // Omit forcedRowIndex as it's not part of the schema
      };

      console.log(`⭐⭐⭐ ENHANCED ROW PLACEMENT - FINAL VALUES: 
        - Calculated best row: ${bestRowValue}
        - Final row value: ${scheduleWithRows.row}
        - Final rowIndex value: ${scheduleWithRows.rowIndex}
        - Target bay: ${scheduleWithRows.bayId}
        - This ensures projects appear EXACTLY where dropped with NO ADJUSTMENT
      `);

      // Insert with our guaranteed row values
      const [newSchedule] = await db.insert(manufacturingSchedules).values(scheduleWithRows).returning();

      console.log(`✅ SCHEDULE CREATED with GUARANTEED placement: Bay=${newSchedule.bayId}, Row=${newSchedule.row}`);
      console.log(`✅ DATABASE ROW VALUE VERIFICATION: ${newSchedule.row}`);
      return newSchedule;
    } catch (error) {
      console.error("Error creating manufacturing schedule:", error);
      throw error;
    }
  }

  async updateManufacturingSchedule(id: number, schedule: Partial<InsertManufacturingSchedule> & { forcedRowIndex?: number }): Promise<ManufacturingSchedule | undefined> {
    try {
      // 🚨 MAY 17 2025 - CRITICAL ROW PLACEMENT FIX FOR UPDATES 🚨
      console.log(`🔴 STORAGE UPDATE: Raw row parameters received for schedule ${id}:
        - Original schedule.forcedRowIndex: ${(schedule as any).forcedRowIndex}
        - Original schedule.rowIndex: ${schedule.rowIndex}
        - Original schedule.row: ${schedule.row}
      `);

      // CRITICAL PRIORITY ORDER: forcedRowIndex > rowIndex > row
      const finalRowValue = 
        schedule.forcedRowIndex !== undefined ? Number(schedule.forcedRowIndex) :
        schedule.rowIndex !== undefined ? Number(schedule.rowIndex) :
        schedule.row !== undefined ? Number(schedule.row) : undefined;

      // If we have a final row value, use it for both row fields
      // If not, preserve the existing values
      const scheduleWithRows = {
        ...schedule,
        updatedAt: new Date(),
        // Only set these if we calculated a final row value
        ...(finalRowValue !== undefined ? { 
          row: finalRowValue,
          rowIndex: finalRowValue // Match rowIndex to row for consistency
        } : {})
      };

      console.log(`🚨 MANUFACTURING SCHEDULE UPDATE ${id}: PRESERVING EXACT ROW PLACEMENT`);
      if (finalRowValue !== undefined) {
        console.log(`  - 🔴 CRITICAL: Forcing exact row placement: ${finalRowValue}`);
        console.log(`  - This ensures projects stay EXACTLY where dropped by users`);
        console.log(`  - Priority order: forcedRowIndex > rowIndex > row`);
      }
      if (schedule.bayId !== undefined) {
        console.log(`  - Using exact bay: ${schedule.bayId}`);
      }

      const [updatedSchedule] = await db
        .update(manufacturingSchedules)
        .set(scheduleWithRows)
        .where(eq(manufacturingSchedules.id, id))
        .returning();

      console.log(`✅ SCHEDULE UPDATED with GUARANTEED placement: Bay=${updatedSchedule.bayId}, Row=${updatedSchedule.row}`);
      return updatedSchedule;
    } catch (error) {
      console.error(`Error updating manufacturing schedule ${id}:`, error);
      throw error;
    }
  }

  async deleteManufacturingSchedule(id: number): Promise<boolean> {
    try {
      // Delete the schedule with the given ID
      const result = await db.delete(manufacturingSchedules).where(eq(manufacturingSchedules.id, id));
      console.log(`Deleted manufacturing schedule with ID ${id}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete manufacturing schedule ${id}:`, error);
      return false;
    }
  }

  async getBayManufacturingSchedules(bayId: number): Promise<ManufacturingSchedule[]> {
    try {
      const results = await db
        .select()
        .from(manufacturingSchedules)
        .where(eq(manufacturingSchedules.bayId, bayId))
        .orderBy(manufacturingSchedules.startDate);

      return castSqlResult<ManufacturingSchedule>(results);
    } catch (error) {
      console.error("Error fetching bay manufacturing schedules:", error);
      return [];
    }
  }

  async getProjectManufacturingSchedules(projectId: number): Promise<ManufacturingSchedule[]> {
    try {
      const results = await db
        .select()
        .from(manufacturingSchedules)
        .where(eq(manufacturingSchedules.projectId, projectId))
        .orderBy(manufacturingSchedules.startDate);

      return castSqlResult<ManufacturingSchedule>(results);
    } catch (error) {
      console.error("Error fetching project manufacturing schedules:", error);
      return [];
    }
  }

  // Allowed Emails
  async getAllowedEmails(): Promise<AllowedEmail[]> {
    return await db.select().from(allowedEmails).orderBy(allowedEmails.emailPattern);
  }

  async getAllowedEmail(id: number): Promise<AllowedEmail | undefined> {
    const [email] = await db.select().from(allowedEmails).where(eq(allowedEmails.id, id));
    return email;
  }

  async createAllowedEmail(allowedEmail: InsertAllowedEmail): Promise<AllowedEmail> {
    const [email] = await db.insert(allowedEmails).values(allowedEmail).returning();
    return email;
  }

  async updateAllowedEmail(id: number, allowedEmail: Partial<InsertAllowedEmail>): Promise<AllowedEmail | undefined> {
    const [updatedEmail] = await db
      .update(allowedEmails)
      .set({ ...allowedEmail, updatedAt: new Date() })
      .where(eq(allowedEmails.id, id))
      .returning();
    return updatedEmail;
  }

  async deleteAllowedEmail(id: number): Promise<boolean> {
    await db.delete(allowedEmails).where(eq(allowedEmails.id, id));
    return true;
  }

  async checkIsEmailAllowed(email: string): Promise<{ allowed: boolean, autoApprove: boolean, defaultRole: string } | undefined> {
    try {
      console.log(`[EMAIL CHECK] Checking if email is allowed: ${email}`);
      if (!email) {
        console.log(`[EMAIL CHECK] Empty email provided, not allowed`);
        return { allowed: false, autoApprove: false, defaultRole: "pending" };
      }

      // Get all allowed email patterns
      const allowedEmailsList = await this.getAllowedEmails();
      console.log(`[EMAIL CHECK] Found ${allowedEmailsList.length} email patterns`);

      // No patterns defined, allow anyone but set to pending
      if (allowedEmailsList.length === 0) {
        console.log(`[EMAIL CHECK] No email patterns defined, allowing with pending status`);
        return { allowed: true, autoApprove: false, defaultRole: "pending" };
      }

      // Output all patterns for debugging
      console.log(`[EMAIL CHECK] Available patterns:`);
      allowedEmailsList.forEach(pattern => {
        console.log(`  - Pattern: ${pattern.emailPattern}, Auto-approve: ${pattern.autoApprove}, Role: ${pattern.defaultRole}`);
      });

      // Check each pattern for a match
      for (const pattern of allowedEmailsList) {
        // Convert pattern to regex (replace * with .*)
        const regexPattern = pattern.emailPattern.replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`, 'i');

        const matches = regex.test(email);
        console.log(`[EMAIL CHECK] Checking pattern "${pattern.emailPattern}" against "${email}": ${matches ? 'MATCH' : 'no match'}`);

        if (matches) {
          // Fix the issue with autoApprove
          // Force pattern.autoApprove to be a boolean true/false value
          const isAutoApproved = pattern.autoApprove === true;
          const role = pattern.defaultRole || "viewer";

          console.log(`[EMAIL CHECK] Email ALLOWED with auto-approve: ${isAutoApproved}, role: ${role}`);

          return { 
            allowed: true, 
            autoApprove: isAutoApproved, // Fix: Use the boolean variable
            defaultRole: role
          };
        }
      }

      // If no match found, return default behavior
      console.log(`[EMAIL CHECK] No matching pattern found, email NOT allowed`);
      return { allowed: false, autoApprove: false, defaultRole: "pending" };
    } catch (error) {
      console.error("[EMAIL CHECK] Error checking allowed email:", error);
      return { allowed: false, autoApprove: false, defaultRole: "pending" };
    }
  }

  // Notification methods
  async getNotifications(userId?: string, options?: { unreadOnly?: boolean, limit?: number }): Promise<Notification[]> {
    try {
      // Building the query
      let baseQuery = db.select().from(notifications);

      // Filter conditions
      if (userId) {
        // Get notifications for specific user OR global notifications
        baseQuery = baseQuery.where(
          and(
            or(
              eq(notifications.userId, userId),
              isNull(notifications.userId)
            ),
            // Only get non-expired notifications
            or(
              isNull(notifications.expiresAt),
              gte(notifications.expiresAt, new Date())
            )
          )
        );
      }

      // Filter for unread notifications if requested
      if (options?.unreadOnly) {
        baseQuery = baseQuery.where(eq(notifications.isRead, false));
      }

      // Sorting newest first
      baseQuery = baseQuery.orderBy(desc(notifications.createdAt));

      // Add limit if provided
      if (options?.limit) {
        baseQuery = baseQuery.limit(options.limit);
      }

      // Execute the query
      const results = await baseQuery;

      // Cast and return the results
      return castSqlResult<Notification>(results);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  }

  async getNotificationById(id: number): Promise<Notification | undefined> {
    return await safeSingleQuery<Notification>(() =>
      db.select().from(notifications).where(eq(notifications.id, id))
    );
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [newNotification] = await db
        .insert(notifications)
        .values(notification)
        .returning();
      return newNotification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    try {
      const [updatedNotification] = await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id))
        .returning();
      return updatedNotification;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return undefined;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      // Mark both user-specific notifications AND global notifications (userId = null) as read
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            or(
              eq(notifications.userId, userId),
              isNull(notifications.userId)
            ),
            eq(notifications.isRead, false)
          )
        );
      console.log(`Marked all notifications as read for user ${userId}`);
      return true;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }
  }

  async deleteNotification(id: number): Promise<boolean> {
    try {
      await db.delete(notifications).where(eq(notifications.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting notification:", error);
      return false;
    }
  }

  async deleteAllNotifications(userId: string): Promise<boolean> {
    try {
      await db.delete(notifications).where(eq(notifications.userId, userId));
      return true;
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      return false;
    }
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            or(
              eq(notifications.userId, userId),
              isNull(notifications.userId)
            ),
            eq(notifications.isRead, false),
            or(
              isNull(notifications.expiresAt),
              gte(notifications.expiresAt, new Date())
            )
          )
        );

      return result[0]?.count || 0;
    } catch (error) {
      console.error("Error counting unread notifications:", error);
      return 0;
    }
  }

  // Archived Projects methods implementation
  async getArchivedProjects(): Promise<ArchivedProject[]> {
    try {
      return await db.select().from(archivedProjects).orderBy(desc(archivedProjects.archivedAt));
    } catch (error) {
      console.error("Error retrieving archived projects:", error);
      return [];
    }
  }

  async getArchivedProject(id: number): Promise<ArchivedProject | undefined> {
    try {
      const [archivedProject] = await db
        .select()
        .from(archivedProjects)
        .where(eq(archivedProjects.id, id));
      return archivedProject;
    } catch (error) {
      console.error(`Error retrieving archived project ${id}:`, error);
      return undefined;
    }
  }

  async archiveProject(projectId: number, userId: string, reason?: string): Promise<ArchivedProject | undefined> {
    try {
      // Begin transaction
      return await db.transaction(async (tx) => {
        // 1. Fetch the project to be archived
        const [project] = await tx
          .select()
          .from(projects)
          .where(eq(projects.id, projectId));

        if (!project) {
          console.error(`Project with ID ${projectId} not found for archiving`);
          return undefined;
        }

        // 2. Create archive entry with all project data
        const archiveData = {
          originalId: project.id,
          projectNumber: project.projectNumber,
          name: project.name,
          description: project.description,
          pmOwnerId: project.pmOwnerId,
          pmOwner: project.pmOwner,
          team: project.team,
          location: project.location,
          contractDate: project.contractDate,
          startDate: project.startDate,
          estimatedCompletionDate: project.estimatedCompletionDate,
          actualCompletionDate: project.actualCompletionDate,
          chassisETA: project.chassisETA,
          fabricationStart: project.fabricationStart,
          assemblyStart: project.assemblyStart,
          wrapDate: project.wrapDate,
          ntcTestingDate: project.ntcTestingDate,
          qcStartDate: project.qcStartDate,
          executiveReviewDate: project.executiveReviewDate,
          shipDate: project.shipDate,
          deliveryDate: project.deliveryDate,
          totalHours: project.totalHours,
          fabPercentage: project.fabPercentage,
          paintPercentage: project.paintPercentage,
          productionPercentage: project.productionPercentage,
          itPercentage: project.itPercentage,
          ntcPercentage: project.ntcPercentage,
          qcPercentage: project.qcPercentage,
          fabWeeks: project.fabWeeks,
          percentComplete: project.percentComplete,
          dpasRating: project.dpasRating,
          stretchShortenGears: project.stretchShortenGears,
          lltsOrdered: project.lltsOrdered,
          qcDays: project.qcDays,
          meAssigned: project.meAssigned,
          meDesignOrdersPercent: project.meDesignOrdersPercent,
          eeAssigned: project.eeAssigned,
          eeDesignOrdersPercent: project.eeDesignOrdersPercent,
          iteAssigned: project.iteAssigned,
          itDesignOrdersPercent: project.itDesignOrdersPercent,
          ntcDesignOrdersPercent: project.ntcDesignOrdersPercent,
          status: "archived",
          riskLevel: project.riskLevel,
          hasBillingMilestones: project.hasBillingMilestones,
          notes: project.notes,
          rawData: project.rawData,
          archivedAt: new Date(),
          archivedBy: userId,
          archiveReason: reason || "Project archived by user",
          originalCreatedAt: project.createdAt,
        };

        // 3. Insert into archived_projects table
        const [archivedProject] = await tx
          .insert(archivedProjects)
          .values(archiveData)
          .returning();

        if (!archivedProject) {
          throw new Error(`Failed to create archive record for project ${projectId}`);
        }

        // 4. Delete related data first to handle foreign key constraints

        // Delete notifications related to this project
        await tx
          .delete(notifications)
          .where(eq(notifications.relatedProjectId, projectId));

        // Delete billing milestones
        await tx
          .delete(billingMilestones)
          .where(eq(billingMilestones.projectId, projectId));

        // Delete tasks
        await tx
          .delete(tasks)
          .where(eq(tasks.projectId, projectId));

        // Delete project costs
        await tx
          .delete(projectCosts)
          .where(eq(projectCosts.projectId, projectId));

        // Delete manufacturing schedules
        await tx
          .delete(manufacturingSchedules)
          .where(eq(manufacturingSchedules.projectId, projectId));

        // Delete delivery tracking records
        await tx
          .delete(deliveryTracking)
          .where(eq(deliveryTracking.projectId, projectId));

        // Delete sales deals that converted to this project
        await tx
          .delete(salesDeals)
          .where(eq(salesDeals.convertedProjectId, projectId));

        // Delete project supply chain benchmarks
        console.log(`Deleting supply chain benchmarks for project ${projectId}`);
        const deletedBenchmarks = await tx
          .delete(projectSupplyChainBenchmarks)
          .where(eq(projectSupplyChainBenchmarks.projectId, projectId));
        console.log(`Deleted ${deletedBenchmarks.rowCount || 0} supply chain benchmark records`);

        // 5. Now delete the original project
        await tx
          .delete(projects)
          .where(eq(projects.id, projectId));

        // 6. Create a notification about the archived project
        await tx
          .insert(notifications)
          .values({
            userId,
            title: "Project Archived",
            message: `Project ${project.projectNumber} (${project.name}) has been archived.`,
            type: "system",
            priority: "medium",
            relatedProjectId: null, // Project is now archived, so no direct reference
          });

        console.log(`Project ${projectId} (${project.projectNumber}) archived successfully`);
        return archivedProject;
      });
    } catch (error) {
      console.error(`Error archiving project ${projectId}:`, error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      return undefined;
    }
  }

  async removeManufacturingScheduleByProjectId(projectId: number): Promise<boolean> {
    try {
      console.log(`Removing manufacturing schedules for project ID ${projectId}`);

      const result = await db
        .delete(manufacturingSchedules)
        .where(eq(manufacturingSchedules.projectId, projectId));

      console.log(`Successfully removed manufacturing schedules for project ID ${projectId}`);
      return true;
    } catch (error) {
      console.error(`Error removing manufacturing schedules for project ID ${projectId}:`, error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      return false;
    }
  }

  async restoreProject(projectId: number, userId: string): Promise<Project | undefined> {
    try {
      // Begin transaction
      return await db.transaction(async (tx) => {
        // 1. Fetch the archived project
        const [archivedProject] = await tx
          .select()
          .from(archivedProjects)
          .where(eq(archivedProjects.id, projectId));

        if (!archivedProject) {
          console.error(`Archived project with ID ${projectId} not found for restoration`);
          return undefined;
        }

        // 2. Create project entry with recovered data
        const projectData = {
          id: archivedProject.originalId, // Use the original ID
          projectNumber: archivedProject.projectNumber,
          name: archivedProject.name,
          description: archivedProject.description,
          pmOwnerId: archivedProject.pmOwnerId,
          pmOwner: archivedProject.pmOwner,
          team: archivedProject.team,
          location: archivedProject.location,
          contractDate: archivedProject.contractDate,
          startDate: archivedProject.startDate,
          estimatedCompletionDate: archivedProject.estimatedCompletionDate,
          actualCompletionDate: archivedProject.actualCompletionDate,
          chassisETA: archivedProject.chassisETA,
          fabricationStart: archivedProject.fabricationStart,
          assemblyStart: archivedProject.assemblyStart,
          wrapDate: archivedProject.wrapDate,
          ntcTestingDate: archivedProject.ntcTestingDate,
          qcStartDate: archivedProject.qcStartDate,
          executiveReviewDate: archivedProject.executiveReviewDate,
          shipDate: archivedProject.shipDate,
          deliveryDate: archivedProject.deliveryDate,
          percentComplete: archivedProject.percentComplete,
          dpasRating: archivedProject.dpasRating,
          stretchShortenGears: archivedProject.stretchShortenGears,
          lltsOrdered: archivedProject.lltsOrdered,
          qcDays: archivedProject.qcDays,
          meAssigned: archivedProject.meAssigned,
          meDesignOrdersPercent: archivedProject.meDesignOrdersPercent,
          eeAssigned: archivedProject.eeAssigned,
          eeDesignOrdersPercent: archivedProject.eeDesignOrdersPercent,
          iteAssigned: archivedProject.iteAssigned,
          itDesignOrdersPercent: archivedProject.itDesignOrdersPercent,
          ntcDesignOrdersPercent: archivedProject.ntcDesignOrdersPercent,
          status: "active", // Set status back to active
          hasBillingMilestones: archivedProject.hasBillingMilestones,
          notes: archivedProject.notes ? 
            archivedProject.notes + 
            `\n\n[${new Date().toISOString()}] Project restored from archive by user ID ${userId}` :
            `[${new Date().toISOString()}] Project restored from archive by user ID ${userId}`,
          rawData: archivedProject.rawData,
          createdAt: archivedProject.originalCreatedAt,
          updatedAt: new Date(),
        };

        // 3. Insert into projects table
        const [restoredProject] = await tx
          .insert(projects)
          .values(projectData)
          .returning();

        if (!restoredProject) {
          throw new Error(`Failed to insert restored project ${projectId}`);
        }

        // 4. Delete the archived project
        await tx
          .delete(archivedProjects)
          .where(eq(archivedProjects.id, projectId));

        // 5. Create a notification for the project restoration
        await tx
          .insert(notifications)
          .values({
            title: "Project Restored",
            message: `Project ${restoredProject.projectNumber}: ${restoredProject.name} has been restored from the archive.`,
            type: "system",
            priority: "medium",
            relatedProjectId: restoredProject.id,
            createdAt: new Date(),
          });

        console.log(`Project ${projectId} (${restoredProject.projectNumber}) restored successfully`);
        return restoredProject;
      });
    } catch (error) {
      console.error(`Error restoring project ${projectId}:`, error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      return undefined;
    }
  }

  // Delivered Projects methods
  async getDeliveredProjects(): Promise<Project[]> {
    return await safeQuery<Project>(() =>
      db.select()
        .from(projects)
        .where(eq(projects.status, 'delivered'))
        .orderBy(desc(projects.deliveryDate))
    );
  }

  async updateDeliveredProjectReason(projectId: number, reason: string): Promise<boolean> {
    try {
      console.log("🔥🔥🔥 STORAGE: Starting reason update for project", projectId, "with value:", reason);

      const result = await db.update(projects)
        .set({ lateDeliveryReason: reason })
        .where(eq(projects.id, projectId));

      console.log("🔥🔥🔥 STORAGE: Update result:", result);
      console.log("🔥🔥🔥 STORAGE: Result type:", typeof result);
      console.log("🔥🔥🔥 STORAGE: Result stringified:", JSON.stringify(result));

      // For Drizzle ORM, a successful update doesn't throw and the result exists
      console.log("🎉 STORAGE: Successfully updated responsibility");
      return true;
    } catch (error) {
      console.error("💥💥💥 STORAGE ERROR:", error);
      return false;
    }
  }

  async updateDeliveredProjectResponsibility(projectId: number, responsibility: string): Promise<boolean> {
    try {
      console.log("🔥🔥🔥 STORAGE: Starting responsibility update for project", projectId, "with value:", responsibility);

      // First, let's verify the project exists
      const existingProject = await this.getProject(projectId);
      if (!existingProject) {
        console.error("💥 STORAGE: Project not found with ID:", projectId);
        return false;
      }

      console.log("🔥🔥🔥 STORAGE: Project exists, proceeding with update");

      // Use the same pattern as other successful updates in storage
      const [updatedProject] = await db.update(projects)
        .set({ 
          delayResponsibility: responsibility as any,
          updatedAt: new Date()
        })
        .where(eq(projects.id, projectId))
        .returning();

      if (updatedProject) {
        console.log("🎉 STORAGE: Successfully updated responsibility for project", projectId, "to:", responsibility);
        return true;
      } else {
        console.log("💥 STORAGE: Update completed but no project returned");
        return false;
      }
    } catch (error) {
      console.error("💥💥💥 STORAGE RESPONSIBILITY ERROR:", error);
      // Log the specific error details
      if (error instanceof Error) {
        console.error("💥💥💥 Error message:", error.message);
        console.error("💥💥💥 Error stack:", error.stack);
      }
      return false;
    }
  }

  async updateDeliveredProjectContractExtensions(projectId: number, contractExtensions: number): Promise<boolean> {
    try {
      console.log("🔥 STORAGE: Starting contract extensions update for project", projectId, "with value:", contractExtensions);

      // First, verify the project exists
      const existingProject = await this.getProject(projectId);
      if (!existingProject) {
        console.error("💥 STORAGE: Project not found with ID:", projectId);
        return false;
      }

      console.log("🔥 STORAGE: Project exists, proceeding with update");

      const [updatedProject] = await db.update(projects)
        .set({ 
          contractExtensions: contractExtensions,
          updatedAt: new Date()
        })
        .where(eq(projects.id, projectId))
        .returning();

      if (updatedProject) {
        console.log("🎉 STORAGE: Successfully updated contract extensions for project", projectId, "to:", contractExtensions);
        return true;
      } else {
        console.log("💥 STORAGE: Update completed but no project returned");
        return false;
      }
    } catch (error) {
      console.error("💥 STORAGE CONTRACT EXTENSIONS ERROR:", error);
      if (error instanceof Error) {
        console.error("💥 Error message:", error.message);
        console.error("💥 Error stack:", error.stack);
      }
      return false;
    }
  }

  // Delivery Tracking methods
  async getDeliveryTrackings(): Promise<DeliveryTracking[]> {
    return await safeQuery<DeliveryTracking>(() => 
      db.select().from(deliveryTracking).orderBy(desc(deliveryTracking.updatedAt))
    );
  }

  async getProjectDeliveryTrackings(projectId: number): Promise<DeliveryTracking[]> {
    return await safeQuery<DeliveryTracking>(() => 
      db.select()
        .from(deliveryTracking)
        .where(eq(deliveryTracking.projectId, projectId))
        .orderBy(desc(deliveryTracking.updatedAt))
    );
  }

  async getDeliveryTracking(id: number): Promise<DeliveryTracking | undefined> {
    return await safeSingleQuery<DeliveryTracking>(() => 
      db.select().from(deliveryTracking).where(eq(deliveryTracking.id, id))
    );
  }

  async createDeliveryTracking(tracking: InsertDeliveryTracking): Promise<DeliveryTracking> {
    try {
      console.log("Creating delivery tracking with data:", JSON.stringify(tracking, null, 2));
      const [newTracking] = await db.insert(deliveryTracking).values(tracking).returning();
      console.log("Delivery tracking created successfully:", newTracking.id);
      return newTracking;
    } catch (error) {
      console.error("Error creating delivery tracking:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw error;
    }
  }

  // Data migration methods
  async updateDefaultProjectHours(): Promise<number> {
    try {
      console.log("Updating default project hours from 40 to 1000...");
      // Update all active projects with default hours of 40
      const result = await db
        .update(projects)
        .set({ 
          totalHours: 1000,
          updatedAt: new Date()
        })
        .where(eq(projects.totalHours, 40))
        .returning();

      // Also update archived projects
      const archivedResult = await db
        .update(archivedProjects)
        .set({ 
          totalHours: 1000,
          updatedAt: new Date()
        })
        .where(eq(archivedProjects.totalHours, 40))
        .returning();

      const totalUpdated = result.length + archivedResult.length;
      console.log(`Successfully updated hours for ${totalUpdated} projects (${result.length} active, ${archivedResult.length} archived)`);

      return totalUpdated;
    } catch (error) {
      console.error("Error updating project hours:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw error;
    }
  }

  async updateDefaultScheduleHours(): Promise<number> {
    try {
      console.log("Updating default manufacturing schedule hours from 40 to 1000...");
      // Update all schedules with default hours of 40
      const result = await db
        .update(manufacturingSchedules)
        .set({ 
          totalHours: 1000,
          updatedAt: new Date()
        })
        .where(eq(manufacturingSchedules.totalHours, 40))
        .returning();

      console.log(`Successfully updated hours for ${result.length} manufacturing schedules`);
      return result.length;
    } catch (error) {
      console.error("Error updating manufacturing schedule hours:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw error;
    }
  }

  // Sales Deals methods
  async getSalesDeals(filters?: { isActive?: boolean, ownerId?: string, dealStage?: string, dealType?: string, priority?: string }): Promise<SalesDeal[]> {
    try {
      let query = db.select().from(salesDeals);

      // Apply filters if provided
      if (filters) {
        const conditions: SQL<unknown>[] = [];

        if (filters.isActive !== undefined) {
          conditions.push(eq(salesDeals.isActive, filters.isActive));
        }

        if (filters.ownerId) {
          conditions.push(eq(salesDeals.ownerId, filters.ownerId));
        }

        if (filters.dealStage) {
          conditions.push(eq(salesDeals.dealStage, filters.dealStage));
        }

        if (filters.dealType) {
          conditions.push(eq(salesDeals.dealType, filters.dealType));
        }

        if (filters.priority) {
          conditions.push(eq(salesDeals.priority, filters.priority));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }

      return await query.orderBy(desc(salesDeals.updatedAt));
    } catch (error) {
      console.error("Error fetching sales deals:", error);
      return [];
    }
  }

  async getSalesDeal(id: number): Promise<SalesDeal | undefined> {
    try {
      const [deal] = await db.select().from(salesDeals).where(eq(salesDeals.id, id));
      return deal;
    } catch (error) {
      console.error(`Error fetching sales deal with ID ${id}:`, error);
      return undefined;
    }
  }

  async getSalesDealByNumber(dealNumber: string): Promise<SalesDeal | undefined> {
    try {
      const [deal] = await db.select().from(salesDeals).where(eq(salesDeals.dealNumber, dealNumber));
      return deal;
    } catch (error) {
      console.error(`Error fetching sales deal with number ${dealNumber}:`, error);
      return undefined;
    }
  }

  async createSalesDeal(deal: InsertSalesDeal): Promise<SalesDeal> {
    try {
      const [newDeal] = await db.insert(salesDeals).values(deal).returning();
      console.log("Sales deal created successfully:", newDeal.id, newDeal.dealNumber);
      return newDeal;
    } catch (error) {
      console.error("Error creating sales deal:", error);
      throw error;
    }
  }

  async updateSalesDeal(id: number, deal: Partial<InsertSalesDeal>): Promise<SalesDeal | undefined> {
    try {
      const [updatedDeal] = await db
        .update(salesDeals)
        .set({ ...deal, updatedAt: new Date() })
        .where(eq(salesDeals.id, id))
        .returning();

      if (!updatedDeal) {
        console.error(`No sales deal found with ID ${id} for update`);
        return undefined;
      }

      console.log(`Sales deal ${id} updated successfully`);
      return updatedDeal;
    } catch (error) {
      console.error(`Error updating sales deal ${id}:`, error);
      return undefined;
    }
  }

  async deleteSalesDeal(id: number): Promise<boolean> {
    try {
      await db.delete(salesDeals).where(eq(salesDeals.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting sales deal ${id}:`, error);
      return false;
    }
  }

  async convertSalesDealToProject(id: number, projectId: number): Promise<SalesDeal | undefined> {
    try {
      const [updatedDeal] = await db
        .update(salesDeals)
        .set({ 
          isConverted: true, 
          convertedProjectId: projectId,
          actualCloseDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(salesDeals.id, id))
        .returning();

      if (!updatedDeal) {
        console.error(`No sales deal found with ID ${id} for conversion`);
        return undefined;
      }

      console.log(`Sales deal ${id} converted to project ${projectId} successfully`);
      return updatedDeal;
    } catch (error) {
      console.error(`Error converting sales deal ${id} to project:`, error);
      return undefined;
    }
  }

  async getUserSalesDeals(userId: string): Promise<SalesDeal[]> {
    try {
      return await db
        .select()
        .from(salesDeals)
        .where(eq(salesDeals.ownerId, userId))
        .orderBy(desc(salesDeals.updatedAt));
    } catch (error) {
      console.error(`Error fetching sales deals for user ${userId}:`, error);
      return [];
    }
  }

  // Financial Goals CRUD operations
  async getFinancialGoals(): Promise<FinancialGoal[]> {
    try {
      return await db
        .select()
        .from(financialGoals)
        .orderBy(financialGoals.year, financialGoals.month, financialGoals.week);
    } catch (error) {
      console.error("Error fetching financial goals:", error);
      return [];
    }
  }

  async getWeeklyFinancialGoals(year: number, month: number): Promise<FinancialGoal[]> {
    try {
      return await db
        .select()
        .from(financialGoals)
        .where(and(
          eq(financialGoals.year, year),
          eq(financialGoals.month, month),
          isNotNull(financialGoals.week)
        ))
        .orderBy(financialGoals.week);
    } catch (error) {
      console.error(`Error fetching weekly financial goals for ${year}-${month}:`, error);
      return [];
    }
  }

  async getFinancialGoalByYearMonth(
    year: number, 
    month: number, 
    week?: number
  ): Promise<FinancialGoal | undefined> {
    try {
      let conditions = [
        eq(financialGoals.year, year),
        eq(financialGoals.month, month)
      ];

      // If week is provided, filter by that specific week
      // If week is undefined, filter for entries where week IS NULL (month-level goals)
      if (week !== undefined) {
        conditions.push(eq(financialGoals.week, week));
      } else {
        conditions.push(isNull(financialGoals.week));
      }

      const [goal] = await db
        .select()
        .from(financialGoals)
        .where(and(...conditions));

      return goal;
    } catch (error) {
      const periodStr = week !== undefined ? `${year}-${month}-W${week}` : `${year}-${month}`;
      console.error(`Error fetching financial goal for ${periodStr}:`, error);
      return undefined;
    }
  }

  async createFinancialGoal(goalData: InsertFinancialGoal): Promise<FinancialGoal | undefined> {
    try {
      const [goal] = await db
        .insert(financialGoals)
        .values(goalData)
        .returning();

      return goal;
    } catch (error) {
      console.error("Error creating financial goal:", error);
      return undefined;
    }
  }

  async updateFinancialGoal(
    year: number, 
    month: number, 
    goalData: Partial<InsertFinancialGoal>,
    week?: number
  ): Promise<FinancialGoal | undefined> {
    try {
      let conditions = [
        eq(financialGoals.year, year),
        eq(financialGoals.month, month)
      ];

      // If week is provided, filter by that specific week
      // If week is undefined, filter for entries where week IS NULL (month-level goals)
      if (week !== undefined) {
        conditions.push(eq(financialGoals.week, week));
      } else {
        conditions.push(isNull(financialGoals.week));
      }

      const [updatedGoal] = await db
        .update(financialGoals)
        .set({ ...goalData, updatedAt: new Date() })
        .where(and(...conditions))
        .returning();

      return updatedGoal;
    } catch (error) {
      const periodStr = week !== undefined ? `${year}-${month}-W${week}` : `${year}-${month}`;
      console.error(`Error updating financial goal for ${periodStr}:`, error);
      return undefined;
    }
  }

  async deleteFinancialGoal(
    year: number, 
    month: number,
    week?: number
  ): Promise<boolean> {
    try {
      let conditions = [
        eq(financialGoals.year, year),
        eq(financialGoals.month, month)
      ];

      // If week is provided, filter by that specific week
      // If week is undefined, filter for entries where week IS NULL (month-level goals)
      if (week !== undefined) {
        conditions.push(eq(financialGoals.week, week));
      } else {
        conditions.push(isNull(financialGoals.week));
      }

      await db
        .delete(financialGoals)
        .where(and(...conditions));

      return true;
    } catch (error) {
      const periodStr = week !== undefined ? `${year}-${month}-W${week}` : `${year}-${month}`;
      console.error(`Error deleting financial goal for ${periodStr}:`, error);
      return false;
    }
  }
  // Execute arbitrary SQL query with parameters
  async executeSql(query: string, params: any[] = []) {
    try {
      const prepared = sql`${sql.raw(query)}`;
      return await db.execute(prepared, params);
    } catch (error) {
      console.error("Error executing SQL query:", error);
      throw error;
    }
  }

  // User Module Visibility Management
  async updateUserModuleVisibility(userId: string, moduleId: string, visible: boolean): Promise<void> {
    try {
      // Use raw SQL since the existing table structure doesn't match our schema
      await db.execute(sql`
        INSERT INTO user_module_visibility (user_id, module, is_visible, created_at, updated_at)
        VALUES (${userId}, ${moduleId}, ${visible}, NOW(), NOW())
        ON CONFLICT (user_id, module)
        DO UPDATE SET 
          is_visible = ${visible},
          updated_at = NOW()
      `);
    } catch (error) {
      console.error("Error updating user module visibility:", error);
      throw error;
    }
  }

  async getUserModuleVisibility(userId: string): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT user_id, module, is_visible, created_at, updated_at
        FROM user_module_visibility
        WHERE user_id = ${userId}
      `);
      return result.rows;
    } catch (error) {
      console.error("Error fetching user module visibility:", error);
      return [];
    }
  }

  // Role Permissions Management
  async getRolePermissions(role?: string): Promise<typeof rolePermissions.$inferSelect[]> {
    try {
      if (role) {
        return await db
          .select()
          .from(rolePermissions)
          .where(eq(rolePermissions.role, role))
          .orderBy(rolePermissions.category, rolePermissions.feature);
      } else {
        return await db
          .select()
          .from(rolePermissions)
          .orderBy(rolePermissions.role, rolePermissions.category, rolePermissions.feature);
      }
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      return [];
    }
  }

  async getRolePermissionsByCategory(role: string, category: string): Promise<typeof rolePermissions.$inferSelect[]> {
    try {
      return await db
        .select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.role, role),
          eq(rolePermissions.category, category as any)
        ))
        .orderBy(rolePermissions.feature);
    } catch (error) {
      console.error(`Error fetching permissions for role ${role} in category ${category}:`, error);
      return [];
    }
  }

  async getRolePermission(id: number): Promise<typeof rolePermissions.$inferSelect | undefined> {
    try {
      const [permission] = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.id, id));
      return permission;
    } catch (error) {
      console.error(`Error fetching permission with ID ${id}:`, error);
      return undefined;
    }
  }

  async createRolePermission(permission: typeof rolePermissions.$inferInsert): Promise<typeof rolePermissions.$inferSelect | undefined> {
    try {
      const [newPermission] = await db
        .insert(rolePermissions)
        .values(permission)
        .returning();
      return newPermission;
    } catch (error) {
      console.error("Error creating role permission:", error);
      return undefined;
    }
  }

  async updateRolePermission(id: number, data: Partial<typeof rolePermissions.$inferInsert>): Promise<typeof rolePermissions.$inferSelect | undefined> {
    try {
      const [updatedPermission] = await db
        .update(rolePermissions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(rolePermissions.id, id))
        .returning();
      return updatedPermission;
    } catch (error) {
      console.error(`Error updating permission with ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteRolePermission(id: number): Promise<boolean> {
    try {
      await db
        .delete(rolePermissions)
        .where(eq(rolePermissions.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting permission with ID ${id}:`, error);
      return false;
    }
  }

  async bulkUpdateRolePermissions(role: string, permissions: Partial<typeof rolePermissions.$inferInsert>[]): Promise<number> {
    try {
      let updateCount = 0;

      // Use a transaction to ensure all updates complete or none do
      await db.transaction(async (tx) => {
        for (const permission of permissions) {
          if (permission.id) {
            // Update existing permission
            await tx
              .update(rolePermissions)
              .set({ ...permission, updatedAt: new Date() })
              .where(eq(rolePermissions.id, permission.id));
            updateCount++;
          } else if (permission.feature && permission.category) {
            // Create new permission
            await tx
              .insert(rolePermissions)
              .values({
                ...permission,
                role,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            updateCount++;
          }
        }
      });

      return updateCount;
    } catch (error) {
      console.error(`Error bulk updating permissions for role ${role}:`, error);
      return 0;
    }
  }

  // User-specific permissions management
  async getUserPermissions(userId: string): Promise<typeof userPermissions.$inferSelect[]> {
    try {
      return await db
        .select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, userId))
        .orderBy(userPermissions.module);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      return [];
    }
  }

  async createUserPermission(data: typeof userPermissions.$inferInsert): Promise<typeof userPermissions.$inferSelect> {
    try {
      const [permission] = await db.insert(userPermissions).values(data).returning();
      return permission;
    } catch (error) {
      console.error("Error creating user permission:", error);
      throw error;
    }
  }

  async updateUserPermission(userId: string, module: string, canAccess: boolean): Promise<typeof userPermissions.$inferSelect | null> {
    try {
      const [permission] = await db
        .update(userPermissions)
        .set({ canAccess, updatedAt: new Date() })
        .where(and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.module, module as any)
        ))
        .returning();
      return permission;
    } catch (error) {
      console.error("Error updating user permission:", error);
      return null;
    }
  }

  async bulkUpdateUserPermissions(userId: string, permissions: { module: string; canAccess: boolean }[]): Promise<number> {
    try {
      let updateCount = 0;
      
      for (const perm of permissions) {
        // Try to update existing permission
        const [updated] = await db
          .update(userPermissions)
          .set({ canAccess: perm.canAccess, updatedAt: new Date() })
          .where(and(
            eq(userPermissions.userId, userId),
            eq(userPermissions.module, perm.module as any)
          ))
          .returning();

        if (updated) {
          updateCount++;
        } else {
          // Create new permission if it doesn't exist
          await db.insert(userPermissions).values({
            userId,
            module: perm.module as any,
            canAccess: perm.canAccess,
          });
          updateCount++;
        }
      }

      return updateCount;
    } catch (error) {
      console.error(`Error bulk updating user permissions for user ${userId}:`, error);
      return 0;
    }
  }

  async hasModuleAccess(userId: string, module: string): Promise<boolean> {
    try {
      // Get the user's role and module permission
      const user = await this.getUser(userId);
      if (!user || !user.role) return false;

      // Admin users have access to all modules by default
      if (user.role === 'admin') return true;

      // Check user-specific permissions
      const [permission] = await db
        .select()
        .from(userPermissions)
        .where(and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.module, module as any)
        ));

      if (permission) {
        return permission.canAccess;
      }

      // If no specific permission exists, use role defaults
      if (user.role === 'viewer') {
        // Viewers can see all modules except sales by default
        return module !== 'sales';
      } else if (user.role === 'editor') {
        // Editors can see all modules by default
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking module access:", error);
      return false;
    }
  }

  // Check if a user has a specific permission
  async hasPermission(userId: string, category: string, feature: string, permission: 'view' | 'edit' | 'create' | 'delete' | 'import' | 'export'): Promise<boolean> {
    try {
      // Get the user's role
      const user = await this.getUser(userId);
      if (!user || !user.role) return false;

      // Admin users have all permissions by default
      if (user.role === 'admin') return true;

      // Find the permission record for this role, category, and feature
      const [permissionRecord] = await db
        .select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.role, user.role),
          eq(rolePermissions.category, category as any),
          eq(rolePermissions.feature, feature)
        ));

      if (!permissionRecord) return false;

      // Check the requested permission
      switch (permission) {
        case 'view': return !!permissionRecord.canView;
        case 'edit': return !!permissionRecord.canEdit;
        case 'create': return !!permissionRecord.canCreate;
        case 'delete': return !!permissionRecord.canDelete;
        case 'import': return !!permissionRecord.canImport;
        case 'export': return !!permissionRecord.canExport;
        default: return false;
      }
    } catch (error) {
      console.error(`Error checking permission for user ${userId}:`, error);
      return false;
    }
  }

  // Project Milestone Icons methods
  async getProjectMilestoneIcons(projectId: number): Promise<ProjectMilestoneIcon[]> {
    return await safeQuery<ProjectMilestoneIcon>(() =>
      db.select().from(projectMilestoneIcons)
        .where(eq(projectMilestoneIcons.projectId, projectId))
        .orderBy(projectMilestoneIcons.name)
    );
  }

  async getAllProjectMilestoneIcons(): Promise<ProjectMilestoneIcon[]> {
    return await safeQuery<ProjectMilestoneIcon>(() =>
      db.select().from(projectMilestoneIcons)
        .where(eq(projectMilestoneIcons.isEnabled, true))
        .orderBy(projectMilestoneIcons.projectId, projectMilestoneIcons.name)
    );
  }

  async getProjectMilestoneIcon(id: number): Promise<ProjectMilestoneIcon | undefined> {
    return await safeSingleQuery<ProjectMilestoneIcon>(() =>
      db.select().from(projectMilestoneIcons)
        .where(eq(projectMilestoneIcons.id, id))
    );
  }

  async createProjectMilestoneIcon(icon: InsertProjectMilestoneIcon): Promise<ProjectMilestoneIcon> {
    try {
      const [newIcon] = await db.insert(projectMilestoneIcons).values(icon).returning();
      return newIcon;
    } catch (error) {
      console.error("Error creating project milestone icon:", error);
      throw error;
    }
  }

  async updateProjectMilestoneIcon(id: number, icon: Partial<InsertProjectMilestoneIcon>): Promise<ProjectMilestoneIcon | undefined> {
    try {
      const [updatedIcon] = await db.update(projectMilestoneIcons)
        .set({ ...icon, updatedAt: new Date() })
        .where(eq(projectMilestoneIcons.id, id))
        .returning();
      return updatedIcon;
    } catch (error) {
      console.error("Error updating project milestone icon:", error);
      return undefined;
    }
  }

  async deleteProjectMilestoneIcon(id: number): Promise<boolean> {
    try {
      await db.delete(projectMilestoneIcons).where(eq(projectMilestoneIcons.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting project milestone icon:", error);
      return false;
    }
  }

  // Role Permission Management (for auto-save functionality)
  async updateRolePermission(role: string, category: string, permission: string, enabled: boolean): Promise<void> {
    try {
      // Use raw SQL to handle dynamic permission updates
      await db.execute(sql`
        INSERT INTO role_permissions (role, category, permission, enabled, created_at, updated_at)
        VALUES (${role}, ${category}, ${permission}, ${enabled}, NOW(), NOW())
        ON CONFLICT (role, category, permission)
        DO UPDATE SET 
          enabled = ${enabled},
          updated_at = NOW()
      `);
    } catch (error) {
      console.error("Error updating role permission:", error);
      throw error;
    }
  }

  async getAllRolePermissions(): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT role, category, permission, enabled, created_at, updated_at
        FROM role_permissions
        ORDER BY role, category, permission
      `);
      return result.rows;
    } catch (error) {
      console.error("Error fetching all role permissions:", error);
      return [];
    }
  }

  // Forensics methods
  async getProjectForensics(projectId: number, limit: number = 50, offset: number = 0): Promise<ProjectForensics[]> {
    try {
      return await db
        .select()
        .from(projectForensics)
        .where(eq(projectForensics.projectId, projectId))
        .orderBy(desc(projectForensics.timestamp))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error("Error fetching project forensics:", error);
      return [];
    }
  }

  async getEntityForensics(projectId: number, entityType: string, entityId: number): Promise<ProjectForensics[]> {
    try {
      return await db
        .select()
        .from(projectForensics)
        .where(
          and(
            eq(projectForensics.projectId, projectId),
            eq(projectForensics.entityType, entityType as any),
            eq(projectForensics.entityId, entityId)
          )
        )
        .orderBy(desc(projectForensics.timestamp));
    } catch (error) {
      console.error("Error fetching entity forensics:", error);
      return [];
    }
  }

  async createProjectForensics(forensics: InsertProjectForensics): Promise<ProjectForensics> {
    try {
      const [result] = await db
        .insert(projectForensics)
        .values(forensics)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating project forensics:", error);
      throw error;
    }
  }

  // Meeting methods implementation
  async getMeetings(): Promise<Meeting[]> {
    return await safeQuery<Meeting>(() =>
      db.select().from(meetings).orderBy(desc(meetings.datetime))
    );
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    return await safeSingleQuery<Meeting>(() =>
      db.select().from(meetings).where(eq(meetings.id, id))
    );
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    try {
      const [newMeeting] = await db.insert(meetings).values(meeting).returning();
      return newMeeting;
    } catch (error) {
      console.error("Error creating meeting:", error);
      throw error;
    }
  }

  async updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    try {
      // Convert datetime string to Date object if present
      const updateData = { ...meeting };
      if (updateData.datetime && typeof updateData.datetime === 'string') {
        updateData.datetime = new Date(updateData.datetime);
      }
      
      const [updatedMeeting] = await db.update(meetings)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(meetings.id, id))
        .returning();
      return updatedMeeting;
    } catch (error) {
      console.error("Error updating meeting:", error);
      return undefined;
    }
  }

  async deleteMeeting(id: number): Promise<boolean> {
    try {
      // Delete related data first
      await db.delete(meetingTasks).where(eq(meetingTasks.meetingId, id));
      await db.delete(meetingNotes).where(eq(meetingNotes.meetingId, id));
      await db.delete(meetingAttendees).where(eq(meetingAttendees.meetingId, id));
      await db.delete(meetings).where(eq(meetings.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting meeting:", error);
      return false;
    }
  }

  // Meeting Attendees methods
  async getMeetingAttendees(meetingId: number): Promise<MeetingAttendee[]> {
    return await safeQuery<MeetingAttendee>(() =>
      db.select().from(meetingAttendees).where(eq(meetingAttendees.meetingId, meetingId))
    );
  }

  async addMeetingAttendee(attendee: InsertMeetingAttendee): Promise<MeetingAttendee> {
    try {
      const [newAttendee] = await db.insert(meetingAttendees).values(attendee).returning();
      return newAttendee;
    } catch (error) {
      console.error("Error adding meeting attendee:", error);
      throw error;
    }
  }

  async removeMeetingAttendee(meetingId: number, userId: string): Promise<boolean> {
    try {
      await db.delete(meetingAttendees)
        .where(and(eq(meetingAttendees.meetingId, meetingId), eq(meetingAttendees.userId, userId)));
      return true;
    } catch (error) {
      console.error("Error removing meeting attendee:", error);
      return false;
    }
  }

  async updateAttendeeStatus(meetingId: number, userId: string, attended: boolean): Promise<MeetingAttendee | undefined> {
    try {
      const [updatedAttendee] = await db.update(meetingAttendees)
        .set({ attended })
        .where(and(eq(meetingAttendees.meetingId, meetingId), eq(meetingAttendees.userId, userId)))
        .returning();
      return updatedAttendee;
    } catch (error) {
      console.error("Error updating attendee status:", error);
      return undefined;
    }
  }

  // Meeting Notes methods
  async getMeetingNotes(meetingId: number): Promise<MeetingNote[]> {
    return await safeQuery<MeetingNote>(() =>
      db.select().from(meetingNotes).where(eq(meetingNotes.meetingId, meetingId))
        .orderBy(meetingNotes.createdAt)
    );
  }

  async createMeetingNote(note: InsertMeetingNote): Promise<MeetingNote> {
    try {
      const [newNote] = await db.insert(meetingNotes).values(note).returning();
      return newNote;
    } catch (error) {
      console.error("Error creating meeting note:", error);
      throw error;
    }
  }

  async updateMeetingNote(id: number, note: Partial<InsertMeetingNote>): Promise<MeetingNote | undefined> {
    try {
      const [updatedNote] = await db.update(meetingNotes)
        .set({ ...note, updatedAt: new Date() })
        .where(eq(meetingNotes.id, id))
        .returning();
      return updatedNote;
    } catch (error) {
      console.error("Error updating meeting note:", error);
      return undefined;
    }
  }

  async deleteMeetingNote(id: number): Promise<boolean> {
    try {
      await db.delete(meetingNotes).where(eq(meetingNotes.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting meeting note:", error);
      return false;
    }
  }

  // Meeting Tasks methods
  async getMeetingTasks(meetingId?: number): Promise<MeetingTask[]> {
    return await safeQuery<MeetingTask>(() => {
      const query = db.select().from(meetingTasks);
      if (meetingId) {
        return query.where(eq(meetingTasks.meetingId, meetingId)).orderBy(meetingTasks.createdAt);
      }
      return query.orderBy(desc(meetingTasks.createdAt));
    });
  }

  async getMeetingTask(id: number): Promise<MeetingTask | undefined> {
    return await safeSingleQuery<MeetingTask>(() =>
      db.select().from(meetingTasks).where(eq(meetingTasks.id, id))
    );
  }

  async createMeetingTask(task: InsertMeetingTask): Promise<MeetingTask> {
    try {
      const [newTask] = await db.insert(meetingTasks).values(task).returning();
      return newTask;
    } catch (error) {
      console.error("Error creating meeting task:", error);
      throw error;
    }
  }

  async updateMeetingTask(id: number, task: Partial<InsertMeetingTask>): Promise<MeetingTask | undefined> {
    try {
      const [updatedTask] = await db.update(meetingTasks)
        .set({ ...task, updatedAt: new Date() })
        .where(eq(meetingTasks.id, id))
        .returning();
      return updatedTask;
    } catch (error) {
      console.error("Error updating meeting task:", error);
      return undefined;
    }
  }

  async deleteMeetingTask(id: number): Promise<boolean> {
    try {
      await db.delete(meetingTasks).where(eq(meetingTasks.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting meeting task:", error);
      return false;
    }
  }

  async getUserMeetingTasks(userId: string): Promise<MeetingTask[]> {
    return await safeQuery<MeetingTask>(() =>
      db.select().from(meetingTasks)
        .where(eq(meetingTasks.assignedToId, userId))
        .orderBy(meetingTasks.dueDate, desc(meetingTasks.createdAt))
    );
  }

  // Meeting Templates methods
  async getMeetingTemplates(): Promise<MeetingTemplate[]> {
    return await safeQuery<MeetingTemplate>(() =>
      db.select().from(meetingTemplates)
        .where(eq(meetingTemplates.isActive, true))
        .orderBy(desc(meetingTemplates.createdAt))
    );
  }

  async getMeetingTemplate(id: number): Promise<MeetingTemplate | undefined> {
    return await safeSingleQuery<MeetingTemplate>(() =>
      db.select().from(meetingTemplates).where(eq(meetingTemplates.id, id))
    );
  }

  async createMeetingTemplate(template: InsertMeetingTemplate): Promise<MeetingTemplate> {
    try {
      const [newTemplate] = await db.insert(meetingTemplates).values(template).returning();
      return newTemplate;
    } catch (error) {
      console.error("Error creating meeting template:", error);
      throw error;
    }
  }

  async updateMeetingTemplate(id: number, template: Partial<InsertMeetingTemplate>): Promise<MeetingTemplate | undefined> {
    try {
      const [updatedTemplate] = await db.update(meetingTemplates)
        .set({ ...template, updatedAt: new Date() })
        .where(eq(meetingTemplates.id, id))
        .returning();
      return updatedTemplate;
    } catch (error) {
      console.error("Error updating meeting template:", error);
      return undefined;
    }
  }

  async deleteMeetingTemplate(id: number): Promise<boolean> {
    try {
      await db.update(meetingTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(meetingTemplates.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting meeting template:", error);
      return false;
    }
  }

  // Meeting Email Notifications methods
  async getMeetingEmailNotifications(meetingId?: number): Promise<MeetingEmailNotification[]> {
    return await safeQuery<MeetingEmailNotification>(() => {
      let query = db.select().from(meetingEmailNotifications);
      if (meetingId) {
        query = query.where(eq(meetingEmailNotifications.meetingId, meetingId));
      }
      return query.orderBy(desc(meetingEmailNotifications.createdAt));
    });
  }

  async createMeetingEmailNotification(notification: InsertMeetingEmailNotification): Promise<MeetingEmailNotification> {
    try {
      const [newNotification] = await db.insert(meetingEmailNotifications).values(notification).returning();
      return newNotification;
    } catch (error) {
      console.error("Error creating meeting email notification:", error);
      throw error;
    }
  }

  async updateMeetingEmailNotificationStatus(id: number, status: string, errorMessage?: string): Promise<MeetingEmailNotification | undefined> {
    try {
      const updateData: any = { status };
      if (status === 'sent') {
        updateData.sentAt = new Date();
      }
      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }
      
      const [updatedNotification] = await db.update(meetingEmailNotifications)
        .set(updateData)
        .where(eq(meetingEmailNotifications.id, id))
        .returning();
      return updatedNotification;
    } catch (error) {
      console.error("Error updating meeting email notification status:", error);
      return undefined;
    }
  }

  async getPendingEmailNotifications(): Promise<MeetingEmailNotification[]> {
    return await safeQuery<MeetingEmailNotification>(() =>
      db.select().from(meetingEmailNotifications)
        .where(and(
          eq(meetingEmailNotifications.status, 'pending'),
          lte(meetingEmailNotifications.scheduledAt, new Date())
        ))
        .orderBy(meetingEmailNotifications.scheduledAt)
    );
  }

  // Project-Meeting Sync methods implementation
  async getMeetingsByProject(projectId: number): Promise<Meeting[]> {
    return await safeQuery<Meeting>(() =>
      db.select().from(meetings)
        .where(sql`${projectId} = ANY(${meetings.relatedProjects})`)
        .orderBy(desc(meetings.datetime))
    );
  }

  async getMeetingTasksByProjectTask(projectTaskId: number): Promise<MeetingTask[]> {
    return await safeQuery<MeetingTask>(() =>
      db.select().from(meetingTasks)
        .where(eq(meetingTasks.syncedTaskId, projectTaskId))
        .orderBy(desc(meetingTasks.createdAt))
    );
  }

  // Project Labels methods
  async getProjectLabels(): Promise<ProjectLabel[]> {
    return await safeQuery<ProjectLabel>(() =>
      db.select().from(projectLabels)
        .where(eq(projectLabels.isActive, true))
        .orderBy(projectLabels.name)
    );
  }

  async getProjectLabel(id: number): Promise<ProjectLabel | undefined> {
    return await safeSingleQuery<ProjectLabel>(() =>
      db.select().from(projectLabels).where(eq(projectLabels.id, id))
    );
  }

  async createProjectLabel(label: InsertProjectLabel): Promise<ProjectLabel> {
    try {
      const [newLabel] = await db.insert(projectLabels).values(label).returning();
      return newLabel;
    } catch (error) {
      console.error("Error creating project label:", error);
      throw error;
    }
  }

  async updateProjectLabel(id: number, label: Partial<InsertProjectLabel>): Promise<ProjectLabel | undefined> {
    try {
      const [updatedLabel] = await db.update(projectLabels)
        .set({ ...label, updatedAt: new Date() })
        .where(eq(projectLabels.id, id))
        .returning();
      return updatedLabel;
    } catch (error) {
      console.error("Error updating project label:", error);
      return undefined;
    }
  }

  async deleteProjectLabel(id: number): Promise<boolean> {
    try {
      // First remove all assignments
      await db.delete(projectLabelAssignments).where(eq(projectLabelAssignments.labelId, id));
      // Then delete the label
      await db.delete(projectLabels).where(eq(projectLabels.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting project label:", error);
      return false;
    }
  }

  // Project Label Assignments methods
  async getProjectLabelAssignments(projectId: number): Promise<ProjectLabelAssignment[]> {
    return await safeQuery<ProjectLabelAssignment>(() =>
      db.select({
        id: projectLabelAssignments.id,
        projectId: projectLabelAssignments.projectId,
        labelId: projectLabelAssignments.labelId,
        assignedAt: projectLabelAssignments.assignedAt,
        // Include label details
        labelName: projectLabels.name,
        labelType: projectLabels.type,
        labelColor: projectLabels.color,
        backgroundColor: projectLabels.backgroundColor,
        textColor: projectLabels.textColor,
      })
      .from(projectLabelAssignments)
      .leftJoin(projectLabels, eq(projectLabelAssignments.labelId, projectLabels.id))
      .where(eq(projectLabelAssignments.projectId, projectId))
      .orderBy(projectLabels.name)
    );
  }

  async assignLabelToProject(projectId: number, labelId: number): Promise<ProjectLabelAssignment> {
    try {
      const [assignment] = await db.insert(projectLabelAssignments)
        .values({ projectId, labelId })
        .returning();
      return assignment;
    } catch (error) {
      console.error("Error assigning label to project:", error);
      throw error;
    }
  }

  async removeLabelFromProject(projectId: number, labelId: number): Promise<boolean> {
    try {
      await db.delete(projectLabelAssignments)
        .where(and(
          eq(projectLabelAssignments.projectId, projectId),
          eq(projectLabelAssignments.labelId, labelId)
        ));
      return true;
    } catch (error) {
      console.error("Error removing label from project:", error);
      return false;
    }
  }

}

export const storage = new DatabaseStorage();