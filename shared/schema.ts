import {
  pgTable,
  text,
  serial,
  timestamp,
  decimal,
  integer,
  boolean,
  date,
  varchar,
  pgEnum,
  foreignKey,
  unique,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "delayed",
  "completed",
  "archived",
  "critical",
]);

export const billingStatusEnum = pgEnum("billing_status", [
  "upcoming",
  "invoiced",
  "paid",
  "delayed",
]);

export const manufacturingStatusEnum = pgEnum("manufacturing_status", [
  "scheduled",
  "in_progress",
  "complete",
  "maintenance",
]);

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users Table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  bio: text("bio"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectNumber: text("project_number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  
  // PM and team information
  pmOwnerId: varchar("pm_owner_id").references(() => users.id),
  team: text("team"),
  location: text("location"),
  
  // Dates
  contractDate: date("contract_date"),
  startDate: date("start_date").notNull(),
  estimatedCompletionDate: date("estimated_completion_date").notNull(),
  actualCompletionDate: date("actual_completion_date"),
  chassisETA: date("chassis_eta"),
  fabricationStart: date("fabrication_start"),
  assemblyStart: date("assembly_start"),
  wrapDate: date("wrap_date"),
  ntcTestingDate: date("ntc_testing_date"),
  qcStartDate: date("qc_start_date"),
  executiveReviewDate: date("executive_review_date"),
  shipDate: date("ship_date"),
  deliveryDate: date("delivery_date"),
  
  // Project details
  percentComplete: decimal("percent_complete", { precision: 5, scale: 2 }).default("0").notNull(),
  dpasRating: text("dpas_rating"),
  stretchShortenGears: text("stretch_shorten_gears"),
  lltsOrdered: boolean("llts_ordered").default(false),
  qcDays: integer("qc_days"),
  
  // Design assignments
  meAssigned: text("me_assigned"),
  meDesignOrdersPercent: decimal("me_design_orders_percent", { precision: 5, scale: 2 }),
  eeAssigned: text("ee_assigned"),
  eeDesignOrdersPercent: decimal("ee_design_orders_percent", { precision: 5, scale: 2 }),
  iteAssigned: text("ite_assigned"),
  itDesignOrdersPercent: decimal("it_design_orders_percent", { precision: 5, scale: 2 }),
  ntcDesignOrdersPercent: decimal("ntc_design_orders_percent", { precision: 5, scale: 2 }),
  
  // Status fields
  status: projectStatusEnum("status").default("active").notNull(),
  hasBillingMilestones: boolean("has_billing_milestones").default(false),
  notes: text("notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  pmOwner: one(users, {
    fields: [projects.pmOwnerId],
    references: [users.id],
  }),
  tasks: many(tasks),
  milestones: many(billingMilestones),
  baySchedules: many(manufacturingSchedules),
}));

// Tasks Table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  completedDate: date("completed_date"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tasks Relations
export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));

// Billing Milestones Table
export const billingMilestones = pgTable("billing_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  targetInvoiceDate: date("target_invoice_date").notNull(),
  actualInvoiceDate: date("actual_invoice_date"),
  paymentReceivedDate: date("payment_received_date"),
  status: billingStatusEnum("status").default("upcoming").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Billing Milestones Relations
export const billingMilestonesRelations = relations(billingMilestones, ({ one }) => ({
  project: one(projects, {
    fields: [billingMilestones.projectId],
    references: [projects.id],
  }),
}));

// Manufacturing Bay Table
export const manufacturingBays = pgTable("manufacturing_bays", {
  id: serial("id").primaryKey(),
  bayNumber: integer("bay_number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  equipment: text("equipment"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Manufacturing Schedule Table
export const manufacturingSchedules = pgTable("manufacturing_schedules", {
  id: serial("id").primaryKey(),
  bayId: integer("bay_id")
    .references(() => manufacturingBays.id)
    .notNull(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: manufacturingStatusEnum("status").default("scheduled").notNull(),
  notes: text("notes"),
  equipment: text("equipment"),
  staffAssigned: text("staff_assigned"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Manufacturing Schedule Relations
export const manufacturingSchedulesRelations = relations(manufacturingSchedules, ({ one }) => ({
  bay: one(manufacturingBays, {
    fields: [manufacturingSchedules.bayId],
    references: [manufacturingBays.id],
  }),
  project: one(projects, {
    fields: [manufacturingSchedules.projectId],
    references: [projects.id],
  }),
}));

// Insert Schemas

export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  bio: true,
  profileImageUrl: true,
  role: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertBillingMilestoneSchema = createInsertSchema(billingMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertManufacturingBaySchema = createInsertSchema(manufacturingBays).omit({
  id: true,
  createdAt: true,
});

export const insertManufacturingScheduleSchema = createInsertSchema(manufacturingSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type BillingMilestone = typeof billingMilestones.$inferSelect;
export type InsertBillingMilestone = z.infer<typeof insertBillingMilestoneSchema>;

export type ManufacturingBay = typeof manufacturingBays.$inferSelect;
export type InsertManufacturingBay = z.infer<typeof insertManufacturingBaySchema>;

export type ManufacturingSchedule = typeof manufacturingSchedules.$inferSelect;
export type InsertManufacturingSchedule = z.infer<typeof insertManufacturingScheduleSchema>;
