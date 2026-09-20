import { APIRouters } from '../APIRouters';
import { api } from '../index';
import { AuthUser } from '@/lib/auth';
import {
  CreateTaskGroupPayload,
  TaskGroup,
  UpdateTaskGroupPayload,
} from '@/types/task-group.type';

export const createTaskGroupsApis = ({
  accessToken,
  user,
}: {
  accessToken?: string;
  user?: AuthUser;
}) => {
  return {
    list: async () => {
      const response = await api.get<TaskGroup[]>(APIRouters.taskGroups.base, {
        accessToken,
        user,
      });
      return response.data;
    },
    create: async (payload: CreateTaskGroupPayload) => {
      const response = await api.post<TaskGroup>(APIRouters.taskGroups.base, {
        accessToken,
        user,
        data: payload,
      });
      return response.data;
    },
    update: async (id: string, payload: UpdateTaskGroupPayload) => {
      const response = await api.patch<TaskGroup>(
        APIRouters.taskGroups.byId(id),
        {
          accessToken,
          user,
          data: payload,
        },
      );
      return response.data;
    },
    remove: async (id: string) => {
      const response = await api.delete(APIRouters.taskGroups.byId(id), {
        accessToken,
        user,
      });
      return response.data;
    },
    leave: async (id: string) => {
      const response = await api.post(APIRouters.taskGroups.leave(id), {
        accessToken,
        user,
      });
      return response.data;
    },
  };
};
