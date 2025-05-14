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

// Configure the connection pool with more conservative settings to prevent connection issues
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduce max connections even further to prevent connection issues
  idleTimeoutMillis: 30000, // Longer idle timeout to prevent premature closing
  connectionTimeoutMillis: 5000, // Shorter connection timeout
  maxUses: 1000, // Close connection after fewer uses to prevent fatigue
  allowExitOnIdle: true,
});

// Set up enhanced error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected database error on idle client:', err);
  
  // Log additional information about pool status to help with debugging
  console.error(`Database connection error occurred at ${new Date().toISOString()}`);
  
  // Create a new connection to replace the failed one
  const newClient = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  
  // Attempt recovery through reconnection after a brief delay
  setTimeout(() => {
    console.log("Attempting to verify database connection...");
    newClient.query('SELECT 1')
      .then(() => {
        console.log("Database connection reestablished with new client");
        // Don't replace the pool as it might affect existing references
        // but keep the new client active
      })
      .catch(error => {
        console.error("Failed to reestablish database connection:", error.message);
        newClient.end().catch(() => {}); // Clean up failed connection attempt
      });
  }, 2000);
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