'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { useUploadThing } from '@/lib/uploadthing';
import { MAX_TASK_ATTACHMENTS } from '@/components/tasks/task-utils';

interface UseTaskFileUploadOptions {
  /** Số tệp đã có (để kiểm tra trần MAX_TASK_ATTACHMENTS). */
  currentCount: () => number;
  /** Gọi khi upload xong — caller tự gắn vào form/state + toast riêng. */
  onUploaded: (files: { name: string; url: string }[]) => void;
}

/**
 * Gom boilerplate upload tệp đính kèm cho các modal Công việc:
 * useUploadThing + dropzone + danh sách đang chờ + tiến độ + chặn quá trần.
 * Phần side-effect khác nhau (gắn form / evidence / comment, toast) để ở `onUploaded`.
 */
export function useTaskFileUpload({
  currentCount,
  onUploaded,
}: UseTaskFileUploadOptions) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);

  const { startUpload, isUploading } = useUploadThing('attachmentUploader', {
    onUploadProgress: (p) => setProgress(p),
    onClientUploadComplete: (res) => {
      setProgress(0);
      setPendingFiles([]);
      if (res && res.length > 0) {
        onUploaded(res.map((f) => ({ name: f.name, url: f.ufsUrl })));
      }
    },
    onUploadError: (error) => {
      setProgress(0);
      setPendingFiles([]);
      toast.error(`Lỗi tải lên: ${error.message}`);
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const remaining =
        MAX_TASK_ATTACHMENTS - (currentCount() + pendingFiles.length);
      if (remaining <= 0) {
        toast.error(
          `Tối đa ${MAX_TASK_ATTACHMENTS} tệp đính kèm cho mỗi công việc`,
        );
        return;
      }
      const allowed = acceptedFiles.slice(0, remaining);
      if (allowed.length < acceptedFiles.length) {
        toast.error(
          `Chỉ thêm được ${remaining} tệp nữa (tối đa ${MAX_TASK_ATTACHMENTS})`,
        );
      }
      setPendingFiles((prev) => [...prev, ...allowed]);
      startUpload(allowed);
    },
    [startUpload, pendingFiles, currentCount],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return {
    pendingFiles,
    progress,
    isUploading,
    onDrop,
    getRootProps,
    getInputProps,
    isDragActive,
  };
}
