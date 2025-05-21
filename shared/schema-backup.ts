import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

// Database backup records
export const databaseBackups = pgTable('database_backups', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  size: integer('size').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Database restore records
export const databaseRestores = pgTable('database_restores', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  restoredAt: timestamp('restored_at').notNull().defaultNow(),
});