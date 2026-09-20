'use client';

import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskAssignmentStatus,
  TaskActivityFilter,
  UpdateTaskPayload,
  type CooperationCategory,
  type TaskActivity,
  type TaskAttachment,
} from '@/types/task.type';
import {
  toMediaItems,
  DEFAULT_COOPERATION_CATEGORY,
  TASK_STATUS_CONFIG,
  isEditableTarget,
  filesFromClipboard,
  mergeGroupMembers,
  resolveMentionIds,
} from '@/components/tasks/task-utils';
import {
  useUpdateTask,
  useLeaveTask,
  useAcceptTask,
  useDeleteTask,
  useRestoreTask,
  useAddTaskComment,
  useTask,
  useUpdateActivity,
  useDeleteActivity,
  useTaskActivities,
  usePinTask,
  useUnpinTask,
} from '@/hooks/queries/task-queries';
import { useOptimizedInfiniteScroll } from '@/hooks/use-optimized-infinite-scroll';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUploadThing } from '@/lib/uploadthing';
import { toast } from 'sonner';
import ResponsiveModal from '@/components/modals/responsive-modal';
import { useMedia } from 'react-use';
import { UpdateStatusModal } from './update-status-modal';
import { useSession } from 'next-auth/react';
import { useEffectiveUserId } from '@/contexts/caregiver-context';
import { useTaskFileUpload } from './shared/use-task-file-upload';
import { TaskMediaViewer, MediaItem } from './shared/task-media-viewer';
import { TaskActivityFeed } from './detail/task-activity-feed';
import { TaskMembersPanel } from './detail/task-members-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskEditForm } from './form/task-edit-form';
import {
  updateTaskSchema,
  type UpdateTaskFormValues,
} from './form/task-form-schema';
import { useTaskSocket } from '@/hooks/use-task-socket';
import { SelectAssigneeModal } from './select-assignee-modal';
import { TaskGroupModal } from './task-group-modal';
import type { TaskGroupMember } from '@/types/task-group.type';
import { type MentionCandidate } from './detail/mention-textarea';
import { TaskCommentComposer } from './detail/task-comment-composer';
import { LeaveTaskModal, JoinTaskModal } from './shared/task-confirm-modals';
import { TaskDetailHeader } from './detail/task-detail-header';
import { UserReferenceResponse } from '@/types/user.type';

