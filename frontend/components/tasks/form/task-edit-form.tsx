'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import {
  SubmitHandler,
  useFieldArray,
  UseFormReturn,
} from 'react-hook-form';
import {
  CalendarClock,
  ListTodo,
  Loader2,
  LogOut,
  RotateCcw,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
/* Cùng vòng focus với popup TẠO việc (`create-task-modal.tsx`) — chép lại
   chuỗi `focus-visible:…` là cách hai màn bắt đầu lệch nhau.

   Lưu ý một khác biệt: ở popup TẠO, hàng việc con luôn đứng trên
   `bg-ws-surface-alt`. Ở màn SỬA này thì không — hàng bị xoá mềm chuyển sang
   `bg-ws-void-bg` (xem chỗ dựng class của hàng). `FOCUS_RING` lấy `ring-offset`
   theo `ws-surface-alt`, nên trên hàng đã xoá khe hở 1px của vòng focus lệch
   màu một chút. Chấp nhận: hàng đã xoá là trạng thái tạm, và cho nó một biến
   thể vòng focus riêng thì thành hai chuỗi phải giữ đồng bộ — đúng thứ chú
   thích này đang cảnh báo. */
import { FOCUS_RING } from '@/components/daily-report/daily-report-utils';
import {
  Task,
  TaskAssignmentStatus,
  TaskStatus,
  type TaskItemEvent,
} from '@/types/task.type';
import type { UserReferenceResponse } from '@/types/user.type';
import {
  COOPERATION_CATEGORY_LABEL_VI,
  TASK_PRIORITY_CONFIG,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_CONFIG,
} from '@/components/tasks/task-utils';
import { ChecklistItemHistory } from '../detail/checklist-item-history';
import type { MediaItem } from '../shared/task-media-viewer';
import { useTaskFileUpload } from '../shared/use-task-file-upload';
import type { UpdateTaskFormValues } from './task-form-schema';
import { TaskFormAttachments } from './task-form-attachments';
import { TaskFormDates } from './task-form-dates';
import { TaskFormSupport } from './task-form-support';

type UploadBag = ReturnType<typeof useTaskFileUpload>;

/** Tách URL trong văn bản thành thẻ <a> bấm được, giữ nguyên phần còn lại. */
function linkifyText(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target='_blank'
        rel='noopener noreferrer'
        onClick={(e) => e.stopPropagation()}
        className='text-blue-600 underline break-all hover:text-blue-700'
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}


interface TaskEditFormProps {
  form: UseFormReturn<UpdateTaskFormValues>;
  task: Task;
  isTrashed: boolean;
  isDesktop: boolean;
  onSubmit: SubmitHandler<UpdateTaskFormValues>;
  /** Chọn trạng thái mới → mở modal xác nhận đổi trạng thái (không sửa form trực tiếp). */
  onStatusSelect: (status: TaskStatus) => void;
  // Người hỗ trợ
  supportUsers: UserReferenceResponse[];
  setSupportUsers: React.Dispatch<
    React.SetStateAction<UserReferenceResponse[]>
  >;
  supportDirty: boolean;
  setSupportDirty: React.Dispatch<React.SetStateAction<boolean>>;
  /** Chỉ người tạo việc + phụ trách chính mới xoá hẳn được việc con. */
  canPurgeItems: boolean;
  canEditSupport: boolean;
  onAddSupport: () => void;
  onAddSupportGroup: () => void;
  // Tải tệp (hook giữ ở modal cha vì còn dùng cho dán-ngoài-ô-nhập)
  pendingFiles: File[];
  uploadProgress: number;
  isUploadingMain: boolean;
  getRootProps: UploadBag['getRootProps'];
  getInputProps: UploadBag['getInputProps'];
  isDragActive: boolean;
  // Mở trình xem ảnh/video toàn màn hình
  onOpenViewer: (items: MediaItem[], index: number) => void;
  // Hành động chân modal
  canDeleteTask: boolean;
  onRequestDelete: () => void;
  canLeaveTask: boolean;
  onRequestLeave: () => void;
  canRestoreTask: boolean;
  onRestore: () => void;
  isRestoring: boolean;
  isUpdating: boolean;
}

/**
 * Cột trái của modal chi tiết: form sửa công việc (trạng thái, tiêu đề, mô tả,
 * người hỗ trợ, mốc thời gian, checklist việc cần làm, tài liệu đính kèm) + chân
 * trang hành động (xóa/rời/khôi phục/lưu). Tách khỏi modal để gọn file.
 */
export function TaskEditForm({
  form,
  task,
  isTrashed,
  isDesktop,
  onSubmit,
  onStatusSelect,
  supportUsers,
  setSupportUsers,
  supportDirty,
  setSupportDirty,
  canPurgeItems,
  canEditSupport,
  onAddSupport,
  onAddSupportGroup,
  pendingFiles,
  uploadProgress,
  isUploadingMain,
  getRootProps,
  getInputProps,
  isDragActive,
  onOpenViewer,
  canDeleteTask,
  onRequestDelete,
  canLeaveTask,
  onRequestLeave,
  canRestoreTask,
  onRestore,
  isRestoring,
  isUpdating,
}: TaskEditFormProps) {
  const statusConfig = TASK_STATUS_CONFIG;

  const [editingDesc, setEditingDesc] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');
  // Ô nhập "việc cần làm" — focus lại sau khi thêm để gõ tiếp.
  const newItemRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Việc con nào đang bung hai ô hạn — GIỐNG HỆT `create-task-modal.tsx`.
   *
   * Khoá là `fieldId` của `useFieldArray`, KHÔNG phải chỉ số: xoá một hàng ở
   * giữa làm mọi chỉ số phía sau tụt một bậc, và trạng thái "đang bung" sẽ
   * nhảy sang nhầm hàng. Cũng không dùng `id` (id thật của việc con) vì hàng
   * mới thêm chưa có id.
   *
   * Không có khoá = chưa ai chạm vào hàng đó, lúc ấy mặc định do dữ liệu
   * quyết định (xem `isDueOpen` bên dưới).
   */
  const [openDueRows, setOpenDueRows] = useState<Record<string, boolean>>({});
  const setDueRowOpen = (rowId: string, open: boolean) =>
    setOpenDueRows((prev) => ({ ...prev, [rowId]: open }));

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
    // Đổi tên khoá RHF để KHÔNG đè `id` (id ổn định của việc con) trong field.
    keyName: 'fieldId',
  });

  // Xoá: item đã lưu (có id) → xoá mềm (giữ để xem lịch sử); item mới chưa lưu → gỡ hẳn.
  const handleRemoveItem = (index: number) => {
    const it = form.getValues(`items.${index}`);
    if (it?.id) {
      form.setValue(`items.${index}.deleted`, true, { shouldDirty: true });
    } else {
      remove(index);
    }
  };
  const handleRestoreItem = (index: number) => {
    form.setValue(`items.${index}.deleted`, false, { shouldDirty: true });
  };

  /**
   * Xoá hẳn: chỉ đánh cờ `purge`, việc xoá thật xảy ra khi bấm Lưu. Không
   * `remove(index)` — payload phải còn item này thì server mới biết phải xoá;
   * thiếu nó thì `mergeItemsForUpdate` chỉ xoá mềm phòng thủ.
   *
   * Item chưa lưu (không có `id`) thì gỡ luôn khỏi form, chẳng có gì để xoá.
   */
  const handlePurgeItem = (index: number) => {
    const it = form.getValues(`items.${index}`);
    if (!it?.id) {
      remove(index);
      return;
    }
    form.setValue(`items.${index}.purge`, true, { shouldDirty: true });
  };

  // Lịch sử theo từng việc con — đọc read-only từ task gốc theo id (không nằm trong form).
  const getItemHistory = (id?: string): TaskItemEvent[] => {
    if (!id) return [];
    return (task.items ?? []).find((i) => i.id === id)?.history ?? [];
  };

  // Người hỗ trợ đã lưu trên server, để phân biệt với người vừa chọn (chưa lưu).
  const savedSupportIds = new Set((task.relatedUsers ?? []).map((u) => u.id));
  // id người hỗ trợ -> trạng thái tham gia (pending/accepted), để tô tone chip.
  const supportStatusMap: Record<string, TaskAssignmentStatus> = (() => {
    const map: Record<string, TaskAssignmentStatus> = {};
    (task.relatedUsers ?? []).forEach((u) => {
      if (u.status) map[u.id] = u.status;
    });
    return map;
  })();

  const addChecklistItem = () => {
    if (!newItemLabel.trim()) return;
    /* `shouldFocus: false` là phần quan trọng nhất ở đây.
       Mặc định `useFieldArray.append` tự đưa con trỏ vào ô của DÒNG VỪA THÊM.
       Người dùng vừa gõ xong một việc con và bấm Enter để gõ tiếp việc kế,
       nhưng con trỏ lại nhảy xuống dòng vừa tạo — gõ tiếp là sửa đè lên chính
       nó. Lệnh `newItemRef.current?.focus()` bên dưới cũng không cứu được vì
       RHF đặt focus SAU khi React vẽ xong. */
    append(
      {
        label: newItemLabel.trim(),
        done: false,
        reportDueAt: null,
        completionDueAt: null,
      },
      { shouldFocus: false },
    );
    setNewItemLabel('');
    // Giữ con trỏ ở ô nhập để thêm việc tiếp theo ngay.
    newItemRef.current?.focus();
  };

  /**
   * Enter = thêm việc con, Shift+Enter = xuống dòng.
   *
   * Ô này là `Textarea` nên Enter vốn có nghĩa "xuống dòng"; nhận Enter làm
   * lệnh thêm mà không chừa đường xuống dòng là lấy mất một phím của người
   * dùng. `nativeEvent.isComposing` chặn trường hợp gõ tiếng Việt bằng bộ gõ
   * có bước ghép: khi đó Enter là phím CHỌN chữ đang ghép, không phải phím
   * gửi, mà bắt nhầm thì mất luôn chữ vừa gõ dở.
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    if ((e.nativeEvent as unknown as { isComposing?: boolean }).isComposing)
      return;
    e.preventDefault();
    addChecklistItem();
  };

  const removeAttachment = (index: number) => {
    const current = form.getValues('attachments') || [];
    const updated = [...current];
    updated.splice(index, 1);
    form.setValue('attachments', updated, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // Tiến độ chỉ tính các việc con CHƯA xoá.
  const watchedItems = form.watch('items') || [];
  // Item chờ xoá hẳn coi như đã biến mất, không tính vào tiến độ.
  const activeItems = watchedItems.filter((it) => !it?.deleted && !it?.purge);
  const totalItems = activeItems.length;
  const doneItems = activeItems.filter((it) => it?.done).length;
  const progressValue = totalItems > 0 ? (doneItems / totalItems) * 100 : 0;
  // Danh sách đính kèm theo form (gồm cả tệp vừa upload), không phải task gốc.
  const watchedAttachments = form.watch('attachments') || [];

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='flex flex-col flex-1 min-h-0'
      >
        <div
          className={cn(
            /* `ws-scroll` thay `scrollbar-custom`: cùng độ mảnh nhưng màu lấy
               từ token `ws-*` nên tự đảo theo chế độ tối, thay vì một sắc xám
               slate ghi cứng. */
            'ws-scroll p-6 space-y-6',
            isDesktop ? 'flex-1 overflow-y-auto' : 'flex-none',
          )}
        >
          <fieldset disabled={isTrashed} className='space-y-6 min-w-0'>
            <div className='space-y-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='status'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-[11px] font-bold text-gray-700 uppercase'>
                        Trạng thái
                      </FormLabel>
                      <Select
                        onValueChange={(val: TaskStatus) =>
                          onStatusSelect(val)
                        }
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className='h-9 text-sm font-medium'>
                            <SelectValue placeholder='Chọn trạng thái' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='ws-scope'>
                          {Object.entries(statusConfig).map(
                            ([status, config]) => (
                              <SelectItem key={status} value={status}>
                                <div className='flex items-center gap-2'>
                                  <config.icon
                                    className={cn('w-3.5 h-3.5', config.color)}
                                  />
                                  <span>{config.label}</span>
                                </div>
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='category'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-[11px] font-bold text-gray-700 uppercase'>
                        Loại công việc
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className='h-9 text-sm'>
                            <SelectValue placeholder='Chọn loại công việc' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='ws-scope max-h-[300px]'>
                          {Object.entries(COOPERATION_CATEGORY_LABEL_VI).map(
                            ([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              <FormField
                control={form.control}
                name='priority'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[11px] font-bold text-gray-700 uppercase'>
                      Mức độ ưu tiên
                    </FormLabel>
                    <FormControl>
                      <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                        {TASK_PRIORITY_ORDER.map((value) => {
                          const cfg = TASK_PRIORITY_CONFIG[value];
                          const Icon = cfg.icon;
                          const selected = field.value === value;
                          return (
                            <button
                              key={value}
                              type='button'
                              onClick={() => field.onChange(value)}
                              className={cn(
                                'flex h-9 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-all',
                                selected
                                  ? `${cfg.badge} ring-1 ring-inset`
                                  : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50',
                              )}
                            >
                              <Icon className='h-3.5 w-3.5' />
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[11px] font-bold text-gray-700 uppercase'>
                      Tiêu đề
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Tiêu đề...'
                        {...field}
                        className='h-9 text-sm font-semibold'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-[11px] font-bold text-gray-700 uppercase'>
                    Mô tả chi tiết
                  </FormLabel>
                  <FormControl>
                    {editingDesc || !field.value ? (
                      <Textarea
                        autoFocus={editingDesc}
                        placeholder='Ghi chú...'
                        className='resize-none min-h-28 [field-sizing:content] text-sm'
                        {...field}
                        onBlur={() => {
                          field.onBlur();
                          setEditingDesc(false);
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => {
                          if (!isTrashed) setEditingDesc(true);
                        }}
                        className={cn(
                          'min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-pre-wrap break-words',
                          isTrashed ? 'cursor-default' : 'cursor-text',
                        )}
                      >
                        {linkifyText(field.value)}
                      </div>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {task.createdBy && (
              <div className='space-y-2'>
                <FormLabel className='text-[11px] font-bold text-gray-700 uppercase flex items-center gap-2'>
                  <Users className='w-4 h-4 text-zinc-500' />
                  Người tạo
                </FormLabel>
                <div className='flex items-center gap-2 w-fit max-w-full min-w-0 mb-2'>
                  <span className='w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 text-[10px] font-bold flex items-center justify-center shrink-0 overflow-hidden'>
                    {task.createdBy.avatarUrl ? (
                      <Image
                        src={task.createdBy.avatarUrl}
                        alt={task.createdBy.fullName}
                        width={24}
                        height={24}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      task.createdBy.fullName.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className='text-xs text-zinc-500 truncate min-w-0'>
                    <span className='font-semibold text-zinc-700'>
                      {task.createdBy.fullName}
                    </span>
                    {' · '}
                    {new Date(task.createdAt).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            )}

            {task.mainAssignee && (
              <div className='space-y-2'>
                <FormLabel className='text-[11px] font-bold text-gray-700 uppercase flex items-center gap-2'>
                  <Users className='w-4 h-4 text-zinc-500' />
                  Người phụ trách chính
                </FormLabel>
                <div className='flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full pl-1 pr-3 py-1 w-fit max-w-full min-w-0 mb-2'>
                  <span className='w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 overflow-hidden'>
                    {task.mainAssignee.avatarUrl ? (
                      <img
                        src={task.mainAssignee.avatarUrl}
                        alt={task.mainAssignee.fullName}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      task.mainAssignee.fullName.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className='text-xs font-medium text-blue-700 truncate min-w-0'>
                    {task.mainAssignee.fullName}
                  </span>
                </div>
              </div>
            )}

            <TaskFormSupport
              supportUsers={supportUsers}
              setSupportUsers={setSupportUsers}
              setSupportDirty={setSupportDirty}
              savedSupportIds={savedSupportIds}
              supportStatusMap={supportStatusMap}
              canEditSupport={canEditSupport}
              onAddSupport={onAddSupport}
              onAddSupportGroup={onAddSupportGroup}
            />

            <TaskFormDates form={form} />

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <FormLabel className='text-[11px] font-bold text-gray-700 uppercase flex items-center gap-2'>
                  <ListTodo className='w-4 h-4 text-zinc-500' />
                  Việc cần làm
                </FormLabel>
                {totalItems > 0 && (
                  <span className='text-[11px] font-bold text-zinc-500'>
                    {Math.round(progressValue)}%
                  </span>
                )}
              </div>
              {totalItems > 0 && (
                <Progress value={progressValue} className='h-1.5 bg-gray-100' />
              )}
              {/* 8px giữa hai việc con, không phải 6px.
                  Mỗi dòng việc con LÀ một ô nhập, mà khoảng cách nhãn↔ô nhập
                  trong cả form là 8px (`FormItem` dùng `space-y-2`). Để hai ô
                  nhập cách nhau 6px — tức GẦN hơn khoảng cách trong nội bộ một
                  trường — là đảo ngược thứ bậc: mắt gom hai dòng khác nhau
                  thành một khối, đúng cảm giác "dính sát". */}
              <div className='space-y-2'>
                {fields.map((item, index) => {
                  // Đã bấm "Xoá hẳn": biến khỏi danh sách ngay, nhưng vẫn nằm
                  // trong form để payload lúc Lưu mang cờ `purge` lên server.
                  if (form.watch(`items.${index}.purge`)) return null;

                  const isDeleted = !!form.watch(`items.${index}.deleted`);
                  const itemId = item.id as string | undefined;
                  const events = getItemHistory(itemId);
                  const rowId = item.fieldId;
                  const dueRegionId = `task-item-due-${rowId}`;
                  /* Hàng ĐÃ CÓ hạn thì luôn mở sẵn. Ẩn một ô đang có dữ liệu
                     là người dùng đọc ra "hạn biến mất" — với họ đó là mất dữ
                     liệu, dù payload vẫn còn nguyên. Trạng thái người dùng tự
                     bấm (`openDueRows[rowId]`) đứng trước, dữ liệu chỉ quyết
                     định khi chưa ai chạm vào hàng. */
                  const hasDue =
                    !!form.watch(`items.${index}.reportDueAt`) ||
                    !!form.watch(`items.${index}.completionDueAt`);
                  const isDueOpen = openDueRows[rowId] ?? hasDue;
                  return (
                    <div
                      key={item.fieldId}
                      className={cn(
                        /* `p-1.5` chứ không `p-1`: hộp nền 4px đệm nằm cách
                           hộp kế 6px thì đệm trong gần bằng khoảng cách
                           ngoài, hai hàng đọc thành một mảng liền.
                           Màu cũng chuyển sang token `ws-*` — `bg-gray-50/30`
                           và `bg-rose-50/40` là hai class Tailwind cũ, ở chế
                           độ tối chúng vẫn sáng trắng. */
                        'flex items-start gap-2 group p-1.5 rounded-lg',
                        isDeleted ? 'bg-ws-void-bg' : 'bg-ws-surface-alt',
                      )}
                    >
                      <FormField
                        control={form.control}
                        name={`items.${index}.done`}
                        render={({ field }) => (
                          /* Ô tick 16px đứng giữa một khối 44px — GIỐNG HỆT
                             popup TẠO việc (`create-task-modal.tsx`), vì đây là
                             cùng một hàng việc con ở hai màn.
                             `<label>` chứ không `<div>`: nhãn không có `for` tự
                             nhận phần tử điều khiển ĐẦU TIÊN bên trong làm đích
                             — ở đây là thẻ `<button>` Radix Checkbox dựng ra —
                             nên cả 44px đều bấm được, thay vì chỉ 16px như bản
                             `ml-2 mt-2` cũ. Khối 44px cũng tự đưa ô tick về
                             ngang tâm nút lịch 44px cùng hàng. */
                          <label
                            className={cn(
                              'flex h-11 w-11 shrink-0 items-center justify-center',
                              isDeleted ? 'cursor-not-allowed' : 'cursor-pointer',
                            )}
                          >
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isDeleted}
                              /* `<label>` bọc ngoài mở rộng vùng chạm nhưng
                                 KHÔNG đặt tên: nhãn rỗng trả chuỗi rỗng, rồi
                                 accname rơi xuống nội dung của chính nút — cũng
                                 rỗng. Thiếu dòng này thì trình đọc màn hình đọc
                                 ra 'hộp kiểm' trơ trọi. Đánh số thay vì đọc nhãn
                                 việc con, vì nhãn là ô đang gõ dở. */
                              aria-label={`Đánh dấu đã xong việc cần làm thứ ${index + 1}`}
                              className='rounded-sm'
                            />
                          </label>
                        )}
                      />
                      <div className='flex-1 min-w-0 flex flex-col'>
                        <FormField
                          control={form.control}
                          name={`items.${index}.label`}
                          render={({ field }) => (
                            <Textarea
                              {...field}
                              rows={1}
                              readOnly={isDeleted}
                              /* Cao 44px, đúng bằng ô nhập việc con ở popup TẠO
                                 việc: cùng một hàng việc con thì không được cao
                                 khác nhau ở hai màn. Bản cũ `min-h-8 py-1.5`
                                 chỉ 32px, trong khi nút lịch bên phải đã là
                                 44px — icon lịch tụt khỏi tâm dòng chữ ~6px.
                                 Đệm 12px là để dòng đầu nằm giữa hộp 44px
                                 (13,5px × 1,375 ≈ 18,6px chữ).
                                 `md:text-ws-body` viết kèm không phải thừa:
                                 chuỗi nền của `Textarea` mang sẵn `md:text-sm`
                                 (`components/ui/textarea.tsx:24`) mà
                                 `tailwind-merge` không cho hai class khác
                                 modifier loại nhau — giải thích đầy đủ ở
                                 `INPUT_TEXT_SIZE_CLASS` trong
                                 `create-task-modal.tsx`. */
                              className={cn(
                                'min-h-11 py-3 text-ws-body md:text-ws-body leading-snug border-none shadow-none focus-visible:ring-0 bg-transparent w-full resize-none field-sizing-content break-words',
                                /* Token thay cho `text-rose-600` và
                                   `text-gray-400`: hai class Tailwind thô đó
                                   không đổi theo chế độ tối, nên ở nền tối chữ
                                   việc con đã xoá và việc con đã xong vẫn giữ
                                   sắc của nền sáng. `ws-void-fg` là màu chữ
                                   của trạng thái "đã huỷ/đã xoá", đúng cặp với
                                   nền `ws-void-bg` mà hàng này dùng khi bị xoá
                                   mềm; `ws-ink-ghost` là bậc chữ mờ nhất. */
                                isDeleted
                                  ? 'text-ws-void-fg line-through'
                                  : form.watch(`items.${index}.done`) &&
                                      'text-ws-ink-ghost line-through',
                              )}
                            />
                          )}
                        />
                        {!isDeleted && isDueOpen && (
                          <div
                            id={dueRegionId}
                            className='grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2'
                          >
                            <FormField
                              control={form.control}
                              name={`items.${index}.reportDueAt`}
                              render={({ field }) => (
                                <DateTimePicker
                                  date={field.value ? new Date(field.value) : undefined}
                                  onDateChange={(date) => {
                                    field.onChange(date?.toISOString() ?? null);
                                    /* Ghim hàng ở trạng thái mở: xoá sạch hạn
                                       mà khối tự cụp lại ngay dưới tay thì
                                       thao tác "đặt lại hạn" đứt giữa chừng. */
                                    setDueRowOpen(rowId, true);
                                  }}
                                  placeholder='Hạn báo cáo'
                                  className='min-h-11 text-ws-chip'
                                />
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.completionDueAt`}
                              render={({ field }) => (
                                <DateTimePicker
                                  date={field.value ? new Date(field.value) : undefined}
                                  onDateChange={(date) => {
                                    field.onChange(date?.toISOString() ?? null);
                                    setDueRowOpen(rowId, true);
                                  }}
                                  placeholder='Hạn hoàn thành'
                                  className='min-h-11 text-ws-chip'
                                />
                              )}
                            />
                          </div>
                        )}
                      </div>

                      {/* Hai mốc hạn ẩn theo mặc định — cùng lý do và cùng
                          cách bấm với popup TẠO việc: mỗi việc con luôn hiện
                          hai ô ngày thì ba việc con đã là sáu ô, chiếm gần hết
                          chiều cao, trong khi phần lớn việc con chẳng bao giờ
                          cần hạn. Hàng đã xoá không có nút này vì khối hạn
                          của nó cũng không hiện. */}
                      {!isDeleted && (
                        <button
                          type='button'
                          onClick={() => setDueRowOpen(rowId, !isDueOpen)}
                          aria-expanded={isDueOpen}
                          aria-controls={isDueOpen ? dueRegionId : undefined}
                          aria-label={`Đặt hạn cho việc cần làm thứ ${index + 1}`}
                          className={cn(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-ws-control transition-colors',
                            FOCUS_RING,
                            isDueOpen
                              ? 'bg-ws-surface-sunken text-ws-ink'
                              : 'text-ws-ink-faint hover:bg-ws-surface-sunken hover:text-ws-ink',
                          )}
                        >
                          <CalendarClock className='h-4 w-4' />
                        </button>
                      )}

                      <ChecklistItemHistory events={events} itemId={itemId} />

                      {/* Ba nút cuối hàng — khôi phục / xoá hẳn / xoá — là ba
                          ngoại lệ CÒN SÓT của hàng này: ô tick, ô nhập, nút đặt
                          hạn và nút lịch sử đều đã 44px, riêng chúng vẫn là hộp
                          26px (`p-1.5` quanh icon 14px) bị `mt-1` đẩy xuống 4px.
                          Trong hàng `items-start`, tâm chúng nằm ở 17px trong
                          khi tâm bốn khối 44px kia ở 22px — lệch 5px, đọc ra như
                          ba icon bị tụt khỏi dòng chữ. Bỏ `mt-1`, dùng đúng
                          khuôn `h-11 w-11` của `ChecklistItemHistory` — nút
                          đứng ngay bên trái ở CẢ HAI trạng thái. Nút đặt hạn
                          thì không: nó nằm trong nhánh `!isDeleted`, nên ở hàng
                          đã xoá mềm nó không render.

                          `aria-label` chứ không chỉ `title`: `title` là chú giải
                          của TRÌNH DUYỆT — không hiện khi Tab tới bằng bàn phím
                          và không bao giờ hiện trên màn cảm ứng. Tức ở đúng khổ
                          máy mà nút nhỏ nhất, người dùng lại không có lời giải
                          thích nào. Giữ `title` cho chú giải chuột. Đánh số thay
                          vì đọc nhãn việc con, cùng lý do với ô tick ở trên:
                          nhãn là ô đang gõ dở.

                          Màu chuyển hết sang token. Bộ cũ: chữ `zinc-400` nền,
                          hover thì nút khôi phục đổi chữ sang `emerald-600` và
                          nền sang `emerald-50`, hai nút xoá đổi chữ sang
                          `red-600` và nền sang `rose-50` — toàn màu Tailwind
                          thô, ở chế độ tối chúng không đảo. Đừng viết gộp thành
                          `emerald-600/50`: trong Tailwind dấu `/` là ĐỘ MỜ, nên
                          ký hiệu đó đọc ra một class khác hẳn và không có thật
                          ở đây. Nền hover nay lấy `ws-surface-sunken` cho giống
                          hai nút 44px kề bên, chỉ icon đổi màu.
                          (Tên màu trong đoạn này cố ý viết trần, không kèm tiền
                          tố `text-`/`bg-`: cổng đếm class màu thô ở
                          `docs/features/task-workspace-ui/MASTER.md` mục 8 là
                          phép đếm chuỗi, nó không phân biệt code với chú thích.)

                          Vòng focus: hàng đã xoá đứng trên nền `ws-void-bg` (xem
                          chỗ khai báo `isDeleted` đầu vòng lặp), mà họ
                          `FOCUS_RING*` chưa có
                          bản lấy offset theo nền đó — `FOCUS_RING`
                          (offset `ws-surface-alt`) là bản gần nhất trong bốn bản
                          sẵn có, khe 1px chỉ lệch một sắc rất nhẹ chứ không
                          thành vệt TRẮNG như khi bỏ trống `ring-offset-*`. */}
                      {isDeleted ? (
                        <>
                          <button
                            type='button'
                            onClick={() => handleRestoreItem(index)}
                            title='Khôi phục'
                            aria-label={`Khôi phục việc cần làm thứ ${index + 1}`}
                            className={cn(
                              'flex h-11 w-11 shrink-0 items-center justify-center rounded-ws-control text-ws-ink-faint transition-colors hover:bg-ws-surface-sunken hover:text-ws-accent',
                              FOCUS_RING,
                            )}
                          >
                            <RotateCcw className='w-3.5 h-3.5' />
                          </button>
                          {canPurgeItems ? (
                            <button
                              type='button'
                              onClick={() => handlePurgeItem(index)}
                              title='Xoá hẳn (áp dụng khi bấm Lưu)'
                              /* Nói rõ "khi bấm Lưu" trong cả `aria-label`:
                                 người dùng bàn phím và trình đọc màn hình không
                                 thấy `title`, mà đây là nút DUY NHẤT trong hàng
                                 có hậu quả không hoàn tác được. */
                              aria-label={`Xoá hẳn việc cần làm thứ ${index + 1}, áp dụng khi bấm Lưu`}
                              className={cn(
                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-ws-control text-ws-ink-faint transition-colors hover:bg-ws-surface-sunken hover:text-ws-danger',
                                FOCUS_RING,
                              )}
                            >
                              <Trash2 className='w-3.5 h-3.5' />
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <button
                          type='button'
                          onClick={() => handleRemoveItem(index)}
                          title='Xoá việc con'
                          aria-label={`Xoá việc cần làm thứ ${index + 1}`}
                          /* Giữ nguyên cách ẩn/hiện cũ, chỉ đổi sang token: dưới
                             1024px nút luôn hiện và mang sắc đỏ (không có chuột
                             thì không có `group-hover` để gọi nó ra), từ `lg`
                             mới ẩn cho gọn và về màu trung tính.
                             Thêm hai thứ bản cũ thiếu:
                             — `lg:focus-visible:opacity-100`, nếu không thì Tab
                               tới nút ở khổ `lg` là focus vào một phần tử
                               `opacity-0`: vòng focus vừa thêm bên dưới sẽ vô
                               hình, người dùng bàn phím mất dấu con trỏ.
                             — `lg:hover:text-ws-danger` chứ không phải
                               `hover:text-ws-danger`: dưới `lg` nút vốn đã đỏ
                               sẵn nên bản không tiền tố chẳng làm gì, còn từ
                               `lg` thì lớp hover phải nằm CÙNG media query mới
                               chắc chắn thắng `lg:text-ws-ink-faint`, không phụ
                               thuộc thứ tự Tailwind xuất hai lớp ra CSS. */
                          className={cn(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-ws-control text-ws-danger transition-all hover:bg-ws-surface-sunken lg:text-ws-ink-faint lg:opacity-0 lg:hover:text-ws-danger lg:group-hover:opacity-100 lg:focus-visible:opacity-100',
                            FOCUS_RING,
                          )}
                        >
                          <X className='w-3.5 h-3.5' />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className='flex items-start gap-2 mt-4 pt-4 border-t border-ws-line'>
                <Textarea
                  ref={newItemRef}
                  rows={1}
                  placeholder='Thêm việc cần làm...'
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  onKeyDown={handleKeyPress}
                  /* Cùng cỡ với hàng việc con ngay phía trên (44px, thang
                     `ws-*`). Trước đây cả hai cùng 32px nên vẫn đều; sau khi
                     hàng việc con lên 44px mà ô này đứng yên thì ô nhập cuối
                     danh sách tụt hẳn một bậc so với các hàng trên nó.
                     `md:text-ws-body` viết kèm vì `components/ui/textarea.tsx`
                     mang sẵn `md:text-sm`, và tailwind-merge xếp hai class có
                     modifier khác nhau vào hai khoá khác nhau nên bản không
                     modifier không đẩy được nó ra. */
                  className='min-h-11 py-3 text-ws-body md:text-ws-body leading-snug bg-ws-surface-alt flex-1 min-w-0 resize-none field-sizing-content break-words'
                />
                <Button
                  type='button'
                  variant='outline'
                  className='h-11 shrink-0 px-4 text-ws-chip font-bold'
                  onClick={addChecklistItem}
                >
                  Thêm
                </Button>
              </div>
            </div>

            <TaskFormAttachments
              watchedAttachments={watchedAttachments}
              removeAttachment={removeAttachment}
              onOpenViewer={onOpenViewer}
              pendingFiles={pendingFiles}
              uploadProgress={uploadProgress}
              isDragActive={isDragActive}
              getRootProps={getRootProps}
              getInputProps={getInputProps}
            />
          </fieldset>
        </div>

        {/* Hàng nút đứng ngoài vùng cuộn, nền ĐẶC.
            `sticky` bỏ đi vì thừa: khối này đã là anh em `shrink-0` của vùng
            cuộn trong cùng một cột flex, nên nó vốn luôn ở đáy. Nền thì phải
            đặc và phải là `ws-surface` — `bg-zinc-50` là màu Tailwind cũ,
            không đổi theo chế độ tối, và bất cứ nền trong suốt nào ở đây cũng
            để chữ của phần cuộn trồi lên dưới hai nút quyết định.
            `shadow-ws-raised` hắt lên trên để nói rõ "còn nội dung phía dưới
            dải này", thay cho việc nhìn xuyên qua. */}
        <div className='shrink-0 border-t border-ws-line bg-ws-surface p-6 pt-4 shadow-ws-raised flex items-center justify-between'>
          {isTrashed ? (
            <>
              {canRestoreTask ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-9 px-3 text-emerald-600 font-bold text-xs'
                  onClick={onRestore}
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  ) : (
                    <RotateCcw className='w-4 h-4 mr-2' />
                  )}{' '}
                  Khôi phục
                </Button>
              ) : (
                <span className='text-xs font-medium text-zinc-500'>
                  Công việc đã bị xóa
                </span>
              )}
              <span />
            </>
          ) : (
            <>
              {canDeleteTask ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-9 px-3 text-red-600 font-bold text-xs'
                  onClick={onRequestDelete}
                >
                  <Trash2 className='w-4 h-4 mr-2' /> Xóa việc
                </Button>
              ) : canLeaveTask ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-9 px-3 text-amber-600 font-bold text-xs'
                  onClick={onRequestLeave}
                >
                  <LogOut className='w-4 h-4 mr-2' /> Rời việc
                </Button>
              ) : (
                <span />
              )}
              <div className='flex gap-2'>
                {(form.formState.isDirty || supportDirty) && (
                  <Button
                    type='submit'
                    size='sm'
                    className='h-9 px-6 bg-zinc-900 text-white font-bold text-xs shadow-md rounded-xl'
                    disabled={isUpdating || isUploadingMain}
                  >
                    {isUpdating ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      'Lưu thay đổi'
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </form>
    </Form>
  );
}
