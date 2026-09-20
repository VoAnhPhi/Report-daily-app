'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
  type QueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { createTasksApis, GetTasksQuery } from '@/app/api/tasks';
import {
  CreateTaskPayload,
  UpdateTaskPayload,
  Task,
  UpdateTaskStatusDto,
  TaskActivity,
  TaskActivityFilter,
  TaskAssignmentStatus,
  TaskStatus,
} from '@/types/task.type';
import { toast } from 'sonner';
import { PaginatedResponse } from '@/types/common.type';
import { useOnBehalfParam } from '@/contexts/caregiver-context';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: GetTasksQuery) => [...taskKeys.lists(), filters] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
  // Bỏ `filter` thì key thành tiền tố của cả ba chế độ — `invalidateQueries`
  // khớp tiền tố nên gọi `activities(id)` vẫn dọn sạch mọi chế độ.
  activities: (id: string, filter?: TaskActivityFilter) =>
    filter
      ? ([...taskKeys.detail(id), 'activities', filter] as const)
      : ([...taskKeys.detail(id), 'activities'] as const),
  members: (id: string) => [...taskKeys.detail(id), 'members'] as const,
  sharedWith: (userId: string) =>
    [...taskKeys.all, 'shared-with', userId] as const,
  // Nhánh trả lời có gốc riêng (khóa theo activityId, không phải taskId).
  repliesAll: () => ['task-activities'] as const,
  replies: (activityId: string) =>
    [...taskKeys.repliesAll(), activityId, 'replies'] as const,
};

/**
 * Làm mới cache khi một hoạt động đổi (sửa/xóa/cảm xúc) mà không rõ taskId:
 * mọi feed 'activities' + nhánh trả lời; kèm danh sách khi số đếm đổi (xóa).
 * Tránh nuke toàn bộ ['tasks'] (lists/detail/counts) để hết refetch storm.
 */
function invalidateActivityScoped(
  queryClient: QueryClient,
  { includeLists = false }: { includeLists?: boolean } = {},
) {
  queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === 'tasks' &&
      (query.queryKey.includes('activities') ||
        (includeLists && query.queryKey[1] === 'list')),
  });
  queryClient.invalidateQueries({ queryKey: taskKeys.repliesAll() });
}

// Cache danh sách công việc có 2 shape: mảng `Task[]` (bản cũ, không phân trang)
// và `InfiniteData<PaginatedResponse<Task>>` (board/list infinite scroll theo cột).
type TaskListCache = Task[] | InfiniteData<PaginatedResponse<Task>>;

function isInfiniteTaskCache(
  v: unknown,
): v is InfiniteData<PaginatedResponse<Task>> {
  return (
    !!v && typeof v === 'object' && Array.isArray((v as { pages?: unknown }).pages)
  );
}

/** Áp updater lên task theo id trong MỌI shape cache list (mảng hoặc infinite). */
function mapTaskInCache(
  old: TaskListCache | undefined,
  id: string,
  update: (t: Task) => Task,
): TaskListCache | undefined {
  if (!old) return old;
  if (isInfiniteTaskCache(old)) {
    return {
      ...old,
      pages: old.pages.map((p) => ({
        ...p,
        data: p.data.map((t) => (t.id === id ? update(t) : t)),
      })),
    };
  }
  return old.map((t) => (t.id === id ? update(t) : t));
}

/** Áp payload cập nhật vào mọi danh sách công việc trong cache (optimistic). */
function patchTaskInLists(
  queryClient: QueryClient,
  id: string,
  payload: UpdateTaskPayload,
) {
  queryClient.setQueriesData<TaskListCache>(
    { queryKey: taskKeys.lists() },
    (old) =>
      mapTaskInCache(
        old,
        id,
        (task) =>
          ({
            ...task,
            ...payload,
            attachments: payload.attachments
              ? payload.attachments.map((a) => ({ name: a.name, url: a.url }))
              : task.attachments,
          }) as Task,
      ),
  );
}

/** Client API tasks gắn token phiên hiện tại — gom boilerplate dùng chung cho mọi hook. */
function useTaskApis() {
  const { data: session } = useSession();
  return createTasksApis({
    accessToken: session?.accessToken,
    user: session?.user,
  });
}

