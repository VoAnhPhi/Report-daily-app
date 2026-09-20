'use client';

import { useEffect, useState } from 'react';
import { Play, FileIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { FileMediaType } from '@/types/task.type';
import { getFileMediaType } from '@/components/tasks/task-utils';

interface PendingFilePreviewProps {
  file: File;
  /** % tiến độ tải lên (0–100). */
  progress: number;
}

/** Thẻ xem trước tệp đang tải lên kèm thanh tiến độ. Dùng chung cho các modal công việc. */
export function PendingFilePreview({
  file,
  progress,
}: PendingFilePreviewProps) {
  const type = getFileMediaType(file.name, file.type);
  const [preview, setPreview] = useState<string>('');

  /*
   * `react-hooks/set-state-in-effect` báo ở đây là dương tính giả: đây đúng là
   * việc mà effect sinh ra để làm — đồng bộ với một hệ thống BÊN NGOÀI React,
   * cụ thể là sổ blob URL của trình duyệt.
   *
   * Không tính thẳng khi render được: chuỗi URL chỉ tồn tại SAU khi gọi
   * `URL.createObjectURL`, và bắt buộc phải trả lại bằng `URL.revokeObjectURL`
   * trong hàm dọn. Tạo nó lúc render là rò một blob mỗi lượt render (và React
   * gọi thân component hai lần ở chế độ Strict).
   */
  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lý do ở chú thích ngay trên
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className='flex flex-col gap-2 p-3 bg-blue-50/30 border border-blue-100 rounded-xl shadow-xs'>
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 rounded-lg bg-white border border-blue-100 overflow-hidden flex items-center justify-center shrink-0'>
          {type === FileMediaType.IMAGE ? (
            <img
              src={preview || undefined}
              alt='preview'
              className='w-full h-full object-cover'
            />
          ) : type === FileMediaType.VIDEO ? (
            <div className='relative w-full h-full'>
              <video
                src={preview || undefined}
                className='w-full h-full object-cover'
              />
              <Play className='absolute inset-0 m-auto w-3 h-3 text-blue-500 fill-blue-500' />
            </div>
          ) : (
            <FileIcon className='w-4 h-4 text-blue-400' />
          )}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between mb-1'>
            <span className='text-[10px] font-bold text-blue-700 truncate uppercase tracking-tight'>
              {file.name}
            </span>
            <span className='text-[10px] font-black text-blue-600'>
              {progress}%
            </span>
          </div>
          <Progress value={progress} className='h-1 bg-blue-100' />
        </div>
      </div>
    </div>
  );
}
