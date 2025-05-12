const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Function to analyze an Excel file
function analyzeExcelFile(filePath) {
  try {
    console.log(`Analyzing Excel file: ${filePath}`);
    
    // Read the file
    const workbook = XLSX.readFile(filePath);
    
    // Get list of sheet names
    console.log('\nSheets in workbook:');
    console.log(workbook.SheetNames);
    
    // Analyze each sheet
    workbook.SheetNames.forEach(sheetName => {
      console.log(`\n--- Sheet: ${sheetName} ---`);
      
      // Get the worksheet
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const json = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: null,
        raw: false 
      });
      
      // Print dimensions
      console.log(`Rows: ${json.length}`);
      
      if (json.length > 0) {
        console.log(`Columns: ${json[0].length}`);
        
        // Print column headers (first row)
        console.log('\nColumn Headers:');
        if (json[0]) {
          json[0].forEach((header, index) => {
            console.log(`Column ${index}: ${header}`);
          });
        }
        
        // Print first few rows
        console.log('\nFirst 3 data rows:');
        for (let i = 1; i < Math.min(4, json.length); i++) {
          console.log(`Row ${i}:`, JSON.stringify(json[i]));
        }
      }
      
      // Convert with headers
      const jsonWithHeaders = XLSX.utils.sheet_to_json(worksheet, { 
        raw: false,
        defval: null
      });
      
      console.log('\nData with column headers:');
      console.log(`Total rows: ${jsonWithHeaders.length}`);
      if (jsonWithHeaders.length > 0) {
        console.log('Column names:', Object.keys(jsonWithHeaders[0]).join(', '));
        console.log('First row:', JSON.stringify(jsonWithHeaders[0], null, 2));
      }
    });
    
  } catch (error) {
    console.error('Error analyzing Excel file:', error);
  }
}

// Analyze billing milestone template
const filePath = path.join(__dirname, 'attached_assets', 'billing_milestones_template.xlsx');
analyzeExcelFile(filePath);