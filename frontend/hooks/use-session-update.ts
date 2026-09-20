import { useSession } from 'next-auth/react';
import { useCallback } from 'react';

/**
 * Hook for triggering session updates after user data changes
 *
 * This hook provides a convenient way to refresh the user session
 * after profile updates, ensuring that all components using the session
 * get the latest user data immediately.
 */
export const useSessionUpdate = () => {
  const { update: updateSession } = useSession();

  /**
   * Triggers a session update to refresh user data across the app
   *
   * @param options - Optional configuration for the update
   * @returns Promise that resolves when the session is updated
   */
  const triggerSessionUpdate = useCallback(
    async (options?: {
      revalidate?: boolean;
      redirect?: boolean;
      refreshUser?: boolean;
    }) => {
      try {
        await updateSession(options);
      } catch (error) {
        console.error('Error updating session:', error);
        throw error;
      }
    },
    [updateSession],
  );

  return {
    triggerSessionUpdate,
    updateSession: triggerSessionUpdate, // Alias for convenience
  };
};
