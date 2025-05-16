// Simple script to remove team associations from specific bays
const fetch = require('node-fetch');

async function deleteBayTeams() {
  // Teams to delete based on the user's request
  const bayIdsToUpdate = [8, 16, 17, 18, 19, 20]; // Based on the database query results
  
  console.log('Starting team deletion process...');
  
  for (const bayId of bayIdsToUpdate) {
    try {
      console.log(`Removing team from bay ID ${bayId}...`);
      
      const response = await fetch(`http://localhost:3000/api/manufacturing-bays/${bayId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          team: null,
          description: null
        })
      });
      
      if (response.ok) {
        console.log(`✅ Successfully removed team from bay ID ${bayId}`);
      } else {
        console.error(`❌ Failed to update bay ${bayId}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error updating bay ${bayId}:`, error.message);
    }
  }
  
  console.log('Team deletion process completed.');
}

deleteBayTeams().catch(console.error);
