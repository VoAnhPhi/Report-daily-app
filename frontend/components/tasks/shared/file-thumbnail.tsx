'use client';

import { FileIcon, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileMediaType } from '@/types/task.type';

interface FileThumbnailProps {
  /** Loại tệp (ảnh/video/khác) — quyết định nhánh hiển thị. */
  type: FileMediaType;
  url: string;
  name: string;
  /** Kích thước/màu nút Play phủ lên video (mặc định nhỏ, trắng). */
  playClassName?: string;
  /** Kích thước/màu icon tệp thường (mặc định w-4 h-4, xám). */
  fileIconClassName?: string;
}

/**
 * Nội dung thu nhỏ (fill `w-full h-full` của ô bọc bên ngoài) cho 3 nhánh:
 * ảnh → <img>, video → <video> + nút Play phủ giữa, còn lại → icon tệp.
 * Ô bọc (kích thước/viền/onClick) do nơi gọi tự lo — đây chỉ là phần ruột.
 */
export function FileThumbnail({
  type,
  url,
  name,
  playClassName,
  fileIconClassName,
}: FileThumbnailProps) {
  if (type === FileMediaType.IMAGE) {
    return (
      <img src={url} alt={name} className='w-full h-full object-cover' />
    );
  }
  if (type === FileMediaType.VIDEO) {
    return (
      <div className='relative w-full h-full'>
        <video
          src={`${url}#t=0.001`}
          className='w-full h-full object-cover'
          muted
          playsInline
          preload='metadata'
        />
        <Play
          className={cn(
            'absolute inset-0 m-auto w-3 h-3 text-white fill-white',
            playClassName,
          )}
        />
      </div>
    );
  }
  return <FileIcon className={cn('w-4 h-4 text-zinc-400', fileIconClassName)} />;
}
