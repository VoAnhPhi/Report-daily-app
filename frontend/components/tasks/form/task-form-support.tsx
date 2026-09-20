'use client';

import { Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { TaskAssignmentStatus } from '@/types/task.type';
import type { UserReferenceResponse } from '@/types/user.type';

/** Sắc thái hiển thị chip người hỗ trợ trong form sửa. */
enum SupportTone {
  /** Vừa chọn, chưa lưu. */
  New = 'new',
  /** Chờ tham gia. */
  Pending = 'pending',
  /** Đã tham gia. */
  Accepted = 'accepted',
}

/** Class màu theo từng sắc thái chip người hỗ trợ. */
const SUPPORT_TONE_STYLES: Record<
  SupportTone,
  { chip: string; avatar: string; name: string; remove: string }
> = {
  [SupportTone.New]: {
    chip: 'bg-sky-50 border-sky-200',
    avatar: 'bg-sky-200 text-sky-800',
    name: 'text-sky-700',
    remove: 'text-sky-500',
  },
  [SupportTone.Pending]: {
    chip: 'bg-amber-50 border-amber-200',
    avatar: 'bg-amber-200 text-amber-800',
    name: 'text-amber-700',
    remove: 'text-amber-500',
  },
  [SupportTone.Accepted]: {
    chip: 'bg-emerald-50 border-emerald-200',
    avatar: 'bg-emerald-200 text-emerald-800',
    name: 'text-emerald-700',
    remove: 'text-emerald-500',
  },
};

interface TaskFormSupportProps {
  /** Danh sách người hỗ trợ đang hiển thị (gồm cả người vừa chọn chưa lưu). */
  supportUsers: UserReferenceResponse[];
  setSupportUsers: React.Dispatch<
    React.SetStateAction<UserReferenceResponse[]>
  >;
  setSupportDirty: React.Dispatch<React.SetStateAction<boolean>>;
  /** Id của những người ĐÃ lưu trên server — dùng phân biệt chip "vừa chọn". */
  savedSupportIds: Set<string>;
  /** Trạng thái nhận việc theo từng người, quyết sắc thái chip. */
  supportStatusMap: Record<string, TaskAssignmentStatus>;
  canEditSupport: boolean;
  onAddSupport: () => void;
  onAddSupportGroup: () => void;
}

/**
 * Khối "Người hỗ trợ" của form sửa việc.
 *
 * Ba sắc thái chip nói ba trạng thái khác nhau và KHÔNG được gộp: vừa chọn chưa
 * lưu (xanh trời), đã lưu nhưng người kia chưa nhận (hổ phách), đã nhận (xanh
 * lá). Bảng màu ở `SUPPORT_TONE_STYLES` ngay trên.
 */
export function TaskFormSupport({
  supportUsers,
  setSupportUsers,
  setSupportDirty,
  savedSupportIds,
  supportStatusMap,
  canEditSupport,
  onAddSupport,
  onAddSupportGroup,
}: TaskFormSupportProps) {
  return (
    <div className='space-y-2'>
      <FormLabel className='text-[11px] font-bold text-gray-700 uppercase flex items-center gap-2'>
        <Users className='w-4 h-4 text-zinc-500' />
        Người hỗ trợ
      </FormLabel>
      {supportUsers.length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {supportUsers.map((user) => {
            // Chọn sắc thái chip theo trạng thái người hỗ trợ:
            // - chưa lưu (vừa thêm)        → New (xanh da trời, nhãn "Mới")
            // - đã lưu, chưa nhận lời mời  → Pending (vàng, nhãn "Đang chờ")
            // - đã lưu, đã tham gia        → Accepted (xanh lá)
            const isNew = !savedSupportIds.has(user.id);
            const pending =
              !isNew &&
              supportStatusMap[user.id] ===
                TaskAssignmentStatus.PENDING;
            const tone: SupportTone = isNew
              ? SupportTone.New
              : pending
                ? SupportTone.Pending
                : SupportTone.Accepted;
            const toneStyle = SUPPORT_TONE_STYLES[tone];
            return (
              <div
                key={user.id}
                className={cn(
                  'flex items-center gap-2 rounded-full pl-1 pr-2 py-1 border max-w-full min-w-0',
                  toneStyle.chip,
                )}
              >
                <span
                  className={cn(
                    'w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 overflow-hidden',
                    toneStyle.avatar,
                  )}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    user.fullName.charAt(0).toUpperCase()
                  )}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium truncate min-w-0',
                    toneStyle.name,
                  )}
                >
                  {user.fullName}
                </span>
                {tone === SupportTone.New && (
                  <span
                    title='Sẽ được mời khi lưu'
                    className='shrink-0 text-[9px] font-bold uppercase rounded-full px-1.5 py-0.5 leading-none bg-sky-200 text-sky-800'
                  >
                    Mới
                  </span>
                )}
                {tone === SupportTone.Pending && (
                  <span
                    title='Đang chờ tham gia'
                    className='shrink-0 text-[9px] font-bold uppercase rounded-full px-1.5 py-0.5 leading-none bg-amber-200 text-amber-800'
                  >
                    Đang chờ
                  </span>
                )}
                {canEditSupport && (
                  <button
                    type='button'
                    onClick={() => {
                      setSupportUsers((prev) =>
                        prev.filter((u) => u.id !== user.id),
                      );
                      setSupportDirty(true);
                    }}
                    className={cn(
                      'shrink-0 transition-colors hover:text-red-500',
                      toneStyle.remove,
                    )}
                  >
                    <X className='w-3 h-3' />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {canEditSupport ? (
        <div className='flex flex-col sm:flex-row gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-9 w-full sm:flex-1 justify-center text-xs font-bold border-dashed'
            onClick={onAddSupport}
          >
            <Users className='w-3.5 h-3.5 mr-1.5' />
            {supportUsers.length > 0
              ? `Đã chọn ${supportUsers.length} người`
              : 'Thêm người hỗ trợ'}
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-9 w-full sm:w-auto justify-center text-xs font-bold border-dashed'
            onClick={onAddSupportGroup}
          >
            <Users className='w-3.5 h-3.5 mr-1.5' />
            Chọn nhóm
          </Button>
        </div>
      ) : (
        supportUsers.length === 0 && (
          <p className='text-xs text-gray-400'>Chưa có người hỗ trợ.</p>
        )
      )}
    </div>
  );
}
