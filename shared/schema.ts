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
  "delivered",
]);

export const dealTypeEnum = pgEnum("deal_type", [
  "unsolicited_bid",
  "unfinanced_restrict",
  "developed_direct",
  "developed_public_bid",
]);

export const dealStageEnum = pgEnum("deal_stage", [
  "verbal_commit",
  "project_launch",
  "site_core_activity", 
  "submit_decide",
  "not_started",
  "fruit_loop"
]);

export const dealPriorityEnum = pgEnum("deal_priority", [
  "low",
  "medium", 
  "high",
  "urgent"
]);

export const dealStatusEnum = pgEnum("deal_status", [
  "AT RISK",
  "Submittal Missed",
  "Complete",
  "In Progress",
  "No Bid",
  "On Hold",
  "Not Started"
]);

export const projectRiskLevelEnum = pgEnum("project_risk_level", [
  "low",
  "medium",
  "high"
]);

export const billingStatusEnum = pgEnum("billing_status", [
  "upcoming",
  "invoiced",
  "paid",
  "delayed",
]);

export const costSectionEnum = pgEnum("cost_section", [
  "X", "B", "A", "C", "D", "E", "F", "G", "H", "I", "J", "T", "L", "N", "Q", "U"
]);

export const manufacturingStatusEnum = pgEnum("manufacturing_status", [
  "scheduled",
  "in_progress",
  "complete",
  "maintenance",
]);

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "editor",
  "viewer",
  "pending",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "billing",
  "project",
  "manufacturing",
  "system",
]);

export const notificationPriorityEnum = pgEnum("notification_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);



export const delayResponsibilityEnum = pgEnum("delay_responsibility", [
  "nomad_fault",
  "vendor_fault",
  "client_fault",
  "not_applicable",
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
// User status enum
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "inactive",
  "archived",
]);

// Define permission categories enum
export const permissionCategoryEnum = pgEnum("permission_category", [
  "projects",
  "manufacturing",
  "billing",
  "users",
  "settings",
  "data",
  "reports",
  "import_export",
]);

// Note: Role Permissions Table is defined further down in this file

export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique(),
  password: varchar("password"), // Hashed password for email auth
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  bio: text("bio"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").default("pending"),  // Using text for backward compatibility
  isApproved: boolean("is_approved").default(false),
  status: userStatusEnum("status").default("active"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Relations
// User Audit Logs Table
export const userAuditLogs = pgTable("user_audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // e.g., "created", "updated", "archived", "restored", "role_changed", etc.
  performedBy: varchar("performed_by").references(() => users.id).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  previousData: jsonb("previous_data"),
  newData: jsonb("new_data"),
  details: text("details"), // Additional context about the change
});

export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
    relationName: "userPreferences",
  }),
  auditLogs: many(userAuditLogs, { 
    relationName: "userAuditLogs",
    fields: [users.id],
    references: [userAuditLogs.userId] 
  }),
  actionsPerformed: many(userAuditLogs, { 
    relationName: "actionsPerformed", 
    fields: [users.id],
    references: [userAuditLogs.performedBy] 
  }),
  projects: many(projects),
  salesDeals: many(salesDeals),
}));

// User Preferences Table
// Department enum for user department assignments
export const userDepartmentEnum = pgEnum("user_department", [
  "engineering",
  "manufacturing",
  "finance",
  "project_management",
  "quality_control",
  "it",
  "sales",
  "executive",
  "planning_analysis",
  "other"
]);

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  theme: text("theme").default("dark"),
  dashboardLayout: jsonb("dashboard_layout"),
  emailNotifications: boolean("email_notifications").default(true),
  displayDensity: text("display_density").default("comfortable"),
  defaultView: text("default_view").default("dashboard"),
  showCompletedProjects: boolean("show_completed_projects").default(true),
  dateFormat: text("date_format").default("MM/DD/YYYY"),
  department: userDepartmentEnum("department"),
  // Notification preferences for different types
  notifyBillingUpdates: boolean("notify_billing_updates").default(true),
  notifyProjectUpdates: boolean("notify_project_updates").default(true),
  notifyManufacturingUpdates: boolean("notify_manufacturing_updates").default(true),
  notifySystemUpdates: boolean("notify_system_updates").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Preferences Relations
