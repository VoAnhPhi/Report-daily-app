import { useEffect, useCallback, useRef } from 'react';

interface UseOptimizedInfiniteScrollOptions {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onPrefetch?: () => void; // Optional prefetch function
  threshold?: number;
  rootMargin?: string;
  prefetchThreshold?: number; // Distance from threshold to trigger prefetch
  enablePrefetch?: boolean;
}

export function useOptimizedInfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  onPrefetch,
  threshold = 2000,
  rootMargin = '200px',
  prefetchThreshold = 500,
  enablePrefetch = true,
}: UseOptimizedInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prefetchObserverRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  const onLoadMoreRef = useRef(onLoadMore);
  const onPrefetchRef = useRef(onPrefetch);
  const prefetchedRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const lastPrefetchTimeRef = useRef(0);

  // Update refs to avoid stale closures
  useEffect(() => {
    loadingRef.current = loading;
    hasMoreRef.current = hasMore;
    onLoadMoreRef.current = onLoadMore;
    onPrefetchRef.current = onPrefetch;
  }, [loading, hasMore, onLoadMore, onPrefetch]);

  // Reset prefetch flag when new data is loaded
  useEffect(() => {
    if (!loading && hasMore) {
      prefetchedRef.current = false;
    }
  }, [loading, hasMore]);

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;

      // Disconnect previous observers
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (prefetchObserverRef.current) {
        prefetchObserverRef.current.disconnect();
      }

      // Main loading observer with improved logic
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          const now = Date.now();

          // Add throttling to prevent rapid firing
          if (now - lastLoadTimeRef.current < 1000) {
            return;
          }

          if (
            entry.isIntersecting &&
            hasMoreRef.current &&
            !loadingRef.current
          ) {
            lastLoadTimeRef.current = now;
            onLoadMoreRef.current();
          }
        },
        {
          rootMargin,
          threshold: 0.1, // Reduced from 0.3 to 0.1 for more sensitive detection
        },
      );

      // Prefetch observer (triggers earlier for smoother experience).
      // Use the ref (not the `onPrefetch` prop) so this callback's deps stay
      // stable and observers aren't torn down/recreated on every render.
      if (enablePrefetch && onPrefetchRef.current) {
        prefetchObserverRef.current = new IntersectionObserver(
          (entries) => {
            const [entry] = entries;
            const now = Date.now();
            // Throttle prefetch the same way as the main loader to avoid
            // rapid re-firing while the sentinel stays in view.
            if (now - lastPrefetchTimeRef.current < 1000) {
              return;
            }
            if (
              entry.isIntersecting &&
              hasMoreRef.current &&
              !loadingRef.current &&
              !prefetchedRef.current &&
              onPrefetchRef.current
            ) {
              lastPrefetchTimeRef.current = now;
              prefetchedRef.current = true;
              onPrefetchRef.current();
            }
          },
          {
            rootMargin: `${parseInt(rootMargin) + prefetchThreshold}px`,
            threshold: 0.05, // Very sensitive for prefetch
          },
        );
        prefetchObserverRef.current.observe(node);
      }

      // Observe the last element
      observerRef.current.observe(node);
    },
    // NOTE: intentionally NOT depending on onLoadMore/onPrefetch — they're read
    // through refs above. Including them recreated the observers on every render
    // (their identity changes each render), which, with the sentinel in view,
    // re-fired loadMore/prefetch in a tight loop. Keep only stable primitives.
    [rootMargin, enablePrefetch, prefetchThreshold],
  );

  // Cleanup observers on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (prefetchObserverRef.current) {
        prefetchObserverRef.current.disconnect();
      }
    };
  }, []);

  return { lastElementRef };
}
