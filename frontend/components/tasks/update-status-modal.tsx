'use client';

import {
  TaskStatus,
  UpdateTaskStatusDto,
  FileMediaType,
} from '@/types/task.type';
import {
  getFileMediaType,
  TASK_STATUS_CONFIG,
} from '@/components/tasks/task-utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useUpdateTaskStatus } from '@/hooks/queries/task-queries';
import { Loader2, X, Paperclip, Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { attachmentSchema } from './task-schema-parts';
import ResponsiveModal from '@/components/modals/responsive-modal';
import { cn } from '@/lib/utils';
import { PendingFilePreview } from './shared/pending-file-preview';
import { useTaskFileUpload } from './shared/use-task-file-upload';
import { FileThumbnail } from './shared/file-thumbnail';
import { TaskMediaViewer, MediaItem } from './shared/task-media-viewer';

const statusSchema = z.object({
  message: z.string().optional(),
  evidence: z.array(attachmentSchema).optional(),
});

type StatusFormValues = z.infer<typeof statusSchema>;

interface UpdateStatusModalProps {
  taskId: string | null;
  newStatus: TaskStatus | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateStatusModal({
  taskId,
  newStatus,
  isOpen,
  onClose,
}: UpdateStatusModalProps) {
  const { mutateAsync: updateStatus, isPending } = useUpdateTaskStatus();

  // Media Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewerMediaItems, setViewerMediaItems] = useState<MediaItem[]>([]);

  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      message: '',
      evidence: [],
    },
  });

  const evidence = form.watch('evidence') ?? [];

  const {
    pendingFiles,
    progress: uploadProgress,
    isUploading,
    getRootProps,
    getInputProps,
    isDragActive,
  } = useTaskFileUpload({
    currentCount: () => (form.getValues('evidence') ?? []).length,
    onUploaded: (files) => {
      const updated = [...(form.getValues('evidence') ?? []), ...files];
      form.setValue('evidence', updated, { shouldValidate: true });
      toast.success(`Đã đính kèm ${files.length} minh chứng`);
    },
  });

  const statusConfig = TASK_STATUS_CONFIG;

  const onSubmit: SubmitHandler<StatusFormValues> = async (values) => {
    if (!taskId || !newStatus) return;

    try {
      const payload: UpdateTaskStatusDto = {
        status: newStatus,
        message: values.message || undefined,
        evidence: values.evidence,
      };

      await updateStatus({ id: taskId, payload });
      form.reset();
      onClose();
    } catch {
      // Lỗi đã được hook xử lý và hiện toast.
    }
  };

  const removeEvidence = (index: number) => {
    const updated = [...evidence];
    updated.splice(index, 1);
    form.setValue('evidence', updated, { shouldValidate: true });
  };

  if (!newStatus) return null;
  const config = statusConfig[newStatus];

  return (
    <ResponsiveModal
      className='ws-scope'
      overlayClassName='bg-ws-overlay'
      open={isOpen}
      onOpenChange={(open) => !open && !isPending && !isUploading && onClose()}
      maxWidth='sm:max-w-[500px]'
      scrollable={false}
    >
      <div className='flex flex-col max-h-[90vh] overflow-hidden bg-white dark:bg-slate-800'>
        <div className='p-6 border-b border-zinc-100 shrink-0'>
          <div className='flex items-center gap-3'>
            <div
              className={cn(
                'p-2 rounded-xl bg-zinc-50 border border-zinc-100',
                config.color,
              )}
            >
              <config.icon className='w-5 h-5 stroke-[2]' />
            </div>
            {/* Một dòng tiêu đề, không hai — hộp thoại này bật rất thường
                xuyên, mỗi dòng thừa là một nhịp đọc thừa. */}
            <h2 className='text-[15px] font-semibold tracking-tight text-ws-ink'>
              Chuyển sang{' '}
              <span className={cn('font-bold', config.color)}>
                {config.label}
              </span>
            </h2>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col flex-1 min-h-0'
          >
            <div className='flex-1 overflow-y-auto p-6 space-y-6 ws-scroll'>
              <FormField
                control={form.control}
                name='message'
                render={({ field }) => (
                  <FormItem className='space-y-2'>
                    <FormLabel className='text-[11px] font-bold text-gray-700 uppercase'>
                      Ghi chú công việc
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Mô tả kết quả thực hiện...'
                        className='resize-none h-24 text-sm bg-zinc-50/50 border-zinc-200 focus:bg-white transition-all rounded-xl p-3'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='space-y-4'>
                {/* Bỏ dòng "n FILE ĐÃ CHỌN": danh sách tệp ngay bên dưới đã
                    nói đúng điều đó, đếm lại chỉ là nhiễu. */}
                <FormLabel className='text-[11px] font-bold uppercase text-ws-ink-soft'>
                  Bằng chứng thực hiện
                </FormLabel>

                {/* 1. COMPLETED EVIDENCE */}
                {evidence.length > 0 && (
                  <div className='grid grid-cols-1 gap-2'>
                    {evidence.map((file, index) => {
                      const type = getFileMediaType(file.name);
                      return (
                        <div
                          key={index}
                          className='group border border-emerald-100 rounded-xl p-2 flex items-center gap-2 bg-emerald-50/30 hover:bg-white hover:border-emerald-200 transition-all shadow-xs'
                        >
                          <button
                            type='button'
                            onClick={() => {
                              if (
                                type === FileMediaType.IMAGE ||
                                type === FileMediaType.VIDEO
                              ) {
                                setViewerMediaItems(
                                  evidence.map((a) => ({
                                    url: a.url,
                                    name: a.name,
                                    type: getFileMediaType(a.name) as any,
                                  })),
                                );
                                setViewerInitialIndex(index);
                                setViewerOpen(true);
                              } else {
                                window.open(file.url, '_blank');
                              }
                            }}
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-xs overflow-hidden bg-white border border-emerald-100',
                              type === FileMediaType.IMAGE ||
                                type === FileMediaType.VIDEO
                                ? 'cursor-pointer'
                                : 'text-emerald-500 cursor-pointer',
                            )}
                          >
                            <FileThumbnail
                              type={type}
                              url={file.url}
                              name={file.name}
                            />
                          </button>
                          <div className='flex-1 min-w-0'>
                            <p className='text-[10px] font-bold text-gray-700 truncate'>
                              {file.name}
                            </p>
                            <a
                              href={file.url}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-[9px] text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-0.5 font-bold uppercase'
                            >
                              <Download className='w-2.5 h-2.5' /> Xem chi tiết
                            </a>
                          </div>
                          <button
                            type='button'
                            onClick={() => removeEvidence(index)}
                            className='p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity'
                          >
                            <X className='w-3.5 h-3.5' />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. PENDING UPLOADS */}
                {pendingFiles.length > 0 && (
                  <div className='space-y-2 animate-in fade-in duration-300'>
                    {pendingFiles.map((file, i) => (
                      <PendingFilePreview
                        key={i}
                        file={file}
                        progress={uploadProgress}
                      />
                    ))}
                  </div>
                )}

                {/* 3. DROPZONE */}
                <div
                  {...getRootProps()}
                  className={cn(
                    // Vùng thả thu từ 140px xuống 96px — cả hai trường đều tuỳ
                    // chọn nên không đáng chiếm nửa hộp thoại.
                    'border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer min-h-[96px]',
                    isDragActive
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-zinc-200 bg-zinc-50/30 hover:bg-white hover:border-zinc-300',
                  )}
                >
                  <input {...getInputProps()} />
                  <div
                    className={cn(
                      'p-3 rounded-full bg-white shadow-sm border border-zinc-100 transition-transform',
                      isDragActive && 'scale-110',
                    )}
                  >
                    <Paperclip
                      className={cn(
                        'w-5 h-5 transition-colors',
                        isDragActive ? 'text-blue-600' : 'text-zinc-400',
                      )}
                    />
                  </div>
                  <div className='text-center'>
                    <p className='text-[11px] font-bold text-zinc-500 uppercase tracking-widest'>
                      {isDragActive
                        ? 'Thả minh chứng vào đây'
                        : 'Tải lên tài liệu minh chứng'}
                    </p>
                  </div>
                </div>

                {form.formState.errors.evidence && (
                  <p className='text-[10px] font-bold text-rose-500 px-1'>
                    {form.formState.errors.evidence.message}
                  </p>
                )}
              </div>
            </div>

            <div className='p-6 border-t bg-zinc-50/50 shrink-0 flex items-center justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]'>
              <Button
                type='button'
                variant='outline'
                onClick={onClose}
                disabled={isPending || isUploading}
                className='h-9 px-4 text-xs font-bold text-zinc-500'
              >
                HỦY BỎ
              </Button>
              <Button
                type='submit'
                disabled={isPending || isUploading}
                className='h-9 px-6 bg-zinc-900 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 transition-all'
              >
                {isPending ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  'XÁC NHẬN'
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
    </ResponsiveModal>
  );
}
