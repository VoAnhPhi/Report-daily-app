'use client';

import { useEffect, useState } from 'react';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, ListTodo, Loader2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
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
import { DateTimePicker } from '@/components/ui/datetime-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ResponsiveModal from '@/components/modals/responsive-modal';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { cn } from '@/lib/utils';
/* Vòng focus lấy từ họ hằng dùng chung thay vì chép lại chuỗi
   `focus-visible:…`. Lấy HAI bản vì khe `ring-offset` được tô bằng màu nền và
   phải khớp đúng nền phía sau: nút trong thân popup đứng trên `ws-surface`
   (`FOCUS_RING_SURFACE`), còn nút trong hàng việc con đứng trên nền hàng
   `ws-surface-alt` (`FOCUS_RING`). Code ngoài `components/daily-report/` đi
   qua barrel `daily-report-utils` — đúng luật ghi trong chính barrel ấy. */
import {
  FOCUS_RING,
  FOCUS_RING_SURFACE,
} from '@/components/daily-report/daily-report-utils';
import { useCreateTask } from '@/hooks/queries/task-queries';
import {
  CreateTaskPayload,
  FileMediaType,
  TaskStatus,
  TaskType,
  type CooperationCategory,
} from '@/types/task.type';
import type { UserReferenceResponse } from '@/types/user.type';
import type { TaskGroupMember } from '@/types/task-group.type';
import {
  COOPERATION_CATEGORY_LABEL_VI,
  DEFAULT_COOPERATION_CATEGORY,
  DEFAULT_TASK_PRIORITY,
  filesFromClipboard,
  getFileMediaType,
  isEditableTarget,
  mergeGroupMembers,
  TASK_PRIORITY_CONFIG,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_CONFIG,
  toMediaItems,
} from '@/components/tasks/task-utils';
import { useTaskFileUpload } from './shared/use-task-file-upload';
import { MediaItem, TaskMediaViewer } from './shared/task-media-viewer';
import { SelectAssigneeModal } from './select-assignee-modal';
import { TaskGroupModal } from './task-group-modal';
import { taskSchema, type TaskFormValues } from './form/create-task-schema';
import { CreateTaskAssignees } from './form/create-task-assignees';
import { CreateTaskAttachments } from './form/create-task-attachments';
import { CreateTaskDates } from './form/create-task-dates';


/**
 * Hai trạng thái cho phép chọn khi TẠO việc.
 *
 * Nhãn, icon và màu lấy từ `TASK_STATUS_CONFIG` — KHÔNG khai lại. Trước đây
 * khối này tự chọn hổ phách cho "Chờ xử lý", trong khi bảng màu quy định trạng
 * thái đó là xám trung tính; hai nguồn màu trạng thái là cách chắc chắn nhất để
 * chúng lệch nhau.
 */
const CREATE_TASK_STATUS_VALUES = [
  TaskStatus.PENDING,
  TaskStatus.IN_PROGRESS,
] as const;

/**
 * Nhãn của MỘT trường — tầng dưới trong hai tầng chữ của popup.
 *
 * `leading-snug` không phải trang trí: `Label` gốc đặt `leading-none`, tức
 * chiều cao dòng đúng bằng cỡ chữ. Nhãn ở đây viết hoa toàn bộ và có dấu
 * ("MỨC ĐỘ ƯU TIÊN"), mà dấu nặng và dấu mũ ăn cả phần trên lẫn phần dưới
 * dòng — tỉ lệ 1.0 là cụt dấu. Thang tối thiểu của repo là 1.15.
 */
const FIELD_LABEL_CLASS =
  'text-ws-micro font-bold uppercase leading-snug text-ws-ink-soft';

