'use client';

import { Download, Paperclip, X } from 'lucide-react';
import { FormLabel } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { FileMediaType } from '@/types/task.type';
import {
  getFileMediaType,
  MAX_TASK_ATTACHMENTS,
} from '@/components/tasks/task-utils';
import { FileThumbnail } from '../shared/file-thumbnail';
import { PendingFilePreview } from '../shared/pending-file-preview';
import type { MediaItem } from '../shared/task-media-viewer';
import type { useTaskFileUpload } from '../shared/use-task-file-upload';

type UploadBag = ReturnType<typeof useTaskFileUpload>;

interface TaskFormAttachmentsProps {
  /** Danh sách đính kèm đang có trong form (đã `form.watch`). */
  watchedAttachments: { name: string; url: string }[];
  removeAttachment: (index: number) => void;
  /** Mở trình xem ảnh/video toàn màn hình. */
  onOpenViewer: (items: MediaItem[], index: number) => void;
  pendingFiles: File[];
  uploadProgress: number;
  isDragActive: boolean;
  getRootProps: UploadBag['getRootProps'];
  getInputProps: UploadBag['getInputProps'];
}

/**
 * Khối tài liệu đính kèm của form sửa việc.
 *
 * Hook `useTaskFileUpload` KHÔNG gọi ở đây — nó ở modal cha vì còn phục vụ việc
 * dán tệp ngoài ô nhập. Khối này chỉ nhận lại phần cần để vẽ.
 */
export function TaskFormAttachments({
  watchedAttachments,
  removeAttachment,
  onOpenViewer,
  pendingFiles,
  uploadProgress,
  isDragActive,
  getRootProps,
  getInputProps,
}: TaskFormAttachmentsProps) {
  return (
    <div className='space-y-4 pt-4 border-t border-gray-100'>
      <FormLabel className='text-[11px] font-bold text-gray-700 uppercase'>
        Tài liệu đính kèm{' '}
        <span className='text-zinc-400 font-bold normal-case'>
          ({watchedAttachments.length}/{MAX_TASK_ATTACHMENTS})
        </span>
      </FormLabel>
      {watchedAttachments.length > 0 && (
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
          {watchedAttachments.map((file, index) => {
            const type = getFileMediaType(file.name);
            return (
              <div
                key={index}
                className='group border border-gray-100 rounded-xl p-2 flex items-center gap-2 bg-zinc-50/50 hover:bg-white hover:border-zinc-200 transition-all shadow-xs'
              >
                <button
                  type='button'
                  onClick={() => {
                    if (
                      type === FileMediaType.IMAGE ||
                      type === FileMediaType.VIDEO
                    ) {
                      onOpenViewer(
                        watchedAttachments.map((a) => ({
                          url: a.url,
                          name: a.name,
                          type: getFileMediaType(
                            a.name,
                          ) as MediaItem['type'],
                        })),
                        index,
                      );
                    } else {
                      window.open(file.url, '_blank');
                    }
                  }}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-xs overflow-hidden bg-zinc-100 border border-zinc-200',
                    type === FileMediaType.IMAGE ||
                      type === FileMediaType.VIDEO
                      ? 'cursor-pointer'
                      : 'text-gray-500 cursor-pointer',
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
                    className='text-[9px] text-zinc-500 hover:text-black flex items-center gap-1 mt-0.5 font-bold uppercase'
                  >
                    <Download className='w-2.5 h-2.5' /> Tải về
                  </a>
                </div>
                <button
                  type='button'
                  onClick={() => removeAttachment(index)}
                  className='p-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-red-600 lg:text-current hover:text-red-600 transition-opacity'
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
            <PendingFilePreview
              key={i}
              file={file}
              progress={uploadProgress}
            />
          ))}
        </div>
      )}
      <div
        {...getRootProps()}
        className={cn(
          /* `p-6`, không phải `p-8`: hộp con không được đệm dày hơn
             hộp chứa nó — thân form cũng chỉ `p-6`. Vùng kéo thả 32px
             đứng cạnh danh sách việc con giãn 8px là chỗ chênh lệch
             lớn nhất của cả popup. */
          'border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer',
          isDragActive
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-gray-200 bg-zinc-50/30 hover:bg-white hover:border-zinc-300',
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
              ? 'Thả tệp vào đây'
              : 'Kéo thả hoặc nhấn để chọn tệp'}
          </p>
        </div>
      </div>
    </div>
  );
}
