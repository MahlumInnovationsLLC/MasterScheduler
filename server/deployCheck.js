// This script can be used to check what's happening in production deployment
// You can run this with: node server/deployCheck.js

console.log('=== Deployment Environment Check ===');
console.log('Current working directory:', process.cwd());
console.log('Node version:', process.version);
console.log('Environment:', process.env.NODE_ENV);

// Check for essential environment variables
console.log('\n=== Environment Variables ===');
const essentialVars = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'REPLIT_DOMAINS',
  'REPL_ID',
  'REPLIT_DB_URL',
  'OPENAI_API_KEY'
];

essentialVars.forEach(varName => {
  const exists = process.env[varName] ? '✓ Present' : '✗ Missing';
  console.log(`${varName}: ${exists}`);
});

// Check for filesystem paths
console.log('\n=== Filesystem Check ===');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathsToCheck = [
  '.',
  './dist',
  './dist/index.html',
  './dist/index.js',
  './server',
  './server/index.ts',
  './shared'
];

pathsToCheck.forEach(p => {
  try {
    const fullPath = path.resolve(p);
    const exists = fs.existsSync(fullPath);
    const type = exists ? 
      (fs.statSync(fullPath).isDirectory() ? 'Directory' : 'File') : 'Not found';
    
    console.log(`${p}: ${exists ? '✓' : '✗'} ${type}`);
  } catch (error) {
    console.log(`${p}: Error checking - ${error.message}`);
  }
});

// Try to connect to the database if DATABASE_URL exists
console.log('\n=== Database Connection Test ===');
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL is present, will attempt connection');
  
  // Using dynamic import for ESM compatibility
  import('@neondatabase/serverless')
    .then(({ Pool }) => {
      try {
        const pool = new Pool({ 
          connectionString: process.env.DATABASE_URL,
          max: 1
        });
        
        console.log('Pool created, attempting connection...');
        
        // Test the connection
        return pool.connect()
          .then(client => {
            console.log('Database connection successful!');
            return client.query('SELECT NOW()')
              .then(result => {
                console.log('Database time:', result.rows[0].now);
                client.release();
                return pool.end();
              })
              .catch(err => {
                console.error('Error executing query:', err);
                client.release();
                return pool.end();
              });
          });
      } catch (error) {
        console.error('Error setting up database connection:', error);
      }
    })
    .catch(err => {
      console.error('Error importing pool:', err);
    });
} else {
  console.log('Skipping database test - DATABASE_URL not available');
}

console.log('\n=== End of Check ===');