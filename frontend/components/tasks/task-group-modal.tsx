'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  ArrowLeft,
  ClipboardList,
  Eye,
  LogOut,
} from 'lucide-react';
import { Role, UserReferenceResponse } from '@/types/user.type';
import { TaskGroup, TaskGroupMember } from '@/types/task-group.type';
import {
  useTaskGroups,
  useCreateTaskGroup,
  useUpdateTaskGroup,
  useDeleteTaskGroup,
  useLeaveTaskGroup,
} from '@/hooks/queries/task-group-queries';
import { useAuthPermissions } from '@/hooks/auth/use-auth-permissions';
import { PermissionCode } from '@/types/permission.type';
import { SelectAssigneeModal } from './select-assignee-modal';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { DailyReportConfigPanel } from '@/components/daily-report/daily-report-config-panel';
import {
  useCreateReportScope,
  useMyReportScopes,
  useUpdateReportScope,
} from '@/hooks/queries/daily-report-queries';
import {
  DEFAULT_REMINDER_BEFORE_MINUTES,
  REPORT_CUTOFF_MINUTE,
  parseMinuteOfDay,
  toSchedulePayload,
} from '@/components/daily-report/daily-report-utils';

// Phím kích hoạt hàng nhóm bằng bàn phím (a11y).
const ENTER = 'Enter';
const SPACE = ' ';

interface TaskGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (members: TaskGroupMember[]) => void;
  /**
   * Bấm vào một hàng nhóm thì làm gì.
   *
   * `'apply'` (mặc định) — gán thành viên nhóm vào việc đang soạn rồi đóng.
   * Đúng cho hai nơi gọi từ màn Công việc (`create-task-modal`,
   * `task-detail-modal`).
   *
   * `'edit'` — mở form sửa nhóm (tên, thành viên, và khối bật báo cáo). Dùng
   * cho màn Báo cáo: ở đó `onApply` không có việc nào để gán nên hàng nhóm
   * từng bấm vào chỉ đóng hộp thoại, không phản hồi gì.
   */
  rowAction?: 'apply' | 'edit';
  /**
   * Mở cấu hình báo cáo ĐẦY ĐỦ của một scope (người duyệt phụ, thời hạn duyệt,
   * tạo báo cáo hôm nay) chồng lên hộp thoại này. Chỉ màn Báo cáo truyền vào;
   * thiếu thì khối báo cáo trong form không có lối sang đó.
   */
  onOpenScopeConfig?: (scopeId: string) => void;
}

const membersToRefs = (members: TaskGroupMember[]): UserReferenceResponse[] =>
  members.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    avatarUrl: m.avatarUrl,
    referenceId: m.referenceId ?? '',
  })) as unknown as UserReferenceResponse[];

