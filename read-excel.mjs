import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get the directory name correctly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file
const filePath = path.join(__dirname, 'attached_assets/OTD Template.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  
  // Get the first sheet name
  const sheetName = workbook.SheetNames[0];
  
  // Get the worksheet
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert the worksheet to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Print the headers (first row)
  console.log("Headers:");
  console.log(jsonData[0]);
  
  // Print a few rows of data if available
  console.log("\nSample Data:");
  if (jsonData.length > 1) {
    console.log(jsonData[1]);
  }
  
  // Print all sheet names in the workbook
  console.log("\nAll Sheet Names:");
  console.log(workbook.SheetNames);
  
} catch (error) {
  console.error("Error reading Excel file:", error);
}