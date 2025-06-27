// Calculate MECH shop dates: 30 working days before Production start date
// This script properly handles weekends in the calculation

function subtractWorkingDays(date, workingDays) {
  let currentDate = new Date(date);
  let daysSubtracted = 0;
  
  while (daysSubtracted < workingDays) {
    currentDate.setDate(currentDate.getDate() - 1);
    
    // Check if it's a weekday (Monday = 1, Friday = 5)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      daysSubtracted++;
    }
  }
  
  return currentDate;
}

// Test the function
const testDate = new Date('2025-02-10');
const result = subtractWorkingDays(testDate, 30);
console.log(`Test: 30 working days before 2025-02-10 = ${result.toISOString().split('T')[0]}`);

// Example calculation showing the logic
let count = 0;
let testCurrent = new Date('2025-02-10');
console.log(`\nCounting backwards from ${testCurrent.toISOString().split('T')[0]}:`);

while (count < 30) {
  testCurrent.setDate(testCurrent.getDate() - 1);
  const dayOfWeek = testCurrent.getDay();
  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
    count++;
    if (count <= 5 || count >= 26) { // Show first 5 and last 5
      console.log(`Day ${count}: ${testCurrent.toISOString().split('T')[0]} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]})`);
    } else if (count === 6) {
      console.log('...');
    }
  }
}
