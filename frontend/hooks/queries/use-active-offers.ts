import { useQuery } from '@tanstack/react-query';

export interface ActiveOfferDisplayBadge {
  text?: string;
  color?: string;
  icon?: string;
}

export interface ActiveOffer {
  id: string;
  name: string;
  subtitleText: string | null;
  displayBadge: ActiveOfferDisplayBadge | null;
  warehouseId: string | null;
  warehouseSlug: string | null;
  validTo: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchActiveOffers(): Promise<ActiveOffer[]> {
  const res = await fetch(`${API_URL}/public/offers/active`);
  if (!res.ok) {
    throw new Error('Không tải được danh sách ưu đãi');
  }
  return res.json();
}

export function useActiveOffers() {
  return useQuery({
    queryKey: ['active-offers'],
    queryFn: fetchActiveOffers,
    staleTime: 5 * 60_000,
  });
}
