import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/components/PermissionsManager';
import { useAuth } from '@/hooks/use-auth';

export interface ModuleVisibility {
  [moduleId: string]: boolean;
}

export const useModuleVisibility = () => {
  const { userRole } = usePermissions();
  const { user } = useAuth();

  const { data: moduleVisibility = {}, isLoading } = useQuery<ModuleVisibility>({
    queryKey: ['module-visibility', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      
      const response = await fetch(`/api/users/${user.id}/module-visibility`);
      if (!response.ok) {
        throw new Error('Failed to fetch module visibility');
      }
      
      const visibilityData = await response.json();
      
      // Convert array of visibility objects to a map
      const visibilityMap: ModuleVisibility = {};
      visibilityData.forEach((item: any) => {
        visibilityMap[item.module] = item.is_visible;
      });
      
      return visibilityMap;
    },
    enabled: !!user?.id,
  });

  const isModuleVisible = (moduleId: string): boolean => {
    // Special access control for Engineering module (check this first)
    if (moduleId === 'engineering') {
      // EDITOR and ADMIN roles can access regardless of department
      if (userRole === 'editor' || userRole === 'admin') {
        return true;
      }
      // VIEWER role can access ONLY if they are in the engineering department
      if (userRole === 'viewer') {
        return user?.department === 'engineering';
      }
      return false;
    }
    
    // Special access control for Forecast module - visible to all users
    if (moduleId === 'forecast') {
      return true;
    }
    
    // Capacity Management module - visible to all users
    if (moduleId === 'capacity') {
      return true;
    }
    
    // If we have saved visibility data, use it (explicit override)
    if (moduleVisibility[moduleId] !== undefined) {
      return moduleVisibility[moduleId];
    }
    
    // Fallback to role-based defaults if no saved data
    if (!userRole) return true; // Default to visible if no user
    
    // Admin can see everything by default
    if (userRole === 'admin') return true;
    
    // Editor defaults - can see everything except quality-assurance, system-settings and import
    if (userRole === 'editor') {
      return !['quality-assurance', 'system-settings', 'import'].includes(moduleId);
    }
    
    // Viewer defaults - can see everything except quality-assurance, sales-forecast, bay-scheduling, system-settings, import, and engineering (unless engineering department)
    if (userRole === 'viewer') {
      return !['quality-assurance', 'sales-forecast', 'bay-scheduling', 'system-settings', 'import', 'engineering'].includes(moduleId);
    }
    
    return true; // Default to visible for any other case
  };

  return {
    moduleVisibility,
    isModuleVisible,
    isLoading,
  };
};