/** Người hỗ trợ tự rời khỏi công việc chung. */
export function useLeaveTask() {
  const apis = useTaskApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apis.post.leaveTask(id, reason, onBehalfOfUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success('Đã rời khỏi công việc');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Không thể rời công việc';
      toast.error(msg);
    },
  });
}

/** Người được tag xác nhận tham gia việc chung. */
export function useAcceptTask() {
  const apis = useTaskApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();

  return useMutation({
    mutationFn: (id: string) => apis.post.acceptTask(id, onBehalfOfUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success('Đã tham gia công việc');
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message || 'Không thể tham gia công việc';
      toast.error(msg);
    },
  });
}

/** Số lượng việc theo từng tab (cá nhân / đối tác / chung) cho nhãn đếm. */
export function useMyTaskCounts() {
  const { data: session } = useSession();
  const apis = useTaskApis();
  const onBehalfOfUserId = useOnBehalfParam();

  return useQuery({
    queryKey: [...taskKeys.all, 'counts', onBehalfOfUserId ?? null] as const,
    queryFn: async () => apis.get.getMyTaskCounts(onBehalfOfUserId),
    enabled: !!session?.accessToken,
    staleTime: 60 * 1000,
  });
}

export function useMyTasks(query?: GetTasksQuery) {
  const { data: session } = useSession();
  const apis = useTaskApis();
  const onBehalfOfUserId = useOnBehalfParam();
  // onBehalf vào cả query (gửi API) lẫn key (tách cache theo từng người được chăm).
  const effectiveQuery: GetTasksQuery | undefined = onBehalfOfUserId
    ? { ...query, onBehalfOfUserId }
    : query;

  return useQuery({
    queryKey: taskKeys.list(effectiveQuery),
    queryFn: async () => apis.get.getMyTasks(effectiveQuery),
    enabled: !!session?.accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Danh sách việc của MỘT cột status, cuộn tới đâu tải tới đó (giảm tải: không
 * load hết 1 lần). Board/List gọi 1 lần cho mỗi status. `baseQuery` = filter của
 * tab hiện tại (KHÔNG kèm status). onBehalf gộp vào query nên vào cả key lẫn API.
 */
export function useMyTasksInfinite(
  status: TaskStatus,
  baseQuery?: GetTasksQuery,
  limit: number = 20,
) {
  const { data: session } = useSession();
  const apis = useTaskApis();
  const onBehalfOfUserId = useOnBehalfParam();
  // Loại việc đã ghim khỏi danh sách phân trang — chúng nằm ở khu ghim riêng
  // (useMyPinnedTasks) nổi trên đầu cột, không thuộc nhóm tháng nào.
  const query: GetTasksQuery = { ...baseQuery, status, pinned: false };
  const effectiveQuery: GetTasksQuery = onBehalfOfUserId
    ? { ...query, onBehalfOfUserId }
    : query;

  return useInfiniteQuery({
    queryKey: [...taskKeys.list(effectiveQuery), 'inf'] as const,
    queryFn: async ({ pageParam = 1 }) =>
      apis.get.getMyTasksPaged(effectiveQuery, pageParam as number, limit),
    getNextPageParam: (lastPage) => {
      const current = lastPage.currentPage ?? lastPage.page;
      if (current && current < lastPage.totalPages) return current + 1;
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!session?.accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Toàn bộ việc ĐÃ GHIM của một cột status (query RIÊNG, không phân trang) — luôn
 * nổi đầu cột dù task nằm trang nào. Ghim ít nên tải trọn 1 lần; tách khỏi list
 * để invalidate/optimistic độc lập, rõ logic.
 */
export function useMyPinnedTasks(status: TaskStatus, baseQuery?: GetTasksQuery) {
  const { data: session } = useSession();
  const apis = useTaskApis();
  const onBehalfOfUserId = useOnBehalfParam();
  const query: GetTasksQuery = { ...baseQuery, status, pinned: true };
  const effectiveQuery: GetTasksQuery = onBehalfOfUserId
    ? { ...query, onBehalfOfUserId }
    : query;

  return useQuery({
    queryKey: taskKeys.list(effectiveQuery),
    queryFn: async () => apis.get.getMyTasks(effectiveQuery),
    enabled: !!session?.accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTask(id: string) {
  const { data: session } = useSession();
  const apis = useTaskApis();
  const onBehalfOfUserId = useOnBehalfParam();

  return useQuery({
    // onBehalf ở cuối key: nội dung per-viewer (isPinnedByMe…) khác theo ngữ cảnh
    // làm thay; giữ detail(id) làm prefix để invalidation cũ không vỡ.
    queryKey: [...taskKeys.detail(id), 'obh', onBehalfOfUserId ?? null],
    queryFn: async () => apis.get.getById(id, onBehalfOfUserId),
    enabled: !!id && !!session?.accessToken,
  });
}

/** Người phụ trách chính của các việc chung tôi tham gia — cho bộ lọc tab Việc chung / Chờ tham gia. */
export function useSharedAssignees(
  enabled: boolean = true,
  status?: TaskAssignmentStatus,
) {
  const { data: session } = useSession();
  const apis = useTaskApis();
  const onBehalfOfUserId = useOnBehalfParam();

  return useQuery({
    queryKey: [
      ...taskKeys.all,
      'shared-assignees',
      status ?? 'accepted',
      onBehalfOfUserId ?? null,
    ] as const,
    queryFn: async () => apis.get.getSharedAssignees(status, onBehalfOfUserId),
    enabled: enabled && !!session?.accessToken,
    staleTime: 60 * 1000,
  });
}

/** Thành viên của một việc + số việc chung với người đang xem. */
export function useTaskMembers(taskId: string) {
  const { data: session } = useSession();
  const apis = useTaskApis();
  const onBehalfOfUserId = useOnBehalfParam();

  return useQuery({
    queryKey: [...taskKeys.members(taskId), onBehalfOfUserId ?? null],
    queryFn: async () => apis.get.getMembers(taskId, onBehalfOfUserId),
    enabled: !!taskId && !!session?.accessToken,
  });
}

/** Việc chung với một người, cuộn tới đâu tải tới đó. */
export function useSharedTasks(userId: string, limit: number = 20) {
  const { data: session } = useSession();
  const apis = useTaskApis();
  const onBehalfOfUserId = useOnBehalfParam();

  return useInfiniteQuery({
    queryKey: [...taskKeys.sharedWith(userId), onBehalfOfUserId ?? null],
    queryFn: async ({ pageParam = 1 }) =>
      apis.get.getSharedTasks(
        userId,
        pageParam as number,
        limit,
        onBehalfOfUserId,
      ),
    getNextPageParam: (lastPage) => {
      const current = lastPage.currentPage ?? lastPage.page;
      if (current && current < lastPage.totalPages) return current + 1;
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!userId && !!session?.accessToken,
  });
}

export function useCreateTask() {
  const apis = useTaskApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();

  return useMutation({
    mutationFn: async (payload: CreateTaskPayload) =>
      apis.post.create(payload, onBehalfOfUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success('Đã tạo công việc mới');
    },
    onError: () => {
      toast.error('Không thể tạo công việc');
    },
  });
}

export function useUpdateTask() {
  const apis = useTaskApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateTaskPayload;
    }) => apis.patch.update(id, payload, onBehalfOfUserId),
    // Optimistic update: vá task trong mọi cache danh sách trước khi server trả lời
    // (UI phản hồi tức thì). Lưu snapshot cũ để rollback nếu lỗi.
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      const previousTasks = queryClient.getQueriesData<Task[]>({
        queryKey: taskKeys.lists(),
      });

      patchTaskInLists(queryClient, id, payload);

      return { previousTasks };
    },
    onError: (err, _variables, context) => {
      // Khôi phục toàn bộ snapshot danh sách đã lưu ở onMutate.
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Không thể cập nhật công việc');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/** Bộ lọc gắn trong khóa cache danh sách — `['tasks','list',filters,…]`. */
type ListKeyFilters = GetTasksQuery | undefined;

/**
 * Chuyển một việc sang cột khác NGAY trong cache: gỡ khỏi mọi danh sách rồi
 * chèn lên đầu danh sách của trạng thái đích. Mỗi cột là một query riêng khóa
 * theo `status`, nên chỉ đổi trường `status` tại chỗ sẽ khiến thẻ nằm lại cột cũ.
 *
 * Trả về snapshot để `onError` lùi lại nguyên trạng.
 */
function moveTaskAcrossListCaches(
  queryClient: QueryClient,
  id: string,
  newStatus: TaskStatus,
) {
  const entries = queryClient.getQueriesData<TaskListCache>({
    queryKey: taskKeys.lists(),
  });

  let moved: Task | undefined;
  for (const [, data] of entries) {
    if (!data) continue;
    const list = isInfiniteTaskCache(data)
      ? data.pages.flatMap((p) => p.data)
      : data;
    const found = list.find((t) => t.id === id);
    if (found) {
      moved = found;
      break;
    }
  }
  if (!moved) return entries;

  const next: Task = { ...moved, status: newStatus };

  for (const [key, data] of entries) {
    if (!data) continue;
    const filters = key[2] as ListKeyFilters;
    // Chỉ chèn vào đúng cột đích VÀ đúng nhánh ghim/không ghim — hai nhánh là
    // hai query khác nhau, chèn nhầm sẽ hiện thẻ hai lần.
    const isTarget =
      filters?.status === newStatus &&
      Boolean(filters?.pinned) === Boolean(moved.isPinnedByMe);

    if (isInfiniteTaskCache(data)) {
      const had = data.pages.some((p) => p.data.some((t) => t.id === id));
      const pages = data.pages.map((p, i) => {
        const kept = p.data.filter((t) => t.id !== id);
        const withInsert = isTarget && i === 0 ? [next, ...kept] : kept;
        const delta = (had ? -1 : 0) + (isTarget ? 1 : 0);
        return {
          ...p,
          data: withInsert,
          total: Math.max(0, (p.total ?? kept.length) + (i === 0 ? delta : 0)),
        };
      });
      queryClient.setQueryData(key, { ...data, pages });
    } else {
      const kept = data.filter((t) => t.id !== id);
      queryClient.setQueryData(key, isTarget ? [next, ...kept] : kept);
    }
  }

  return entries;
}

interface UpdateStatusVars {
  id: string;
  payload: UpdateTaskStatusDto;
  /** Trạng thái trước khi đổi — để dựng nút Hoàn tác. Không gửi lên server. */
  previousStatus?: TaskStatus;
  /** true = bỏ toast Hoàn tác (chính lần hoàn tác đang chạy). */
  silentUndo?: boolean;
}

export function useUpdateTaskStatus() {
  const apis = useTaskApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();
  /**
   * Nút Hoàn tác trong toast phải gọi lại chính mutation này. Giữ qua ref vì
   * `onSuccess` được khai trước khi `mutation` tồn tại.
   */
  const mutateRef = useRef<((vars: UpdateStatusVars) => void) | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ id, payload }: UpdateStatusVars) =>
      apis.patch.updateStatus(id, payload, onBehalfOfUserId),
    /**
     * Cập nhật lạc quan: thẻ nhảy cột ngay, không chờ máy chủ. Kéo thả vốn có
     * phản hồi tức thì trong đầu người dùng — bắt chờ vài trăm mili giây đọc
     * thành "hệ thống treo".
     */
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      const snapshot = moveTaskAcrossListCaches(
        queryClient,
        id,
        payload.status,
      );
      return { snapshot };
    },
    onError: (err, _vars, context) => {
      // Lùi lại đầy đủ: thẻ bay về cột cũ trước khi hiện lỗi.
      context?.snapshot?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      // `APIError.message` đã mang câu của server (app/api/index.ts hoist sẵn);
      // `err.response` LÀ thân phản hồi nên `err.response.data.message` luôn undefined.
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Không thể cập nhật trạng thái';
      toast.error(msg);
    },
    onSuccess: (_data, vars) => {
      if (vars.silentUndo || vars.previousStatus === undefined) {
        toast.success('Đã cập nhật trạng thái công việc');
        return;
      }
      const back = vars.previousStatus;
      const wasDone = vars.payload.status === TaskStatus.DONE;
      toast.success('Đã cập nhật trạng thái công việc', {
        duration: 5000,
        description: wasDone
          ? 'Hoàn tác sẽ trả việc về trạng thái cũ nhưng KHÔNG xóa ghi chú và bằng chứng vừa gửi.'
          : undefined,
        action: {
          label: 'Hoàn tác',
          onClick: () => {
            // Đảo trạng thái bằng chính endpoint này — đổi trạng thái vốn đảo
            // ngược được nên không cần endpoint hoàn tác riêng.
            mutateRef.current?.({
              id: vars.id,
              payload: { status: back },
              silentUndo: true,
            });
          },
        },
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });

  /*
   * Gán ref trong effect, KHÔNG gán thẳng lúc render: ghi `ref.current` giữa
   * render là thứ `react-hooks/refs` cấm, và React cũng không bảo đảm lượt
   * render đó được commit.
   *
   * An toàn vì nơi DUY NHẤT đọc `mutateRef.current` là `onClick` của nút Hoàn
   * tác trong toast (xem `onSuccess` ngay trên) — toast chỉ xuất hiện sau khi
   * mutation thành công, tức sau một vòng mạng, lúc đó effect đã chạy xong từ
   * lâu. `mutation.mutate` của React Query giữ nguyên tham chiếu qua các lượt
   * render nên effect này thực chất chỉ chạy một lần.
   */
  useEffect(() => {
    mutateRef.current = mutation.mutate;
  }, [mutation.mutate]);

  return mutation;
}

export function useAddTaskComment() {
  const apis = useTaskApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();

  return useMutation({
    mutationFn: async ({
      id,
      message,
      attachments,
      parentId,
      mentionedUserIds,
    }: {
      id: string;
      message: string;
      attachments?: { name: string; url: string }[];
      parentId?: string;
      mentionedUserIds?: string[];
    }) =>
      apis.post.addComment(
        id,
        message,
        attachments,
        parentId,
        mentionedUserIds,
        onBehalfOfUserId,
      ),
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Không thể thêm nhận xét';
      toast.error(msg);
    },
    onSuccess: (data, { id, parentId }) => {
      const queryKey = parentId
        ? taskKeys.replies(parentId)
        : taskKeys.activities(id);
      queryClient.invalidateQueries({ queryKey });
      // Là phản hồi: làm mới feed cha để cập nhật replyCount.
      if (parentId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.activities(id) });
      }
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success(parentId ? 'Đã gửi phản hồi' : 'Đã thêm nhận xét');
    },
  });
}

export function useUpdateActivity() {
  const apis = useTaskApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();

  return useMutation({
    mutationFn: async ({
      activityId,
      message,
    }: {
      activityId: string;
      message: string;
    }) => apis.patch.updateActivity(activityId, message, onBehalfOfUserId),
    onSuccess: () => {
      // Sửa nội dung không đổi số đếm → chỉ làm mới feed hoạt động + trả lời.
      invalidateActivityScoped(queryClient);
      toast.success('Đã cập nhật nhận xét');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Không thể cập nhật nhận xét';
      toast.error(msg);
    },
  });
}

export function useDeleteActivity() {
  const apis = useTaskApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();

  return useMutation({
    mutationFn: async (activityId: string) =>
      apis.delete.deleteActivity(activityId, onBehalfOfUserId),
    onSuccess: () => {
      // Xóa làm đổi số đếm hoạt động trên thẻ → kèm danh sách.
      invalidateActivityScoped(queryClient, { includeLists: true });
      toast.success('Đã xóa nhận xét');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Không thể xóa nhận xét';
      toast.error(msg);
    },
  });
}

export function useDeleteTask() {
  const apis = useTaskApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();

  return useMutation({
    mutationFn: async (id: string) => apis.delete.delete(id, onBehalfOfUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success('Đã xóa công việc');
    },
    onError: () => {
      toast.error('Không thể xóa công việc');
    },
  });
}

/** Danh sách việc đã xóa mềm (thùng rác) do chính user tạo. */
export function useDeletedTasks(enabled = true) {
  const { data: session } = useSession();
  const apis = useTaskApis();
  const onBehalfOfUserId = useOnBehalfParam();
  const query: GetTasksQuery = onBehalfOfUserId
    ? { deleted: true, onBehalfOfUserId }
    : { deleted: true };

  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: async () => apis.get.getMyTasks(query),
    enabled: enabled && !!session?.accessToken,
    staleTime: 60 * 1000,
  });
}

export function useRestoreTask() {
  const apis = useTaskApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();

  return useMutation({
    mutationFn: async (id: string) => apis.post.restore(id, onBehalfOfUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success('Đã khôi phục công việc');
    },
    onError: () => {
      toast.error('Không thể khôi phục công việc');
    },
  });
}

/** Ghim / bỏ ghim công việc (riêng tư theo user). Optimistic lật cờ isPinnedByMe. */
function useTogglePin(pin: boolean) {
  const apis = useTaskApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();

  return useMutation({
    mutationFn: async (id: string) =>
      pin
        ? apis.post.pin(id, onBehalfOfUserId)
        : apis.delete.unpin(id, onBehalfOfUserId),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const previousTasks = queryClient.getQueriesData<TaskListCache>({
        queryKey: taskKeys.lists(),
      });
      queryClient.setQueriesData<TaskListCache>(
        { queryKey: taskKeys.lists() },
        (old) => mapTaskInCache(old, id, (t) => ({ ...t, isPinnedByMe: pin })),
      );
      // Key detail giờ có hậu tố onBehalf → dùng prefix match để vá mọi biến thể.
      queryClient.setQueriesData<Task>(
        { queryKey: taskKeys.detail(id) },
        (old) => (old ? { ...old, isPinnedByMe: pin } : old),
      );
      return { previousTasks };
    },
    onError: (_err, _id, context) => {
      context?.previousTasks?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error(pin ? 'Không thể ghim công việc' : 'Không thể bỏ ghim');
    },
    // Không toast khi thành công — icon ghim đã đổi ngay (optimistic), toast là thừa.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export const usePinTask = () => useTogglePin(true);
export const useUnpinTask = () => useTogglePin(false);

export function useTaskActivities(
  id: string,
  filter: TaskActivityFilter = TaskActivityFilter.ALL,
  limit: number = 20,
) {
  const { data: session } = useSession();
  const apis = useTaskApis();
  const onBehalfOfUserId = useOnBehalfParam();

  return useInfiniteQuery({
    queryKey: [...taskKeys.activities(id, filter), 'obh', onBehalfOfUserId ?? null],
    queryFn: async ({ pageParam = 1 }) =>
      apis.get.getActivities(
        id,
        pageParam as number,
        limit,
        filter,
        onBehalfOfUserId,
      ) as Promise<PaginatedResponse<TaskActivity>>,
    getNextPageParam: (lastPage) => {
      const current = lastPage.currentPage ?? lastPage.page;
      if (current && current < lastPage.totalPages) {
        return current + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!id && !!session?.accessToken,
  });
}

export function useTaskActivityReplies(
  activityId: string,
  limit: number = 20,
  options?: { enabled?: boolean },
) {
  const { data: session } = useSession();
  const apis = useTaskApis();
  const onBehalfOfUserId = useOnBehalfParam();

  return useInfiniteQuery({
    queryKey: [...taskKeys.replies(activityId), 'obh', onBehalfOfUserId ?? null],
    queryFn: async ({ pageParam = 1 }) =>
      apis.get.getReplies(
        activityId,
        pageParam as number,
        limit,
        onBehalfOfUserId,
      ) as Promise<PaginatedResponse<TaskActivity>>,
    getNextPageParam: (lastPage) => {
      const current = lastPage.currentPage ?? lastPage.page;
      if (current && current < lastPage.totalPages) {
        return current + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled:
      !!activityId && !!session?.accessToken && (options?.enabled ?? true),
  });
}

export function useToggleActivityReaction() {
  const apis = useTaskApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();

  return useMutation({
    mutationFn: async ({
      activityId,
      emoji,
    }: {
      activityId: string;
      emoji: string;
    }) => apis.post.toggleReaction(activityId, emoji, onBehalfOfUserId),
    onSuccess: () => {
      // Cảm xúc chỉ đổi trong feed hoạt động + trả lời; không đụng lists/counts.
      invalidateActivityScoped(queryClient);
    },
  });
}
