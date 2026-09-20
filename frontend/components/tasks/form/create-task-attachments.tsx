'use client';

import { Download, Loader2, Paperclip, X } from 'lucide-react';
import { FormLabel } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { FileMediaType } from '@/types/task.type';
import {
  getFileMediaType,
  MAX_TASK_ATTACHMENTS,
} from '@/components/tasks/task-utils';
import { FileThumbnail } from '../shared/file-thumbnail';
import type { useTaskFileUpload } from '../shared/use-task-file-upload';

type UploadBag = ReturnType<typeof useTaskFileUpload>;

interface CreateTaskAttachmentsProps {
  attachments?: { name: string; url: string }[];
  removeAttachment: (index: number) => void;
  /** Mở trình xem ảnh/video cho một tệp đã tải lên. */
  openAttachmentPreview: (
    file: { name: string; url: string },
    index: number,
  ) => void;
  pendingFiles: File[];
  uploadProgress: number;
  isDragActive: boolean;
  getRootProps: UploadBag['getRootProps'];
  getInputProps: UploadBag['getInputProps'];
}

/**
 * Khối tài liệu đính kèm của form TẠO việc.
 *
 * Hook `useTaskFileUpload` ở modal cha vì còn phục vụ việc dán tệp ngoài ô nhập;
 * khối này chỉ nhận lại phần cần để vẽ.
 */
export function CreateTaskAttachments({
  attachments,
  removeAttachment,
  openAttachmentPreview,
  pendingFiles,
  uploadProgress,
  isDragActive,
  getRootProps,
  getInputProps,
}: CreateTaskAttachmentsProps) {
  return (
<div className='space-y-4 pt-4 border-t border-ws-line-soft'>
  <FormLabel className='text-[11px] font-bold text-ws-ink-soft uppercase'>
    Tài liệu đính kèm{' '}
    <span className='text-ws-ink-ghost font-bold normal-case'>
      ({attachments?.length ?? 0}/{MAX_TASK_ATTACHMENTS})
    </span>
  </FormLabel>

  {attachments.length > 0 && (
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
      {attachments.map((file, index) => {
        const type = getFileMediaType(file.name);
        return (
          <div
            key={index}
            className='group border border-ws-line-soft rounded-xl p-2 flex items-center gap-2 bg-ws-surface-alt/50 hover:bg-ws-surface hover:border-ws-line transition-all shadow-xs'
          >
            <button
              type='button'
              onClick={() => openAttachmentPreview(file, index)}
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-xs overflow-hidden bg-ws-surface-sunken border border-ws-line',
                type === FileMediaType.IMAGE ||
                  type === FileMediaType.VIDEO
                  ? 'cursor-pointer'
                  : 'text-ws-ink-faint cursor-pointer',
              )}
            >
              <FileThumbnail
                type={type}
                url={file.url}
                name={file.name}
              />
            </button>
            <div className='flex-1 min-w-0'>
              <p className='text-[10px] font-bold text-ws-ink-soft truncate'>
                {file.name}
              </p>
              <a
                href={file.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-[9px] text-ws-ink-faint hover:text-ws-ink flex items-center gap-1 mt-0.5 font-bold uppercase'
              >
                <Download className='w-2.5 h-2.5' /> Tải về
              </a>
            </div>
            <button
              type='button'
              onClick={() => removeAttachment(index)}
              className='p-1.5 opacity-0 group-hover:opacity-100 hover:text-ws-danger transition-opacity'
            >
              <X className='w-3.5 h-3.5' />
            </button>
          </div>
        );
      })}
    </div>
  )}

  {pendingFiles.length > 0 && (
    <div className='space-y-2 animate-in fade-in duration-300'>
      {pendingFiles.map((file, i) => (
        <div
          key={i}
          className='flex flex-col gap-2 p-3 bg-ws-progress-bg border border-ws-progress-edge/25 rounded-xl shadow-xs'
        >
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-2 flex-1 min-w-0'>
              <Loader2 className='w-3.5 h-3.5 text-ws-progress-fg animate-spin shrink-0' />
              <span className='text-[10px] font-bold text-ws-progress-fg truncate uppercase tracking-tight'>
                {file.name}
              </span>
            </div>
            <span className='text-[10px] font-black text-ws-progress-fg shrink-0'>
              {uploadProgress}%
            </span>
          </div>
          <Progress
            value={uploadProgress}
            className='h-1 bg-ws-progress-bg'
          />
        </div>
      ))}
    </div>
  )}

  <div
    {...getRootProps()}
    className={cn(
      'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer',
      isDragActive
        ? 'border-ws-accent bg-ws-accent-bg'
        : 'border-ws-line bg-ws-surface-alt/30 hover:bg-ws-surface hover:border-ws-line-strong',
    )}
  >
    <input {...getInputProps()} />
    <div
      className={cn(
        'p-3 rounded-full bg-ws-surface shadow-sm border border-ws-line-soft transition-transform',
        isDragActive && 'scale-110',
      )}
    >
      <Paperclip
        className={cn(
          'w-5 h-5 transition-colors',
          isDragActive ? 'text-ws-accent' : 'text-ws-ink-ghost',
        )}
      />
    </div>
    <div className='text-center'>
      <p className='text-[11px] font-bold text-ws-ink-faint uppercase tracking-widest'>
        {isDragActive
          ? 'Thả tệp vào đây'
          : 'Kéo thả hoặc nhấn để chọn tệp'}
      </p>
    </div>
  </div>
</div>
  );
}
