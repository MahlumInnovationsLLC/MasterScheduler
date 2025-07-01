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
  "pending",
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

export const materialManagementStatusEnum = pgEnum("material_management_status", [
  "incoming",
  "in_qc",
  "in_work",
  "inventory_job_cart",
  "shipped",
]);

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "editor",
  "viewer",
  "pending",
]);

export const departmentEnum = pgEnum("department", [
  "supply_chain",
  "engineering", 
  "manufacturing",
  "quality_assurance",
  "sales",
  "finance",
  "it",
  "human_resources",
  "operations",
  "other"
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

// Meeting enums
export const meetingStatusEnum = pgEnum("meeting_status", [
  "scheduled",
  "in_progress", 
  "completed",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress", 
  "completed",
]);

export const elevatedConcernTypeEnum = pgEnum("elevated_concern_type", [
  "task",
  "note",
]);

export const delayResponsibilityEnum = pgEnum("delay_responsibility", [
  "nomad_fault",
  "vendor_fault",
  "client_fault",
  "not_applicable",
]);

export const engineeringDisciplineEnum = pgEnum("engineering_discipline", [
  "ME",
  "EE", 
  "ITE",
  "NTC",
]);

export const engineeringWorkloadStatusEnum = pgEnum("engineering_workload_status", [
  "available",
  "at_capacity",
  "overloaded",
  "unavailable",
]);

export const engineeringTaskStatusEnum = pgEnum("engineering_task_status", [
  "not_started",
  "in_progress",
  "under_review",
  "completed",
  "on_hold",
  "cancelled",
]);

// Forensics enums for tracking data changes
export const forensicsActionEnum = pgEnum("forensics_action", [
  "create",
  "update", 
  "delete",
  "archive",
  "restore",
  "import",
  "export",
  "bulk_update",
]);

export const forensicsEntityEnum = pgEnum("forensics_entity", [
  "project",
  "task",
  "billing_milestone",
  "manufacturing_schedule",
  "manufacturing_bay",
  "project_cost",
  "delivery_tracking",
  "sales_deal",
  "supply_chain_benchmark",
  "project_supply_chain_benchmark",
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
  department: text("department"), // Department field for user management
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
    relationName: "userAuditLogs"
  }),
  actionsPerformed: many(userAuditLogs, { 
    relationName: "actionsPerformed"
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
  mechShop: date("mech_shop"),
  fabricationStart: date("fabrication_start"),
  assemblyStart: date("assembly_start"),
  wrapDate: date("wrap_date"),
  ntcTestingDate: date("ntc_testing_date"),
  qcStartDate: date("qc_start_date"),
  executiveReviewDate: date("executive_review_date"),
  shipDate: date("ship_date"),
  deliveryDate: date("delivery_date"),
  paintStart: date("paint_start"),
  productionStart: date("production_start"),
  itStart: date("it_start"),

  // Originally Planned (OP) dates - for tracking original timeline baselines
  opContractDate: date("op_contract_date"),
  opStartDate: date("op_start_date"),
  opEstimatedCompletionDate: date("op_estimated_completion_date"),
  opActualCompletionDate: date("op_actual_completion_date"),
  opChassisETA: date("op_chassis_eta"),
  opMechShop: date("op_mech_shop"),
  opFabricationStart: date("op_fabrication_start"),
  opAssemblyStart: date("op_assembly_start"),
  opWrapDate: date("op_wrap_date"),
  opNtcTestingDate: date("op_ntc_testing_date"),
  opQcStartDate: date("op_qc_start_date"),
  opExecutiveReviewDate: date("op_executive_review_date"),
  opShipDate: date("op_ship_date"),
  opDeliveryDate: date("op_delivery_date"),
  opPaintStart: date("op_paint_start"),
  opProductionStart: date("op_production_start"),
  opItStart: date("op_it_start"),

  // Text overrides for date fields (stores "N/A", "PENDING", etc.)
  fabricationStartText: text("fabrication_start_text"),
  wrapDateText: text("wrap_date_text"),
  ntcTestingDateText: text("ntc_testing_date_text"),
  executiveReviewDateText: text("executive_review_date_text"),
  deliveryDateText: text("delivery_date_text"),

  // Text overrides for Originally Planned date fields
  opFabricationStartText: text("op_fabrication_start_text"),
  opWrapDateText: text("op_wrap_date_text"),
  opNtcTestingDateText: text("op_ntc_testing_date_text"),
  opExecutiveReviewDateText: text("op_executive_review_date_text"),
  opDeliveryDateText: text("op_delivery_date_text"),

  // Department Approval Section
  tierIvMeetingDate: date("tier_iv_meeting_date"),
  salesApproval: boolean("sales_approval").default(false),
  projectManagementApproval: boolean("project_management_approval").default(false),
  supplyChainApproval: boolean("supply_chain_approval").default(false),
  engineeringApproval: boolean("engineering_approval").default(false),
  productionApproval: boolean("production_approval").default(false),
  financeApproval: boolean("finance_approval").default(false),
  qcApproval: boolean("qc_approval").default(false),
  executiveApproval: boolean("executive_approval").default(false),

  // Delivery information
  actualDeliveryDate: date("actual_delivery_date"),
  lateDeliveryReason: text("late_delivery_reason"),
  delayResponsibility: delayResponsibilityEnum("delay_responsibility").default('not_applicable'),
  isDeliveredOnTime: boolean("is_delivered_on_time"),
  contractExtensions: integer("contract_extensions").default(0).notNull(),

  // Project details
  percentComplete: decimal("percent_complete", { precision: 5, scale: 2 }).default("0").notNull(),
  totalHours: integer("total_hours").default(1000), // Total hours needed for manufacturing

  // Project Performance Metrics (from metrics.nomadgcs.com/pea)
  cpi: decimal("cpi", { precision: 10, scale: 4 }), // Cost Performance Index
  plannedValue: decimal("planned_value", { precision: 15, scale: 2 }), // Planned Value
  earnedValue: decimal("earned_value", { precision: 15, scale: 2 }), // Earned Value
  actualCost: decimal("actual_cost", { precision: 15, scale: 2 }), // Actual Cost
  estimatedCost: decimal("estimated_cost", { precision: 15, scale: 2 }), // Estimated Cost
  metricsLastUpdated: timestamp("metrics_last_updated"), // When metrics were last synced

  // Department hours percentage allocations
  fabPercentage: decimal("fab_percentage", { precision: 5, scale: 2 }).default("27").notNull(),
  paintPercentage: decimal("paint_percentage", { precision: 5, scale: 2 }).default("7").notNull(),
  productionPercentage: decimal("production_percentage", { precision: 5, scale: 2 }).default("60").notNull(),
  itPercentage: decimal("it_percentage", { precision: 5, scale: 2 }).default("7").notNull(),
  ntcPercentage: decimal("ntc_percentage", { precision: 5, scale: 2 }).default("7").notNull(),
  qcPercentage: decimal("qc_percentage", { precision: 5, scale: 2 }).default("7").notNull(),

  // Phase visibility controls - allow phases to be removed from projects
  showFabPhase: boolean("show_fab_phase").default(true).notNull(),
  showPaintPhase: boolean("show_paint_phase").default(true).notNull(),
  showProductionPhase: boolean("show_production_phase").default(true).notNull(),
  showItPhase: boolean("show_it_phase").default(true).notNull(),
  showNtcPhase: boolean("show_ntc_phase").default(true).notNull(),
  showQcPhase: boolean("show_qc_phase").default(true).notNull(),

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
  materialManagementStatus: materialManagementStatusEnum("material_management_status").default("in_work"),
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
  mechShop: date("mech_shop"),
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

// Project Milestone Icons - for displaying on bay schedule project bars
export const projectMilestoneIconsEnum = pgEnum("project_milestone_icon", [
  "car", "truck", "box", "tape", "wrench", "gear", "calendar", "clock", 
  "checkmark", "warning", "flag", "star", "diamond", "circle", "square"
]);

export const projectPhaseEnum = pgEnum("project_phase", [
  "fab", "paint", "production", "it", "ntc", "qc"
]);

export const labelTypeEnum = pgEnum("label_type", [
  "status", "priority", "issue", "category", "custom"
]);

export const labelColorEnum = pgEnum("label_color", [
  "red", "orange", "yellow", "green", "blue", "purple", "pink", "gray"
]);

export const projectMilestoneIcons = pgTable("project_milestone_icons", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  name: text("name").notNull(), // e.g., "MECH SHOP", "GRAPHICS"
  icon: projectMilestoneIconsEnum("icon").notNull(),
  phase: projectPhaseEnum("phase").notNull(), // Which phase to calculate from
  daysBefore: integer("days_before").notNull(), // Days before phase start
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Labels Table - for creating reusable labels
export const projectLabels = pgTable("project_labels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  type: labelTypeEnum("type").notNull().default("custom"),
  color: labelColorEnum("color").notNull().default("gray"),
  backgroundColor: text("background_color").default("bg-gray-100"),
  textColor: text("text_color").default("text-gray-800"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Label Assignment Table - for assigning labels to projects
export const projectLabelAssignments = pgTable("project_label_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  labelId: integer("label_id")
    .references(() => projectLabels.id)
    .notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => ({
  uniqueProjectLabel: unique().on(table.projectId, table.labelId),
}));

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
  completedByUserId: varchar("completed_by_user_id").references(() => users.id),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
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

// Project Milestone Icons Relations
export const projectMilestoneIconsRelations = relations(projectMilestoneIcons, ({ one }) => ({
  project: one(projects, {
    fields: [projectMilestoneIcons.projectId],
    references: [projects.id],
  }),
}));

// Project Labels Relations
export const projectLabelsRelations = relations(projectLabels, ({ many }) => ({
  assignments: many(projectLabelAssignments),
}));

// Project Label Assignments Relations
export const projectLabelAssignmentsRelations = relations(projectLabelAssignments, ({ one }) => ({
  project: one(projects, {
    fields: [projectLabelAssignments.projectId],
    references: [projects.id],
  }),
  label: one(projectLabels, {
    fields: [projectLabelAssignments.labelId],
    references: [projectLabels.id],
  }),
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
  assignedToUser: one(users, {
    fields: [tasks.assignedToUserId],
    references: [users.id],
  }),
  completedByUser: one(users, {
    fields: [tasks.completedByUserId],
    references: [users.id],
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

export const moduleEnum = pgEnum("module", [
  "projects",
  "manufacturing", 
  "billing",
  "users",
  "settings",
  "data",
  "reports",
  "import_export",
  "sales",
  "sales-forecast",
  "bay-scheduling",
  "on-time-delivery",
  "delivered-projects",
  "calendar",
  "export-reports",
  "system-settings",
  "dashboard",
  "notifications",
  "meetings",
]);

// Email notification type enum
export const emailNotificationTypeEnum = pgEnum("email_notification_type", [
  "reminder",
  "invitation",
  "update", 
  "task_due",
  "task_assigned",
]);

// Email notification status enum
export const emailNotificationStatusEnum = pgEnum("email_notification_status", [
  "pending",
  "sent",
  "failed",
  "cancelled",
]);

// User-specific permissions table - For per-user module access control
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  // The user this permission applies to
  userId: text("user_id").notNull().references(() => users.id),
  // The module this permission controls
  module: moduleEnum("module").notNull(),
  // Whether this user can access this module
  canAccess: boolean("can_access").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Ensure one permission record per user per module
  userModuleUnique: unique().on(table.userId, table.module),
}));

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
  labelAssignments: many(projectLabelAssignments),
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
  link:text("link"), // Internal app link for navigation
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

// Project Priorities Table
export const projectPriorities = pgTable("project_priorities", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull().unique(),
  priorityOrder: integer("priority_order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Module Visibility Table
export const userModuleVisibility = pgTable("user_module_visibility", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  moduleId: text("module_id").notNull(), // e.g., 'dashboard', 'projects', 'sales-forecast'
  visible: boolean("visible").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userModuleUnique: unique().on(table.userId, table.moduleId),
}));

// User Module Visibility Relations
export const userModuleVisibilityRelations = relations(userModuleVisibility, ({ one }) => ({
  user: one(users, {
    fields: [userModuleVisibility.userId],
    references: [users.id],
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

// Insert schema for project priorities
export const insertProjectPrioritySchema = createInsertSchema(projectPriorities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schema for user module visibility
export const insertUserModuleVisibilitySchema = createInsertSchema(userModuleVisibility).omit({
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

export type ProjectPriority = typeof projectPriorities.$inferSelect;
export type InsertProjectPriority = z.infer<typeof insertProjectPrioritySchema>;

export type UserModuleVisibility = typeof userModuleVisibility.$inferSelect;
export type InsertUserModuleVisibility = z.infer<typeof insertUserModuleVisibilitySchema>;

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

// Multi-Department Benchmarks Table (renamed from Supply Chain Benchmarks)
export const supplyChainBenchmarks = pgTable("supply_chain_benchmarks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  department: departmentEnum("department").notNull().default("supply_chain"),
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

// Engineering Resource Management Tables
export const engineeringResources = pgTable("engineering_resources", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  discipline: text("discipline").notNull(), // 'ME', 'EE', 'ITE', 'NTC'
  title: text("title").notNull(),
  workloadStatus: text("workload_status").default("available").notNull(), // 'available', 'at_capacity', 'overloaded', 'unavailable'
  currentCapacityPercent: integer("current_capacity_percent").default(0).notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).default("0.00").notNull(),
  skillLevel: text("skill_level").default("intermediate").notNull(), // 'junior', 'intermediate', 'senior', 'principal'
  isActive: boolean("is_active").default(true).notNull(),
  userId: text("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const engineeringTasks = pgTable("engineering_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  resourceId: integer("resource_id")
    .references(() => engineeringResources.id),
  taskName: text("task_name").notNull(),
  description: text("description"),
  discipline: engineeringDisciplineEnum("discipline").notNull(),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }).notNull(),
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }).default("0"),
  percentComplete: decimal("percent_complete", { precision: 5, scale: 2}).default("0").notNull(),
  status: engineeringTaskStatusEnum("status").default("not_started").notNull(),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const engineeringBenchmarks = pgTable("engineering_benchmarks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  discipline: text("discipline").notNull(), // 'ME', 'EE', 'ITE', 'NTC'
  benchmarkName: text("benchmark_name").notNull(),
  description: text("description"),
  targetDate: text("target_date").notNull(),
  actualDate: text("actual_date"),
  isCompleted: boolean("is_completed").default(false).notNull(),
  commitmentLevel: text("commitment_level").default("medium").notNull(), // 'low', 'medium', 'high', 'critical'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Engineering Assignments Table
export const projectEngineeringAssignments = pgTable("project_engineering_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  resourceId: integer("resource_id")
    .references(() => engineeringResources.id)
    .notNull(),
  discipline: text("discipline").notNull(), // 'ME', 'EE', 'ITE', 'NTC'
  percentage: integer("percentage").default(0).notNull(),
  isLead: boolean("is_lead").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_project_resource_discipline").on(table.projectId, table.resourceId, table.discipline)
]);

// Engineering Resource Relations
export const engineeringResourcesRelations = relations(engineeringResources, ({ many, one }) => ({
  tasks: many(engineeringTasks),
  assignments: many(projectEngineeringAssignments),
  user: one(users, {
    fields: [engineeringResources.userId],
    references: [users.id],
  }),
}));

export const engineeringTasksRelations = relations(engineeringTasks, ({ one }) => ({
  project: one(projects, {
    fields: [engineeringTasks.projectId],
    references: [projects.id],
  }),
  resource: one(engineeringResources, {
    fields: [engineeringTasks.resourceId],
    references: [engineeringResources.id],
  }),
}));

export const engineeringBenchmarksRelations = relations(engineeringBenchmarks, ({ one }) => ({
  project: one(projects, {
    fields: [engineeringBenchmarks.projectId],
    references: [projects.id],
  }),
}));

export const projectEngineeringAssignmentsRelations = relations(projectEngineeringAssignments, ({ one }) => ({
  project: one(projects, {
    fields: [projectEngineeringAssignments.projectId],
    references: [projects.id],
  }),
  resource: one(engineeringResources, {
    fields: [projectEngineeringAssignments.resourceId],
    references: [engineeringResources.id],
  }),
}));

// Engineering schemas
export const insertEngineeringResourceSchema = createInsertSchema(engineeringResources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEngineeringTaskSchema = createInsertSchema(engineeringTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEngineeringBenchmarkSchema = createInsertSchema(engineeringBenchmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectEngineeringAssignmentSchema = createInsertSchema(projectEngineeringAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EngineeringResource = typeof engineeringResources.$inferSelect;
export type InsertEngineeringResource = z.infer<typeof insertEngineeringResourceSchema>;
export type EngineeringTask = typeof engineeringTasks.$inferSelect;
export type InsertEngineeringTask = z.infer<typeof insertEngineeringTaskSchema>;
export type EngineeringBenchmark = typeof engineeringBenchmarks.$inferSelect;
export type InsertEngineeringBenchmark = z.infer<typeof insertEngineeringBenchmarkSchema>;
export type ProjectEngineeringAssignment = typeof projectEngineeringAssignments.$inferSelect;
export type InsertProjectEngineeringAssignment = z.infer<typeof insertProjectEngineeringAssignmentSchema>;

export type SelectUserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;

// Create insert schema for project milestone icons
export const insertProjectMilestoneIconSchema = createInsertSchema(projectMilestoneIcons).omit({
  id: true,
  projectId: true, // Exclude projectId since it comes from route parameter
  createdAt: true,
  updatedAt: true,
});

// Type definitions for project milestone icons
export type ProjectMilestoneIcon = typeof projectMilestoneIcons.$inferSelect;
export type InsertProjectMilestoneIcon = z.infer<typeof insertProjectMilestoneIconSchema>;

// Project Forensics Table - tracks all changes to project-related data
export const projectForensics = pgTable("project_forensics", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  entityType: forensicsEntityEnum("entity_type").notNull(),
  entityId: integer("entity_id").notNull(), // ID of the specific entity that was changed
  action: forensicsActionEnum("action").notNull(),
  userId: varchar("user_id").references(() => users.id),
  username: text("username"), // Store username for display even if user is deleted

  // Change tracking
  changedFields: text("changed_fields").array(), // Array of field names that changed
  previousValues: jsonb("previous_values"), // JSON object with previous field values
  newValues: jsonb("new_values"), // JSON object with new field values

  // Context information
  changeDescription: text("change_description"), // Human-readable description of what changed
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  source: text("source").default("manual"), // manual, import, api, bulk_update, etc.

  // Impact tracking
  affectedEntities: jsonb("affected_entities"), // Other entities affected by this change
  cascadeChanges: boolean("cascade_changes").default(false), // Whether this change triggered other changes

  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Project Forensics Relations
export const projectForensicsRelations = relations(projectForensics, ({ one }) => ({
  project: one(projects, {
    fields: [projectForensics.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectForensics.userId],
    references: [users.id],
  }),
}));

// Create insert schema for project forensics
export const insertProjectForensicsSchema = createInsertSchema(projectForensics).omit({
  id: true,
  timestamp: true,
});

// Type definitions for project forensics
export type ProjectForensics = typeof projectForensics.$inferSelect;
export type InsertProjectForensics = z.infer<typeof insertProjectForensicsSchema>;

// Meetings Module Tables
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  datetime: timestamp("datetime").notNull(),
  location: text("location"),
  virtualLink: text("virtual_link"),
  organizerId: varchar("organizer_id").references(() => users.id).notNull(),
  status: meetingStatusEnum("status").default("scheduled"),
  agenda: text("agenda").array().default([]),
  description: text("description"),
  relatedProjects: integer("related_projects").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const meetingAttendees = pgTable("meeting_attendees", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  attended: boolean("attended").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique().on(table.meetingId, table.userId)
]);

export const meetingNotes = pgTable("meeting_notes", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id).notNull(),
  agendaItem: text("agenda_item").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const meetingTasks = pgTable("meeting_tasks", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id).notNull(),
  description: text("description").notNull(),
  assignedToId: varchar("assigned_to_id").references(() => users.id).notNull(),
  dueDate: date("due_date"),
  priority: taskPriorityEnum("priority").default("medium"),
  status: taskStatusEnum("status").default("pending"),
  projectId: integer("project_id").references(() => projects.id), // Link to project
  syncedTaskId: integer("synced_task_id").references(() => tasks.id), // Link to project task
  completedDate: date("completed_date"),
  completedByUserId: varchar("completed_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Meeting Templates
export const meetingTemplates = pgTable("meeting_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  defaultDuration: integer("default_duration").default(60), // in minutes
  agendaItems: text("agenda_items").array(),
  defaultAttendees: text("default_attendees").array(), // user IDs
  reminderSettings: jsonb("reminder_settings").default({
    email: true,
    daysBefore: [1, 7],
    hoursBefore: [2]
  }),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Elevated Concerns - for Tier III/IV dashboards
export const elevatedConcerns = pgTable("elevated_concerns", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  type: elevatedConcernTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: taskPriorityEnum("priority").default("medium"),
  status: taskStatusEnum("status").default("pending"),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  dueDate: date("due_date"),
  isEscalatedToTierIV: boolean("is_escalated_to_tier_iv").default(false),
  escalatedAt: timestamp("escalated_at"),
  escalatedBy: varchar("escalated_by").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email Notifications
export const meetingEmailNotifications = pgTable("meeting_email_notifications", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id).notNull(),
  type: emailNotificationTypeEnum("type").notNull(),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  sentAt: timestamp("sent_at"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: emailNotificationStatusEnum("status").default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Meeting Relations
export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  organizer: one(users, {
    fields: [meetings.organizerId],
    references: [users.id],
  }),
  attendees: many(meetingAttendees),
  notes: many(meetingNotes),
  tasks: many(meetingTasks),
}));

export const meetingAttendeesRelations = relations(meetingAttendees, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingAttendees.meetingId],
    references: [meetings.id],
  }),
  user: one(users, {
    fields: [meetingAttendees.userId],
    references: [users.id],
  }),
}));

export const meetingNotesRelations = relations(meetingNotes, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingNotes.meetingId],
    references: [meetings.id],
  }),
}));

export const meetingTasksRelations = relations(meetingTasks, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingTasks.meetingId],
    references: [meetings.id],
  }),
  assignedTo: one(users, {
    fields: [meetingTasks.assignedToId],
    references: [users.id],
  }),
}));

export const elevatedConcernsRelations = relations(elevatedConcerns, ({ one }) => ({
  project: one(projects, {
    fields: [elevatedConcerns.projectId],
    references: [projects.id],
  }),
  assignedTo: one(users, {
    fields: [elevatedConcerns.assignedToId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [elevatedConcerns.createdBy],
    references: [users.id],
  }),
  escalatedBy: one(users, {
    fields: [elevatedConcerns.escalatedBy],
    references: [users.id],
  }),
}));

// Meeting Insert Schemas
export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  datetime: z.string().transform((str) => new Date(str)),
  organizerId: z.string().optional(), // Make optional for validation, will be set in route
});

export const insertMeetingAttendeeSchema = createInsertSchema(meetingAttendees).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingNoteSchema = createInsertSchema(meetingNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingTaskSchema = createInsertSchema(meetingTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingTemplateSchema = createInsertSchema(meetingTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingEmailNotificationSchema = createInsertSchema(meetingEmailNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertElevatedConcernSchema = createInsertSchema(elevatedConcerns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Meeting Types
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type MeetingAttendee = typeof meetingAttendees.$inferSelect;
export type InsertMeetingAttendee = z.infer<typeof insertMeetingAttendeeSchema>;
export type MeetingNote = typeof meetingNotes.$inferSelect;
export type InsertMeetingNote = z.infer<typeof insertMeetingNoteSchema>;
export type MeetingTask = typeof meetingTasks.$inferSelect;
export type InsertMeetingTask = z.infer<typeof insertMeetingTaskSchema>;
export type MeetingTemplate = typeof meetingTemplates.$inferSelect;
export type InsertMeetingTemplate = z.infer<typeof insertMeetingTemplateSchema>;
export type MeetingEmailNotification = typeof meetingEmailNotifications.$inferSelect;
export type InsertMeetingEmailNotification = z.infer<typeof insertMeetingEmailNotificationSchema>;
export type ElevatedConcern = typeof elevatedConcerns.$inferSelect;
export type InsertElevatedConcern = z.infer<typeof insertElevatedConcernSchema>;

// Priority System Enums
export const priorityTypeEnum = pgEnum("priority_type", [
  "production",
  "supply_chain",
  "quality",
  "engineering",
  "logistics",
  "maintenance"
]);

export const priorityLevelEnum = pgEnum("priority_level", [
  "critical",
  "high", 
  "medium",
  "low"
]);

export const priorityStatusEnum = pgEnum("priority_status", [
  "new",
  "in_progress",
  "blocked",
  "review",
  "completed",
  "cancelled"
]);

// Priority Items Table
export const priorities = pgTable("priorities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: priorityTypeEnum("type").notNull(),
  level: priorityLevelEnum("level").notNull().default("medium"),
  status: priorityStatusEnum("status").notNull().default("new"),
  projectId: integer("project_id").references(() => projects.id),
  assignedToId: text("assigned_to_id").references(() => users.id),
  createdById: text("created_by_id").notNull().references(() => users.id),
  dueDate: date("due_date"),
  estimatedHours: decimal("estimated_hours", { precision: 10, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 10, scale: 2 }),
  tags: text("tags").array().default([]),
  attachments: jsonb("attachments").$type<Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Priority Comments Table
export const priorityComments = pgTable("priority_comments", {
  id: serial("id").primaryKey(),
  priorityId: integer("priority_id").notNull().references(() => priorities.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Priority Activity Log Table
export const priorityActivityLog = pgTable("priority_activity_log", {
  id: serial("id").primaryKey(),
  priorityId: integer("priority_id").notNull().references(() => priorities.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // created, updated, status_changed, assigned, commented, etc.
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Priority Visibility Table
export const userPriorityVisibility = pgTable("user_priority_visibility", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  canView: boolean("can_view").default(false),
  canCreate: boolean("can_create").default(false),
  canEdit: boolean("can_edit").default(false),
  canDelete: boolean("can_delete").default(false),
  canAssign: boolean("can_assign").default(false),
  priorityTypes: priorityTypeEnum("priority_types").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUser: unique().on(table.userId),
}));

// Priority Relations
export const prioritiesRelations = relations(priorities, ({ one, many }) => ({
  project: one(projects, {
    fields: [priorities.projectId],
    references: [projects.id],
  }),
  assignedTo: one(users, {
    fields: [priorities.assignedToId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [priorities.createdById],
    references: [users.id],
  }),
  comments: many(priorityComments),
  activityLogs: many(priorityActivityLog),
}));

export const priorityCommentsRelations = relations(priorityComments, ({ one }) => ({
  priority: one(priorities, {
    fields: [priorityComments.priorityId],
    references: [priorities.id],
  }),
  author: one(users, {
    fields: [priorityComments.authorId],
    references: [users.id],
  }),
}));

export const priorityActivityLogRelations = relations(priorityActivityLog, ({ one }) => ({
  priority: one(priorities, {
    fields: [priorityActivityLog.priorityId],
    references: [priorities.id],
  }),
  user: one(users, {
    fields: [priorityActivityLog.userId],
    references: [users.id],
  }),
}));

export const userPriorityVisibilityRelations = relations(userPriorityVisibility, ({ one }) => ({
  user: one(users, {
    fields: [userPriorityVisibility.userId],
    references: [users.id],
  }),
}));

// Priority Insert Schemas
export const insertPrioritySchema = createInsertSchema(priorities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
}).extend({
  dueDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
});

export const insertPriorityCommentSchema = createInsertSchema(priorityComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPriorityActivityLogSchema = createInsertSchema(priorityActivityLog).omit({
  id: true,
  createdAt: true,
});

export const insertUserPriorityVisibilitySchema = createInsertSchema(userPriorityVisibility).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Priority Types
export type Priority = typeof priorities.$inferSelect;
export type InsertPriority = z.infer<typeof insertPrioritySchema>;
export type PriorityComment = typeof priorityComments.$inferSelect;
export type InsertPriorityComment = z.infer<typeof insertPriorityCommentSchema>;
export type PriorityActivityLog = typeof priorityActivityLog.$inferSelect;
export type InsertPriorityActivityLog = z.infer<typeof insertPriorityActivityLogSchema>;
export type UserPriorityVisibility = typeof userPriorityVisibility.$inferSelect;
export type InsertUserPriorityVisibility = z.infer<typeof insertUserPriorityVisibilitySchema>;

// Project Labels Schemas
export const insertProjectLabelSchema = createInsertSchema(projectLabels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectLabelAssignmentSchema = createInsertSchema(projectLabelAssignments).omit({
  id: true,
  assignedAt: true,
});

// Project Labels Types
export type ProjectLabel = typeof projectLabels.$inferSelect;
export type InsertProjectLabel = z.infer<typeof insertProjectLabelSchema>;
export type ProjectLabelAssignment = typeof projectLabelAssignments.$inferSelect;
export type InsertProjectLabelAssignment = z.infer<typeof insertProjectLabelAssignmentSchema>;

// Quality Assurance Module Enums
export const ncrSeverityEnum = pgEnum("ncr_severity", [
  "low",
  "medium", 
  "high",
  "critical"
]);

export const ncrStatusEnum = pgEnum("ncr_status", [
  "open",
  "under_review",
  "resolved",
  "closed"
]);

export const capaStatusEnum = pgEnum("capa_status", [
  "draft",
  "in_progress",
  "complete",
  "verified"
]);

export const scarStatusEnum = pgEnum("scar_status", [
  "issued",
  "supplier_responded",
  "under_review",
  "closed",
  "escalated"
]);

export const auditTypeEnum = pgEnum("audit_type", [
  "internal",
  "external",
  "iso",
  "dot",
  "customer",
  "supplier"
]);

export const auditFindingTypeEnum = pgEnum("audit_finding_type", [
  "major",
  "minor",
  "observation",
  "opportunity"
]);

export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "submitted",
  "reviewed",
  "approved",
  "obsolete"
]);

export const documentCategoryEnum = pgEnum("document_category", [
  "sop",
  "work_instruction",
  "form",
  "calibration_record",
  "quality_plan",
  "specification"
]);

export const trainingStatusEnum = pgEnum("training_status", [
  "not_started",
  "in_progress",
  "completed",
  "expired"
]);

export const trainingTypeEnum = pgEnum("training_type", [
  "onboarding",
  "equipment_certification",
  "sop_familiarization",
  "safety",
  "quality_system"
]);

// Quality Assurance Tables

// 1. Non-Conformance Reports (NCRs)
export const nonConformanceReports = pgTable("non_conformance_reports", {
  id: serial("id").primaryKey(),
  ncrNumber: text("ncr_number").notNull().unique(), // Auto-generated NCR-YYYY-###
  projectId: integer("project_id").references(() => projects.id).notNull(),
  bayId: integer("bay_id").references(() => manufacturingBays.id),
  
  // Core NCR Information
  issueTitle: text("issue_title").notNull(),
  description: text("description").notNull(),
  vehicleModuleSection: text("vehicle_module_section"),
  partSubsystemInvolved: text("part_subsystem_involved"),
  
  // Identification Details
  dateIdentified: timestamp("date_identified").notNull(),
  identifiedById: varchar("identified_by_id").references(() => users.id).notNull(),
  severity: ncrSeverityEnum("severity").notNull(),
  status: ncrStatusEnum("status").default("open").notNull(),
  
  // Attachments and Evidence
  attachmentUrls: text("attachment_urls").array(),
  imageUrls: text("image_urls").array(),
  
  // Resolution
  resolutionDescription: text("resolution_description"),
  resolutionDate: timestamp("resolution_date"),
  resolvedById: varchar("resolved_by_id").references(() => users.id),
  
  // Auto-trigger CAPA flag
  requiresCapa: boolean("requires_capa").default(false),
  capaTriggered: boolean("capa_triggered").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. Corrective and Preventive Actions (CAPA)
export const correctiveActions = pgTable("corrective_actions", {
  id: serial("id").primaryKey(),
  capaNumber: text("capa_number").notNull().unique(), // Auto-generated CAPA-YYYY-###
  
  // Linkages
  ncrId: integer("ncr_id"), // Will add foreign key after table creation
  auditFindingId: integer("audit_finding_id"), // Will add foreign key after table creation
  projectId: integer("project_id").references(() => projects.id),
  
  // CAPA Details
  title: text("title").notNull(),
  description: text("description").notNull(),
  rootCauseAnalysis: text("root_cause_analysis").notNull(),
  analysisMethod: text("analysis_method"), // "5_whys", "fishbone", "other"
  
  // Actions
  correctiveActions: text("corrective_actions").notNull(),
  preventiveMeasures: text("preventive_measures").notNull(),
  
  // Ownership and Timeline
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  dueDate: date("due_date").notNull(),
  effectivenessReviewDate: date("effectiveness_review_date"),
  
  // Status and Verification
  status: capaStatusEnum("status").default("draft").notNull(),
  implementationDate: timestamp("implementation_date"),
  verificationDate: timestamp("verification_date"),
  verifiedById: varchar("verified_by_id").references(() => users.id),
  effectivenessVerified: boolean("effectiveness_verified").default(false),
  
  // Attachments
  attachmentUrls: text("attachment_urls").array(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. Supplier Corrective Action Requests (SCAR)
export const supplierCorrectiveActions = pgTable("supplier_corrective_actions", {
  id: serial("id").primaryKey(),
  scarNumber: text("scar_number").notNull().unique(), // Auto-generated SCAR-YYYY-###
  
  // Supplier Information
  supplierName: text("supplier_name").notNull(),
  supplierContact: text("supplier_contact"),
  supplierEmail: text("supplier_email"),
  
  // Issue Details
  linkedPoNumber: text("linked_po_number"),
  partNumber: text("part_number"),
  defectDescription: text("defect_description").notNull(),
  
  // Dates and Timeline
  dateReported: timestamp("date_reported").notNull(),
  supplierResponseDue: date("supplier_response_due").notNull(),
  supplierResponseDate: date("supplier_response_date"),
  
  // Evidence and Attachments
  evidenceUrls: text("evidence_urls").array(),
  photoUrls: text("photo_urls").array(),
  
  // Supplier Response
  supplierResponse: text("supplier_response"),
  supplierCorrectiveActions: text("supplier_corrective_actions"),
  supplierPreventiveMeasures: text("supplier_preventive_measures"),
  
  // Internal Review
  internalReviewNotes: text("internal_review_notes"),
  closureNotes: text("closure_notes"),
  closureDate: timestamp("closure_date"),
  closedById: varchar("closed_by_id").references(() => users.id),
  
  // Status and Escalation
  status: scarStatusEnum("status").default("issued").notNull(),
  escalationLevel: integer("escalation_level").default(1),
  effectivenessVerified: boolean("effectiveness_verified").default(false),
  
  // Project Linkage
  projectId: integer("project_id").references(() => projects.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 4. Audit Management
export const audits = pgTable("audits", {
  id: serial("id").primaryKey(),
  auditNumber: text("audit_number").notNull().unique(), // Auto-generated AUD-YYYY-###
  
  // Audit Details
  auditType: auditTypeEnum("audit_type").notNull(),
  auditTitle: text("audit_title").notNull(),
  auditDate: date("audit_date").notNull(),
  auditorName: text("auditor_name").notNull(),
  auditorOrganization: text("auditor_organization"),
  
  // Scope
  areaFunction: text("area_function").notNull(), // e.g., "Electrical Install", "Chassis Fabrication"
  scope: text("scope").notNull(),
  
  // Planning
  plannedDate: date("planned_date"),
  plannedById: varchar("planned_by_id").references(() => users.id),
  
  // Completion
  completedDate: timestamp("completed_date"),
  completedById: varchar("completed_by_id").references(() => users.id),
  
  // Summary
  auditSummary: text("audit_summary"),
  overallRating: text("overall_rating"), // "satisfactory", "needs_improvement", "unsatisfactory"
  
  // Attachments
  reportUrl: text("report_url"),
  attachmentUrls: text("attachment_urls").array(),
  
  // Project Linkage
  projectId: integer("project_id").references(() => projects.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 5. Audit Findings
export const auditFindings = pgTable("audit_findings", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").references(() => audits.id).notNull(),
  
  // Finding Details
  findingNumber: text("finding_number").notNull(), // e.g., "F001", "F002"
  findingType: auditFindingTypeEnum("finding_type").notNull(),
  clauseReference: text("clause_reference"), // ISO clause or standard reference
  
  // Description
  findingDescription: text("finding_description").notNull(),
  evidence: text("evidence"),
  requirement: text("requirement"),
  
  // Response and Correction
  responseRequired: boolean("response_required").default(true),
  targetCloseDate: date("target_close_date"),
  actualCloseDate: date("actual_close_date"),
  
  // Status
  status: text("status").default("open").notNull(), // "open", "responded", "verified", "closed"
  
  // Linkages
  linkedNcrId: integer("linked_ncr_id").references(() => nonConformanceReports.id),
  linkedCapaId: integer("linked_capa_id"), // Will add foreign key after table creation
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 6. Document Control
export const qualityDocuments = pgTable("quality_documents", {
  id: serial("id").primaryKey(),
  documentNumber: text("document_number").notNull().unique(), // Auto-generated DOC-YYYY-###
  
  // Document Information
  title: text("title").notNull(),
  description: text("description"),
  category: documentCategoryEnum("category").notNull(),
  department: userDepartmentEnum("department"),
  
  // Version Control
  version: text("version").default("1.0").notNull(),
  previousVersionId: integer("previous_version_id"), // Will add self-reference after table creation
  versionNotes: text("version_notes"),
  
  // File Information
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  
  // Lifecycle
  status: documentStatusEnum("status").default("draft").notNull(),
  effectiveDate: date("effective_date"),
  expiryDate: date("expiry_date"),
  
  // Ownership and Approval
  authorId: varchar("author_id").references(() => users.id).notNull(),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  approverId: varchar("approver_id").references(() => users.id),
  
  // Dates
  submittedDate: timestamp("submitted_date"),
  reviewedDate: timestamp("reviewed_date"),
  approvedDate: timestamp("approved_date"),
  
  // Tags and Classification
  tags: text("tags").array(),
  complianceCategory: text("compliance_category"), // "ISO", "DOT", "Customer", etc.
  
  // Project Linkage
  projectId: integer("project_id").references(() => projects.id),
  projectType: text("project_type"), // For filtering by project type
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 7. Document Acknowledgments
export const documentAcknowledgments = pgTable("document_acknowledgments", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => qualityDocuments.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Acknowledgment Details
  acknowledgedDate: timestamp("acknowledged_date").defaultNow(),
  comments: text("comments"),
  
  // Digital signature equivalent
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Ensure one acknowledgment per user per document version
  unique("unique_user_document_ack").on(table.documentId, table.userId)
]);

// 8. Training Center
export const trainingModules = pgTable("training_modules", {
  id: serial("id").primaryKey(),
  moduleNumber: text("module_number").notNull().unique(), // Auto-generated TRN-YYYY-###
  
  // Module Information
  title: text("title").notNull(),
  description: text("description"),
  type: trainingTypeEnum("type").notNull(),
  category: text("category"), // "Safety", "Quality", "Equipment", etc.
  
  // Content
  contentUrl: text("content_url"), // PDF, video, slides
  contentType: text("content_type"), // "pdf", "video", "slideshow", "quiz"
  duration: integer("duration"), // Duration in minutes
  
  // Requirements
  requiredForDepartments: userDepartmentEnum("required_for_departments").array(),
  requiredForRoles: text("required_for_roles").array(),
  prerequisiteModuleIds: integer("prerequisite_module_ids").array(),
  
  // Certification
  requiresCertification: boolean("requires_certification").default(false),
  certificationValidityDays: integer("certification_validity_days"),
  passingScore: integer("passing_score"), // Percentage required to pass
  
  // Quiz Configuration
  hasQuiz: boolean("has_quiz").default(false),
  quizQuestions: jsonb("quiz_questions"), // JSON array of questions
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Ownership
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  lastUpdatedById: varchar("last_updated_by_id").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 9. Training Assignments
export const trainingAssignments = pgTable("training_assignments", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").references(() => trainingModules.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Assignment Details
  assignedDate: timestamp("assigned_date").defaultNow(),
  assignedById: varchar("assigned_by_id").references(() => users.id).notNull(),
  dueDate: date("due_date"),
  
  // Progress and Completion
  status: trainingStatusEnum("status").default("not_started").notNull(),
  startedDate: timestamp("started_date"),
  completedDate: timestamp("completed_date"),
  
  // Quiz Results
  quizAttempts: integer("quiz_attempts").default(0),
  bestScore: integer("best_score"), // Best quiz score percentage
  lastAttemptScore: integer("last_attempt_score"),
  quizResults: jsonb("quiz_results"), // Detailed quiz attempt history
  
  // Certification
  certified: boolean("certified").default(false),
  certificationDate: timestamp("certification_date"),
  certificationExpiryDate: date("certification_expiry_date"),
  recertificationRequired: boolean("recertification_required").default(false),
  
  // Comments and Notes
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Ensure one assignment per user per module
  unique("unique_user_module_assignment").on(table.moduleId, table.userId)
]);

// Quality Assurance Relations
export const nonConformanceReportsRelations = relations(nonConformanceReports, ({ one, many }) => ({
  project: one(projects, {
    fields: [nonConformanceReports.projectId],
    references: [projects.id],
  }),
  bay: one(manufacturingBays, {
    fields: [nonConformanceReports.bayId],
    references: [manufacturingBays.id],
  }),
  identifiedBy: one(users, {
    fields: [nonConformanceReports.identifiedById],
    references: [users.id],
    relationName: "ncrIdentifiedBy"
  }),
  resolvedBy: one(users, {
    fields: [nonConformanceReports.resolvedById],
    references: [users.id],
    relationName: "ncrResolvedBy"
  }),
  correctiveActions: many(correctiveActions),
}));

export const correctiveActionsRelations = relations(correctiveActions, ({ one }) => ({
  ncr: one(nonConformanceReports, {
    fields: [correctiveActions.ncrId],
    references: [nonConformanceReports.id],
  }),
  auditFinding: one(auditFindings, {
    fields: [correctiveActions.auditFindingId],
    references: [auditFindings.id],
  }),
  project: one(projects, {
    fields: [correctiveActions.projectId],
    references: [projects.id],
  }),
  owner: one(users, {
    fields: [correctiveActions.ownerId],
    references: [users.id],
    relationName: "capaOwner"
  }),
  verifiedBy: one(users, {
    fields: [correctiveActions.verifiedById],
    references: [users.id],
    relationName: "capaVerifiedBy"
  }),
}));

export const supplierCorrectiveActionsRelations = relations(supplierCorrectiveActions, ({ one }) => ({
  project: one(projects, {
    fields: [supplierCorrectiveActions.projectId],
    references: [projects.id],
  }),
  closedBy: one(users, {
    fields: [supplierCorrectiveActions.closedById],
    references: [users.id],
  }),
}));

export const auditsRelations = relations(audits, ({ one, many }) => ({
  project: one(projects, {
    fields: [audits.projectId],
    references: [projects.id],
  }),
  plannedBy: one(users, {
    fields: [audits.plannedById],
    references: [users.id],
    relationName: "auditPlannedBy"
  }),
  completedBy: one(users, {
    fields: [audits.completedById],
    references: [users.id],
    relationName: "auditCompletedBy"
  }),
  findings: many(auditFindings),
}));

export const auditFindingsRelations = relations(auditFindings, ({ one }) => ({
  audit: one(audits, {
    fields: [auditFindings.auditId],
    references: [audits.id],
  }),
  linkedNcr: one(nonConformanceReports, {
    fields: [auditFindings.linkedNcrId],
    references: [nonConformanceReports.id],
  }),
  linkedCapa: one(correctiveActions, {
    fields: [auditFindings.linkedCapaId],
    references: [correctiveActions.id],
  }),
}));

export const qualityDocumentsRelations = relations(qualityDocuments, ({ one, many }) => ({
  author: one(users, {
    fields: [qualityDocuments.authorId],
    references: [users.id],
    relationName: "documentAuthor"
  }),
  reviewer: one(users, {
    fields: [qualityDocuments.reviewerId],
    references: [users.id],
    relationName: "documentReviewer"
  }),
  approver: one(users, {
    fields: [qualityDocuments.approverId],
    references: [users.id],
    relationName: "documentApprover"
  }),
  project: one(projects, {
    fields: [qualityDocuments.projectId],
    references: [projects.id],
  }),
  previousVersion: one(qualityDocuments, {
    fields: [qualityDocuments.previousVersionId],
    references: [qualityDocuments.id],
    relationName: "documentVersions"
  }),
  acknowledgments: many(documentAcknowledgments),
}));

export const documentAcknowledgmentsRelations = relations(documentAcknowledgments, ({ one }) => ({
  document: one(qualityDocuments, {
    fields: [documentAcknowledgments.documentId],
    references: [qualityDocuments.id],
  }),
  user: one(users, {
    fields: [documentAcknowledgments.userId],
    references: [users.id],
  }),
}));

export const trainingModulesRelations = relations(trainingModules, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [trainingModules.createdById],
    references: [users.id],
    relationName: "trainingModuleCreator"
  }),
  lastUpdatedBy: one(users, {
    fields: [trainingModules.lastUpdatedById],
    references: [users.id],
    relationName: "trainingModuleUpdater"
  }),
  assignments: many(trainingAssignments),
}));

export const trainingAssignmentsRelations = relations(trainingAssignments, ({ one }) => ({
  module: one(trainingModules, {
    fields: [trainingAssignments.moduleId],
    references: [trainingModules.id],
  }),
  user: one(users, {
    fields: [trainingAssignments.userId],
    references: [users.id],
    relationName: "trainingAssignee"
  }),
  assignedBy: one(users, {
    fields: [trainingAssignments.assignedById],
    references: [users.id],
    relationName: "trainingAssigner"
  }),
}));

// Quality Assurance Insert Schemas
export const insertNonConformanceReportSchema = createInsertSchema(nonConformanceReports).omit({
  id: true,
  ncrNumber: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
});

export const insertNcrSchema = insertNonConformanceReportSchema;

export const insertCorrectiveActionSchema = createInsertSchema(correctiveActions).omit({
  id: true,
  capaNumber: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierCorrectiveActionSchema = createInsertSchema(supplierCorrectiveActions).omit({
  id: true,
  scarNumber: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
});

export const insertAuditSchema = createInsertSchema(audits).omit({
  id: true,
  auditNumber: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
});

export const insertAuditFindingSchema = createInsertSchema(auditFindings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQualityDocumentSchema = createInsertSchema(qualityDocuments).omit({
  id: true,
  documentNumber: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentAcknowledgmentSchema = createInsertSchema(documentAcknowledgments).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingModuleSchema = createInsertSchema(trainingModules).omit({
  id: true,
  moduleNumber: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
});

// External Connections
export const externalConnections = pgTable("external_connections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // "webhook", "api", "database", etc.
  method: text("method").notNull().default("POST"), // GET, POST, PUT, DELETE
  url: text("url").notNull(),
  headers: jsonb("headers").$type<Record<string, string>>().default({}),
  authentication: jsonb("authentication").$type<{
    type: 'none' | 'basic' | 'bearer' | 'apikey';
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  }>().default({ type: 'none' }),
  requestBody: text("request_body"), // Template for request body
  responseMapping: jsonb("response_mapping").$type<Record<string, string>>().default({}),
  retryConfig: jsonb("retry_config").$type<{
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  }>().default({ maxRetries: 3, retryDelay: 1000, backoffMultiplier: 2 }),
  isActive: boolean("is_active").default(true),
  lastTestedAt: timestamp("last_tested_at"),
  lastSuccessAt: timestamp("last_success_at"),
  lastErrorAt: timestamp("last_error_at"),
  lastErrorMessage: text("last_error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// External Connection Logs
export const externalConnectionLogs = pgTable("external_connection_logs", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").references(() => externalConnections.id),
  requestData: jsonb("request_data"),
  responseData: jsonb("response_data"),
  statusCode: integer("status_code"),
  responseTime: integer("response_time"), // in milliseconds
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTrainingAssignmentSchema = createInsertSchema(trainingAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Project Metrics Connection Configuration
export const projectMetricsConnection = pgTable("project_metrics_connection", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Project Performance Metrics API"),
  url: text("url").notNull().default("http://metrics.nomadgcs.com/pea"),
  apiKey: text("api_key"),
  isActive: boolean("is_active").default(true),
  autoSync: boolean("auto_sync").default(true),
  syncSchedule: text("sync_schedule").default("0 5 * * *"), // Daily at 5:00 AM
  lastSyncAt: timestamp("last_sync_at"),
  lastSuccessAt: timestamp("last_success_at"),
  lastErrorAt: timestamp("last_error_at"),
  lastErrorMessage: text("last_error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PTN Metrics Connection Configuration
export const ptnConnection = pgTable("ptn_connection", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("PTN Production System"),
  url: text("url").notNull().default("https://ptn.nomadgcsai.com/api"),
  apiKey: text("api_key"),
  description: text("description"),
  headers: jsonb("headers").$type<Record<string, string>>().default({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }),
  timeout: integer("timeout").default(30000),
  retryAttempts: integer("retry_attempts").default(3),
  isEnabled: boolean("is_enabled").default(true),
  syncFrequency: text("sync_frequency").default("hourly"),
  lastSync: timestamp("last_sync"),
  lastTestResult: text("last_test_result"), // JSON string with test results
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// External Connections Insert Schemas
export const insertExternalConnectionSchema = createInsertSchema(externalConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExternalConnectionLogSchema = createInsertSchema(externalConnectionLogs).omit({
  id: true,
  createdAt: true,
});

export const insertProjectMetricsConnectionSchema = createInsertSchema(projectMetricsConnection).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPtnConnectionSchema = createInsertSchema(ptnConnection).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type ExternalConnection = typeof externalConnections.$inferSelect;
export type InsertExternalConnection = z.infer<typeof insertExternalConnectionSchema>;
export type ExternalConnectionLog = typeof externalConnectionLogs.$inferSelect;
export type InsertExternalConnectionLog = z.infer<typeof insertExternalConnectionLogSchema>;
export type ProjectMetricsConnection = typeof projectMetricsConnection.$inferSelect;
export type InsertProjectMetricsConnection = z.infer<typeof insertProjectMetricsConnectionSchema>;
export type PTNConnection = typeof ptnConnection.$inferSelect;
export type InsertPTNConnection = z.infer<typeof insertPtnConnectionSchema>;

// Quality Assurance Types
export type NonConformanceReport = typeof nonConformanceReports.$inferSelect;
export type InsertNonConformanceReport = z.infer<typeof insertNonConformanceReportSchema>;
export type CorrectiveAction = typeof correctiveActions.$inferSelect;
export type InsertCorrectiveAction = z.infer<typeof insertCorrectiveActionSchema>;
export type SupplierCorrectiveAction = typeof supplierCorrectiveActions.$inferSelect;
export type InsertSupplierCorrectiveAction = z.infer<typeof insertSupplierCorrectiveActionSchema>;
export type Audit = typeof audits.$inferSelect;
export type InsertAudit = z.infer<typeof insertAuditSchema>;
export type AuditFinding = typeof auditFindings.$inferSelect;
export type InsertAuditFinding = z.infer<typeof insertAuditFindingSchema>;
export type QualityDocument = typeof qualityDocuments.$inferSelect;
export type InsertQualityDocument = z.infer<typeof insertQualityDocumentSchema>;
export type DocumentAcknowledgment = typeof documentAcknowledgments.$inferSelect;
export type InsertDocumentAcknowledgment = z.infer<typeof insertDocumentAcknowledgmentSchema>;
export type TrainingModule = typeof trainingModules.$inferSelect;
export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;
export type TrainingAssignment = typeof trainingAssignments.$inferSelect;
export type InsertTrainingAssignment = z.infer<typeof insertTrainingAssignmentSchema>;

// User Priority Access Table
export const userPriorityAccess = pgTable("user_priority_access", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  canViewPriorities: boolean("can_view_priorities").default(true),
  canEditPriorities: boolean("can_edit_priorities").default(false),
  canDragReorder: boolean("can_drag_reorder").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_user_priority_access").on(table.userId)
]);

// User Priority Access Insert Schema
export const insertUserPriorityAccessSchema = createInsertSchema(userPriorityAccess).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User Priority Access Types
export type UserPriorityAccess = typeof userPriorityAccess.$inferSelect;
export type InsertUserPriorityAccess = z.infer<typeof insertUserPriorityAccessSchema>;

// Change Control Board (CCB) Enums
export const ccbStatusEnum = pgEnum("ccb_status", [
  "pending_review",
  "under_review",
  "approved",
  "rejected",
  "implemented",
  "cancelled"
]);

export const ccbPriorityEnum = pgEnum("ccb_priority", [
  "low",
  "medium", 
  "high",
  "critical"
]);

export const ccbTypeEnum = pgEnum("ccb_type", [
  "schedule_change",
  "scope_change",
  "budget_change",
  "resource_change",
  "technical_change"
]);

export const ccbDepartmentEnum = pgEnum("ccb_department", [
  "sales",
  "engineering", 
  "supply_chain",
  "finance",
  "fabrication",
  "paint",
  "production", 
  "it",
  "ntc",
  "qc",
  "fsw"
]);

// Change Control Board Requests
export const ccbRequests = pgTable("ccb_requests", {
  id: serial("id").primaryKey(),
  ccbNumber: text("ccb_number").notNull().unique(), // Auto-generated CCB-YYYY-###
  
  // Basic Information
  projectId: integer("project_id").references(() => projects.id).notNull(),
  requesterId: varchar("requester_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  
  // Change Details
  changeType: ccbTypeEnum("change_type").notNull(),
  priority: ccbPriorityEnum("priority").default("medium").notNull(),
  status: ccbStatusEnum("status").default("pending_review").notNull(),
  
  // Schedule Change Specifics (for schedule_change type)
  affectedPhases: text("affected_phases").array(), // ["fabrication_start", "production_start", etc.]
  currentDates: jsonb("current_dates"), // {fabricationStart: "2025-01-15", productionStart: "2025-02-01"}
  proposedDates: jsonb("proposed_dates"), // {fabricationStart: "2025-01-20", productionStart: "2025-02-05"}
  justification: text("justification").notNull(),
  
  // Impact Assessment
  businessImpact: text("business_impact"),
  technicalImpact: text("technical_impact"),
  costImpact: text("cost_impact"),
  riskAssessment: text("risk_assessment"),
  
  // Departmental Reviews/Approvals
  salesApproval: boolean("sales_approval"),
  salesApprovedBy: varchar("sales_approved_by").references(() => users.id),
  salesApprovedAt: timestamp("sales_approved_at"),
  salesComments: text("sales_comments"),
  
  engineeringApproval: boolean("engineering_approval"),
  engineeringApprovedBy: varchar("engineering_approved_by").references(() => users.id),
  engineeringApprovedAt: timestamp("engineering_approved_at"),
  engineeringComments: text("engineering_comments"),
  
  supplyChainApproval: boolean("supply_chain_approval"),
  supplyChainApprovedBy: varchar("supply_chain_approved_by").references(() => users.id),
  supplyChainApprovedAt: timestamp("supply_chain_approved_at"),
  supplyChainComments: text("supply_chain_comments"),
  
  financeApproval: boolean("finance_approval"),
  financeApprovedBy: varchar("finance_approved_by").references(() => users.id),
  financeApprovedAt: timestamp("finance_approved_at"),
  financeComments: text("finance_comments"),
  
  fabricationApproval: boolean("fabrication_approval"),
  fabricationApprovedBy: varchar("fabrication_approved_by").references(() => users.id),
  fabricationApprovedAt: timestamp("fabrication_approved_at"),
  fabricationComments: text("fabrication_comments"),
  
  paintApproval: boolean("paint_approval"),
  paintApprovedBy: varchar("paint_approved_by").references(() => users.id),
  paintApprovedAt: timestamp("paint_approved_at"),
  paintComments: text("paint_comments"),
  
  productionApproval: boolean("production_approval"),
  productionApprovedBy: varchar("production_approved_by").references(() => users.id),
  productionApprovedAt: timestamp("production_approved_at"),
  productionComments: text("production_comments"),
  
  itApproval: boolean("it_approval"),
  itApprovedBy: varchar("it_approved_by").references(() => users.id),
  itApprovedAt: timestamp("it_approved_at"),
  itComments: text("it_comments"),
  
  ntcApproval: boolean("ntc_approval"),
  ntcApprovedBy: varchar("ntc_approved_by").references(() => users.id),
  ntcApprovedAt: timestamp("ntc_approved_at"),
  ntcComments: text("ntc_comments"),
  
  qcApproval: boolean("qc_approval"),
  qcApprovedBy: varchar("qc_approved_by").references(() => users.id),
  qcApprovedAt: timestamp("qc_approved_at"),
  qcComments: text("qc_comments"),
  
  fswApproval: boolean("fsw_approval"),
  fswApprovedBy: varchar("fsw_approved_by").references(() => users.id),
  fswApprovedAt: timestamp("fsw_approved_at"),
  fswComments: text("fsw_comments"),
  
  // Final Review and Implementation
  finalApproval: boolean("final_approval"),
  finalApprovedBy: varchar("final_approved_by").references(() => users.id),
  finalApprovedAt: timestamp("final_approved_at"),
  finalComments: text("final_comments"),
  
  rejectionReason: text("rejection_reason"),
  rejectedBy: varchar("rejected_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  
  implementedAt: timestamp("implemented_at"),
  implementedBy: varchar("implemented_by").references(() => users.id),
  implementationNotes: text("implementation_notes"),
  
  // Meeting Assignment
  tierIiiMeetingId: integer("tier_iii_meeting_id"), // References meeting where requested
  tierIvMeetingId: integer("tier_iv_meeting_id"), // References meeting where reviewed
  
  // Attachments and Documentation
  attachmentUrls: text("attachment_urls").array(),
  supportingDocuments: text("supporting_documents").array(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CCB Comments/Discussion Thread
export const ccbComments = pgTable("ccb_comments", {
  id: serial("id").primaryKey(),
  ccbRequestId: integer("ccb_request_id").references(() => ccbRequests.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  comment: text("comment").notNull(),
  department: ccbDepartmentEnum("department"),
  isInternal: boolean("is_internal").default(false), // Internal team discussion vs formal review
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema exports for CCB
export const insertCcbRequestSchema = createInsertSchema(ccbRequests).omit({
  id: true,
  ccbNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCcbCommentSchema = createInsertSchema(ccbComments).omit({
  id: true,
  createdAt: true,
});

export type CcbRequest = typeof ccbRequests.$inferSelect;
export type InsertCcbRequest = z.infer<typeof insertCcbRequestSchema>;
export type CcbComment = typeof ccbComments.$inferSelect;
export type InsertCcbComment = z.infer<typeof insertCcbCommentSchema>;