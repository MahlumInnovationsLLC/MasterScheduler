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
      SELECT id, name, "projectNumber", me_assigned, ee_assigned, ite_assigned
      FROM projects 
      WHERE me_assigned IS NOT NULL OR ee_assigned IS NOT NULL OR ite_assigned IS NOT NULL
    `;

    console.log(`📊 Found ${projects.length} projects with assignments`);

    let updateCount = 0;

    // Process each project
    for (const project of projects) {
      const updates = {};
      
      // Match ME assignments
      if (project.me_assigned) {
        const matchedUser = users.find(user => 
          user.first_name.toLowerCase() === project.me_assigned.toLowerCase().trim()
        );
        if (matchedUser) {
          updates.me_assigned = `${matchedUser.first_name} ${matchedUser.last_name}`;
          console.log(`✅ Project ${project.projectNumber}: ME "${project.me_assigned}" → "${updates.me_assigned}"`);
        } else {
          console.log(`❌ Project ${project.projectNumber}: ME "${project.me_assigned}" - no match found`);
        }
      }

      // Match EE assignments
      if (project.ee_assigned) {
        const matchedUser = users.find(user => 
          user.first_name.toLowerCase() === project.ee_assigned.toLowerCase().trim()
        );
        if (matchedUser) {
          updates.ee_assigned = `${matchedUser.first_name} ${matchedUser.last_name}`;
          console.log(`✅ Project ${project.projectNumber}: EE "${project.ee_assigned}" → "${updates.ee_assigned}"`);
        } else {
          console.log(`❌ Project ${project.projectNumber}: EE "${project.ee_assigned}" - no match found`);
        }
      }

      // Match ITE assignments
      if (project.ite_assigned) {
        const matchedUser = users.find(user => 
          user.first_name.toLowerCase() === project.ite_assigned.toLowerCase().trim()
        );
        if (matchedUser) {
          updates.ite_assigned = `${matchedUser.first_name} ${matchedUser.last_name}`;
          console.log(`✅ Project ${project.projectNumber}: ITE "${project.ite_assigned}" → "${updates.ite_assigned}"`);
        } else {
          console.log(`❌ Project ${project.projectNumber}: ITE "${project.ite_assigned}" - no match found`);
        }
      }

      // Update project if we have matches
      if (Object.keys(updates).length > 0) {
        const setParts = Object.keys(updates).map(key => `"${key}" = $${Object.keys(updates).indexOf(key) + 2}`);
        const values = [project.id, ...Object.values(updates)];
        
        await sql`
          UPDATE projects 
          SET ${sql.unsafe(setParts.join(', '))}
          WHERE id = $1
        `.apply(null, values);
        
        updateCount++;
      }
    }

    console.log(`🎉 Successfully updated ${updateCount} projects with user assignments`);

    // Show summary of current assignments
    const updatedProjects = await sql`
      SELECT "projectNumber", me_assigned, ee_assigned, ite_assigned
      FROM projects 
      WHERE me_assigned IS NOT NULL OR ee_assigned IS NOT NULL OR ite_assigned IS NOT NULL
      ORDER BY "projectNumber"
      LIMIT 20
    `;

    console.log('\n📋 Sample updated assignments:');
    updatedProjects.forEach(p => {
      console.log(`  ${p.projectNumber}: ME=${p.me_assigned || 'None'}, EE=${p.ee_assigned || 'None'}, ITE=${p.ite_assigned || 'None'}`);
    });

  } catch (error) {
    console.error('❌ Error syncing project assignments:', error);
  }
}

// Run the sync
syncProjectAssignments();