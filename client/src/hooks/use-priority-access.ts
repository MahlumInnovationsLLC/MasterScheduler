import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

interface UserPriorityAccess {
  canViewPriorities: boolean;
  canEditPriorities: boolean;
  canDragReorder: boolean;
}

export const usePriorityAccess = () => {
  const { user } = useAuth();

  const { data: priorityAccess, isLoading } = useQuery<UserPriorityAccess>({
    queryKey: ['/api/users', user?.id, 'priority-access'],
    queryFn: async () => {
      if (!user?.id) return { canViewPriorities: false, canEditPriorities: false, canDragReorder: false };
      
      try {
        const response = await fetch(`/api/users/${user.id}/priority-access`);
        if (!response.ok) {
          // Return default values instead of throwing error
          return { canViewPriorities: false, canEditPriorities: false, canDragReorder: false };
        }
        
        return response.json();
      } catch (error) {
        // Return default values on any error
        return { canViewPriorities: false, canEditPriorities: false, canDragReorder: false };
      }
    },
    enabled: !!user?.id,
  });

  return {
    canViewPriorities: priorityAccess?.canViewPriorities ?? false, // Default to false - requires explicit permission
    canEditPriorities: priorityAccess?.canEditPriorities ?? false,
    canDragReorder: priorityAccess?.canDragReorder ?? false,
    isLoading
  };
};