/** Hai tab của cột phải. */
const RIGHT_TAB = { ACTIVITY: 'activity', MEMBERS: 'members' } as const;
type RightTab = (typeof RIGHT_TAB)[keyof typeof RIGHT_TAB];

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailModal({
  task: initialTask,
  isOpen,
  onClose,
}: TaskDetailModalProps) {
  const { data: session } = useSession();
  // Làm thay: quyền tính theo người được chăm (nếu đang làm thay), ngược lại là mình.
  const effectiveUserId = useEffectiveUserId();
  const isDesktop = useMedia('(min-width: 1024px)', true);
  const [showActivities, setShowActivities] = useState(true);
  const [activityFilter, setActivityFilter] = useState(TaskActivityFilter.ALL);
  const [rightTab, setRightTab] = useState<RightTab>(RIGHT_TAB.ACTIVITY);

  const [loadedTaskId, setLoadedTaskId] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewerMediaItems, setViewerMediaItems] = useState<MediaItem[]>([]);

  // Ngăn xếp việc đã mở từ tab Thành viên. Rỗng = đang xem `initialTask`.
  const [taskStack, setTaskStack] = useState<string[]>([]);
  /** Điều hướng đang chờ người dùng xác nhận bỏ thay đổi. `null` = đóng modal. */
  const [pendingNav, setPendingNav] = useState<
    { type: 'push'; taskId: string } | { type: 'pop' } | null
  >(null);
  const activeTaskId = taskStack.at(-1) ?? initialTask?.id ?? '';

  const { data: liveTask } = useTask(activeTaskId);
  // Đã drill sang việc khác thì `initialTask` là dữ liệu việc CŨ — không được
  // rơi về nó, nếu không modal chớp nội dung sai trong lúc fetch.
  const task = taskStack.length > 0 ? liveTask : liveTask || initialTask;
  const isTrashed = !!task?.deletedAt;

  const { mutateAsync: updateTask, isPending: isUpdating } = useUpdateTask();
  const { mutateAsync: leaveTask, isPending: isLeaving } = useLeaveTask();
  const { mutateAsync: acceptTask, isPending: isAccepting } = useAcceptTask();
  const { mutateAsync: deleteTask, isPending: isDeleting } = useDeleteTask();
  const { mutateAsync: restoreTask, isPending: isRestoring } = useRestoreTask();
  const { mutate: pinTask, isPending: isPinning } = usePinTask();
  const { mutate: unpinTask, isPending: isUnpinning } = useUnpinTask();

  const [supportUsers, setSupportUsers] = useState<UserReferenceResponse[]>([]);
  const [isSupportPickerOpen, setIsSupportPickerOpen] = useState(false);
  const [isSupportGroupOpen, setIsSupportGroupOpen] = useState(false);
  const [supportDirty, setSupportDirty] = useState(false);
  const { mutateAsync: addComment, isPending: isAddingComment } =
    useAddTaskComment();
  const { mutateAsync: updateActivity } = useUpdateActivity();
  const { mutateAsync: deleteActivity } = useDeleteActivity();

  // Enable real-time updates via Socket.IO
  useTaskSocket(task?.id || null);

  const {
    data: activitiesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingActivities,
  } = useTaskActivities(task?.id || '', activityFilter);

  const activities = useMemo(() => {
    const seen = new Set<string>();
    return (activitiesData?.pages.flatMap((page) => page.data) ?? []).filter(
      (activity) => {
        // Infinite-query pages can overlap briefly after a live invalidation.
        // Keep the newest occurrence so the activity feed never renders the
        // same comment/activity key twice.
        if (!activity.id) return true;
        if (seen.has(activity.id)) return false;
        seen.add(activity.id);
        return true;
      },
    );
  }, [activitiesData]);
  const orderedActivities = [...activities].reverse();
  const newestActivityId = activities[0]?.id;

  const activityScrollRef = useRef<HTMLDivElement>(null);
  // Khóa đồng bộ chống gửi nhận xét hai lần (xem handlePostComment).
  const isPostingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => {
      if (activityScrollRef.current) {
        activityScrollRef.current.scrollTop =
          activityScrollRef.current.scrollHeight;
      }
    }, 80);
    return () => window.clearTimeout(id);
  }, [isOpen, newestActivityId, isLoadingActivities, orderedActivities.length]);

  const { lastElementRef } = useOptimizedInfiniteScroll({
    hasMore: !!hasNextPage,
    loading: isFetchingNextPage,
    onLoadMore: () => fetchNextPage(),
    rootMargin: '400px',
  });

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isConfirmLeaveOpen, setIsConfirmLeaveOpen] = useState(false);
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState(false);
  // Người vừa được tag mở việc lần đầu.
  const [joinDismissed, setJoinDismissed] = useState(false);
  /*
   * Đổi việc hoặc đóng/mở modal thì lời mời tham gia phải hiện lại. Điều chỉnh
   * state NGAY TRONG render theo khuôn của React (giữ khoá lượt trước trong
   * state, so sánh khi render, khác thì `setState` tại chỗ) thay vì `useEffect`:
   * effect chạy sau commit nên khi drill sang việc khác, khung hình đầu tiên của
   * việc mới còn mang trạng thái "đã tắt lời mời" của việc vừa xem.
   */
  const joinKey = `${task?.id ?? ''}|${isOpen}`;
  const [prevJoinKey, setPrevJoinKey] = useState(joinKey);
  if (prevJoinKey !== joinKey) {
    setPrevJoinKey(joinKey);
    setJoinDismissed(false);
  }
  const [leaveReason, setLeaveReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<TaskStatus | null>(null);
  const [comment, setComment] = useState('');
  // Người đã chọn từ dropdown @mention của bình luận đang soạn — nguồn id đáng tin.
  const [selectedMentions, setSelectedMentions] = useState<
    { id: string; name: string }[]
  >([]);
  const [commentAttachments, setCommentAttachments] = useState<
    { name: string; url: string }[]
  >([]);
  const [isUploadingCommentFile, setIsUploadingCommentFile] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Map id -> tên người liên quan (phụ trách chính + hỗ trợ + người tạo), truyền
  // xuống ActivityItem (đã memo) để bôi đậm "@Tên"; memo giữ ref ổn định.
  // ĐẶT TRƯỚC early return `if (!task)` bên dưới — hook phải gọi vô điều kiện.
  //
  // Ba nhánh của `task` được rút ra biến riêng TRƯỚC khi vào `useMemo`.
  //
  // Bản cũ khai `[task?.mainAssignee, task?.relatedUsers, task?.createdBy]`
  // trong khi thân hàm — đã nằm sau chốt `if` — đọc `task.mainAssignee.id`
  // KHÔNG có `?.`. React Compiler so từng đốt đường dẫn phụ thuộc kể cả cờ
  // "optional", thấy `?.mainAssignee` khai báo lệch với `.mainAssignee` suy ra
  // được, nên bỏ luôn việc tối ưu cả component
  // (`react-hooks/preserve-manual-memoization`).
  //
  // Rút ra biến thì mỗi phần tử của mảng phụ thuộc là một tên cục bộ trần, đúng
  // bằng thứ thân hàm dùng. Điều kiện tính lại không đổi: vẫn chỉ khi một trong
  // ba nhánh đổi tham chiếu.
  const mainAssignee = task?.mainAssignee;
  const relatedUsers = task?.relatedUsers;
  const createdBy = task?.createdBy;
  const participantNameMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    if (mainAssignee) map[mainAssignee.id] = mainAssignee.fullName;
    (relatedUsers ?? []).forEach((u) => {
      map[u.id] = u.fullName;
    });
    if (createdBy) map[createdBy.id] = createdBy.fullName;
    return map;
  }, [mainAssignee, relatedUsers, createdBy]);

  // Handler truyền xuống ActivityItem (memo) — useCallback giữ ref ổn định.
  const handleUpdateComment = useCallback(
    async (activityId: string, message: string) => {
      await updateActivity({ activityId, message });
    },
    [updateActivity],
  );
  const handleDeleteComment = useCallback(
    async (activityId: string) => {
      await deleteActivity(activityId);
    },
    [deleteActivity],
  );
  // Bấm "phản hồi" → ghim người được phản hồi vào ô nhận xét.
  const handleReplyTo = useCallback((act: TaskActivity) => {
    setReplyingTo({ id: act.id, name: act.createdBy.fullName });
  }, []);
  // Bấm ảnh/video → mở trình xem full-screen tại đúng vị trí.
  const handleActivityMediaClick = useCallback(
    (att: TaskAttachment[], index: number) => {
      setViewerMediaItems(toMediaItems(att));
      setViewerInitialIndex(index);
      setViewerOpen(true);
    },
    [],
  );

  const form = useForm<UpdateTaskFormValues>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: TaskStatus.PENDING,
      priority: TaskPriority.NORMAL,
      category: DEFAULT_COOPERATION_CATEGORY,
      startDate: '',
      dueDate: '',
      attachments: [],
      items: [],
    },
  });

  const {
    pendingFiles,
    progress: uploadProgressMain,
    isUploading: isUploadingMain,
    onDrop,
    getRootProps,
    getInputProps,
    isDragActive,
  } = useTaskFileUpload({
    currentCount: () => (form.getValues('attachments') || []).length,
    onUploaded: (files) => {
      const updated = [...(form.getValues('attachments') || []), ...files];
      form.setValue('attachments', updated, {
        shouldValidate: true,
        shouldDirty: true,
      });
      toast.success(`Đã đính kèm ${files.length} tệp`);
    },
  });

  // Uploader riêng cho ảnh/tài liệu dán vào ô nhận xét.
  const { startUpload: startCommentUpload } = useUploadThing(
    'attachmentUploader',
    {
      onUploadBegin: () => setIsUploadingCommentFile(true),
      onClientUploadComplete: (res) => {
        setIsUploadingCommentFile(false);
        if (res)
          setCommentAttachments((prev) => [
            ...prev,
            ...res.map((f) => ({ name: f.name, url: f.ufsUrl })),
          ]);
      },
      onUploadError: (error) => {
        setIsUploadingCommentFile(false);
        toast.error(`Lỗi tải lên: ${error.message}`);
      },
    },
  );

  const handleCommentPaste = (e: React.ClipboardEvent) => {
    const files = filesFromClipboard(e);
    if (files.length === 0) return; // không có tệp → để dán text bình thường
    e.preventDefault();
    setIsUploadingCommentFile(true);
    startCommentUpload(files);
  };

  // Dán (Ctrl+V) khi KHÔNG focus ô nhập nào → upload vào phần tài liệu đính kèm.
  // (Focus ô nhận xét/ô nhập khác thì để onPaste của chính nó xử lý.)
  useEffect(() => {
    if (!isOpen || isTrashed) return;
    const onDocPaste = (e: ClipboardEvent) => {
      if (isEditableTarget(document.activeElement)) return;
      const files = filesFromClipboard(e);
      if (files.length === 0) return;
      e.preventDefault();
      onDrop(files);
    };
    document.addEventListener('paste', onDocPaste);
    return () => document.removeEventListener('paste', onDocPaste);
  }, [isOpen, isTrashed, onDrop]);

  useEffect(() => {
    if (task && task.status && task.id !== loadedTaskId) {
      form.reset({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority || TaskPriority.NORMAL,
        category: task.category || DEFAULT_COOPERATION_CATEGORY,
        startDate: task.startDate ? new Date(task.startDate).toISOString() : '',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : '',
        attachments: task.attachments || [],
        // Giữ id (để server nối lịch sử) + cờ deleted; history đọc read-only từ task, không vào form.
        items: (task.items || []).map((it) => ({
          id: it.id,
          label: it.label,
          done: it.done,
          deleted: it.deleted ?? false,
          reportDueAt: it.reportDueAt ?? null,
          completionDueAt: it.completionDueAt ?? null,
        })),
      });
      setSupportUsers(
        (task.relatedUsers ?? []).map((u) => ({
          id: u.id,
          fullName: u.fullName,
          avatarUrl: u.avatarUrl ?? null,
        })) as unknown as UserReferenceResponse[],
      );
      setSupportDirty(false);
      setLoadedTaskId(task.id);
    }
  }, [task?.id, task?.status, form, loadedTaskId]);

  /*
   * Đóng modal thì trả bốn state điều hướng về mặc định — làm ngay trong render
   * theo khuôn của React (giữ giá trị lượt trước trong state, so sánh khi render,
   * khác thì `setState` tại chỗ) thay vì trong `useEffect`.
   *
   * Không đổi kết quả cuối: `setLoadedTaskId(null)` vẫn khiến effect nạp form
   * ngay trên chạy lại và nạp lại việc đang mở, y như khi việc dọn này nằm trong
   * effect. Chỉ khác là bớt được một lượt commit trung gian.
   */
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (prevOpen !== isOpen) {
    setPrevOpen(isOpen);
    if (!isOpen) {
      setLoadedTaskId(null);
      setTaskStack([]);
      setPendingNav(null);
      setRightTab(RIGHT_TAB.ACTIVITY);
    }
  }

  // Đang drill sang việc khác mà chưa có dữ liệu: giữ modal, hiện spinner.
  // `return null` ở đây sẽ unmount cả modal.
  if (!task && isOpen && taskStack.length > 0) {
    return (
      <ResponsiveModal
        className='ws-scope'
      overlayClassName='bg-ws-overlay'
        open={isOpen}
        onOpenChange={(o) => !o && onClose()}
        maxWidth='sm:max-w-2xl'
        scrollable={false}
      >
        <div className='flex items-center justify-center py-24'>
          <Loader2 className='w-6 h-6 animate-spin text-zinc-400' />
        </div>
      </ResponsiveModal>
    );
  }

  if (!task) return null;

  const currentUserId = effectiveUserId;
  const canEditSupport =
    !!currentUserId &&
    (currentUserId === task.mainAssignee?.id ||
      currentUserId === task.createdById);
  const canDeleteTask =
    !!currentUserId &&
    currentUserId === task.createdById &&
    !task.createdByAdmin;
  const canRestoreTask =
    isTrashed && !!currentUserId && currentUserId === task.createdById;
  const canLeaveTask =
    !!currentUserId &&
    currentUserId !== task.mainAssignee?.id &&
    (task.relatedUsers ?? []).some((u) => u.id === currentUserId);

  const handleLeave = async () => {
    try {
      await leaveTask({ id: task.id, reason: leaveReason.trim() || undefined });
      setIsConfirmLeaveOpen(false);
      setLeaveReason('');
      onClose();
    } catch {}
  };

  // Danh sách người có thể @mention trong nhận xét: phụ trách chính + người hỗ trợ,
  // loại bản thân (không tự tag) và loại trùng id. Dùng để gợi ý @ và để dò id được tag.
  const mentionCandidates: MentionCandidate[] = (() => {
    const raw = [
      ...(task.mainAssignee ? [task.mainAssignee] : []),
      ...(task.relatedUsers ?? []),
    ];
    const seen = new Set<string>();
    const out: MentionCandidate[] = [];
    for (const u of raw) {
      if (!u?.id || u.id === currentUserId || seen.has(u.id)) continue;
      seen.add(u.id);
      out.push({ id: u.id, fullName: u.fullName, avatarUrl: u.avatarUrl });
    }
    return out;
  })();

  // Người vừa được tag mở việc chung lần đầu, hiện popup xác nhận.
  const needsJoinConfirm =
    isOpen &&
    !isTrashed &&
    task.myAssignmentStatus === TaskAssignmentStatus.PENDING &&
    !joinDismissed;

  const handleAcceptJoin = async () => {
    try {
      await acceptTask(task.id);
      setJoinDismissed(true);
    } catch {}
  };

  const handleDeclineJoin = async () => {
    try {
      await leaveTask({ id: task.id });
      onClose();
    } catch {}
  };

  // Copy link chia sẻ công việc (xem nội bộ). Link gắn ?focusTaskId=<id>; người nhận
  // mở link chỉ xem được popup nếu đã có quyền (tạo/phụ trách/hỗ trợ), ngược lại bị
  // backend chặn 403 và báo "Bạn không có quyền xem công việc này" — KHÔNG tự thêm ai.
  const handleCopyTaskCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Đã sao chép mã ${code}`);
    } catch {
      toast.error('Không sao chép được mã');
    }
  };

  const handleCopyShareLink = async () => {
    const baseUrl =
      process.env.NEXT_PUBLIC_CLIENT_URL ?? window.location.origin;
    const url = `${baseUrl}/tasks?focusTaskId=${task.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Đã sao chép link chia sẻ');
    } catch {
      toast.error('Không sao chép được link');
    }
  };

  const statusConfig = TASK_STATUS_CONFIG;

  const onSubmit: SubmitHandler<UpdateTaskFormValues> = async (values) => {
    const { dirtyFields } = form.formState;
    const payload: UpdateTaskPayload = {
      title: values.title,
      description: values.description ?? '',
      status: values.status,
      priority: values.priority,
      category: values.category as CooperationCategory,
      startDate: values.startDate
        ? new Date(values.startDate).toISOString()
        : undefined,
      dueDate: values.dueDate
        ? new Date(values.dueDate).toISOString()
        : undefined,
    };
    if (dirtyFields.attachments) payload.attachments = values.attachments;
    if (dirtyFields.items) payload.items = values.items;
    if (supportDirty) payload.relatedUserIds = supportUsers.map((u) => u.id);
    await updateTask({ id: task.id, payload });
    onClose();
  };

  // Còn thay đổi chưa lưu? (form đã sửa hoặc danh sách người hỗ trợ đã đổi)
  const hasUnsavedChanges = () => form.formState.isDirty || supportDirty;

  const applyNav = (
    nav: { type: 'push'; taskId: string } | { type: 'pop' },
  ) => {
    // Form tự nạp lại nhờ effect so `task.id !== loadedTaskId`; chỉ cần dọn cờ.
    setSupportDirty(false);
    setRightTab(RIGHT_TAB.ACTIVITY);
    setTaskStack((stack) =>
      nav.type === 'push' ? [...stack, nav.taskId] : stack.slice(0, -1),
    );
  };

  /** Chặn mọi điều hướng khi form còn dở — hỏi trước, đi sau. */
  const attemptNav = (
    nav: { type: 'push'; taskId: string } | { type: 'pop' },
  ) => {
    if (isUpdating) return;
    if (!isTrashed && hasUnsavedChanges()) {
      setPendingNav(nav);
      setIsConfirmDiscardOpen(true);
      return;
    }
    applyNav(nav);
  };

  const openSharedTask = (taskId: string) =>
    attemptNav({ type: 'push', taskId });
  const goBackTask = () => attemptNav({ type: 'pop' });

  // Đóng modal có kiểm tra: còn thay đổi chưa lưu → hỏi xác nhận trước khi bỏ.
  const attemptClose = () => {
    if (isUpdating) return;
    if (!isTrashed && hasUnsavedChanges()) {
      setPendingNav(null);
      setIsConfirmDiscardOpen(true);
      return;
    }
    onClose();
  };

  const confirmDiscard = () => {
    setIsConfirmDiscardOpen(false);
    if (pendingNav) {
      applyNav(pendingNav);
      setPendingNav(null);
      return;
    }
    onClose();
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    setIsConfirmDeleteOpen(false);
    onClose();
  };

  const handleRestore = async () => {
    try {
      await restoreTask(task.id);
      onClose();
    } catch {}
  };

  const handlePostComment = async () => {
    // Chặn double-submit ĐỒNG BỘ. `isAddingComment` (isPending của React Query)
    // cập nhật bất đồng bộ nên hai Enter sát nhau (luồng @mention: Enter chọn →
    // Enter gửi) đều đọc `false` và gửi hai lần. Cờ ref chặn ngay trong cùng nhịp.
    if (isPostingRef.current || isAddingComment) return;
    if (!task || (!comment.trim() && commentAttachments.length === 0)) return;
    isPostingRef.current = true;
    // Chỉ tag người đã thật sự chọn từ dropdown và tên vẫn còn trong nội dung.
    const mentionedUserIds = resolveMentionIds(comment, selectedMentions);
    try {
      await addComment({
        id: task.id,
        message: comment.trim(),
        attachments:
          commentAttachments.length > 0 ? commentAttachments : undefined,
        parentId: replyingTo?.id,
        mentionedUserIds:
          mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      });
      setComment('');
      setSelectedMentions([]);
      setCommentAttachments([]);
      setReplyingTo(null);
    } catch {
      // Toast lỗi do chính mutation bắn ra; ở đây chỉ cần nhả cờ đang gửi.
    } finally {
      isPostingRef.current = false;
    }
  };

  // Ghi lại người vừa chọn từ dropdown @mention (nguồn id đáng tin để tag).
  const handleMentionSelect = (c: MentionCandidate) => {
    setSelectedMentions((prev) =>
      prev.some((m) => m.id === c.id)
        ? prev
        : [...prev, { id: c.id, name: c.fullName }],
    );
  };

  const handleCommentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePostComment();
    }
  };

  // Áp nhóm gán nhanh: luôn thêm vào danh sách người hỗ trợ, đánh dấu form đã sửa.
  const handleApplySupportGroup = (members: TaskGroupMember[]) => {
    setSupportUsers((prev) => mergeGroupMembers(prev, members));
    setSupportDirty(true);
  };

  return (
    <>
      <ResponsiveModal
        className='ws-scope'
      overlayClassName='bg-ws-overlay'
        open={isOpen}
        onOpenChange={(open) => !open && attemptClose()}
        maxWidth={cn(
          'transition-all duration-300',
          showActivities ? 'sm:max-w-6xl' : 'sm:max-w-2xl',
        )}
        scrollable={!isDesktop} // Allow native scrolling on mobile
      >
        {!task?.status ? (
          <div className='flex items-center justify-center h-[40vh] w-full'>
            <Loader2 className='h-6 w-6 animate-spin text-zinc-400' />
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-col lg:flex-row bg-white transition-all duration-300 font-sans',
              isDesktop ? 'max-h-[90vh] overflow-hidden' : 'h-full',
            )}
          >
            {/* LEFT COLUMN: TASK DETAILS */}
            <div className='flex-1 flex flex-col min-w-0 border-r border-zinc-100'>
              <TaskDetailHeader
                task={task}
                canGoBack={taskStack.length > 0}
                onGoBack={goBackTask}
                onCopyCode={handleCopyTaskCode}
                isTrashed={isTrashed}
                isPinBusy={isPinning || isUnpinning}
                onTogglePin={() =>
                  task.isPinnedByMe ? unpinTask(task.id) : pinTask(task.id)
                }
                onCopyShareLink={handleCopyShareLink}
                isDesktop={isDesktop}
                showActivities={showActivities}
                onToggleActivities={() => setShowActivities(!showActivities)}
              />

              <TaskEditForm
                form={form}
                task={task}
                isTrashed={isTrashed}
                isDesktop={isDesktop}
                onSubmit={onSubmit}
                onStatusSelect={setUpdatingStatus}
                supportUsers={supportUsers}
                setSupportUsers={setSupportUsers}
                supportDirty={supportDirty}
                setSupportDirty={setSupportDirty}
                canEditSupport={canEditSupport}
                // Cùng điều kiện: người tạo việc hoặc phụ trách chính.
                canPurgeItems={canEditSupport}
                onAddSupport={() => setIsSupportPickerOpen(true)}
                onAddSupportGroup={() => setIsSupportGroupOpen(true)}
                pendingFiles={pendingFiles}
                uploadProgress={uploadProgressMain}
                isUploadingMain={isUploadingMain}
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
                onOpenViewer={(items, index) => {
                  setViewerMediaItems(items);
                  setViewerInitialIndex(index);
                  setViewerOpen(true);
                }}
                canDeleteTask={canDeleteTask}
                onRequestDelete={() => setIsConfirmDeleteOpen(true)}
                canLeaveTask={canLeaveTask}
                onRequestLeave={() => setIsConfirmLeaveOpen(true)}
                canRestoreTask={canRestoreTask}
                onRestore={handleRestore}
                isRestoring={isRestoring}
                isUpdating={isUpdating}
              />
            </div>

            {/* RIGHT COLUMN: ACTIVITIES + MEMBERS */}
            {(!isDesktop || showActivities) && (
              <div
                className={cn(
                  'w-full lg:w-[400px] flex flex-col bg-zinc-50/50 shrink-0 lg:overflow-hidden animate-in fade-in slide-in-from-right-5 duration-300',
                  !isDesktop && 'border-t border-zinc-200 mt-4',
                )}
              >
                <Tabs
                  value={rightTab}
                  onValueChange={(v) => setRightTab(v as RightTab)}
                  className='flex flex-col flex-1 min-h-0 gap-0'
                >
                  {/* `mt-6` cho khớp `mx-6`: lề trên 16px cạnh lề ngang 24px
                      làm cụm tab đứng lệch so với cột trái (thân form `p-6`).
                      Hai cột đặt cạnh nhau thì hàng đầu tiên của chúng phải
                      bắt đầu trên cùng một đường. */}
                  <TabsList className='grid grid-cols-2 mx-6 mt-6 shrink-0'>
                    <TabsTrigger value={RIGHT_TAB.ACTIVITY}>
                      Nhận xét
                    </TabsTrigger>
                    <TabsTrigger value={RIGHT_TAB.MEMBERS}>
                      Thành viên
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value={RIGHT_TAB.MEMBERS}
                    className='flex-1 min-h-0 mt-0 flex flex-col'
                  >
                    <TaskMembersPanel
                      taskId={task.id}
                      onOpenTask={openSharedTask}
                    />
                  </TabsContent>

                  <TabsContent
                    value={RIGHT_TAB.ACTIVITY}
                    className='flex-1 min-h-0 mt-0 flex flex-col'
                  >
                    <TaskActivityFeed
                      isDesktop={isDesktop}
                      activityFilter={activityFilter}
                      onActivityFilterChange={setActivityFilter}
                      isLoadingActivities={isLoadingActivities}
                      orderedActivities={orderedActivities}
                      isFetchingNextPage={isFetchingNextPage}
                      session={session}
                      isTrashed={isTrashed}
                      scrollRef={activityScrollRef}
                      lastElementRef={lastElementRef}
                      onReply={handleReplyTo}
                      onMediaClick={handleActivityMediaClick}
                      onUpdateComment={handleUpdateComment}
                      onDeleteComment={handleDeleteComment}
                      participants={participantNameMap}
                      statusConfig={statusConfig}
                      composer={
                        <TaskCommentComposer
                          comment={comment}
                          setComment={setComment}
                          commentAttachments={commentAttachments}
                          setCommentAttachments={setCommentAttachments}
                          replyingTo={replyingTo}
                          setReplyingTo={setReplyingTo}
                          mentionCandidates={mentionCandidates}
                          onMentionSelect={handleMentionSelect}
                          isAddingComment={isAddingComment}
                          isUploadingCommentFile={isUploadingCommentFile}
                          setIsUploadingCommentFile={setIsUploadingCommentFile}
                          onPost={handlePostComment}
                          onKeyDown={handleCommentKeyPress}
                          onPaste={handleCommentPaste}
                        />
                      }
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        )}
      </ResponsiveModal>

      <UpdateStatusModal
        taskId={task.id}
        newStatus={updatingStatus}
        isOpen={!!updatingStatus}
        onClose={() => setUpdatingStatus(null)}
      />

      <SelectAssigneeModal
        isOpen={isSupportPickerOpen}
        onClose={() => setIsSupportPickerOpen(false)}
        onSelect={(users) => {
          setSupportUsers(users);
          setSupportDirty(true);
        }}
        selectedUsers={supportUsers}
      />

      <TaskGroupModal
        isOpen={isSupportGroupOpen}
        onClose={() => setIsSupportGroupOpen(false)}
        onApply={handleApplySupportGroup}
      />

      <TaskMediaViewer
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        mediaItems={viewerMediaItems}
        initialIndex={viewerInitialIndex}
      />

      <ConfirmationDialog
        isOpen={isConfirmDiscardOpen}
        onClose={() => {
          // Bỏ luôn điều hướng đang chờ, kẻo lần đóng sau nhảy sang việc cũ.
          setIsConfirmDiscardOpen(false);
          setPendingNav(null);
        }}
        onConfirm={confirmDiscard}
        title={pendingNav ? 'Rời công việc này?' : 'Thoát mà không lưu?'}
        description='Bạn có thay đổi chưa lưu ở công việc này. Nếu tiếp tục, các thay đổi sẽ bị mất.'
        confirmText='Thoát, không lưu'
        cancelText='Ở lại'
        variant='destructive'
      />

      <ConfirmationDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title='Xóa công việc'
        description={`Bạn có chắc chắn muốn xóa công việc "${task.title}"? Hành động này không thể hoàn tác.`}
        confirmText='Xóa ngay'
        variant='destructive'
        isLoading={isDeleting}
      />

      <LeaveTaskModal
        isOpen={isConfirmLeaveOpen}
        onCancel={() => {
          setIsConfirmLeaveOpen(false);
          setLeaveReason('');
        }}
        taskTitle={task.title}
        reason={leaveReason}
        onReasonChange={setLeaveReason}
        isLeaving={isLeaving}
        onConfirm={handleLeave}
      />

      <JoinTaskModal
        isOpen={needsJoinConfirm}
        onDismiss={() => setJoinDismissed(true)}
        isAccepting={isAccepting}
        isLeaving={isLeaving}
        onDecline={handleDeclineJoin}
        onAccept={handleAcceptJoin}
      />
    </>
  );
}
