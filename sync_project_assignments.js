import { neon } from '@neondatabase/serverless';

// Database connection
const sql = neon(process.env.DATABASE_URL);

async function syncProjectAssignments() {
  try {
    console.log('🔄 Starting project assignment synchronization...');

    // Get all users with Engineering department
    const users = await sql`
      SELECT id, first_name, last_name, department 
      FROM users 
      WHERE department = 'Engineering'
    `;
    
    console.log(`📊 Found ${users.length} engineering users:`, users.map(u => `${u.first_name} ${u.last_name}`));

    // Get all projects with assignment fields
    const projects = await sql`
      SELECT id, name, project_number, me_assigned, ee_assigned, ite_assigned
      FROM projects 
      WHERE me_assigned IS NOT NULL OR ee_assigned IS NOT NULL OR ite_assigned IS NOT NULL
    `;

    console.log(`📊 Found ${projects.length} projects with assignments`);

    let updateCount = 0;

    // Process each project
    for (const project of projects) {
      const updates = {};
      
      // Flexible user matching function
      const findMatchingUser = (assignmentText) => {
        if (!assignmentText) return null;
        
        const cleanName = assignmentText.toLowerCase().trim();
        
        // Try exact first name match first
        let match = users.find(user => 
          user.first_name.toLowerCase() === cleanName
        );
        
        // If no exact match, try partial matches
        if (!match) {
          // Extract first name from "FirstName LastInitial" pattern
          const firstWord = cleanName.split(' ')[0];
          match = users.find(user => 
            user.first_name.toLowerCase() === firstWord
          );
        }
        
        // Try matching by full name patterns
        if (!match) {
          match = users.find(user => 
            cleanName.includes(user.first_name.toLowerCase()) || 
            user.first_name.toLowerCase().includes(cleanName)
          );
        }
        
        return match;
      };

      // Match ME assignments
      if (project.me_assigned) {
        const matchedUser = findMatchingUser(project.me_assigned);
        if (matchedUser) {
          updates.me_assigned = `${matchedUser.first_name} ${matchedUser.last_name}`;
          console.log(`✅ Project ${project.project_number}: ME "${project.me_assigned}" → "${updates.me_assigned}"`);
        } else {
          console.log(`❌ Project ${project.project_number}: ME "${project.me_assigned}" - no match found`);
        }
      }

      // Match EE assignments
      if (project.ee_assigned) {
        const matchedUser = findMatchingUser(project.ee_assigned);
        if (matchedUser) {
          updates.ee_assigned = `${matchedUser.first_name} ${matchedUser.last_name}`;
          console.log(`✅ Project ${project.project_number}: EE "${project.ee_assigned}" → "${updates.ee_assigned}"`);
        } else {
          console.log(`❌ Project ${project.project_number}: EE "${project.ee_assigned}" - no match found`);
        }
      }

      // Match ITE assignments
      if (project.ite_assigned) {
        const matchedUser = findMatchingUser(project.ite_assigned);
        if (matchedUser) {
          updates.ite_assigned = `${matchedUser.first_name} ${matchedUser.last_name}`;
          console.log(`✅ Project ${project.project_number}: ITE "${project.ite_assigned}" → "${updates.ite_assigned}"`);
        } else {
          console.log(`❌ Project ${project.project_number}: ITE "${project.ite_assigned}" - no match found`);
        }
      }

      // Update project if we have matches
      if (Object.keys(updates).length > 0) {
        console.log(`📊 Updating project ${project.project_number} with assignments:`, updates);
        
        // Build dynamic update query
        if (updates.me_assigned) {
          await sql`UPDATE projects SET me_assigned = ${updates.me_assigned} WHERE id = ${project.id}`;
        }
        if (updates.ee_assigned) {
          await sql`UPDATE projects SET ee_assigned = ${updates.ee_assigned} WHERE id = ${project.id}`;
        }
        if (updates.ite_assigned) {
          await sql`UPDATE projects SET ite_assigned = ${updates.ite_assigned} WHERE id = ${project.id}`;
        }
        
        updateCount++;
      }
    }

    console.log(`🎉 Successfully updated ${updateCount} projects with user assignments`);

    // Show summary of current assignments
    const updatedProjects = await sql`
      SELECT project_number, me_assigned, ee_assigned, ite_assigned
      FROM projects 
      WHERE me_assigned IS NOT NULL OR ee_assigned IS NOT NULL OR ite_assigned IS NOT NULL
      ORDER BY project_number
      LIMIT 20
    `;

    console.log('\n📋 Sample updated assignments:');
    updatedProjects.forEach(p => {
      console.log(`  ${p.project_number}: ME=${p.me_assigned || 'None'}, EE=${p.ee_assigned || 'None'}, ITE=${p.ite_assigned || 'None'}`);
    });

  } catch (error) {
    console.error('❌ Error syncing project assignments:', error);
  }
}

// Run the sync
syncProjectAssignments();