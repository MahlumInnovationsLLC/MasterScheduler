import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

// Run the migration
async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log("Starting migration to add status column to users table...");
    
    // First check if the status enum type exists
    const checkEnumResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'user_status'
      );
    `);
    
    // Create the enum type if it doesn't exist
    if (!checkEnumResult.rows[0].exists) {
      console.log("Creating user_status enum type...");
      await pool.query(`
        CREATE TYPE user_status AS ENUM ('active', 'inactive', 'archived');
      `);
      console.log("Created user_status enum type");
    } else {
      console.log("user_status enum type already exists");
    }
    
    // Check if the status column exists in the users table
    const checkColumnResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
      );
    `);
    
    // Add the status column if it doesn't exist
    if (!checkColumnResult.rows[0].exists) {
      console.log("Adding status column to users table...");
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN status user_status DEFAULT 'active';
      `);
      console.log("Added status column to users table with default value 'active'");
    } else {
      console.log("status column already exists in users table");
    }
    
    // Check if user_audit_logs table exists
    const checkTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_audit_logs'
      );
    `);
    
    // Create the user_audit_logs table if it doesn't exist
    if (!checkTableResult.rows[0].exists) {
      console.log("Creating user_audit_logs table...");
      await pool.query(`
        CREATE TABLE user_audit_logs (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          action VARCHAR(255) NOT NULL,
          performed_by VARCHAR(255) NOT NULL,
          previous_data TEXT,
          new_data TEXT,
          details TEXT,
          timestamp TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log("Created user_audit_logs table");
    } else {
      console.log("user_audit_logs table already exists");
    }
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();