export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
    relationName: "userPreferences",
  }),
}));

// Project Table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectNumber: text("project_number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  
  // PM and team information
  pmOwnerId: varchar("pm_owner_id").references(() => users.id),
  pmOwner: text("pm_owner"), // Store PM name string directly
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
  
  // Delivery information
  actualDeliveryDate: date("actual_delivery_date"),
  lateDeliveryReason: text("late_delivery_reason"),
  delayResponsibility: delayResponsibilityEnum("delay_responsibility").default('not_applicable'),
  isDeliveredOnTime: boolean("is_delivered_on_time"),
  contractExtensions: integer("contract_extensions").default(0).notNull(),
  
  // Project details
  percentComplete: decimal("percent_complete", { precision: 5, scale: 2 }).default("0").notNull(),
  totalHours: integer("total_hours").default(1000), // Total hours needed for manufacturing
  
  // Department hours percentage allocations
  fabPercentage: decimal("fab_percentage", { precision: 5, scale: 2 }).default("27").notNull(),
  paintPercentage: decimal("paint_percentage", { precision: 5, scale: 2 }).default("7").notNull(),
  productionPercentage: decimal("production_percentage", { precision: 5, scale: 2 }).default("60").notNull(),
  itPercentage: decimal("it_percentage", { precision: 5, scale: 2 }).default("7").notNull(),
  ntcPercentage: decimal("ntc_percentage", { precision: 5, scale: 2 }).default("7").notNull(),
  qcPercentage: decimal("qc_percentage", { precision: 5, scale: 2 }).default("7").notNull(),
  
  fabWeeks: integer("fab_weeks").default(4), // Number of weeks for FAB phase (precedes production)
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
  riskLevel: projectRiskLevelEnum("risk_level").default("medium"),
  hasBillingMilestones: boolean("has_billing_milestones").default(false),
  notes: text("notes"),
  photosTaken: boolean("photos_taken").default(false), // New field for Photos Taken column
  isSalesEstimate: boolean("is_sales_estimate").default(false), // Sales Estimate Proposal flag
  
  // Store all raw data from Excel import
  rawData: jsonb("raw_data"), // JSON field to store all original Excel columns
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Relations definition moved below after deliveryTracking table definition

