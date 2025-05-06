import { readFile, utils } from 'xlsx';
import fs from 'fs';
import path from 'path';

// Path to the Excel file
const filePath = path.join(process.cwd(), 'attached_assets', 'OTD Template.xlsx');

try {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  console.log(`Analyzing file: ${filePath}`);
  
  // Read the Excel file
  const workbook = readFile(filePath);
  
  // Get all sheet names
  console.log('Available sheets:', workbook.SheetNames);
  
  // Process the first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to JSON with headers
  const data = utils.sheet_to_json(worksheet, { header: 1 });
  
  if (data.length === 0) {
    console.log('No data found in the sheet');
    process.exit(1);
  }
  
  // Extract headers (first row)
  const headers = data[0];
  console.log('Headers in OTD Template:');
  console.log(headers);
  
  // Check for sample data
  if (data.length > 1) {
    console.log('\nSample data row:');
    console.log(data[1]);
  }
  
} catch (error) {
  console.error('Error analyzing Excel file:', error);
}