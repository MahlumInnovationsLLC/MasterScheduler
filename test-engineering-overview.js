const { db } = require('./server/db');
const { engineeringBenchmarks, projects } = require('./shared/schema');
const { eq, asc } = require('drizzle-orm');

async function testEngineeringOverview() {
  try {
    console.log('Testing engineering overview data...');
    
    // Test 1: Get benchmarks count
    const benchmarksData = await db.select().from(engineeringBenchmarks);
    console.log('Total benchmarks:', benchmarksData.length);
    
    // Test 2: Count by discipline
    const disciplineCounts = {};
    benchmarksData.forEach(b => {
      disciplineCounts[b.discipline] = (disciplineCounts[b.discipline] || 0) + 1;
    });
    console.log('Benchmarks by discipline:', disciplineCounts);
    
    // Test 3: Count by project
    const projectCounts = {};
    benchmarksData.forEach(b => {
      projectCounts[b.projectId] = (projectCounts[b.projectId] || 0) + 1;
    });
    console.log('Number of projects with benchmarks:', Object.keys(projectCounts).length);
    
    // Test 4: Sample project benchmarks
    const sampleProjectId = Object.keys(projectCounts)[0];
    const sampleBenchmarks = benchmarksData.filter(b => b.projectId == sampleProjectId);
    console.log(`\nSample project ${sampleProjectId} has ${sampleBenchmarks.length} benchmarks:`);
    sampleBenchmarks.forEach(b => {
      console.log(`- ${b.discipline}: ${b.benchmarkName}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testEngineeringOverview();