export function TaskGroupModal({
  isOpen,
  onClose,
  onApply,
  rowAction = 'apply',
  onOpenScopeConfig,
}: TaskGroupModalProps) {
  const { data: session } = useSession();
  const { hasPermission } = useAuthPermissions();
  const { data: groups = [], isLoading } = useTaskGroups();
  // Nhóm nào đang bật báo cáo hằng ngày — vẽ huy hiệu ở danh sách.
  const { data: reportScopes } = useMyReportScopes(isOpen);
  const reportingGroupIds = new Set(
    (reportScopes ?? [])
      .filter((s) => s.isEnabled && s.assignGroupId)
      .map((s) => s.assignGroupId as string),
  );
  const createGroup = useCreateTaskGroup();
  const updateGroup = useUpdateTaskGroup();
  const deleteGroup = useDeleteTaskGroup();
  const leaveGroup = useLeaveTaskGroup();

  const [view, setView] = useState<'list' | 'form' | 'members'>('list');
  const [viewingGroup, setViewingGroup] = useState<TaskGroup | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<UserReferenceResponse[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TaskGroup | null>(null);
  const [pendingLeave, setPendingLeave] = useState<TaskGroup | null>(null);

  const canCreateGroup =
    session?.user?.role === Role.ADMIN ||
    hasPermission(PermissionCode.DAILY_TASK_GROUPS_CREATE);
  const canManageGroup = (group: TaskGroup) =>
    session?.user?.role === Role.ADMIN || group.isOwner !== false;

  /**
   * Nháp cấu hình báo cáo cho CẢ hai chế độ của form — tạo và sửa.
   *
   * Trước đây chỉ chế độ TẠO mới có bản nháp, còn chế độ SỬA thì panel tự gọi
   * API sau mỗi cú bấm. Nghĩa là trong cùng một hộp thoại có nút Lưu và nút
   * Hủy, nửa trên (tên nhóm, thành viên) chờ Lưu còn nửa dưới (báo cáo) đã âm
   * thầm gửi đi rồi — bấm Hủy cũng không lấy lại được. Giờ cả form theo đúng
   * một luật: chưa bấm Lưu thì chưa có gì rời khỏi máy.
   */
  const [wantReport, setWantReport] = useState(false);
  const [draftWeekdays, setDraftWeekdays] = useState<number[]>([
    1, 2, 3, 4, 5, 6,
  ]);
  const [draftRemind, setDraftRemind] = useState(REPORT_CUTOFF_MINUTE - DEFAULT_REMINDER_BEFORE_MINUTES);
  const [draftSummary, setDraftSummary] = useState(17 * 60 + 20);
  /**
   * Người dùng có ĐỘNG vào khối báo cáo trong phiên form này không.
   *
   * Cờ bẩn chứ không phải so sánh nháp với dữ liệu server: nếu so sánh, khi
   * `reportScopes` chưa về lúc mở form thì bản nháp đang mang giá trị mặc định
   * ("tắt", "T2–T7"), so ra là "khác server" và bấm Lưu sẽ tắt báo cáo của cả
   * nhóm dù người dùng chỉ định sửa mỗi cái tên. Không động vào thì không gửi
   * gì — đó là hành vi duy nhất an toàn.
   */
  const [reportDirty, setReportDirty] = useState(false);
  const createScope = useCreateReportScope();
  const updateScope = useUpdateReportScope();

  /** Scope báo cáo của nhóm đang sửa, nếu nhóm đó đã bật báo cáo. */
  const editingScope =
    editingId !== null
      ? ((reportScopes ?? []).find((s) => s.assignGroupId === editingId) ??
        null)
      : null;

  /**
   * Nạp bản nháp từ cấu hình thật khi mở form SỬA.
   *
   * KHÔNG nhét vào `openEdit`: lúc bấm nút bút chì, `reportScopes` có thể còn
   * đang bay. Chỗ này phải chờ dữ liệu về rồi mới nạp, và chỉ nạp khi người dùng
   * CHƯA động vào gì — nếu không, mỗi lần query refetch nền là những thay đổi
   * đang gõ dở bị kéo ngược về giá trị server.
   *
   * Làm NGAY TRONG render theo khuôn "điều chỉnh state khi render" của React
   * (giữ bộ giá trị lượt trước trong state, so sánh khi render, khác thì
   * `setState` tại chỗ) thay vì `useEffect`. Hai điều kiện trên giữ nguyên: khối
   * vẫn chạy lại mỗi khi `editingScope` đổi tham chiếu (tức khi dữ liệu về hoặc
   * refetch), và vẫn im lặng khi `reportDirty`. Cái mất đi là lượt commit trung
   * gian hiển thị bản nháp mặc định trước khi giá trị thật kịp thay vào.
   *
   * Không có nguy cơ lặp vô hạn: `editingScope` là phần tử lấy từ mảng của React
   * Query (tham chiếu ổn định giữa các lượt render) hoặc `null`, và mỗi lần khối
   * chạy thì `lastLoaded` được cập nhật nên lần render kế tiếp không khớp điều
   * kiện nữa.
   */
  const [lastLoaded, setLastLoaded] = useState({
    editingId,
    editingScope,
    reportDirty,
  });
  if (
    lastLoaded.editingId !== editingId ||
    lastLoaded.editingScope !== editingScope ||
    lastLoaded.reportDirty !== reportDirty
  ) {
    setLastLoaded({ editingId, editingScope, reportDirty });
    if (editingId !== null && !reportDirty) {
      const s = editingScope;
      setWantReport(!!s?.isEnabled);
      setDraftWeekdays(s?.weekdays ?? [1, 2, 3, 4, 5, 6]);
      setDraftRemind(
        parseMinuteOfDay(s?.reminderLabel) ??
          REPORT_CUTOFF_MINUTE - DEFAULT_REMINDER_BEFORE_MINUTES,
      );
      setDraftSummary(parseMinuteOfDay(s?.leaderSummaryLabel) ?? 17 * 60 + 20);
    }
  }

  /**
   * Số hiệu phiên của form. Tăng mỗi lần form được dựng lại (huỷ, tạo mới, sửa).
   *
   * Vì sao cần: `handleSave` tạo nhóm rồi mới bật báo cáo — HAI lượt gọi nối
   * tiếp. Giữa hai lượt, nút Lưu bị khoá nhưng Hủy, mũi tên quay lại, Esc và nút
   * đóng thì không, nên người dùng hoàn toàn có thể huỷ rồi bấm "Tạo nhóm" lần
   * nữa. Lúc đó callback của lượt cũ mới về và gọi `setEditingId(nhómCũ.id)`,
   * biến form TẠO đang trống thành form SỬA nhóm cũ. Bấm Lưu tiếp là gọi
   * `updateGroup` với `memberIds: []` — đổi tên nhóm cũ và xoá sạch thành viên
   * của nó, còn nhóm mới thì không bao giờ được tạo.
   *
   * Phải là `ref`, không thể kiểm bằng state: callback đóng gói giá trị của lần
   * render lúc bấm Lưu, nên `view`/`editingId` đọc trong đó vẫn là giá trị cũ và
   * chốt chặn sẽ lọt đúng vào trường hợp xấu.
   */
  const formRun = useRef(0);

  /**
   * Bản nháp cấu hình báo cáo, soi qua ref để callback đọc được giá trị MỚI NHẤT.
   * `createGroup.onSuccess` chạy sau một vòng mạng; nếu nó đọc `wantReport` đóng
   * gói từ lúc bấm Lưu thì người dùng tắt công tắc trong lúc chờ vẫn bị tạo cấu
   * hình báo cáo, kèm toast "Đã bật…" nói ngược lại điều họ vừa làm.
   */
  const reportDraftRef = useRef({
    enabled: false,
    weekdays: [1, 2, 3, 4, 5, 6],
    remindMinute: REPORT_CUTOFF_MINUTE - DEFAULT_REMINDER_BEFORE_MINUTES,
    summaryMinute: 17 * 60 + 20,
    dirty: false,
  });
  /*
   * Đồng bộ ref trong effect, KHÔNG gán thẳng lúc render: ghi `ref.current`
   * giữa render là thứ `react-hooks/refs` cấm, và React không bảo đảm lượt
   * render đó được commit.
   *
   * Vẫn kịp cho mục đích đã nêu ở trên: nơi DUY NHẤT đọc `reportDraftRef.current`
   * là `onSuccess` của `updateGroup` và của `createGroup` trong `handleSave`
   * bên dưới — chúng chạy sau một vòng mạng, lúc đó effect này đã chạy xong.
   */
  useEffect(() => {
    reportDraftRef.current = {
      enabled: wantReport,
      weekdays: draftWeekdays,
      remindMinute: draftRemind,
      summaryMinute: draftSummary,
      dirty: reportDirty,
    };
  }, [wantReport, draftWeekdays, draftRemind, draftSummary, reportDirty]);

  /** Trả mọi state nháp về mặc định. Dùng chung cho ba lối vào form. */
  const resetReportDraft = () => {
    setWantReport(false);
    setDraftWeekdays([1, 2, 3, 4, 5, 6]);
    setDraftRemind(REPORT_CUTOFF_MINUTE - DEFAULT_REMINDER_BEFORE_MINUTES);
    setDraftSummary(17 * 60 + 20);
    setReportDirty(false);
  };

  const resetForm = () => {
    formRun.current += 1;
    setView('list');
    setViewingGroup(null);
    setEditingId(null);
    setName('');
    setPicked([]);
    resetReportDraft();
  };

  const openCreate = () => {
    if (!canCreateGroup) return;
    formRun.current += 1;
    setEditingId(null);
    setName('');
    setPicked([]);
    resetReportDraft();
    setView('form');
  };

  const openEdit = (group: TaskGroup) => {
    if (!canManageGroup(group)) return;
    formRun.current += 1;
    setEditingId(group.id);
    setName(group.name);
    setPicked(membersToRefs(group.members));
    // Xoá nháp của phiên trước rồi để effect nạp lại từ scope thật của nhóm
    // này. Thiếu bước này thì cấu hình của nhóm vừa xem còn dính lại ở form.
    resetReportDraft();
    setView('form');
  };

  const openMembers = (group: TaskGroup) => {
    setViewingGroup(group);
    setView('members');
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const payload = { name: trimmed, memberIds: picked.map((u) => u.id) };
    // Chụp số hiệu phiên NGAY BÂY GIỜ; mọi callback về sau phải khớp mới được
    // chạm vào state, nếu không thì nó thuộc về một form đã bị bỏ.
    const run = formRun.current;
    const isCurrentForm = () => formRun.current === run;

    if (editingId) {
      const reportScope = editingScope;
      updateGroup.mutate(
        { id: editingId, payload },
        {
          onSuccess: () => {
            if (!isCurrentForm()) return;

            // Đọc lại từ ref: người dùng có thể đã đổi công tắc trong lúc
            // request tên nhóm còn đang bay.
            const draft = reportDraftRef.current;

            // KHÔNG động vào khối báo cáo thì không gửi gì. Đây là chốt chặn
            // quan trọng nhất của cả hàm: sửa mỗi tên nhóm không được phép
            // chạm tới cấu hình báo cáo.
            if (!draft.dirty) {
              resetForm();
              return;
            }

            if (reportScope) {
              // Đã có cấu hình — gộp mọi thay đổi vào ĐÚNG MỘT lệnh PATCH.
              updateScope.mutate(
                {
                  scopeId: reportScope.id,
                  payload: {
                    isEnabled: draft.enabled,
                    weekdays: draft.weekdays,
                    ...toSchedulePayload({
                      remindMinute: draft.remindMinute,
                      summaryMinute: draft.summaryMinute,
                      cutoffMinute:
                        reportScope.hardStopMinute ?? REPORT_CUTOFF_MINUTE,
                    }),
                  },
                },
                {
                  onSuccess: () => {
                    if (isCurrentForm()) resetForm();
                  },
                },
              );
              return;
            }

            // Chưa có cấu hình mà người dùng vừa bật → tạo mới.
            if (draft.enabled) {
              createScope.mutate(
                {
                  scopeType: 'assign_group',
                  assignGroupId: editingId,
                  weekdays: draft.weekdays,
                },
                {
                  onSuccess: () => {
                    if (isCurrentForm()) resetForm();
                  },
                },
              );
              return;
            }

            // Chưa có cấu hình và cũng không bật — không có gì để gửi.
            resetForm();
          },
        },
      );
      return;
    }

    createGroup.mutate(payload, {
      onSuccess: (group) => {
        if (!isCurrentForm()) return;
        // Đọc lại từ ref, không dùng giá trị đóng gói: người dùng có thể đã tắt
        // công tắc hoặc đổi ngày trong lúc request đang bay.
        const { enabled, weekdays } = reportDraftRef.current;
        if (!enabled) {
          resetForm();
          return;
        }
        // Nhóm đã tạo xong nên GIỜ mới có id để bật báo cáo. Dù bật được hay
        // không, ở lại form và chuyển sang chế độ sửa nhóm vừa tạo: bật được thì
        // giờ chốt / nhắc trước / bộ câu hỏi hiện ra ngay, hỏng thì người dùng
        // thử lại tại chỗ thay vì phải tự tìm lại nhóm trong danh sách.
        createScope.mutate(
          {
            scopeType: 'assign_group',
            assignGroupId: group.id,
            weekdays,
          },
          {
            onSuccess: () => {
              if (!isCurrentForm()) return;
              setEditingId(group.id);
              // Nháp đã thành sự thật trên server. Hạ cờ bẩn để effect nạp lại
              // giá trị server trả về — nếu không, lần bấm Lưu sau sẽ gửi lại
              // nguyên bản nháp cũ đè lên cấu hình vừa sinh.
              setReportDirty(false);
            },
            onError: () => {
              if (isCurrentForm()) setEditingId(group.id);
            },
          },
        );
      },
    });
  };

  const handleRowClick = (group: TaskGroup) => {
    // Ở màn Báo cáo, "áp dụng thành viên" không có đích đến — mở thẳng form
    // sửa nhóm, nơi có cả danh sách thành viên lẫn công tắc báo cáo.
    if (rowAction === 'edit') {
      if (!canManageGroup(group)) return;
      openEdit(group);
      return;
    }
    onApply(group.members);
    onClose();
  };

  // Xác nhận xóa nhóm đang chờ (đóng popup khi xong).
  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteGroup.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
    });
  };

  const handleConfirmLeave = () => {
    if (!pendingLeave) return;
    leaveGroup.mutate(pendingLeave.id, {
      onSuccess: () => setPendingLeave(null),
    });
  };

  // Lưu nhóm kèm cấu hình báo cáo là HAI lần gọi nối tiếp — nút Lưu phải khoá
  // suốt cả hai, không thả ra giữa chừng.
  const saving =
    createGroup.isPending ||
    updateGroup.isPending ||
    createScope.isPending ||
    updateScope.isPending ||
    leaveGroup.isPending;

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
            onClose();
          }
        }}
      >
        <DialogContent className='ws-scope duration-150 ease-out data-[state=closed]:duration-100 data-[state=open]:zoom-in-[0.99] data-[state=closed]:zoom-out-[0.99] motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100 sm:max-w-md'>
          <DialogHeader>
            <div className='flex items-center justify-between gap-2'>
              {/* `leading-snug` ghi đè `leading-none` của DialogTitle: với
                  font 18px thì line-height bằng đúng font-size, nên tiêu đề
                  tiếng Việt xuống hai dòng ở màn hẹp là đuôi chữ dòng trên
                  đâm vào dấu của dòng dưới. */}
              {/* `min-w-0 flex-1` cho tiêu đề: thiếu nó thì tiêu đề co theo
                  chữ và `justify-between` chỉ còn đẩy nút bằng phần dư, nên ở
                  khổ hẹp nút "Tạo nhóm" trôi vào giữa hàng thay vì dán mép
                  phải. Có `flex-1` thì tiêu đề luôn ăn hết phần trống và nút
                  đứng đúng mép, thẳng cột với các nút icon của từng dòng nhóm
                  bên dưới. `pr-8` của hàng là chỗ chừa cho nút đóng của Radix
                  ở góc trên phải — bỏ nó là hai nút chồng lên nhau. */}
              <DialogTitle className='flex min-w-0 flex-1 items-center gap-2 leading-snug'>
                {/* 28×28 thay cho đúng cái icon 16px: nút này là lối ra duy
                    nhất của form ngoài nút Hủy, mà vùng chạm cũ dưới cả sàn
                    24px (WCAG 2.5.8) và không có vòng focus. */}
                {view !== 'list' && (
                  <button
                    type='button'
                    disabled={view === 'form' && saving}
                    aria-label='Quay lại danh sách nhóm'
                    onClick={resetForm}
                    className='inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-ws-control text-ws-ink-faint transition-colors hover:bg-ws-surface-alt hover:text-ws-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-focus disabled:opacity-50'
                  >
                    <ArrowLeft className='w-4 h-4' />
                  </button>
                )}
                <Users className='w-5 h-5 text-ws-accent' />
                {/* Ở màn Báo cáo hộp thoại này mở từ nút "Nhóm giao việc" và
                    không gán nhanh được gì, nên tiêu đề "Nhóm gán nhanh" là
                    gọi sai tên chính cái nút vừa bấm. */}
                {view === 'form'
                  ? editingId
                    ? 'Sửa nhóm'
                    : 'Tạo nhóm mới'
                  : view === 'members'
                    ? 'Thành viên nhóm'
                    : rowAction === 'edit'
                      ? 'Nhóm giao việc'
                      : 'Nhóm gán nhanh'}
              </DialogTitle>
              {view === 'list' && canCreateGroup && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 shrink-0 text-xs font-bold border-dashed'
                  onClick={openCreate}
                >
                  <Plus className='w-3.5 h-3.5 mr-1' />
                  Tạo nhóm
                </Button>
              )}
            </div>
            <DialogDescription className='sr-only'>
              {rowAction === 'edit'
                ? 'Quản lý nhóm giao việc và bật báo cáo hằng ngày cho từng nhóm.'
                : 'Quản lý và áp dụng nhóm người hỗ trợ.'}
            </DialogDescription>
          </DialogHeader>

          {view === 'list' ? (
            <div className='space-y-3'>
              <ScrollArea className='h-72'>
                {isLoading ? (
                  <p className='text-sm text-ws-ink-soft px-2'>Đang tải...</p>
                ) : groups.length === 0 ? (
                  <p className='text-sm text-ws-ink-soft px-2 py-6 text-center'>
                    {rowAction === 'edit'
                      ? 'Chưa có nhóm nào. Tạo nhóm để giao việc và bật báo cáo hằng ngày.'
                      : 'Chưa có nhóm nào. Tạo nhóm để gán nhanh.'}
                  </p>
                ) : (
                  <div className='space-y-2'>
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        role='button'
                        tabIndex={0}
                        /* Hàng là một nút, mà hai chế độ làm hai việc khác
                           hẳn nhau — không nói ra thì người dùng bấm mò. */
                        title={
                          rowAction === 'edit'
                            ? `Mở cấu hình nhóm ${group.name}`
                            : `Gán thành viên nhóm ${group.name}`
                        }
                        onClick={() => handleRowClick(group)}
                        onKeyDown={(e) => {
                          if (e.key === ENTER || e.key === SPACE) {
                            e.preventDefault();
                            handleRowClick(group);
                          }
                        }}
                        className={`flex items-center justify-between gap-2 p-2 rounded-ws-control border border-ws-line hover:bg-ws-surface-alt transition-colors ${rowAction === 'edit' && !canManageGroup(group) ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <div className='min-w-0'>
                          <p className='text-sm font-medium truncate'>
                            {group.name}
                          </p>
                          <p className='flex items-center gap-1.5 text-xs text-ws-ink-soft'>
                            <span>{group.members.length} người</span>
                            {/* Nhãn thông tin, KHÔNG phải cảnh báo: theo bảng
                                dịch ở docs 03 mục 12, `amber-*` cũ đổi sang
                                nền chìm + chữ mềm. Giữ vàng ở đây là mượn màu
                                của mức ưu tiên cao cho một thứ chỉ nói "nhóm
                                này có bật báo cáo". */}
                            {reportingGroupIds.has(group.id) && (
                              <span className='inline-flex items-center gap-0.5 rounded-full bg-ws-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-ws-ink-soft'>
                                <ClipboardList className='w-2.5 h-2.5' />
                                Báo cáo hằng ngày
                              </span>
                            )}
                          </p>
                        </div>
                        <div className='flex items-center gap-1 shrink-0'>
                          {/* Các nút chỉ có icon nên phải tự mang tên. Kèm tên
                              nhóm vào nhãn: cả danh sách render cùng lúc, nhãn
                              trống nghĩa là trình đọc màn hình đọc ra một dãy
                              "nút, nút, nút" không phân biệt được hàng nào. */}
                          <button
                            type='button'
                            aria-label={`Xem thành viên nhóm ${group.name}`}
                            title={`Xem thành viên nhóm ${group.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openMembers(group);
                            }}
                            className='p-1.5 text-ws-ink-ghost transition-colors hover:text-ws-ink'
                          >
                            <Eye className='w-3.5 h-3.5' />
                          </button>
                          {canManageGroup(group) && (
                            <button
                              type='button'
                              aria-label={`Sửa nhóm ${group.name}`}
                              title={`Sửa nhóm ${group.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(group);
                              }}
                              className='p-1.5 text-ws-ink-ghost transition-colors hover:text-ws-ink'
                            >
                              <Pencil className='w-3.5 h-3.5' />
                            </button>
                          )}
                          {canManageGroup(group) ? (
                            <button
                              type='button'
                              aria-label={`Xóa nhóm ${group.name}`}
                              title={`Xóa nhóm ${group.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingDelete(group);
                              }}
                              className='p-1.5 text-ws-ink-ghost transition-colors hover:text-ws-danger'
                            >
                              <Trash2 className='w-3.5 h-3.5' />
                            </button>
                          ) : (
                            <button
                              type='button'
                              aria-label={`Rời nhóm ${group.name}`}
                              title={`Rời nhóm ${group.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingLeave(group);
                              }}
                              className='p-1.5 text-ws-ink-ghost transition-colors hover:text-ws-danger'
                            >
                              <LogOut className='w-3.5 h-3.5' />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : view === 'members' ? (
            <div className='space-y-3'>
              <div className='rounded-ws-control border border-ws-line bg-ws-surface-alt px-3 py-2'>
                <p className='text-sm font-semibold text-ws-ink'>
                  {viewingGroup?.name}
                </p>
                <p className='mt-0.5 text-xs text-ws-ink-soft'>
                  {viewingGroup?.members.length ?? 0} thành viên
                </p>
              </div>

              {viewingGroup?.members.length ? (
                <div className='max-h-72 space-y-1 overflow-y-auto'>
                  {viewingGroup.members.map((member) => (
                    <div
                      key={member.id}
                      className='flex items-center gap-2 rounded-ws-control border border-ws-line px-3 py-2'
                    >
                      <Avatar className='h-7 w-7 shrink-0'>
                        <AvatarImage
                          src={member.avatarUrl || '/placeholder.svg'}
                          alt={member.fullName}
                        />
                        <AvatarFallback className='text-[10px]'>
                          {member.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className='min-w-0 flex-1 truncate text-sm font-medium text-ws-ink'>
                        {member.fullName}
                      </span>
                      {member.isOwner ? (
                        <span className='shrink-0 text-[11px] font-medium text-ws-accent'>
                          Trưởng nhóm
                        </span>
                      ) : member.id === session?.user?.id ? (
                        <span className='shrink-0 text-[11px] text-ws-ink-soft'>
                          Bạn
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className='py-6 text-center text-sm text-ws-ink-soft'>
                  Nhóm chưa có thành viên.
                </p>
              )}
            </div>
          ) : (
            // Có thêm khối cấu hình báo cáo nên form cao hơn — cuộn dọc trong
            // hộp thoại để không tràn ở khổ điện thoại.
            //
            // `p-1` đều bốn phía, không phải mỗi `pr-1`: `overflow-y-auto` cắt
            // theo CẢ HAI trục (đặt overflow một trục thì trục kia tự thành
            // `auto`), nên mọi thứ vẽ RA NGOÀI biên phần tử con đều bị xén. Ô
            // nhập tên nhóm là `w-full` nằm sát mép trái và sát mép trên, mà
            // vòng focus của nó là `ring-[3px]` — 3px nằm ngoài viền ô. Không
            // chừa chỗ thì lúc bấm vào ô, vòng focus cụt mất cạnh trái và cạnh
            // trên, đọc thành "bóng bị tràn/vỡ". 4px đủ cho vòng 3px, và phần
            // chừa phải có ở CẢ trên lẫn trái nên dùng `p-1`.
            <div className='ws-scroll max-h-[70vh] space-y-3 overflow-y-auto p-1'>
              {/* Nhãn THẬT thay cho placeholder làm nhãn: placeholder biến mất
                  ngay khi gõ chữ đầu tiên, và ở form sửa ô đã có sẵn tên nên
                  người dùng không thấy chữ "Tên nhóm" ở đâu cả. */}
              <div className='space-y-1'>
                <label
                  htmlFor='task-group-name'
                  className='text-xs font-medium text-ws-ink-soft'
                >
                  Tên nhóm
                </label>
                <Input
                  id='task-group-name'
                  placeholder='Ví dụ: Nhóm kinh doanh miền Nam'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>

              {picked.length > 0 && (
                <div className='flex flex-wrap gap-2'>
                  {picked.map((user) => (
                    <div
                      key={user.id}
                      className='flex items-center gap-2 bg-ws-surface-alt border border-ws-line rounded-full pl-1 pr-2 py-1'
                    >
                      <Avatar className='w-5 h-5'>
                        <AvatarImage
                          src={user.avatarUrl || '/placeholder.svg'}
                        />
                        <AvatarFallback className='text-[10px]'>
                          {user.fullName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className='text-xs font-medium text-ws-ink'>
                        {user.fullName}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-9 w-full justify-center text-xs font-bold border-dashed'
                onClick={() => setIsPickerOpen(true)}
              >
                <Users className='w-3.5 h-3.5 mr-1.5' />
                {picked.length > 0
                  ? `Đã chọn ${picked.length} người`
                  : 'Chọn thành viên'}
              </Button>

              {/* Bật báo cáo hằng ngày — đường DUY NHẤT để mở tính năng này.
                  Ở chế độ tạo, panel nhận state nháp nên bật và chọn ngày được
                  ngay tại đây; `handleSave` gửi kèm sau khi nhóm có id. */}
              <DailyReportConfigPanel
                groupId={editingId}
                /* `draft` cho CẢ tạo lẫn sửa: hộp thoại này có nút Lưu và nút
                   Hủy, nên không phần nào trong nó được phép tự gửi đi. */
                mode='draft'
                pendingEnabled={wantReport}
                pendingWeekdays={draftWeekdays}
                pendingRemindMinute={draftRemind}
                pendingSummaryMinute={draftSummary}
                pendingDisabled={saving}
                onPendingChange={({
                  enabled,
                  weekdays,
                  remindMinute,
                  summaryMinute,
                }) => {
                  setWantReport(enabled);
                  setDraftWeekdays(weekdays);
                  setDraftRemind(remindMinute);
                  setDraftSummary(summaryMinute);
                  setReportDirty(true);
                }}
                onOpenFullConfig={onOpenScopeConfig}
              />

              <div className='flex justify-end gap-2 pt-1'>
                <Button
                  type='button'
                  variant='outline'
                  disabled={saving}
                  onClick={resetForm}
                >
                  Hủy
                </Button>
                {/* Không đặt màu riêng: `Button` mặc định đã là nút chính của
                    `ws-scope` (`--color-primary` → `ws-solid`). Đây là chỗ
                    ĐƯỢC dùng đen — một nút chính cho một hộp thoại. */}
                <Button
                  type='button'
                  onClick={handleSave}
                  disabled={!name.trim() || saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SelectAssigneeModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(users) => setPicked(users)}
        selectedUsers={picked}
      />

      <ConfirmationDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Xóa nhóm'
        description={`Bạn có chắc muốn xóa nhóm "${pendingDelete?.name}"? Hành động này không thể hoàn tác.`}
        confirmText='Xóa'
        variant='destructive'
        isLoading={deleteGroup.isPending}
      />
      <ConfirmationDialog
        isOpen={!!pendingLeave}
        onClose={() => setPendingLeave(null)}
        onConfirm={handleConfirmLeave}
        title='Rời nhóm'
        description={`Bạn có chắc muốn rời nhóm "${pendingLeave?.name}"? Bạn sẽ không còn thuộc phạm vi báo cáo hằng ngày của nhóm này.`}
        confirmText='Rời nhóm'
        variant='destructive'
        isLoading={leaveGroup.isPending}
      />
    </>
  );
}
