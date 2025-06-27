// Precise working days calculation for MECH shop dates
const { Client } = require('pg');

async function updateMechShopDates() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Get all projects with production_start dates
    const result = await client.query(`
      SELECT id, project_number, production_start 
      FROM projects 
      WHERE production_start IS NOT NULL
      ORDER BY project_number
    `);

    console.log(`Updating MECH shop dates for ${result.rows.length} projects...`);

    // Function to subtract working days
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

    // Update each project
    for (const project of result.rows) {
      const productionStart = new Date(project.production_start);
      const mechShopDate = subtractWorkingDays(productionStart, 30);
      
      const formattedMechShop = mechShopDate.toISOString().split('T')[0];
      
      await client.query(`
        UPDATE projects 
        SET mech_shop = $1 
        WHERE id = $2
      `, [formattedMechShop, project.id]);

      console.log(`${project.project_number}: Production ${project.production_start} -> MECH shop ${formattedMechShop}`);
    }

    console.log('MECH shop dates updated successfully!');

  } catch (error) {
    console.error('Error updating MECH shop dates:', error);
  } finally {
    await client.end();
  }
}

updateMechShopDates();
