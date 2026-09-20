'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Search, UserCog, X } from 'lucide-react';
import { cn, formatReferenceId } from '@/lib/utils';
import { useMyBabies } from '@/hooks/queries/babysitter/use-care-queries';
import { useCaregiver } from '@/contexts/caregiver-context';
import type { MyBaby } from '@/types/babysitter.type';

/**
 * Dropdown "Làm thay": chọn 1 người đang được chăm để thao tác hộ toàn bộ phần
 * Công việc. Tìm kiếm + cuộn tới đâu tải tới đó. Item đầu "Chính tôi" thoát chế độ.
 * Tự ẩn khi user không chăm ai (không phiền người dùng thường).
 */
export function CaregiverSwitcher() {
  const { careUser, setCareUser } = useCaregiver();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useMyBabies(debounced);

  // Chỉ những người approved + chưa drop mới thao tác hộ được (backend cũng chặn).
  const babies = useMemo(
    () =>
      (data?.pages.flatMap((p) => p.data) ?? []).filter(
        (b) => b.status === 'approved' && !b.droppedAt,
      ),
    [data],
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '80px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, babies.length]);

  // Ẩn hẳn khi không chăm ai (chưa tìm gì, chưa chọn ai).
  if (!isLoading && babies.length === 0 && !debounced && !careUser) return null;

  // Toggle: bấm đúng người đang chọn thì bỏ chọn (về chính mình).
  const toggle = (b: MyBaby) => {
    if (careUser?.id === b.user.id) {
      setCareUser(null);
    } else {
      setCareUser({ id: b.user.id, fullName: b.user.fullName });
    }
    setOpen(false);
  };

  return (
    <div className='flex shrink-0 items-center'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            /* Cao 40px và bo 11px cho khớp ô tìm + ba nút cùng hàng công cụ
               (`page.tsx`). Trước đây h-9/rounded-md nên nút này tụt 4px so
               với hàng — mắt đọc thành "rơi khỏi hàng", không phải cố ý. */
            className={cn(
              'h-10 shrink-0 gap-1.5 px-3 text-[13.5px] font-semibold',
              careUser
                ? 'rounded-l-[11px] rounded-r-none border-r-0 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'rounded-[11px] border-ws-line bg-ws-surface text-ws-ink-soft hover:bg-ws-surface-alt',
            )}
            title={
              careUser
                ? `Đang làm thay cho ${careUser.fullName}`
                : 'Làm thay người được chăm'
            }
          >
            <UserCog className='h-4 w-4 shrink-0' />
            <span
              className={cn(
                'max-w-[120px] truncate',
                careUser ? 'inline' : 'hidden sm:inline',
              )}
            >
              {careUser ? careUser.fullName : 'Làm thay'}
            </span>
            <ChevronDown className='h-3.5 w-3.5 shrink-0 opacity-60' />
          </Button>
        </PopoverTrigger>
        <PopoverContent align='end' className='ws-scope w-72 p-0'>
        <div className='border-b border-ws-line p-2'>
          <div className='relative'>
            <Search className='absolute left-2 top-2.5 h-3.5 w-3.5 text-ws-ink-faint' />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Tìm người được chăm...'
              className='h-8 pl-7 text-sm'
            />
          </div>
        </div>
        {careUser && (
          <p className='border-b border-ws-line px-3 py-1.5 text-[11px] text-amber-600'>
            Đang làm thay — bấm lại người đang chọn để bỏ chọn.
          </p>
        )}
        <div className='ws-scroll max-h-72 overflow-y-auto py-1'>
          {babies.map((b) => (
            <button
              key={b.id}
              type='button'
              onClick={() => toggle(b)}
              className='flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-ws-surface-alt'
            >
              <Avatar className='h-7 w-7'>
                <AvatarImage
                  src={b.user.avatar?.fileUrl || undefined}
                  alt={b.user.fullName}
                />
                <AvatarFallback className='text-[11px]'>
                  {b.user.fullName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='min-w-0 flex-1 text-left'>
                <p className='truncate font-medium'>{b.user.fullName}</p>
                {b.user.referenceId && (
                  <p className='truncate text-[11px] text-ws-ink-faint'>
                    {formatReferenceId(b.user.referenceId)}
                  </p>
                )}
              </div>
              {careUser?.id === b.user.id && (
                <Check className='h-4 w-4 text-amber-600' />
              )}
            </button>
          ))}

          {isLoading && (
            <p className='px-3 py-2 text-xs text-ws-ink-faint'>Đang tải...</p>
          )}
          {!isLoading && babies.length === 0 && (
            <p className='px-3 py-4 text-center text-xs text-ws-ink-faint'>
              Không tìm thấy người được chăm nào
            </p>
          )}
          <div ref={sentinelRef} />
          {isFetchingNextPage && (
            <p className='px-3 py-2 text-xs text-ws-ink-faint'>Đang tải thêm...</p>
          )}
          </div>
        </PopoverContent>
      </Popover>

      {careUser && (
        <button
          type='button'
          onClick={() => setCareUser(null)}
          aria-label='Thoát làm thay'
          title='Thoát làm thay'
          className='flex h-10 items-center rounded-r-[11px] border border-amber-300 bg-amber-50 px-2.5 text-amber-700 hover:bg-amber-100 hover:text-amber-900'
        >
          <X className='h-4 w-4' />
        </button>
      )}
    </div>
  );
}
