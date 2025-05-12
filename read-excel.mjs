import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file
const filePath = path.join(__dirname, 'attached_assets', 'billing_milestones_template.xlsx');

try {
  const workbook = XLSX.read(fs.readFileSync(filePath));
  
  // Get all sheet names in the workbook
  console.log("\nAll Sheet Names:");
  console.log(workbook.SheetNames);
  
  // Process each sheet
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Analyzing Sheet: ${sheetName} ---`);
    
    // Get the worksheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert the worksheet to JSON with raw headers (row 1)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
    
    // Print the headers (first row)
    console.log("\nHeaders (Array format):");
    if (jsonData.length > 0) {
      console.log(jsonData[0]);
    }
    
    // Convert with column headers for analysis
    const jsonWithHeaders = XLSX.utils.sheet_to_json(worksheet, { raw: false });
    console.log(`\nTotal data rows: ${jsonWithHeaders.length}`);
    
    if (jsonWithHeaders.length > 0) {
      // Show all column names from the actual data
      console.log("\nActual Column Names in Data:");
      const allColumns = new Set();
      jsonWithHeaders.forEach(row => {
        Object.keys(row).forEach(key => allColumns.add(key));
      });
      console.log(Array.from(allColumns).join(', '));
      
      // Show sample data with proper mapping
      console.log("\nFirst Row Data (Object format):");
      console.log(JSON.stringify(jsonWithHeaders[0], null, 2));
      
      // Print a few rows of data if available
      console.log("\nSample Data Rows:");
      for (let i = 0; i < Math.min(3, jsonWithHeaders.length); i++) {
        console.log(`Row ${i+1}:`, JSON.stringify(jsonWithHeaders[i]));
      }
    }
  });
  
} catch (error) {
  console.error("Error reading Excel file:", error);
  console.error(error.stack);
}