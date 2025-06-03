
// Script to check and fix user accounts
// You can run this by calling the debug endpoints

const checkAndFixUser = async (email) => {
  try {
    console.log(`Checking user account for: ${email}`);
    
    // First, check the user's current status
    const checkResponse = await fetch(`/api/debug/check-user/${encodeURIComponent(email)}`);
    const userInfo = await checkResponse.json();
    
    console.log('User info:', userInfo);
    
    if (!userInfo.found) {
      console.log('User not found');
      return;
    }
    
    // If user has issues, fix them
    if (userInfo.status === 'archived' || !userInfo.isApproved) {
      console.log('Fixing user account...');
      const fixResponse = await fetch('/api/debug/fix-user-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const fixResult = await fixResponse.json();
      console.log('Fix result:', fixResult);
    }
    
    // If user doesn't have a password, you'll need to reset it
    if (!userInfo.hasPassword) {
      console.log('User has no password set - needs password reset');
      // You would call reset-password endpoint here with a new password
    }
    
  } catch (error) {
    console.error('Error checking/fixing user:', error);
  }
};

// Example usage:
// checkAndFixUser('john.shigo@example.com');

console.log('User account fix script loaded. Call checkAndFixUser("email@example.com") to check and fix a user account.');
