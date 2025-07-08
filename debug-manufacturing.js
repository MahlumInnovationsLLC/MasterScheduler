
console.log('=== DEBUGGING MANUFACTURING HOURS ===');

// This mimics the logic from the Forecast component
const projects = []; // We'll need to fetch this from API
const schedules = []; // We'll need to fetch this from API

// Mock the calculation to see what's happening
let totalManufacturingHours = 0;
let scheduledProjectIds = new Set();

// Add some debug logging
console.log('Total scheduled projects:', scheduledProjectIds.size);
console.log('Total manufacturing hours:', totalManufacturingHours);
