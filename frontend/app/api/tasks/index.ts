import { APIRouters } from '../APIRouters';
import { api } from '../index';
import { AuthUser } from '@/lib/auth';
import { PaginatedResponse } from '@/types/common.type';
import { CooperationCategory, CreateTaskPayload, SharedTaskAssignee, Task, TaskActivityFilter, TaskAssignmentStatus, TaskMember, TaskPriority, TaskStatus, TaskType, UpdateTaskPayload, UpdateTaskStatusDto } from '@/types/task.type';

export interface GetTasksQuery {
  type?: TaskType;
  status?: TaskStatus;
  category?: CooperationCategory;
  priority?: TaskPriority;
  createdByAdmin?: boolean;
  businessFormId?: string;
  shared?: boolean;
  /** Chỉ có tác dụng khi `shared` — lọc việc chờ xác nhận / đã tham gia. */
  assignmentStatus?: TaskAssignmentStatus;
  /** true = chỉ lấy việc đã xóa mềm (thùng rác). */
  deleted?: boolean;
  search?: string;
  /** Ngày bắt đầu / hạn chót (ISO). */
  startFrom?: string;
  startTo?: string;
  dueFrom?: string;
  dueTo?: string;
  /** Lọc theo người phụ trách chính (tab việc chung). */
  mainAssigneeId?: string;
  /** Làm thay: id người được chăm — backend xác thực quan hệ Baby, đổi ngữ cảnh sang người đó. */
  onBehalfOfUserId?: string;
  /** Phân trang (board/list infinite scroll). Bật khi truyền `page`. */
  page?: number;
  limit?: number;
  /** Lọc ghim của người xem: true = chỉ việc ghim; false = bỏ việc ghim; bỏ trống = không lọc. */
  pinned?: boolean;
}

/** Build URLSearchParams từ GetTasksQuery — dùng chung cho bản mảng và bản phân trang. */
const buildTaskParams = (query?: GetTasksQuery): URLSearchParams => {
  const params = new URLSearchParams();
  if (query?.type) params.append('type', query.type);
  if (query?.status) params.append('status', query.status);
  if (query?.category) params.append('category', query.category);
  if (query?.priority) params.append('priority', query.priority);
  if (query?.createdByAdmin) params.append('createdByAdmin', 'true');
  if (query?.businessFormId) params.append('businessFormId', query.businessFormId);
  if (query?.shared) params.append('shared', 'true');
  if (query?.assignmentStatus) params.append('assignmentStatus', query.assignmentStatus);
  if (query?.deleted) params.append('deleted', 'true');
  if (query?.search) params.append('search', query.search);
  if (query?.startFrom) params.append('startFrom', query.startFrom);
  if (query?.startTo) params.append('startTo', query.startTo);
  if (query?.dueFrom) params.append('dueFrom', query.dueFrom);
  if (query?.dueTo) params.append('dueTo', query.dueTo);
  if (query?.mainAssigneeId) params.append('mainAssigneeId', query.mainAssigneeId);
  // !== undefined vì `false` cũng phải gửi (bỏ ghim), khác vắng = không lọc.
  if (query?.pinned !== undefined) params.append('pinned', String(query.pinned));
  if (query?.onBehalfOfUserId)
    params.append('onBehalfOfUserId', query.onBehalfOfUserId);
  return params;
};

