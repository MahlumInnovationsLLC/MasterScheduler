import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

/**
 * ForceLogoutButton - A special logout button that truly logs out even in dev environment
 * This component bypasses the automatic auth in development mode to let you test login/logout flows
 */
export default function ForceLogoutButton() {
  const [, navigate] = useLocation();
  
  // Handle complete force logout
  const handleForceLogout = async () => {
    try {
      // 1. First try direct API call
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // 2. Clear any localStorage/sessionStorage items that might keep state
      localStorage.clear();
      sessionStorage.clear();
      
      // 3. Clear cookies by setting them to expired
      document.cookie.split(';').forEach(function(c) {
        document.cookie = c.trim().split('=')[0] + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      });
      
      // 4. Force window reload to clear React states and all JS memory
      // Instead of direct reload, add a redirect to a fresh login page
      navigate('/simple-login?fresh=true');
      window.location.href = '/simple-login?fresh=true';
      
      console.log('Force logout complete - all storage cleared');
    } catch (error) {
      console.error('Force logout error:', error);
      // Last resort - direct navigation to login
      window.location.href = '/simple-login?fresh=true';
    }
  };
  
  return (
    <Button 
      variant="destructive" 
      onClick={handleForceLogout}
      className="force-logout-button"
    >
      Force Logout (Dev)
    </Button>
  );
}