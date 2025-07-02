import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function analyzeExcelFile(filePath) {
  try {
    console.log(`Analyzing Excel file: ${filePath}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    console.log(`Found ${sheetNames.length} sheet(s): ${sheetNames.join(', ')}`);
    
    // Analyze each sheet
    sheetNames.forEach((sheetName, index) => {
      console.log(`\n--- Sheet ${index + 1}: ${sheetName} ---`);
      
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (data.length === 0) {
        console.log('Sheet is empty');
        return;
      }
      
      // Show headers (first row)
      const headers = data[0];
      console.log(`Headers (${headers.length} columns):`);
      headers.forEach((header, i) => {
        console.log(`  Column ${i + 1}: "${header}"`);
      });
      
      // Show total rows
      console.log(`Total rows: ${data.length} (including header)`);
      
      // Show first few data rows
      const dataRows = data.slice(1, Math.min(4, data.length));
      if (dataRows.length > 0) {
        console.log('\nSample data rows:');
        dataRows.forEach((row, i) => {
          console.log(`  Row ${i + 2}:`);
          row.forEach((cell, j) => {
            if (cell !== undefined && cell !== null && cell !== '') {
              console.log(`    ${headers[j] || `Column ${j + 1}`}: "${cell}"`);
            }
          });
        });
      }
      
      // Analyze column patterns
      console.log('\nColumn analysis:');
      headers.forEach((header, i) => {
        const columnData = data.slice(1).map(row => row[i]).filter(cell => cell !== undefined && cell !== null && cell !== '');
        console.log(`  ${header}: ${columnData.length} non-empty values`);
        
        // Show unique values for small datasets or sample for large ones
        const uniqueValues = [...new Set(columnData)];
        if (uniqueValues.length <= 10) {
          console.log(`    Unique values: ${uniqueValues.join(', ')}`);
        } else {
          console.log(`    Sample values: ${uniqueValues.slice(0, 5).join(', ')}... (${uniqueValues.length} total unique)`);
        }
      });
    });
    
  } catch (error) {
    console.error('Error analyzing Excel file:', error);
  }
}

// Get the file path from command line arguments
const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide a file path as an argument');
  process.exit(1);
}

// Resolve the full path
const fullPath = join(__dirname, filePath);
analyzeExcelFile(fullPath);