/** Nối `onBehalfOfUserId` vào URL (làm thay). Bỏ qua khi undefined = chính mình. */
const withCare = (url: string, onBehalfOfUserId?: string): string => {
  if (!onBehalfOfUserId) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}onBehalfOfUserId=${encodeURIComponent(onBehalfOfUserId)}`;
};

export const createTasksApis = ({
  accessToken,
  user,
}: {
  accessToken?: string;
  user?: AuthUser;
}) => {
  return {
    get: {
      getMyTasks: async (query?: GetTasksQuery) => {
        const params = buildTaskParams(query);
        const url = `${APIRouters.tasks.myTasks}${params.toString() ? `?${params.toString()}` : ''}`;

        const response = await api.get<Task[]>(url, {
          accessToken,
          user,
        });
        return response.data;
      },
      /** Bản phân trang (board/list infinite scroll theo từng cột status). */
      getMyTasksPaged: async (
        query: GetTasksQuery,
        page: number = 1,
        limit: number = 20,
      ): Promise<PaginatedResponse<Task>> => {
        const params = buildTaskParams(query);
        params.set('page', String(page));
        params.set('limit', String(limit));
        const response = await api.get<PaginatedResponse<Task> | Task[]>(
          `${APIRouters.tasks.myTasks}?${params.toString()}`,
          {
            accessToken,
            user,
          },
        );
        const body = response.data;
        // Phòng thủ: BE cũ (chưa nạp phân trang) trả thẳng mảng. Cắt trang phía
        // client để infinite scroll vẫn chạy (không "load hết"). Đây chỉ là lưới
        // an toàn — BE vẫn gửi cả mảng nên KHÔNG giảm tải; giảm tải thật cần BE
        // phục vụ nhánh phân trang (restart/rebuild BE).
        if (Array.isArray(body)) {
          console.warn(
            '[tasks] BE trả mảng — chưa phân trang server-side. Restart/rebuild BE để giảm tải thật.',
          );
          const start = (page - 1) * limit;
          return {
            data: body.slice(start, start + limit),
            total: body.length,
            page,
            currentPage: page,
            limit,
            totalPages: Math.max(1, Math.ceil(body.length / limit)),
          };
        }
        return body;
      },
      getMyTaskCounts: async (onBehalfOfUserId?: string) => {
        const response = await api.get<{
          personal: number;
          partner: number;
          shared: number;
          sharedPending: number;
        }>(withCare(APIRouters.tasks.myTasksCounts, onBehalfOfUserId), {
          accessToken,
          user,
        });
        return response.data;
      },
      getById: async (id: string, onBehalfOfUserId?: string) => {
        const response = await api.get<Task>(
          withCare(APIRouters.tasks.byId(id), onBehalfOfUserId),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
      getMembers: async (id: string, onBehalfOfUserId?: string) => {
        const response = await api.get<TaskMember[]>(
          withCare(APIRouters.tasks.members(id), onBehalfOfUserId),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
      getSharedAssignees: async (
        status?: TaskAssignmentStatus,
        onBehalfOfUserId?: string,
      ) => {
        const url = status
          ? `${APIRouters.tasks.sharedAssignees}?status=${status}`
          : APIRouters.tasks.sharedAssignees;
        const response = await api.get<SharedTaskAssignee[]>(
          withCare(url, onBehalfOfUserId),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
      getSharedTasks: async (
        userId: string,
        page: number = 1,
        limit: number = 20,
        onBehalfOfUserId?: string,
      ) => {
        const response = await api.get<PaginatedResponse<Task>>(
          withCare(
            `${APIRouters.tasks.sharedWith(userId)}?page=${page}&limit=${limit}`,
            onBehalfOfUserId,
          ),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
      getActivities: async (
        id: string,
        page: number = 1,
        limit: number = 20,
        filter: TaskActivityFilter = TaskActivityFilter.ALL,
        onBehalfOfUserId?: string,
      ) => {
        // `all` là mặc định của backend — không nối vào URL cho gọn.
        const filterQuery =
          filter === TaskActivityFilter.ALL ? '' : `&filter=${filter}`;
        const response = await api.get<any>(
          withCare(
            `${APIRouters.tasks.activities(id)}?page=${page}&limit=${limit}${filterQuery}`,
            onBehalfOfUserId,
          ),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
      getReplies: async (
        activityId: string,
        page: number = 1,
        limit: number = 20,
        onBehalfOfUserId?: string,
      ) => {
        const response = await api.get<any>(
          withCare(
            `${APIRouters.tasks.activityReplies(activityId)}?page=${page}&limit=${limit}`,
            onBehalfOfUserId,
          ),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
    },
    post: {
      create: async (payload: CreateTaskPayload, onBehalfOfUserId?: string) => {
        const response = await api.post<Task>(
          withCare(APIRouters.tasks.base, onBehalfOfUserId),
          {
            accessToken,
            user,
            data: payload,
          },
        );
        return response.data;
      },
      addComment: async (id: string, message: string, attachments?: { name: string, url: string }[], parentId?: string, mentionedUserIds?: string[], onBehalfOfUserId?: string) => {
        const response = await api.post<any>(
          withCare(APIRouters.tasks.activities(id), onBehalfOfUserId),
          {
            accessToken,
            user,
            data: {
              message,
              attachments,
              parentId,
              mentionedUserIds,
            },
          },
        );
        return response.data;
      },
      acceptTask: async (id: string, onBehalfOfUserId?: string) => {
        const response = await api.post<Task>(
          withCare(APIRouters.tasks.accept(id), onBehalfOfUserId),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
      toggleReaction: async (activityId: string, emoji: string, onBehalfOfUserId?: string) => {
        const response = await api.post<any>(
          withCare(APIRouters.tasks.activityReact(activityId), onBehalfOfUserId),
          {
            accessToken,
            user,
            data: {
              emoji
            },
          },
        );
        return response.data;
      },
      leaveTask: async (id: string, reason?: string, onBehalfOfUserId?: string) => {
        const response = await api.post<Task>(
          withCare(APIRouters.tasks.leave(id), onBehalfOfUserId),
          {
            accessToken,
            user,
            data: { reason },
          },
        );
        return response.data;
      },
      restore: async (id: string, onBehalfOfUserId?: string) => {
        const response = await api.post<Task>(
          withCare(APIRouters.tasks.restore(id), onBehalfOfUserId),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
      pin: async (id: string, onBehalfOfUserId?: string) => {
        const response = await api.post<Task>(
          withCare(APIRouters.tasks.pin(id), onBehalfOfUserId),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
    },
    patch: {
      update: async (id: string, payload: UpdateTaskPayload, onBehalfOfUserId?: string) => {
        const response = await api.patch<Task>(
          withCare(APIRouters.tasks.byId(id), onBehalfOfUserId),
          {
            accessToken,
            user,
            data: payload,
          },
        );
        return response.data;
      },
      updateStatus: async (id: string, payload: UpdateTaskStatusDto, onBehalfOfUserId?: string) => {
        const response = await api.patch<Task>(
          withCare(APIRouters.tasks.updateStatus(id), onBehalfOfUserId),
          {
            accessToken,
            user,
            data: payload,
          },
        );
        return response.data;
      },
      updateActivity: async (activityId: string, message: string, onBehalfOfUserId?: string) => {
        const response = await api.patch<Task>(
          withCare(APIRouters.tasks.activitiesById(activityId), onBehalfOfUserId),
          {
            accessToken,
            user,
            data: { message },
          },
        );
        return response.data;
      },
    },
    delete: {
      delete: async (id: string, onBehalfOfUserId?: string) => {
        const response = await api.delete(
          withCare(APIRouters.tasks.byId(id), onBehalfOfUserId),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
      deleteActivity: async (activityId: string, onBehalfOfUserId?: string) => {
        const response = await api.delete(
          withCare(APIRouters.tasks.activitiesById(activityId), onBehalfOfUserId),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
      unpin: async (id: string, onBehalfOfUserId?: string) => {
        const response = await api.delete<Task>(
          withCare(APIRouters.tasks.pin(id), onBehalfOfUserId),
          {
            accessToken,
            user,
          },
        );
        return response.data;
      },
    },
  };
};
