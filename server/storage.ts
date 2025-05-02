import {
  users,
  projects,
  tasks,
  billingMilestones,
  manufacturingBays,
  manufacturingSchedules,
  userPreferences,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, like, sql, desc, asc, count, ilike, SQL } from "drizzle-orm";
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
    // When no filters are provided, return all schedules
    if (!filters) {
      return await db.select().from(manufacturingSchedules).orderBy(manufacturingSchedules.startDate);
    }
    
    // Handle individual filter cases for type safety
    const { bayId, projectId, startDate, endDate } = filters;
    
    // Filter by bayId only
    if (bayId && !projectId && !startDate && !endDate) {
      return await db.select()
        .from(manufacturingSchedules)
        .where(eq(manufacturingSchedules.bayId, bayId))
        .orderBy(manufacturingSchedules.startDate);
    }
    
    // Filter by projectId only
    if (!bayId && projectId && !startDate && !endDate) {
      return await db.select()
        .from(manufacturingSchedules)
        .where(eq(manufacturingSchedules.projectId, projectId))
        .orderBy(manufacturingSchedules.startDate);
    }
    
    // Filter by date range only
    if (!bayId && !projectId && startDate && endDate) {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      return await db.select()
        .from(manufacturingSchedules)
        .where(
          and(
            lte(manufacturingSchedules.startDate, endDateStr),
            gte(manufacturingSchedules.endDate, startDateStr)
          )
        )
        .orderBy(manufacturingSchedules.startDate);
    }
    
    // Filter by bayId and projectId
    if (bayId && projectId && !startDate && !endDate) {
      return await db.select()
        .from(manufacturingSchedules)
        .where(
          and(
            eq(manufacturingSchedules.bayId, bayId),
            eq(manufacturingSchedules.projectId, projectId)
          )
        )
        .orderBy(manufacturingSchedules.startDate);
    }
    
    // Filter by bayId and date range
    if (bayId && !projectId && startDate && endDate) {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      return await db.select()
        .from(manufacturingSchedules)
        .where(
          and(
            eq(manufacturingSchedules.bayId, bayId),
            lte(manufacturingSchedules.startDate, endDateStr),
            gte(manufacturingSchedules.endDate, startDateStr)
          )
        )
        .orderBy(manufacturingSchedules.startDate);
    }
    
    // Filter by projectId and date range
    if (!bayId && projectId && startDate && endDate) {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      return await db.select()
        .from(manufacturingSchedules)
        .where(
          and(
            eq(manufacturingSchedules.projectId, projectId),
            lte(manufacturingSchedules.startDate, endDateStr),
            gte(manufacturingSchedules.endDate, startDateStr)
          )
        )
        .orderBy(manufacturingSchedules.startDate);
    }
    
    // Filter by all criteria
    if (bayId && projectId && startDate && endDate) {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      return await db.select()
        .from(manufacturingSchedules)
        .where(
          and(
            eq(manufacturingSchedules.bayId, bayId),
            eq(manufacturingSchedules.projectId, projectId),
            lte(manufacturingSchedules.startDate, endDateStr),
            gte(manufacturingSchedules.endDate, startDateStr)
          )
        )
        .orderBy(manufacturingSchedules.startDate);
    }
    
    // Default - no specific filters matched
    return await db.select().from(manufacturingSchedules).orderBy(manufacturingSchedules.startDate);
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
}

export const storage = new DatabaseStorage();
