// This script finds potential octal literals in JavaScript files that might 
// cause "Octal literals are not allowed in strict mode" errors

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name correctly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to find all files recursively
function findFiles(dir, ext, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    // Skip node_modules
    if (file === 'node_modules' || file === '.git') {
      return;
    }
    
    // Check if directory
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, ext, fileList);
    } else if (path.extname(file).toLowerCase() === ext) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Patterns that might indicate octal literals
const octalsPatterns = [
  // Match 0[1-7][0-7] pattern (octal literals starting with 0)
  /0[1-7][0-7]+/g,
  
  // Time calculations that might be interpreted as octal (common in Excel date parses)
  /\* *86400 *\* *1000/g,
  
  // Common octal patterns in number divisions
  /\/ *0+[1-7][0-7]*/g
];

// Find all JS/TS files
const extensions = ['.js', '.jsx', '.ts', '.tsx'];
let allFiles = [];

extensions.forEach(ext => {
  const files = findFiles('.', ext);
  allFiles = [...allFiles, ...files];
});

console.log(`Found ${allFiles.length} JavaScript/TypeScript files to scan`);

// Process each file
let foundOctalCount = 0;

allFiles.forEach(filePath => {
  try {
    // Skip this debug file itself
    if (filePath === './debug-octal.js') return;
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    let fileHasOctal = false;
    
    // Check each pattern
    octalsPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      
      if (matches && matches.length > 0) {
        if (!fileHasOctal) {
          console.log(`\n\x1b[36m${filePath}\x1b[0m:`);
          fileHasOctal = true;
          foundOctalCount++;
        }
        
        // Get line numbers for each match
        matches.forEach(match => {
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(match)) {
              console.log(`  Line ${i + 1}: \x1b[33m${lines[i].trim()}\x1b[0m`);
            }
          }
        });
      }
    });
    
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
  }
});

console.log(`\nFound ${foundOctalCount} files with potential octal literal issues`);