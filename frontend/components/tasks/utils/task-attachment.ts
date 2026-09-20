/**
 * Tệp đính kèm của việc: trần số tệp, phân loại media theo tên để chọn cách xem
 * trước, chuyển sang dạng `TaskMediaViewer` nhận, và đường dán từ clipboard
 * (bỏ qua khi con trỏ đang ở trong một ô nhập).
 */

import type { ClipboardEvent as ReactClipboardEvent } from 'react';
import { FileMediaType } from '@/types/task.type';
import type { MediaItem } from '../shared/task-media-viewer';

/** Số tệp đính kèm tối đa cho mỗi công việc. */
export const MAX_TASK_ATTACHMENTS = 20;

/** Phân loại tệp theo tên (và MIME nếu có) để chọn cách hiển thị xem trước. */
export function getFileMediaType(name: string, mime?: string): FileMediaType {
  if (
    mime?.startsWith('image/') ||
    /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(name)
  )
    return FileMediaType.IMAGE;
  if (mime?.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/i.test(name))
    return FileMediaType.VIDEO;
  return FileMediaType.FILE;
}

/**
 * Chuyển danh sách tệp đính kèm ({name,url}) sang định dạng cho TaskMediaViewer.
 * Gom đoạn map lặp ở nhiều modal (create / detail / edit).
 */
export const toMediaItems = (
  files: { name: string; url: string }[],
): MediaItem[] =>
  files.map((f) => ({
    url: f.url,
    name: f.name,
    type: getFileMediaType(f.name) as MediaItem['type'],
  }));

/** Đang gõ trong ô nhập/select/contentEditable → đừng cướp paste của nó. */
export const isEditableTarget = (el: Element | null): boolean =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLSelectElement ||
  (el instanceof HTMLElement && el.isContentEditable);

/** Lấy mọi tệp (tài liệu/hình ảnh) từ sự kiện dán clipboard. */
export const filesFromClipboard = (
  e: ClipboardEvent | ReactClipboardEvent,
): File[] =>
  Array.from(e.clipboardData?.items ?? [])
    .map((it) => it.getAsFile())
    .filter((f): f is File => !!f);
