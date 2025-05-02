import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// In production environment, use the global WebSocket constructor
// In development, use the ws package
if (process.env.NODE_ENV === 'production') {
  console.log("Using production WebSocket configuration");
  // In production, use the global WebSocket
  if (typeof WebSocket !== 'undefined') {
    neonConfig.webSocketConstructor = WebSocket;
  } else {
    console.warn("WebSocket is not available globally, fallback to ws package");
    neonConfig.webSocketConstructor = ws;
  }
} else {
  console.log("Using development WebSocket configuration");
  neonConfig.webSocketConstructor = ws;
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set!");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Connecting to database...");

// Configure the connection pool with more robust settings
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 10000, // Close connection after this many uses
  allowExitOnIdle: true,
});

// Set up error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected database error on idle client:', err);
});

// Test the connection immediately
pool.query('SELECT 1')
  .then(() => {
    console.log("Database connection established successfully");
  })
  .catch(err => {
    console.error("Failed to connect to database:", err.message);
  });

// Create the Drizzle ORM instance
const db = drizzle({ client: pool, schema });

export { pool, db };