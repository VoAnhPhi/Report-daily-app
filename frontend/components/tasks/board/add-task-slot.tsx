'use client';

import { Plus } from 'lucide-react';

/**
 * Ô thêm việc ở đáy cột — lối DUY NHẤT để thêm việc từ trong một cột.
 *
 * Chỉ dấu `+`, không chữ: ô nằm ngay dưới danh sách thẻ nên ngữ cảnh đã nói rõ
 * nó thêm gì. Vì là nút chỉ có icon nên bắt buộc có `aria-label` — trình đọc
 * màn hình không đọc được hình dạng.
 */
export function AddTaskSlot({ onAddTask }: { onAddTask: () => void }) {
  return (
    <button
      type='button'
      onClick={onAddTask}
      title='Thêm việc'
      aria-label='Thêm việc'
      className='flex h-[42px] w-full items-center justify-center rounded-xl border border-dashed border-ws-line-strong text-ws-ink-faint transition-colors hover:bg-ws-surface-alt hover:text-ws-ink'
    >
      <Plus className='h-4 w-4' />
    </button>
  );
}