// Archived Projects Table - mirrors the projects table structure
export const archivedProjects = pgTable("archived_projects", {
  id: serial("id").primaryKey(),
  originalId: integer("original_id").notNull(), // Reference to the original project ID
  projectNumber: text("project_number").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  
  // PM and team information
  pmOwnerId: varchar("pm_owner_id").references(() => users.id),
  pmOwner: text("pm_owner"),
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
  totalHours: integer("total_hours").default(1000), // Total hours needed for manufacturing
  
  // Department hours percentage allocations
  fabPercentage: decimal("fab_percentage", { precision: 5, scale: 2 }).default("27").notNull(),
  paintPercentage: decimal("paint_percentage", { precision: 5, scale: 2 }).default("7").notNull(),
  productionPercentage: decimal("production_percentage", { precision: 5, scale: 2 }).default("60").notNull(),
  itPercentage: decimal("it_percentage", { precision: 5, scale: 2 }).default("7").notNull(),
  ntcPercentage: decimal("ntc_percentage", { precision: 5, scale: 2 }).default("7").notNull(),
  qcPercentage: decimal("qc_percentage", { precision: 5, scale: 2 }).default("7").notNull(),
  
  fabWeeks: integer("fab_weeks").default(4), // Number of weeks for FAB phase (precedes production)
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
  
  // Status fields - can store multiple statuses as an array
  status: text("status").array().default(["archived"]).notNull(),
  riskLevel: projectRiskLevelEnum("risk_level").default("medium"),
  hasBillingMilestones: boolean("has_billing_milestones").default(false),
  notes: text("notes"),
  
  // Store all raw data from Excel import
  rawData: jsonb("raw_data"),
  
  // Archive metadata
  archivedAt: timestamp("archived_at").defaultNow(),
  archivedBy: varchar("archived_by").references(() => users.id),
  archiveReason: text("archive_reason"),
  
  // Original timestamps
  originalCreatedAt: timestamp("original_created_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Milestones Table
export const projectMilestones = pgTable("project_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("upcoming"),
  date: date("target_date"),
  color: text("color").default("border-primary"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks Table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  milestoneId: integer("milestone_id")
    .references(() => projectMilestones.id),
  name: text("name").notNull(),
  description: text("description"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  completedDate: date("completed_date"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project Milestones Relations
export const projectMilestonesRelations = relations(projectMilestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectMilestones.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

// Tasks Relations
export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  milestone: one(projectMilestones, {
    fields: [tasks.milestoneId],
    references: [projectMilestones.id],
  }),
}));

// Project Costs Table
export const projectCosts = pgTable("project_costs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  
  // Overall cost tracking
  overallCost: decimal("overall_cost", { precision: 12, scale: 2 }),
  useOverallCostOnly: boolean("use_overall_cost_only").default(false),
  
  // Section-specific costs
  sectionX: decimal("section_x", { precision: 12, scale: 2 }).default("0"),
  sectionB: decimal("section_b", { precision: 12, scale: 2 }).default("0"),
  sectionA: decimal("section_a", { precision: 12, scale: 2 }).default("0"),
  sectionC: decimal("section_c", { precision: 12, scale: 2 }).default("0"),
  sectionD: decimal("section_d", { precision: 12, scale: 2 }).default("0"),
  sectionE: decimal("section_e", { precision: 12, scale: 2 }).default("0"),
  sectionF: decimal("section_f", { precision: 12, scale: 2 }).default("0"),
  sectionG: decimal("section_g", { precision: 12, scale: 2 }).default("0"),
  sectionH: decimal("section_h", { precision: 12, scale: 2 }).default("0"),
  sectionI: decimal("section_i", { precision: 12, scale: 2 }).default("0"),
  sectionJ: decimal("section_j", { precision: 12, scale: 2 }).default("0"),
  sectionT: decimal("section_t", { precision: 12, scale: 2 }).default("0"),
  sectionL: decimal("section_l", { precision: 12, scale: 2 }).default("0"),
  sectionN: decimal("section_n", { precision: 12, scale: 2 }).default("0"),
  sectionQ: decimal("section_q", { precision: 12, scale: 2 }).default("0"),
  sectionU: decimal("section_u", { precision: 12, scale: 2 }).default("0"),
  
  // Additional metadata
  notes: text("notes"),
  lastUpdatedBy: varchar("last_updated_by").references(() => users.id),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Billing Milestones Table
export const billingMilestones = pgTable("billing_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  targetInvoiceDate: date("target_invoice_date"),
  actualInvoiceDate: date("actual_invoice_date"),
  paymentReceivedDate: date("payment_received_date"),
  status: billingStatusEnum("status").default("upcoming").notNull(),
  // Additional fields for enhanced Excel imports
  contractReference: text("contract_reference"),
  paymentTerms: text("payment_terms"),
  invoiceNumber: text("invoice_number"),
  percentageOfTotal: text("percentage_of_total"),
  billingContact: text("billing_contact"),
  notes: text("notes"),
  // This flag indicates if this milestone is tied to the project delivery date
  isDeliveryMilestone: boolean("is_delivery_milestone").default(false),
  // Fields for tracking ship date changes
  liveDate: date("live_date"),
  lastAcceptedShipDate: date("last_accepted_ship_date"),
  shipDateChanged: boolean("ship_date_changed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Costs Relations
export const projectCostsRelations = relations(projectCosts, ({ one }) => ({
  project: one(projects, {
    fields: [projectCosts.projectId],
    references: [projects.id],
  }),
  lastUpdatedByUser: one(users, {
    fields: [projectCosts.lastUpdatedBy],
    references: [users.id],
  }),
}));

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
  team: text("team").default("General"),  // Added team field for grouping bays
  staffCount: integer("staff_count").default(0),  // Total staff count 
  assemblyStaffCount: integer("assembly_staff_count").default(0),  // Assembly team staff count
  electricalStaffCount: integer("electrical_staff_count").default(0),  // Electrical team staff count
  hoursPerPersonPerWeek: integer("hours_per_person_per_week").default(40), // Standard 40hr work week
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
  totalHours: integer("total_hours").default(1000), // Total hours needed for this project
  row: integer("row").default(0), // Row position within bay (0-3)
  rowIndex: integer("row_index").default(0), // New field for row index (1-4) - friendly name used in code
  status: manufacturingStatusEnum("status").default("scheduled").notNull(),
  fabricationStart: date("fabrication_start"),
  assemblyStart: date("assembly_start"),
  ntcTestingStart: date("ntc_testing_start"),
  qcStart: date("qc_start"),
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

// Allowed Emails Table (for user access control)
export const allowedEmails = pgTable("allowed_emails", {
  id: serial("id").primaryKey(),
  emailPattern: varchar("email_pattern").notNull().unique(),
  description: text("description"),
  autoApprove: boolean("auto_approve").default(false),
  defaultRole: text("default_role").default("viewer"),  // Use text for compatibility
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Role Permissions Table - For customizable role-based access control
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  // The role this permission applies to (admin, editor, viewer)
  role: text("role").notNull(),
  // The category of permission (projects, manufacturing, billing, etc.)
  category: permissionCategoryEnum("category").notNull(),
  // The specific feature within that category
  feature: text("feature").notNull(),
  // Whether this role can view this feature
  canView: boolean("can_view").default(false),
  // Whether this role can edit/modify this feature
  canEdit: boolean("can_edit").default(false),
  // Whether this role can create new items in this feature
  canCreate: boolean("can_create").default(false),
  // Whether this role can delete items in this feature
  canDelete: boolean("can_delete").default(false),
  // Whether this role can import data for this feature
  canImport: boolean("can_import").default(false),
  // Whether this role can export data for this feature
  canExport: boolean("can_export").default(false),
  // For special permissions that don't fit the standard CRUD model
  specialPermissions: jsonb("special_permissions"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// On Time Delivery Tracking Table
export const deliveryTracking = pgTable("delivery_tracking", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  originalEstimatedDate: date("original_estimated_date").notNull(),
  revisedEstimatedDate: date("revised_estimated_date"),
  actualDeliveryDate: date("actual_delivery_date"),
  daysLate: integer("days_late"),
  delayResponsibility: delayResponsibilityEnum("delay_responsibility").default("not_applicable"),
  delayReason: text("delay_reason"),
  delayNotes: text("delay_notes"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Delivery Tracking Relations
export const deliveryTrackingRelations = relations(deliveryTracking, ({ one }) => ({
  project: one(projects, {
    fields: [deliveryTracking.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [deliveryTracking.createdById],
    references: [users.id],
  }),
}));

// Update Project Relations to include delivery tracking and project milestones
export const projectsRelations = relations(projects, ({ one, many }) => ({
  pmOwner: one(users, {
    fields: [projects.pmOwnerId],
    references: [users.id],
  }),
  tasks: many(tasks),
  projectMilestones: many(projectMilestones),
  billingMilestones: many(billingMilestones),
  projectCosts: many(projectCosts),
  baySchedules: many(manufacturingSchedules),
  deliveryTracking: many(deliveryTracking),
}));

// Notifications Table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").default("system").notNull(),
  priority: notificationPriorityEnum("priority").default("low").notNull(),
  isRead: boolean("is_read").default(false),
  relatedProjectId: integer("related_project_id").references(() => projects.id),
  relatedMilestoneId: integer("related_milestone_id").references(() => billingMilestones.id),
  relatedScheduleId: integer("related_schedule_id").references(() => manufacturingSchedules.id),
  link: text("link"), // Internal app link for navigation
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Optional expiration time
});

// Sales Deals Table
export const salesDeals = pgTable("sales_deals", {
  id: serial("id").primaryKey(),
  dealNumber: text("deal_number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Client/Customer Information
  clientName: text("client_name"),
  clientLocation: text("client_location"),
  clientContactName: text("client_contact_name"),
  clientContactEmail: text("client_contact_email"),
  
  // Sales Owner Information
  ownerId: varchar("owner_id").references(() => users.id),
  ownerName: text("owner_name"), // Store sales owner name directly
  
  // Deal Details
  value: decimal("value", { precision: 12, scale: 2 }),
  currency: text("currency").default("USD"),
  dealType: dealTypeEnum("deal_type").notNull(),
  dealStage: dealStageEnum("deal_stage").default("not_started").notNull(),
  
  // Dates
  createdDate: date("created_date").defaultNow().notNull(),
  expectedCloseDate: date("expected_close_date"),
  actualCloseDate: date("actual_close_date"),
  lastContactDate: date("last_contact_date"),
  
  // Tracking and Status
  priority: dealPriorityEnum("priority").default("medium"),
  status: dealStatusEnum("status").default("Not Started"),
  probability: integer("probability").default(50), // Percentage 0-100
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  isConverted: boolean("is_converted").default(false),
  convertedProjectId: integer("converted_project_id").references(() => projects.id),
  
  // Tags and Categories
  vertical: text("vertical"), // Business vertical (e.g., Education, Finance, etc.)
  
  // Timestamps
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales Deal Relations
export const salesDealsRelations = relations(salesDeals, ({ one }) => ({
  owner: one(users, {
    fields: [salesDeals.ownerId],
    references: [users.id],
  }),
  convertedProject: one(projects, {
    fields: [salesDeals.convertedProjectId],
    references: [projects.id],
  }),
}));

// Notification Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [notifications.relatedProjectId],
    references: [projects.id],
  }),
  milestone: one(billingMilestones, {
    fields: [notifications.relatedMilestoneId],
    references: [billingMilestones.id],
  }),
  schedule: one(manufacturingSchedules, {
    fields: [notifications.relatedScheduleId],
    references: [manufacturingSchedules.id],
  }),
}));

// Insert Schemas

export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  username: true,
  email: true,
  password: true,
  passwordResetToken: true,
  passwordResetExpires: true,
  firstName: true,
  lastName: true,
  bio: true,
  profileImageUrl: true,
  role: true,
  isApproved: true,
  status: true, 
  lastLogin: true,
});

// User Audit Log insert schema is defined later

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertProjectMilestoneSchema = createInsertSchema(projectMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBillingMilestoneSchema = createInsertSchema(billingMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Make targetInvoiceDate optional to match our form
  targetInvoiceDate: z.string().optional(),
  // Make additional fields optional with proper validation
  contractReference: z.string().optional(),
  paymentTerms: z.string().optional(),
  invoiceNumber: z.string().optional(),
  percentageOfTotal: z.string().optional(),
  billingContact: z.string().optional(),
  notes: z.string().optional(),
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

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAllowedEmailSchema = createInsertSchema(allowedEmails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

// Create insert schema for delivery tracking
export const insertDeliveryTrackingSchema = createInsertSchema(deliveryTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Create insert schema for archived projects
export const insertArchivedProjectSchema = createInsertSchema(archivedProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Create insert schema for sales deals
export const insertSalesDealSchema = createInsertSchema(salesDeals).omit({
  id: true,
  updatedAt: true,
});

// Create insert schema for user audit logs
export const insertUserAuditLogSchema = createInsertSchema(userAuditLogs).omit({
  id: true,
  timestamp: true,
});

// Insert schema for role permissions
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserAuditLog = typeof userAuditLogs.$inferSelect;
export type InsertUserAuditLog = z.infer<typeof insertUserAuditLogSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type SalesDeal = typeof salesDeals.$inferSelect;
export type InsertSalesDeal = z.infer<typeof insertSalesDealSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// AI Insight types for manufacturing analytics
export interface AIInsight {
  type: 'timeline' | 'billing' | 'production' | 'manufacturing';
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

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferencesSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ArchivedProject = typeof archivedProjects.$inferSelect;
export type InsertArchivedProject = z.infer<typeof insertArchivedProjectSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type InsertProjectMilestone = z.infer<typeof insertProjectMilestoneSchema>;

export type BillingMilestone = typeof billingMilestones.$inferSelect;
export type InsertBillingMilestone = z.infer<typeof insertBillingMilestoneSchema>;

export type ManufacturingBay = typeof manufacturingBays.$inferSelect;
export type InsertManufacturingBay = z.infer<typeof insertManufacturingBaySchema>;

export type ManufacturingSchedule = typeof manufacturingSchedules.$inferSelect;
export type InsertManufacturingSchedule = z.infer<typeof insertManufacturingScheduleSchema>;

export type AllowedEmail = typeof allowedEmails.$inferSelect;
export type InsertAllowedEmail = z.infer<typeof insertAllowedEmailSchema>;

export type DeliveryTracking = typeof deliveryTracking.$inferSelect;
export type InsertDeliveryTracking = z.infer<typeof insertDeliveryTrackingSchema>;

// Financial Goals table
export const financialGoals = pgTable("financial_goals", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  week: integer("week"), // Optional week number (1-6) within the month
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create unique constraint on year, month, and week (if present)
// This ensures we can have both monthly goals (with week=null) and weekly goals (with specific week values)
export const financialGoalsConstraints = unique("financial_goals_year_month_week_unique").on(
  financialGoals.year,
  financialGoals.month,
  financialGoals.week
);

// Create insert schema for financial goals
export const insertFinancialGoalSchema = createInsertSchema(financialGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FinancialGoal = typeof financialGoals.$inferSelect;
export type InsertFinancialGoal = z.infer<typeof insertFinancialGoalSchema>;

// Supply Chain Benchmarks Table
export const supplyChainBenchmarks = pgTable("supply_chain_benchmarks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  weeksBeforePhase: integer("weeks_before_phase").notNull(),
  targetPhase: text("target_phase").notNull(), // FAB, PRODUCTION, NTC, QC, SHIP
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Supply Chain Benchmarks - specific benchmarks for each project
export const projectSupplyChainBenchmarks = pgTable("project_supply_chain_benchmarks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  benchmarkId: integer("benchmark_id")
    .references(() => supplyChainBenchmarks.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  targetDate: date("target_date"),
  isCompleted: boolean("is_completed").default(false),
  completedDate: timestamp("completed_date"), // Changed from date to timestamp to store time
  completedBy: text("completed_by"), // Added to track who completed the benchmark
  weeksBeforePhase: integer("weeks_before_phase"),
  targetPhase: text("target_phase"), // FAB, PRODUCTION, NTC, QC, SHIP
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Supply Chain Benchmarks Relations
export const supplyChainBenchmarksRelations = relations(supplyChainBenchmarks, ({ many }) => ({
  projectBenchmarks: many(projectSupplyChainBenchmarks),
}));

// Project Supply Chain Benchmarks Relations
export const projectSupplyChainBenchmarksRelations = relations(projectSupplyChainBenchmarks, ({ one }) => ({
  project: one(projects, {
    fields: [projectSupplyChainBenchmarks.projectId],
    references: [projects.id],
  }),
  benchmark: one(supplyChainBenchmarks, {
    fields: [projectSupplyChainBenchmarks.benchmarkId],
    references: [supplyChainBenchmarks.id],
  }),
}));

// Create insert schema for supply chain benchmarks
export const insertSupplyChainBenchmarkSchema = createInsertSchema(supplyChainBenchmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Create insert schema for project supply chain benchmarks
export const insertProjectSupplyChainBenchmarkSchema = createInsertSchema(projectSupplyChainBenchmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Create insert schema for project costs
export const insertProjectCostSchema = createInsertSchema(projectCosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ProjectCost = typeof projectCosts.$inferSelect;
export type InsertProjectCost = z.infer<typeof insertProjectCostSchema>;

export type SupplyChainBenchmark = typeof supplyChainBenchmarks.$inferSelect;
export type InsertSupplyChainBenchmark = z.infer<typeof insertSupplyChainBenchmarkSchema>;
export type ProjectSupplyChainBenchmark = typeof projectSupplyChainBenchmarks.$inferSelect;
export type InsertProjectSupplyChainBenchmark = z.infer<typeof insertProjectSupplyChainBenchmarkSchema>;
