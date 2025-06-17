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
      
      const response = await fetch(`/api/users/${user.id}/priority-access`);
      if (!response.ok) {
        throw new Error('Failed to fetch priority access');
      }
      
      return response.json();
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