import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set!");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Connecting to database...");

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Set up error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected database error on idle client:', err);
});

console.log("Database connection established successfully");

// Create the Drizzle ORM instance
const db = drizzle({ client: pool, schema });

export { pool, db };