/**
 * Cỡ chữ cho ô nhập dựng trên `Input` / `Textarea` của `components/ui/`.
 *
 * Phải viết cỡ chữ HAI LẦN — một bản trần và một bản `md:` — và đó không phải
 * thừa. Chuỗi class nền của hai component ấy mang sẵn `md:text-sm`
 * (`components/ui/input.tsx:11`, `components/ui/textarea.tsx:24`), mà
 * `tailwind-merge` phân nhóm theo CẢ modifier: `md:text-sm` và `text-ws-body`
 * là hai khoá khác nhau nên không loại nhau, và từ 768px trở lên biến thể `md:`
 * thắng. Chỉ đặt `text-ws-body` thì thang token chỉ có hiệu lực trên điện
 * thoại, còn trên desktop — đúng nơi popup này bị nhìn nhiều nhất — chữ vẫn là
 * 14px cũ. Bản `md:text-ws-body` cùng modifier mới đẩy được `md:text-sm` ra.
 *
 * `SelectTrigger` KHÔNG cần cách này: chuỗi nền của nó chỉ có `text-sm` trần
 * (`components/ui/select.tsx:22`), cùng khoá với `text-ws-body` nên bị loại
 * bình thường.
 *
 * (Việc `text-ws-*` được coi là cỡ chữ chứ không phải màu chữ là nhờ khai báo
 * tay trong `lib/utils/index.tsx` — xem ghi chú ở đó.)
 */
const INPUT_TEXT_SIZE_CLASS = 'text-ws-body md:text-ws-body';

/**
 * Một khối trường trong popup tạo việc.
 *
 * Trước đây popup là danh sách phẳng: "Tiêu đề", "Trạng thái", "Việc cần làm"
 * đều là chữ 11px in hoa giống hệt nhau, nên mắt không có chỗ bám và mọi thứ
 * đọc ra cùng một cấp. Tiêu đề khối ở đây cố ý to hơn hẳn nhãn trường (14px
 * đậm, mực đậm so với 11px in hoa, mực nhạt) để tách rõ hai tầng.
 *
 * Đường kẻ nằm ở `border-t` của chính khối chứ không phải một thẻ `<hr>` xen
 * giữa: khối đầu tiên tự bỏ kẻ bằng `first:`, khỏi phải nhớ chỗ nào cần kẻ mỗi
 * lần thêm hay đổi thứ tự khối.
 */
