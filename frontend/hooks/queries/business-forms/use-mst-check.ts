import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { createBusinessFormsApis } from '@/app/api/business-forms/business-forms-api';
import {
  CheckMstResult,
  MstLookupResult,
} from '@/types/business-form.type';
import { businessFormKeys } from './business-forms-queries';

function isValidMstFormat(value: string): boolean {
  const normalized = value.trim().replace(/\D/g, '');
  return normalized.length === 10 || normalized.length === 13;
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useMstCheck(rawTaxCode: string) {
  const { data: session } = useSession();
  const debouncedTaxCode = useDebouncedValue(rawTaxCode, 700);
  const normalized = debouncedTaxCode.trim().replace(/\D/g, '');

  return useQuery<CheckMstResult>({
    queryKey: businessFormKeys.mstCheck(normalized),
    queryFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createBusinessFormsApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.get.checkMst(normalized);
    },
    enabled: !!session?.accessToken && isValidMstFormat(debouncedTaxCode),
    staleTime: 30_000,
  });
}

export function useMstLookup(rawTaxCode: string) {
  const { data: session } = useSession();
  const debouncedTaxCode = useDebouncedValue(rawTaxCode, 700);
  const normalized = debouncedTaxCode.trim().replace(/\D/g, '');

  return useQuery<MstLookupResult>({
    queryKey: businessFormKeys.mstLookup(normalized),
    queryFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createBusinessFormsApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.get.lookupMst(normalized);
    },
    enabled: !!session?.accessToken && isValidMstFormat(debouncedTaxCode),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useMstDerivedState(taxCodeValue: string, lockMst: boolean) {
  const normalizedTaxCode = taxCodeValue.trim().replace(/\D/g, '');

  const { data: mstCheck, isFetching: mstFetching } = useMstCheck(taxCodeValue);
  const isMstTaken = mstCheck?.taken === true;

  const { data: lookup, isFetching: isLookupFetching } = useMstLookup(
    lockMst || isMstTaken ? '' : taxCodeValue,
  );

  const lookupResolvedForCurrentMst =
    !!lookup &&
    ((lookup.found && lookup.data.id === normalizedTaxCode) || !lookup.found);

  const lookupHit = !!lookup && lookup.found;
  const lookupFallback = !!lookup && !lookup.found && lookupResolvedForCurrentMst;

  return {
    isMstTaken,
    mstFetching,
    lookup,
    isLookupFetching,
    lookupHit,
    lookupFallback,
    lookupResolvedForCurrentMst,
  };
}
