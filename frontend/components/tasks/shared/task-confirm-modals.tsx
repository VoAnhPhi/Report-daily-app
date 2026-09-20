'use client';

import { Loader2 } from 'lucide-react';
import ResponsiveModal from '@/components/modals/responsive-modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/** Modal xác nhận rời việc chung + nhập lý do (không bắt buộc). */
export function LeaveTaskModal({
  isOpen,
  onCancel,
  taskTitle,
  reason,
  onReasonChange,
  isLeaving,
  onConfirm,
}: {
  isOpen: boolean;
  /** Đóng modal + xoá lý do đã gõ. */
  onCancel: () => void;
  taskTitle: string;
  reason: string;
  onReasonChange: (value: string) => void;
  isLeaving: boolean;
  onConfirm: () => void;
}) {
  return (
    <ResponsiveModal
      className='ws-scope'
      overlayClassName='bg-ws-overlay'
      open={isOpen}
      onOpenChange={(o) => !o && !isLeaving && onCancel()}
      maxWidth='sm:max-w-[440px]'
      scrollable={false}
    >
      <div className='p-6 space-y-4'>
        <div>
          <h2 className='text-lg font-bold text-zinc-900'>
            Rời khỏi công việc
          </h2>
          <p className='text-sm text-zinc-500 mt-1'>
            Bạn sẽ bị gỡ khỏi danh sách người hỗ trợ của công việc &quot;
            {taskTitle}&quot;.
          </p>
        </div>
        <div className='space-y-2'>
          <label className='text-[11px] font-bold text-gray-700 uppercase'>
            Lý do{' '}
            <span className='text-zinc-400 font-medium normal-case'>
              (không bắt buộc)
            </span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder='Nhập lý do rời...'
            className='h-20 resize-none text-sm'
            maxLength={500}
          />
        </div>
        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-9 px-4 text-xs font-bold text-zinc-500'
            disabled={isLeaving}
            onClick={onCancel}
          >
            Hủy bỏ
          </Button>
          <Button
            type='button'
            size='sm'
            className='h-9 px-6 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl'
            disabled={isLeaving}
            onClick={onConfirm}
          >
            {isLeaving ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              'Rời việc'
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}

/** Modal xác nhận tham gia việc chung — hiện khi người vừa được tag mở việc lần đầu. */
export function JoinTaskModal({
  isOpen,
  onDismiss,
  isAccepting,
  isLeaving,
  onDecline,
  onAccept,
}: {
  isOpen: boolean;
  /** Đóng mà chưa quyết (bỏ qua lần này). */
  onDismiss: () => void;
  isAccepting: boolean;
  isLeaving: boolean;
  onDecline: () => void;
  onAccept: () => void;
}) {
  return (
    <ResponsiveModal
      className='ws-scope'
      overlayClassName='bg-ws-overlay'
      open={isOpen}
      onOpenChange={(o) => {
        if (!o && !isAccepting && !isLeaving) onDismiss();
      }}
      maxWidth='sm:max-w-[440px]'
      scrollable={false}
    >
      <div className='p-6 space-y-4'>
        <div>
          <h2 className='text-lg font-bold text-zinc-900'>
            Tham gia công việc?
          </h2>
          <p className='text-sm text-zinc-500 mt-1'>
            Bạn được mời tham gia công việc này. Xác nhận để tham gia, hoặc từ
            chối để rời khỏi danh sách người hỗ trợ.
          </p>
        </div>
        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-9 px-4 text-xs font-bold text-zinc-500'
            disabled={isAccepting || isLeaving}
            onClick={onDecline}
          >
            {isLeaving ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              'Từ chối'
            )}
          </Button>
          <Button
            type='button'
            size='sm'
            className='h-9 px-6 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl'
            disabled={isAccepting || isLeaving}
            onClick={onAccept}
          >
            {isAccepting ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              'Xác nhận vào việc'
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