function FormSection({
  title,
  icon: Icon,
  trailing,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  /** Nội dung phụ nằm cuối hàng tiêu đề (bộ đếm, nút phụ). */
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className='space-y-4 border-t border-ws-line-soft pt-4 first:border-t-0 first:pt-0'>
      <div className='flex items-center justify-between gap-2'>
        <h3 className='flex items-center gap-2 text-ws-card-title font-semibold leading-snug text-ws-ink'>
          {Icon ? <Icon className='h-4 w-4 shrink-0 text-ws-ink-faint' /> : null}
          {title}
        </h3>
        {trailing}
      </div>
      {children}
    </section>
  );
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessFormId?: string;
  taskType?: TaskType;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  businessFormId,
  taskType,
}: CreateTaskModalProps) {
  const resolvedType =
    taskType ?? (businessFormId ? TaskType.PARTNER_TASK : TaskType.PERSONAL);
  const { mutate: createTask, isPending } = useCreateTask();
  const [newItemLabel, setNewItemLabel] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<
    UserReferenceResponse[]
  >([]);
  const [isAssigneePickerOpen, setIsAssigneePickerOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);

  /**
   * Việc con nào đang bung hai ô hạn.
   *
   * Khoá là id hàng của `useFieldArray`, KHÔNG phải chỉ số: xoá một hàng ở
   * giữa làm mọi chỉ số phía sau tụt một bậc, và trạng thái "đang bung" sẽ
   * nhảy sang nhầm hàng.
   *
   * Không có khoá = chưa ai chạm vào hàng đó, lúc ấy mặc định do dữ liệu
   * quyết định (xem `isDueOpen` bên dưới).
   */
  const [openDueRows, setOpenDueRows] = useState<Record<string, boolean>>({});
  const setDueRowOpen = (rowId: string, open: boolean) =>
    setOpenDueRows((prev) => ({ ...prev, [rowId]: open }));

  /*
   * Dọn state khi popup ĐÓNG — làm ngay trong render theo khuôn "điều chỉnh
   * state khi render" của React (giữ giá trị lượt trước trong state, so sánh
   * khi render, khác thì `setState` tại chỗ) thay vì trong `useEffect`.
   *
   * Không đổi thứ người dùng thấy: hai state này chỉ nuôi phần thân popup, mà
   * lúc `isOpen` đã là false thì thân popup không còn được vẽ nữa.
   */
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setSelectedAssignees([]);
      // Hàng mới sinh id mới ở lần mở sau, nên khoá cũ chỉ còn là rác.
      setOpenDueRows({});
    }
  }

  // Media Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewerMediaItems, setViewerMediaItems] = useState<MediaItem[]>([]);

  const defaultStartDate = (() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d.toISOString();
  })();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: TaskStatus.IN_PROGRESS,
      priority: DEFAULT_TASK_PRIORITY,
      category: DEFAULT_COOPERATION_CATEGORY,
      startDate: defaultStartDate,
      dueDate: '',
      attachments: [],
      items: [],
    },
  });

  /*
   * Mở popup thì đặt "Bắt đầu" về đúng lúc này, làm tròn xuống phút.
   *
   * Effect này ĐỨNG ĐÂY chứ không ở đầu component như trước: nó đọc `form`, mà
   * `form` là `const` khai báo ngay phía trên. Bản cũ đặt nó TRƯỚC `useForm` nên
   * đang đọc một biến còn trong vùng chết — chạy được chỉ vì thân effect thực
   * thi sau khi render xong, và đó chính là thứ `react-hooks/immutability` báo
   * "accessed before it is declared".
   *
   * Thứ tự chạy so với effect còn lại của component không đổi: nó vẫn đứng
   * trước effect gắn `paste` bên dưới.
   */
  useEffect(() => {
    if (!isOpen) return;
    const d = new Date();
    d.setSeconds(0, 0);
    form.setValue('startDate', d.toISOString());
  }, [isOpen]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const attachments = form.watch('attachments');

  const {
    pendingFiles,
    progress: uploadProgress,
    isUploading: isUploadingMain,
    onDrop,
    getRootProps,
    getInputProps,
    isDragActive,
  } = useTaskFileUpload({
    currentCount: () => (form.getValues('attachments') || []).length,
    onUploaded: (files) => {
      const updated = [...form.getValues('attachments'), ...files];
      form.setValue('attachments', updated, { shouldValidate: true });
      toast.success(`Đã đính kèm ${files.length} tệp`);
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    const onDocPaste = (e: ClipboardEvent) => {
      if (isEditableTarget(document.activeElement)) return;
      const files = filesFromClipboard(e);
      if (files.length === 0) return;
      e.preventDefault();
      onDrop(files);
    };
    document.addEventListener('paste', onDocPaste);
    return () => document.removeEventListener('paste', onDocPaste);
  }, [isOpen, onDrop]);

  const onSubmit: SubmitHandler<TaskFormValues> = (values) => {
    const payload: CreateTaskPayload = {
      title: values.title,
      description: values.description || undefined,
      status: values.status,
      priority: values.priority,
      category: values.category as CooperationCategory,
      startDate: values.startDate
        ? new Date(values.startDate).toISOString()
        : undefined,
      dueDate: values.dueDate
        ? new Date(values.dueDate).toISOString()
        : undefined,
      businessFormId,
      type: resolvedType,
      relatedUserIds: selectedAssignees.map((u) => u.id),
      attachments: values.attachments,
      items: values.items,
    };

    createTask(payload, {
      onSuccess: () => {
        form.reset();
        setSelectedAssignees([]);
        onClose();
      },
    });
  };

  const removeAttachment = (index: number) => {
    const updated = [...attachments];
    updated.splice(index, 1);
    form.setValue('attachments', updated, { shouldValidate: true });
  };

  // Bấm tệp đính kèm: ảnh/video → mở trình xem tại đúng vị trí; tệp khác → mở tab mới.
  const openAttachmentPreview = (
    file: { name: string; url: string },
    index: number,
  ) => {
    const type = getFileMediaType(file.name);
    if (type === FileMediaType.IMAGE || type === FileMediaType.VIDEO) {
      setViewerMediaItems(toMediaItems(attachments));
      setViewerInitialIndex(index);
      setViewerOpen(true);
    } else {
      window.open(file.url, '_blank');
    }
  };

  // Áp nhóm gán nhanh vào danh sách người liên quan (thêm vào / ghi đè), bỏ trùng id.
  const handleApplyGroup = (members: TaskGroupMember[]) => {
    setSelectedAssignees((prev) => mergeGroupMembers(prev, members));
  };

  const addChecklistItem = () => {
    if (!newItemLabel.trim()) return;
    // `shouldFocus: false`: mặc định RHF ném con trỏ vào dòng vừa thêm, nên gõ
    // tiếp là sửa đè lên chính việc con vừa tạo. Xem ghi chú đầy đủ ở
    // `task-edit-form.tsx`.
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
  };

  /** Enter thêm việc con, Shift+Enter xuống dòng — xem `task-edit-form.tsx`. */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    if ((e.nativeEvent as unknown as { isComposing?: boolean }).isComposing)
      return;
    e.preventDefault();
    addChecklistItem();
  };

  // Còn dữ liệu chưa lưu? (form đã sửa / đã chọn người liên quan / đang gõ item mới)
  const hasUnsavedChanges = () =>
    form.formState.isDirty ||
    selectedAssignees.length > 0 ||
    !!newItemLabel.trim();

  // Đóng modal có kiểm tra: còn thay đổi chưa lưu → hỏi xác nhận trước khi bỏ.
  const attemptClose = () => {
    if (isPending || isUploadingMain) return;
    if (hasUnsavedChanges()) {
      setIsConfirmCloseOpen(true);
      return;
    }
    onClose();
  };

  const confirmDiscard = () => {
    setIsConfirmCloseOpen(false);
    onClose();
  };

  return (
    <ResponsiveModal
      className='ws-scope'
      overlayClassName='bg-ws-overlay'
      open={isOpen}
      onOpenChange={(open) => !open && attemptClose()}
      maxWidth='sm:max-w-[600px]'
      /* Hộp thoại này TỰ lo cuộn: nó là một cột flex có tiêu đề và hàng nút
         đứng yên, chỉ phần giữa trượt. Mượn vùng cuộn của `ResponsiveModal`
         thì tiêu đề và hàng nút phải ghim bằng `sticky` vào một scroller
         không thuộc về mình — chạy được nhưng mong manh, và trên điện thoại
         thì ghim vào cái đáy đã tràn khỏi màn hình. */
      scrollable={false}
    >
      <div className='flex max-h-[85vh] flex-col bg-ws-surface'>
        <div className='shrink-0 border-b border-ws-line bg-ws-surface px-6 pt-5 pb-4'>
          <h2 className='text-ws-h1 font-bold leading-snug text-ws-ink'>
            {resolvedType === TaskType.PARTNER_TASK
              ? 'Thêm việc đối tác'
              : 'Tạo việc cá nhân mới'}
          </h2>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            /* `min-h-0` là thứ bắt buộc, không phải làm đẹp: một flex item mặc
               định không co xuống dưới kích thước nội dung, nên thiếu nó thì
               thân form đẩy cả cột dài ra và hàng nút trôi khỏi hộp. */
            className='flex min-h-0 flex-1 flex-col'
          >
            {/* Nhịp dọc: 16px giữa hai KHỐI (`space-y-4` ở đây, cộng `pt-4`
                của mỗi khối thành 32px kèm đường kẻ ở giữa), 16px giữa hai
                TRƯỜNG trong cùng khối, 8px giữa nhãn và ô nhập (`FormItem`).
                Bản cũ để `space-y-6` cho mọi thứ nên trường cùng khối và
                trường khác khối cách nhau y hệt — không đọc ra nhóm nào. */}
            <div className='ws-scroll min-h-0 flex-1 overflow-y-auto p-6'>
              <div className='space-y-4'>
                <FormSection title='Thông tin công việc'>
                  <FormField
                    control={form.control}
                    name='title'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={FIELD_LABEL_CLASS}>
                          Tiêu đề <span className='text-ws-danger'>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Tên công việc...'
                            {...field}
                            /* `leading-snug` viết tường minh vì bỏ cỡ chữ nền
                               đi là bỏ luôn chiều cao dòng đi kèm nó; để rơi
                               về `normal` thì tỉ lệ tụt sát 1.2, quá mỏng cho
                               chữ có dấu. */
                            className={cn(
                              'h-11 leading-snug',
                              INPUT_TEXT_SIZE_CLASS,
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='description'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={FIELD_LABEL_CLASS}>
                          Mô tả
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='Chi tiết công việc...'
                            className={cn(
                              'resize-none h-24 leading-relaxed',
                              INPUT_TEXT_SIZE_CLASS,
                            )}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='category'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={FIELD_LABEL_CLASS}>
                          Loại công việc <span className='text-ws-danger'>*</span>
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className='h-11 text-ws-body'>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className='max-h-[300px]'>
                            {Object.entries(COOPERATION_CATEGORY_LABEL_VI).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
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
                </FormSection>

                <FormSection title='Trạng thái & ưu tiên'>
                  <FormField
                    control={form.control}
                    name='status'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={FIELD_LABEL_CLASS}>
                          Trạng thái
                        </FormLabel>
                        <FormControl>
                          <div className='grid grid-cols-2 gap-2'>
                            {CREATE_TASK_STATUS_VALUES.map((value) => {
                              const visual = TASK_STATUS_CONFIG[value];
                              const Icon = visual.icon;
                              const selected = field.value === value;
                              return (
                                <button
                                  key={value}
                                  type='button'
                                  onClick={() => field.onChange(value)}
                                  aria-pressed={selected}
                                  className={cn(
                                    'flex h-11 items-center justify-center gap-2 rounded-ws-control border text-ws-body font-semibold leading-snug transition-all',
                                    FOCUS_RING_SURFACE,
                                    selected
                                      ? cn(
                                          'border-transparent',
                                          visual.bg,
                                          visual.color,
                                        )
                                      : 'border-ws-line bg-ws-surface-alt text-ws-ink-faint hover:bg-ws-surface-sunken hover:text-ws-ink',
                                  )}
                                >
                                  <Icon className='h-4 w-4' />
                                  {visual.label}
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
                    name='priority'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={FIELD_LABEL_CLASS}>
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
                                  /* Cùng là cụm "chọn một trong nhiều" như hàng
                                     trạng thái ngay trên, nên cũng phải nói ra
                                     lựa chọn nào đang bật — thiếu `aria-pressed`
                                     thì trình đọc màn hình chỉ nghe bốn cái nút
                                     giống nhau. */
                                  aria-pressed={selected}
                                  className={cn(
                                    'flex h-11 items-center justify-center gap-1.5 rounded-ws-control border text-ws-chip font-semibold leading-snug transition-all',
                                    FOCUS_RING_SURFACE,
                                    selected
                                      ? `${cfg.badge} ring-1 ring-inset`
                                      : 'border-ws-line bg-ws-surface text-ws-ink-faint hover:bg-ws-surface-alt',
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
                </FormSection>

                <FormSection title='Thời gian & người liên quan'>
                  <CreateTaskDates form={form} />

                  <CreateTaskAssignees
                    selectedAssignees={selectedAssignees}
                    setSelectedAssignees={setSelectedAssignees}
                    setIsAssigneePickerOpen={setIsAssigneePickerOpen}
                    setIsGroupModalOpen={setIsGroupModalOpen}
                  />
                </FormSection>

                <FormSection
                  title='Việc cần làm'
                  icon={ListTodo}
                  trailing={
                    fields.length > 0 ? (
                      <span className='shrink-0 text-ws-micro font-semibold leading-snug text-ws-ink-faint'>
                        {fields.length} việc
                      </span>
                    ) : null
                  }
                >
                  {/* Vùng cuộn RIÊNG có trần chiều cao.
                      Không có trần thì mỗi việc con lại kéo popup dài thêm, và
                      hàng nút "Lưu công việc" bị đẩy xuống mãi — người thêm mười
                      việc con phải cuộn qua cả danh sách mới bấm lưu được.
                      Trần 17rem ≈ bốn hàng đang thu gọn: đủ thấy danh sách là
                      danh sách, mà phần dưới popup vẫn còn chỗ.
                      `p-1` chừa chỗ cho vòng focus của hàng đầu và hàng cuối —
                      `ring-2` + `ring-offset-1` thò ra 3px, mà mép vùng cuộn
                      thì cắt phăng. */}
                  <div className='ws-scroll max-h-[17rem] space-y-2 overflow-y-auto p-1'>
                    {fields.length === 0 ? (
                      <p className='text-ws-meta leading-snug text-ws-ink-ghost'>
                        Chưa có việc cần làm nào. Thêm ở ô bên dưới.
                      </p>
                    ) : null}
                    {fields.map((item, index) => {
                      const rowId = item.id;
                      const dueRegionId = `create-task-item-due-${rowId}`;
                      /* Hàng ĐÃ CÓ hạn thì luôn mở sẵn. Ẩn một ô đang có dữ
                         liệu là người dùng đọc ra "hạn biến mất" — với họ đó
                         là mất dữ liệu, dù payload vẫn còn nguyên. Trạng thái
                         người dùng tự bấm (`openDueRows[rowId]`) đứng trước,
                         dữ liệu chỉ quyết định khi chưa ai chạm vào hàng. */
                      const hasDue =
                        !!form.watch(`items.${index}.reportDueAt`) ||
                        !!form.watch(`items.${index}.completionDueAt`);
                      const isDueOpen = openDueRows[rowId] ?? hasDue;
                      return (
                        <div
                          key={rowId}
                          className='flex items-start gap-1 group bg-ws-surface-alt p-1.5 rounded-lg'
                        >
                          <FormField
                            control={form.control}
                            name={`items.${index}.done`}
                            render={({ field }) => (
                              /* Ô tick vẽ ra 16px, nhưng vùng bấm phải là 44px
                                 như nút lịch và nút xoá cùng hàng — nó là thứ
                                 duy nhất trong hàng còn dưới sàn chạm.
                                 Bọc bằng `<label>` chứ không phải `<div>`: nhãn
                                 không có `for` thì tự nhận phần tử điều khiển
                                 ĐẦU TIÊN bên trong làm đích, ở đây là thẻ
                                 `<button>` mà Radix Checkbox dựng ra, nên bấm
                                 vào khoảng trống quanh ô tick cũng lật được nó.
                                 Khối 44px này cũng thay luôn `mt-3.5` cũ: tâm
                                 của nó tự trùng tâm hai nút 44px bên phải. */
                              <label className='flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center'>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  /* `<label>` bọc ngoài mở rộng vùng chạm nhưng KHÔNG
                                     đặt tên: nhãn rỗng trả chuỗi rỗng, rồi accname rơi
                                     xuống nội dung của chính nút — cũng rỗng. Không có
                                     dòng này thì trình đọc màn hình đọc ra 'hộp kiểm'
                                     trơ trọi, không biết là của việc con nào.
                                     Đánh số thay vì đọc nhãn việc con: nhãn là ô đang
                                     gõ dở, đọc nó ra sẽ đổi liên tục theo từng phím. */
                                  aria-label={`Đánh dấu đã xong việc cần làm thứ ${index + 1}`}
                                  className='rounded-sm'
                                />
                              </label>
                            )}
                          />
                          <div className='min-w-0 flex-1 flex flex-col'>
                            <FormField
                              control={form.control}
                              name={`items.${index}.label`}
                              render={({ field }) => (
                                <Textarea
                                  {...field}
                                  rows={1}
                                  /* `py-3` chứ không `py-2.5`: hộp cao 44px,
                                     dòng chữ 13.5px × 1.375 ≈ 18,6px, nên đệm
                                     mỗi bên phải ≈ (44 − 18,6) / 2 ≈ 12,7px thì
                                     dòng đầu mới nằm giữa hộp. Với 10px, tâm
                                     dòng chữ cao hơn tâm hai nút 44px bên phải
                                     gần 3px — đủ để icon đọc ra là bị tụt. */
                                  className={cn(
                                    'min-h-11 py-3 leading-snug border-none shadow-none focus-visible:ring-0 bg-transparent w-full resize-none field-sizing-content break-words',
                                    INPUT_TEXT_SIZE_CLASS,
                                  )}
                                />
                              )}
                            />
                            {isDueOpen && (
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
                                        /* Ghim hàng ở trạng thái mở: xoá sạch
                                           hạn mà khối tự cụp lại ngay dưới tay
                                           thì thao tác "đặt lại hạn" đứt giữa
                                           chừng. */
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
                          {/* Hai mốc hạn ẩn theo mặc định.
                              Ba việc con là SÁU ô ngày luôn hiện, chiếm gần hết
                              chiều cao popup, trong khi phần lớn việc con chẳng
                              bao giờ cần hạn. Đưa chúng vào một nút bung: chi
                              phí một cú bấm cho nhóm ít, đổi lấy popup đọc được
                              cho nhóm đông. */}
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
                          {/* Nút xóa phải LUÔN hiện trên thiết bị cảm ứng: ẩn theo
                              `group-hover` nghĩa là trên điện thoại và máy tính
                              bảng không bao giờ thấy nó, tức thêm nhầm một việc
                              con là không xóa được. Từ 768px trở lên (nơi chắc
                              chắn có chuột) mới ẩn cho gọn, và vẫn hiện khi nút
                              nhận focus bàn phím. */}
                          <button
                            type='button'
                            aria-label={`Xóa việc cần làm thứ ${index + 1}`}
                            onClick={() => remove(index)}
                            className={cn(
                              'flex h-11 w-11 shrink-0 items-center justify-center rounded-ws-control text-ws-ink-faint transition-all hover:bg-ws-surface-sunken hover:text-ws-danger md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100',
                              FOCUS_RING,
                            )}
                          >
                            <X className='w-3.5 h-3.5' />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className='flex items-start gap-2'>
                    <Textarea
                      rows={1}
                      placeholder='Thêm việc cần làm mới...'
                      value={newItemLabel}
                      onChange={(e) => setNewItemLabel(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className={cn(
                        'min-h-11 py-3 leading-snug bg-ws-surface-alt flex-1 min-w-0 resize-none field-sizing-content break-words',
                        INPUT_TEXT_SIZE_CLASS,
                      )}
                    />
                    <Button
                      type='button'
                      variant='outline'
                      className='h-11 shrink-0 rounded-ws-control px-4 text-ws-chip font-bold'
                      onClick={addChecklistItem}
                    >
                      Thêm
                    </Button>
                  </div>
                </FormSection>

                <CreateTaskAttachments
                  attachments={attachments}
                  removeAttachment={removeAttachment}
                  openAttachmentPreview={openAttachmentPreview}
                  pendingFiles={pendingFiles}
                  uploadProgress={uploadProgress}
                  isDragActive={isDragActive}
                  getRootProps={getRootProps}
                  getInputProps={getInputProps}
                />
              </div>
            </div>

            {/* Hàng nút là ANH EM `shrink-0` của vùng cuộn trong cùng một cột
                flex, nên nó luôn nằm đúng đáy hộp thoại — không cần `sticky`,
                và cũng không còn nền nửa trong suốt để chữ bên dưới trồi lên.
                Nền đặc `bg-ws-surface` + viền trên là ranh giới rõ ràng giữa
                "nội dung còn cuộn tiếp" và "chỗ quyết định". */}
            <div className='shrink-0 border-t border-ws-line bg-ws-surface px-6 py-4 flex justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={attemptClose}
                disabled={isPending || isUploadingMain}
                className='h-11 rounded-ws-control px-5 text-ws-body font-semibold text-ws-ink-faint'
              >
                Hủy
              </Button>
              <Button
                type='submit'
                className='h-11 rounded-ws-control bg-ws-solid px-6 text-ws-body font-semibold text-ws-solid-ink shadow-ws-rest hover:opacity-90'
                disabled={isPending || isUploadingMain}
              >
                {isPending ? (
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                ) : (
                  'Lưu công việc'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <TaskMediaViewer
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        mediaItems={viewerMediaItems}
        initialIndex={viewerInitialIndex}
      />

      <SelectAssigneeModal
        isOpen={isAssigneePickerOpen}
        onClose={() => setIsAssigneePickerOpen(false)}
        onSelect={setSelectedAssignees}
        selectedUsers={selectedAssignees}
      />

      <TaskGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onApply={handleApplyGroup}
      />

      <ConfirmationDialog
        isOpen={isConfirmCloseOpen}
        onClose={() => setIsConfirmCloseOpen(false)}
        onConfirm={confirmDiscard}
        title='Thoát mà không lưu?'
        description='Bạn có thay đổi chưa lưu. Nếu thoát bây giờ, công việc sẽ không được tạo.'
        confirmText='Thoát, không lưu'
        cancelText='Ở lại'
        variant='destructive'
      />
    </ResponsiveModal>
  );
}
