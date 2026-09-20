import { inject } from 'mobx-react';
import RootStore, { rootStore } from '@/store/rootStore';

// For direct access to the singleton store
export function useStores(): RootStore {
  return rootStore;
}

// For components that need to be injected with stores
export const withStores = inject(
  'rootStore',
  'newsStore',
  'documentsStore',
  'adminUserStore',
  'postsStore',
  'activityLogsStore',
  'notificationStore',
);
