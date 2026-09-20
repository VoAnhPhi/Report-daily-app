'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { createTaskGroupsApis } from '@/app/api/task-groups';
import {
  CreateTaskGroupPayload,
  UpdateTaskGroupPayload,
} from '@/types/task-group.type';
import { dailyReportKeys } from './daily-report-queries';

export const taskGroupKeys = {
  all: ['task-groups'] as const,
};

export function useTaskGroups() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: taskGroupKeys.all,
    queryFn: async () => {
      const apis = createTaskGroupsApis({
        accessToken: session?.accessToken,
        user: session?.user,
      });
      return apis.list();
    },
    enabled: !!session?.accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTaskGroup() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskGroupPayload) => {
      const apis = createTaskGroupsApis({
        accessToken: session?.accessToken,
        user: session?.user,
      });
      return apis.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskGroupKeys.all });
      queryClient.invalidateQueries({ queryKey: dailyReportKeys.all });
      toast.success('Đã tạo nhóm');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không thể tạo nhóm');
    },
  });
}

export function useUpdateTaskGroup() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateTaskGroupPayload;
    }) => {
      const apis = createTaskGroupsApis({
        accessToken: session?.accessToken,
        user: session?.user,
      });
      return apis.update(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskGroupKeys.all });
      queryClient.invalidateQueries({ queryKey: dailyReportKeys.all });
      toast.success('Đã cập nhật nhóm');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không thể cập nhật nhóm');
    },
  });
}

export function useDeleteTaskGroup() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      const apis = createTaskGroupsApis({
        accessToken: session?.accessToken,
        user: session?.user,
      });
      return apis.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskGroupKeys.all });
      queryClient.invalidateQueries({ queryKey: dailyReportKeys.all });
      toast.success('Đã xóa nhóm');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không thể xóa nhóm');
    },
  });
}

export function useLeaveTaskGroup() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      const apis = createTaskGroupsApis({
        accessToken: session?.accessToken,
        user: session?.user,
      });
      return apis.leave(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskGroupKeys.all });
      queryClient.invalidateQueries({ queryKey: dailyReportKeys.all });
      toast.success('Đã rời nhóm');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không thể rời nhóm');
    },
  });
}
