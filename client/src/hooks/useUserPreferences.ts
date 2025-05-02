import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export interface UserPreferences {
  id: number;
  userId: string;
  theme: string;
  dashboardLayout: Record<string, any> | null;
  emailNotifications: boolean;
  displayDensity: 'compact' | 'comfortable';
  defaultView: string;
  showCompletedProjects: boolean;
  dateFormat: string;
  createdAt: string;
  updatedAt: string;
}

export const defaultPreferences: Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  theme: 'dark',
  dashboardLayout: null,
  emailNotifications: true,
  displayDensity: 'comfortable',
  defaultView: 'dashboard',
  showCompletedProjects: true,
  dateFormat: 'MM/DD/YYYY',
};

export function useUserPreferences() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { 
    data: preferences, 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/user-preferences'],
    enabled: isAuthenticated,
    retry: false,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<UserPreferences>) => {
      const response = await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPreferences),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update preferences');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Preferences Updated',
        description: 'Your preferences have been saved successfully.',
      });
      // Invalidate the preferences query to refetch the updated data
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update preferences: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
    updatePreferencesMutation.mutate(newPreferences);
  };

  // Return the preferences or default values if not available
  const userPreferences = preferences || defaultPreferences;

  return {
    preferences: userPreferences,
    isLoading,
    error,
    updatePreferences,
    isUpdating: updatePreferencesMutation.isPending,
  };
}