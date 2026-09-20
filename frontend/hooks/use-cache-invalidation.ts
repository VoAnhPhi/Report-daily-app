import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Hook for comprehensive cache invalidation after user data updates
 *
 * This hook provides utilities to invalidate all user-related caches
 * to ensure fresh data is fetched after profile updates.
 */
export const useCacheInvalidation = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  /**
   * Invalidate all user-related queries for the current user
   */
  const invalidateAllUserQueries = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Invalidate all user profile queries
      await queryClient.invalidateQueries({
        queryKey: ['user', 'profile'],
      });

      // Invalidate user statistics
      await queryClient.invalidateQueries({
        queryKey: ['user', 'statistics'],
      });

      // Invalidate avatar and cover queries
      await queryClient.invalidateQueries({
        queryKey: ['user', 'avatar'],
      });

      await queryClient.invalidateQueries({
        queryKey: ['user', 'cover'],
      });

      // Invalidate referral queries
      await queryClient.invalidateQueries({
        queryKey: ['user', 'referrals'],
      });

      // Invalidate user config queries
      await queryClient.invalidateQueries({
        queryKey: ['user', 'config'],
      });

      // Invalidate all media queries
      await queryClient.invalidateQueries({
        queryKey: ['media'],
      });

      // Invalidate all profile-related queries
      await queryClient.invalidateQueries({
        queryKey: ['profile'],
      });

      console.log('All user-related caches invalidated');
    } catch (error) {
      console.error('Error invalidating user caches:', error);
    }
  }, [queryClient, session?.user?.id]);

  /**
   * Invalidate specific user profile queries
   */
  const invalidateUserProfile = useCallback(
    async (userId: string) => {
      try {
        await queryClient.invalidateQueries({
          queryKey: ['user', 'profile', userId],
        });

        await queryClient.invalidateQueries({
          queryKey: ['user', 'statistics', userId],
        });

        console.log(`User profile cache invalidated for user: ${userId}`);
      } catch (error) {
        console.error('Error invalidating user profile cache:', error);
      }
    },
    [queryClient],
  );

  /**
   * Force refetch all user data
   */
  const refetchAllUserData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Refetch all user-related queries
      await queryClient.refetchQueries({
        queryKey: ['user'],
      });

      await queryClient.refetchQueries({
        queryKey: ['profile'],
      });

      console.log('All user data refetched');
    } catch (error) {
      console.error('Error refetching user data:', error);
    }
  }, [queryClient, session?.user?.id]);

  /**
   * Clear all caches and force fresh data
   */
  const clearAllCaches = useCallback(async () => {
    try {
      await queryClient.clear();
      console.log('All caches cleared');
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  }, [queryClient]);

  return {
    invalidateAllUserQueries,
    invalidateUserProfile,
    refetchAllUserData,
    clearAllCaches,
  };
};
