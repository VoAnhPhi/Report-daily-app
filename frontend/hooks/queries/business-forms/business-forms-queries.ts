import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createBusinessFormsApis } from '@/app/api/business-forms/business-forms-api';
import { useOnBehalfParam } from '@/contexts/caregiver-context';
import {
  BusinessForm,
  CreateBusinessFormDto,
  GetBusinessFormsQueryDto,
  PaginatedBusinessFormsResponse,
  UpdateBusinessFormDto,
} from '@/types/business-form.type';

export const businessFormKeys = {
  all: ['business-forms'] as const,
  mine: () => [...businessFormKeys.all, 'me'] as const,
  myList: (query: GetBusinessFormsQueryDto) =>
    [...businessFormKeys.mine(), 'list', query] as const,
  myDetail: (id: string) => [...businessFormKeys.mine(), id] as const,
  mstCheck: (taxCode: string) =>
    [...businessFormKeys.all, 'mst-check', taxCode] as const,
  mstLookup: (taxCode: string) =>
    [...businessFormKeys.all, 'mst-lookup', taxCode] as const,
};

export function useMyBusinessForms(query: GetBusinessFormsQueryDto) {
  const { data: session } = useSession();

  return useQuery<PaginatedBusinessFormsResponse>({
    queryKey: businessFormKeys.myList(query),
    queryFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createBusinessFormsApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.get.getMyForms(query);
    },
    enabled: !!session?.accessToken,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyBusinessForm(id: string) {
  const { data: session } = useSession();

  return useQuery<BusinessForm>({
    queryKey: businessFormKeys.myDetail(id),
    queryFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createBusinessFormsApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.get.getMyFormById(id);
    },
    enabled: !!session?.accessToken && !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateBusinessForm() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();

  return useMutation<BusinessForm, Error, CreateBusinessFormDto>({
    mutationFn: async (data) => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createBusinessFormsApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.post.createForm(data, onBehalfOfUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessFormKeys.mine() });
    },
  });
}

export function useUpdateBusinessForm(id: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation<BusinessForm, Error, UpdateBusinessFormDto>({
    mutationFn: async (data) => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createBusinessFormsApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.patch.updateForm(id, data);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: businessFormKeys.mine() });
      queryClient.setQueryData(businessFormKeys.myDetail(updated.id), updated);
    },
  });
}

export function useSoftDeleteBusinessForm() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; taxCode: string }>({
    mutationFn: async ({ id }) => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createBusinessFormsApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.delete.softDelete(id);
    },
    onSuccess: (_data, { taxCode }) => {
      queryClient.invalidateQueries({ queryKey: businessFormKeys.mine() });
      queryClient.invalidateQueries({
        queryKey: businessFormKeys.mstCheck(taxCode),
      });
    },
  });
}
