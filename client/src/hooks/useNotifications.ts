import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'billing' | 'project' | 'manufacturing' | 'system';
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
  userId: string | null;
  link: string | null;
  relatedProjectId: number | null;
  relatedMilestoneId: number | null;
  relatedScheduleId: number | null;
  expiresAt: string | null;
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  // Get all notifications for the current user
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated,
  });
  
  // Get unread notification count
  const { data: unreadCount = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread/count'],
    enabled: isAuthenticated,
  });

  // Mark a notification as read
  const markAsRead = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/notifications/${id}/read`, {
        method: 'PUT',
      }),
    onSuccess: () => {
      // Invalidate both notifications and the count
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread/count'] });
    },
  });

  // Mark all notifications as read
  const markAllAsRead = useMutation({
    mutationFn: () => 
      apiRequest('/api/notifications/read-all', {
        method: 'PUT',
      }),
    onSuccess: () => {
      // Invalidate both notifications and the count
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread/count'] });
    },
  });

  // Delete a notification
  const deleteNotification = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/notifications/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      // Invalidate both notifications and the count
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread/count'] });
    },
  });

  return {
    notifications: notifications as Notification[],
    unreadCount: unreadCount?.count || 0,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}