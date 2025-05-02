import {
  users,
  projects,
  tasks,
  billingMilestones,
  manufacturingBays,
  manufacturingSchedules,
  userPreferences,
  allowedEmails,
  notifications,
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type BillingMilestone,
  type InsertBillingMilestone,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, like, sql, desc, asc, count, ilike, SQL, isNull, or } from "drizzle-orm";
import { PgSelectBase } from "drizzle-orm/pg-core";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: InsertUser): Promise<User>;
  updateUserRole(id: string, role: string, isApproved: boolean): Promise<User | undefined>;
  updateUserLastLogin(id: string): Promise<User | undefined>;
  
  // User Preferences methods
  getUserPreferences(userId: string): Promise<UserPreference | undefined>;
  createUserPreferences(preferences: InsertUserPreference): Promise<UserPreference>;
  updateUserPreferences(userId: string, preferences: Partial<InsertUserPreference>): Promise<UserPreference | undefined>;
  
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
  
  // Billing Milestone methods
  getBillingMilestones(): Promise<BillingMilestone[]>;
  getProjectBillingMilestones(projectId: number): Promise<BillingMilestone[]>;
  getBillingMilestone(id: number): Promise<BillingMilestone | undefined>;
  createBillingMilestone(milestone: InsertBillingMilestone): Promise<BillingMilestone>;
  updateBillingMilestone(id: number, milestone: Partial<InsertBillingMilestone>): Promise<BillingMilestone | undefined>;
  deleteBillingMilestone(id: number): Promise<boolean>;
  
  // Manufacturing Bay methods
  getManufacturingBays(): Promise<ManufacturingBay[]>;
  getManufacturingBay(id: number): Promise<ManufacturingBay | undefined>;
  createManufacturingBay(bay: InsertManufacturingBay): Promise<ManufacturingBay>;
  updateManufacturingBay(id: number, bay: Partial<InsertManufacturingBay>): Promise<ManufacturingBay | undefined>;
  deleteManufacturingBay(id: number): Promise<boolean>;
  
  // Manufacturing Schedule methods
  getManufacturingSchedules(filters?: { bayId?: number, projectId?: number, startDate?: Date, endDate?: Date }): Promise<ManufacturingSchedule[]>;
  getManufacturingSchedule(id: number): Promise<ManufacturingSchedule | undefined>;
  createManufacturingSchedule(schedule: InsertManufacturingSchedule): Promise<ManufacturingSchedule>;
  updateManufacturingSchedule(id: number, schedule: Partial<InsertManufacturingSchedule>): Promise<ManufacturingSchedule | undefined>;
  deleteManufacturingSchedule(id: number): Promise<boolean>;
  
  // Notification methods
  getNotifications(userId?: string, options?: { unreadOnly?: boolean, limit?: number }): Promise<Notification[]>;
  getNotificationById(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  deleteAllNotifications(userId: string): Promise<boolean>;
  getUnreadNotificationCount(userId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error fetching user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.updatedAt));
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
  
  async updateUserRole(id: string, role: string, isApproved: boolean): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          role: role,
          isApproved: isApproved,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
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
      const [updatedPreferences] = await db
        .update(userPreferences)
        .set({ 
          ...preferences, 
          updatedAt: new Date() 
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updatedPreferences;
    } catch (error) {
      console.error("Error updating user preferences:", error);
      return undefined;
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
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }
  
  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }
  
  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return true;
  }
  
  // Task methods
  async getTasks(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
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
    const [updatedTask] = await db
      .update(tasks)
      .set(task)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }
  
  async completeTask(id: number, completedDate: Date): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ 
        isCompleted: true, 
        completedDate: completedDate.toISOString().split('T')[0]
      })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<boolean> {
    await db.delete(tasks).where(eq(tasks.id, id));
    return true;
  }
  
  // Billing Milestone methods
  async getBillingMilestones(): Promise<BillingMilestone[]> {
    return await db.select().from(billingMilestones).orderBy(billingMilestones.targetInvoiceDate);
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
    const [updatedBay] = await db
      .update(manufacturingBays)
      .set(bay)
      .where(eq(manufacturingBays.id, id))
      .returning();
    return updatedBay;
  }
  
  async deleteManufacturingBay(id: number): Promise<boolean> {
    await db.delete(manufacturingBays).where(eq(manufacturingBays.id, id));
    return true;
  }
  
  // Manufacturing Schedule methods
  async getManufacturingSchedules(filters?: { bayId?: number, projectId?: number, startDate?: Date, endDate?: Date }): Promise<ManufacturingSchedule[]> {
    let query = db.select().from(manufacturingSchedules);
    
    if (filters) {
      const conditions = [];
      
      if (filters.bayId !== undefined) {
        conditions.push(eq(manufacturingSchedules.bayId, filters.bayId));
      }
      
      if (filters.projectId !== undefined) {
        conditions.push(eq(manufacturingSchedules.projectId, filters.projectId));
      }
      
      if (filters.startDate && filters.endDate) {
        // For date range queries, find schedules that overlap with the given range
        conditions.push(
          sql`${manufacturingSchedules.startDate} <= ${filters.endDate.toISOString().split('T')[0]} AND ${manufacturingSchedules.endDate} >= ${filters.startDate.toISOString().split('T')[0]}`
        );
      } else if (filters.startDate) {
        conditions.push(sql`${manufacturingSchedules.startDate} >= ${filters.startDate.toISOString().split('T')[0]}`);
      } else if (filters.endDate) {
        conditions.push(sql`${manufacturingSchedules.endDate} <= ${filters.endDate.toISOString().split('T')[0]}`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(manufacturingSchedules.startDate);
  }
  
  async getManufacturingSchedule(id: number): Promise<ManufacturingSchedule | undefined> {
    const [schedule] = await db.select().from(manufacturingSchedules).where(eq(manufacturingSchedules.id, id));
    return schedule;
  }
  
  async createManufacturingSchedule(schedule: InsertManufacturingSchedule): Promise<ManufacturingSchedule> {
    const [newSchedule] = await db.insert(manufacturingSchedules).values(schedule).returning();
    return newSchedule;
  }
  
  async updateManufacturingSchedule(id: number, schedule: Partial<InsertManufacturingSchedule>): Promise<ManufacturingSchedule | undefined> {
    const [updatedSchedule] = await db
      .update(manufacturingSchedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(eq(manufacturingSchedules.id, id))
      .returning();
    return updatedSchedule;
  }
  
  async deleteManufacturingSchedule(id: number): Promise<boolean> {
    await db.delete(manufacturingSchedules).where(eq(manufacturingSchedules.id, id));
    return true;
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
      if (!email) return { allowed: false, autoApprove: false, defaultRole: "pending" };
      
      // Get all allowed email patterns
      const allowedEmailsList = await this.getAllowedEmails();
      
      // No patterns defined, allow anyone but set to pending
      if (allowedEmailsList.length === 0) {
        return { allowed: true, autoApprove: false, defaultRole: "pending" };
      }
      
      // Check each pattern for a match
      for (const pattern of allowedEmailsList) {
        // Convert pattern to regex (replace * with .*)
        const regexPattern = pattern.emailPattern.replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        
        if (regex.test(email)) {
          return { 
            allowed: true, 
            autoApprove: pattern.autoApprove === null ? false : pattern.autoApprove,
            defaultRole: pattern.defaultRole || "viewer"
          };
        }
      }
      
      // If no match found, return default behavior
      return { allowed: false, autoApprove: false, defaultRole: "pending" };
    } catch (error) {
      console.error("Error checking allowed email:", error);
      return { allowed: false, autoApprove: false, defaultRole: "pending" };
    }
  }

  // Notification methods
  async getNotifications(userId?: string, options?: { unreadOnly?: boolean, limit?: number }): Promise<Notification[]> {
    try {
      let query = db.select().from(notifications);
      
      if (userId) {
        // Either get notifications for a specific user OR get global notifications (userId is null)
        query = query.where(
          and(
            or(
              eq(notifications.userId, userId),
              isNull(notifications.userId)
            ),
            // If expiration date is provided, only get not-expired notifications
            or(
              isNull(notifications.expiresAt),
              gte(notifications.expiresAt, new Date())
            )
          )
        );
      }
      
      if (options?.unreadOnly) {
        query = query.where(eq(notifications.isRead, false));
      }
      
      // Sort by creation date descending (newest first)
      query = query.orderBy(desc(notifications.createdAt));
      
      // Apply limit if provided
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      // Execute the query and get the results
      const results = await query;
      return results as Notification[];
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  }
  
  async getNotificationById(id: number): Promise<Notification | undefined> {
    try {
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, id));
      return notification;
    } catch (error) {
      console.error("Error fetching notification:", error);
      return undefined;
    }
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
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );
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
}

export const storage = new DatabaseStorage();