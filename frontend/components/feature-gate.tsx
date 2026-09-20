'use client';

import { useIsFeatureEnabled } from '@/hooks/use-feature-flags';

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ featureKey, children, fallback = null }: FeatureGateProps) {
  const isEnabled = useIsFeatureEnabled(featureKey);
  if (!isEnabled) return <>{fallback}</>;
  return <>{children}</>;
}
