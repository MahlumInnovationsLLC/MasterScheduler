import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/components/PermissionsManager';

export interface ModuleVisibility {
  [moduleId: string]: boolean;
}

export const useModuleVisibility = () => {
  const { user } = usePermissions();

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
    // If we have saved visibility data, use it
    if (moduleVisibility[moduleId] !== undefined) {
      return moduleVisibility[moduleId];
    }
    
    // Fallback to role-based defaults if no saved data
    if (!user?.role) return false;
    
    if (user.role === 'admin') return true;
    if (user.role === 'editor') return !['system-settings', 'import'].includes(moduleId);
    if (user.role === 'viewer') return !['sales-forecast', 'bay-scheduling', 'system-settings', 'import'].includes(moduleId);
    
    return false;
  };

  return {
    moduleVisibility,
    isModuleVisible,
    isLoading,
  };
};