import { useQuery } from '@tanstack/react-query';
import { getApiBaseUrl } from '@/lib/api-url';

interface FeatureFlags {
  LIVESTREAM: boolean;
  STORIES: boolean;
  TRAINING_VIDEOS: boolean;
  [key: string]: boolean;
}

/**
 * Per-flag defaults used when the toggle endpoint is unavailable OR a key is
 * absent from the response (e.g. the DB row hasn't been seeded on an env yet).
 *
 * Staged-rollout features that must stay HIDDEN until an admin turns them on
 * MUST default to `false` here — otherwise a missing row / failed fetch would
 * EXPOSE them. TRAINING_VIDEOS is hidden by default for exactly this reason.
 */
const DEFAULT_FLAGS: FeatureFlags = {
  LIVESTREAM: true,
  STORIES: true,
  TRAINING_VIDEOS: false,
};

export function useFeatureFlags() {
  return useQuery<FeatureFlags>({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/feature-toggles/status`);
        if (!res.ok) return DEFAULT_FLAGS;
        const data = (await res.json()) as Record<string, boolean>;
        // Merge over defaults so a flag the backend omits keeps its safe default.
        return { ...DEFAULT_FLAGS, ...data };
      } catch {
        return DEFAULT_FLAGS;
      }
    },
    // Toggles are flipped by an admin a handful of times a month. Polling them
    // every 60s (plus on every window focus) cost one request per minute per
    // open tab for data that is effectively static within a session.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useIsFeatureEnabled(key: string): boolean {
  const { data } = useFeatureFlags();
  return data?.[key] ?? DEFAULT_FLAGS[key] ?? true;
}
