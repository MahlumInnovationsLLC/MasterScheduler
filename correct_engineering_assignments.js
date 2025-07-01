import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { projects } from './shared/schema.ts';

// Initialize database connection
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// Valid Engineering department users (from user table)
const validEngineers = [
  'Brian Dardis',
  'Jason Vryhof', 
  'John Shigo',
  'Josh Williams',
  'Tyler Long'
];

async function correctEngineeringAssignments() {
  try {
    console.log('🔧 Starting engineering assignment correction...');
    
    // Get all projects with engineering assignments
    const allProjects = await db.select().from(projects);
    console.log(`Found ${allProjects.length} total projects`);
    
    let correctedCount = 0;
    let nullifiedCount = 0;
    
    for (const project of allProjects) {
      const updates = {};
      let needsUpdate = false;
      
      // Check ME Assignment
      if (project.meAssigned) {
        if (!validEngineers.includes(project.meAssigned)) {
          updates.meAssigned = null;
          needsUpdate = true;
          console.log(`❌ NULLIFYING ME: "${project.meAssigned}" in project ${project.projectNumber} (not in Engineering dept)`);
        }
      }
      
      // Check EE Assignment  
      if (project.eeAssigned) {
        if (!validEngineers.includes(project.eeAssigned)) {
          updates.eeAssigned = null;
          needsUpdate = true;
          console.log(`❌ NULLIFYING EE: "${project.eeAssigned}" in project ${project.projectNumber} (not in Engineering dept)`);
        }
      }
      
      // Check ITE Assignment
      if (project.iteAssigned) {
        if (!validEngineers.includes(project.iteAssigned)) {
          updates.iteAssigned = null;
          needsUpdate = true;
          console.log(`❌ NULLIFYING ITE: "${project.iteAssigned}" in project ${project.projectNumber} (not in Engineering dept)`);
        }
      }
      
      if (needsUpdate) {
        await db.update(projects)
          .set(updates)
          .where(eq(projects.id, project.id));
        
        nullifiedCount++;
      } else if (project.meAssigned || project.eeAssigned || project.iteAssigned) {
        // This project has valid engineering assignments
        correctedCount++;
      }
    }
    
    console.log('\n✅ ENGINEERING ASSIGNMENT CORRECTION COMPLETE:');
    console.log(`📊 Projects with valid engineering assignments: ${correctedCount}`);
    console.log(`🧹 Projects with nullified invalid assignments: ${nullifiedCount}`);
    console.log('\n✅ Valid Engineering Users:');
    validEngineers.forEach(engineer => {
      console.log(`   - ${engineer}`);
    });
    
  } catch (error) {
    console.error('❌ Error correcting engineering assignments:', error);
  }
}

// Run the correction
correctEngineeringAssignments();