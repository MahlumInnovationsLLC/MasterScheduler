import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to find octal literals in JavaScript code
function findOctalLiterals(code) {
  // This regex finds octal literals like 0123 but not 0.123 or 0x123
  const regex = /\b0[0-7]+\b/g;
  return code.match(regex) || [];
}

// Function to find particular patterns that might indicate octal literals in time calculations
function findTimePatterns(code) {
  const patterns = [
    // Find raw time calculations that could be interpreted as octal
    { regex: /86400 *\* *1000/g, description: "86400 * 1000 time calculation" },
    { regex: /\((\d+) *- *\d+\) *\* *86400 *\* *1000/g, description: "Excel date conversion with 86400 * 1000" },
    // Add more patterns as needed
  ];

  const matches = [];
  for (const pattern of patterns) {
    const found = code.match(pattern.regex);
    if (found) {
      matches.push({ pattern: pattern.description, matches: found });
    }
  }
  
  return matches;
}

// Function to scan a JavaScript file
function scanFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    
    // Find direct octal literals
    const octalLiterals = findOctalLiterals(code);
    
    // Find time calculation patterns
    const timePatterns = findTimePatterns(code);
    
    return { octalLiterals, timePatterns };
  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error.message);
    return { octalLiterals: [], timePatterns: [] };
  }
}

// Function to walk directory recursively
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
      walkDir(filePath, callback);
    } else if (stat.isFile() && /\.(js|jsx|ts|tsx|mjs)$/.test(file)) {
      callback(filePath);
    }
  });
}

// Main function
function main() {
  const rootDir = '.';
  const results = [];
  
  console.log('Scanning for potential octal literals...');
  
  walkDir(rootDir, (filePath) => {
    const { octalLiterals, timePatterns } = scanFile(filePath);
    
    if (octalLiterals.length > 0 || timePatterns.length > 0) {
      results.push({
        file: filePath,
        octalLiterals,
        timePatterns
      });
    }
  });
  
  // Print results
  console.log(`\nFound ${results.length} files with potential octal literals or problematic time calculations:`);
  
  results.forEach(result => {
    console.log(`\n${result.file}:`);
    
    if (result.octalLiterals.length > 0) {
      console.log('  Octal literals:');
      result.octalLiterals.forEach(octal => {
        console.log(`    ${octal}`);
      });
    }
    
    if (result.timePatterns.length > 0) {
      console.log('  Problematic time calculations:');
      result.timePatterns.forEach(pattern => {
        console.log(`    ${pattern.pattern}: ${pattern.matches.join(', ')}`);
      });
    }
  });
}

main();