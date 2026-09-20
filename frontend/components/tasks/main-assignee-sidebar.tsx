'use client';

import Image from 'next/image';
import { Search, Check, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn, formatReferenceId } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { TASK_TAB, type TaskTab } from '@/components/tasks/task-utils';
import type { SharedTaskAssignee } from '@/types/task.type';

interface MainAssigneeSidebarProps {
  selectedId?: string;
  onSelect: (id?: string) => void;
  className?: string;
  activeTab: TaskTab;
  assignees: SharedTaskAssignee[];
}

/**
 * Cột lọc bên trái cho tab "Việc chung": lọc theo người phụ trách chính.
 * Danh sách người lấy từ API; ô tìm kiếm lọc tại chỗ (có debounce) theo tên
 * hoặc mã người dùng (referenceId).
 */
export function MainAssigneeSidebar({
  selectedId,
  onSelect,
  className,
  activeTab,
  assignees,
}: MainAssigneeSidebarProps) {
  const { searchTerm, debouncedTerm, handleSearch } = useDebouncedSearch();

  // Sidebar này áp cho tab "việc chung" và "chờ tham gia".
  if (activeTab !== TASK_TAB.SHARED && activeTab !== TASK_TAB.SHARED_PENDING)
    return null;

  const term = debouncedTerm.trim().toLowerCase();
  const filtered = term
    ? assignees.filter(
        (a) =>
          a.fullName.toLowerCase().includes(term) ||
          a.referenceId?.toLowerCase().includes(term),
      )
    : assignees;

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-ws-surface-sunken/50 rounded-2xl border border-ws-line shadow-xs overflow-hidden',
        className,
      )}
    >
      <div className='p-3 pb-0 space-y-2.5'>
        <div className='flex items-center gap-2 px-1'>
          <div className='w-1.5 h-1.5 rounded-full bg-ws-accent' />
          <h3 className='font-bold text-ws-ink text-[11px] uppercase tracking-wider text-muted-foreground line-clamp-1'>
            Người phụ trách chính
          </h3>
        </div>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ws-ink-ghost' />
          <Input
            placeholder='Tìm theo tên hoặc mã...'
            className='pl-8 h-8 bg-ws-surface border-ws-line text-[11px] transition-all rounded-lg shadow-xs'
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className='w-full flex-1 [&>div>div]:!block'>
        <div className='px-3 pt-3 space-y-2 flex flex-col items-stretch pb-6 min-w-0'>
          <button
            onClick={() => onSelect(undefined)}
            className={cn(
              'w-full text-left p-2.5 rounded-xl text-xs flex items-start gap-2.5 transition-all group border min-w-0',
              /* Mục đang chọn NỔI lên bằng nền trắng trên nền chìm của cột,
                 không tô đen đặc. Cột này đứng cạnh bảng việc suốt phiên làm
                 việc; một khối đen cao 44px nằm im ở đó là mảng tương phản
                 mạnh nhất màn hình, tranh mất chỗ của nút hành động chính. */
              !selectedId
                ? 'bg-ws-surface border-ws-line text-ws-ink shadow-ws-rest'
                : 'text-ws-ink-soft border-transparent hover:bg-ws-surface hover:border-ws-line hover:shadow-xs',
            )}
          >
            <div
              className={cn(
                'p-1.5 rounded-lg transition-colors shrink-0',
                !selectedId
                  ? 'bg-ws-accent-bg text-ws-accent'
                  : 'bg-ws-line/50 text-ws-ink-faint group-hover:bg-ws-surface-sunken',
              )}
            >
              <Users className='w-3.5 h-3.5' />
            </div>
            <div className='flex-1 min-w-0'>
              <p
                className={cn(
                  'font-bold truncate leading-tight mt-0.5 text-[13px]',
                  !selectedId ? 'text-ws-ink' : 'text-ws-ink-soft',
                )}
              >
                Tất cả người phụ trách
              </p>
              <p
                className={cn(
                  'text-[11px] truncate mt-0.5 font-medium opacity-70',
                  'text-ws-ink-faint',
                )}
              >
                Hiển thị mọi việc chung
              </p>
            </div>
            {!selectedId && (
              <Check className='w-3.5 h-3.5 shrink-0 mt-1 text-ws-accent' />
            )}
          </button>

          {filtered.length === 0 ? (
            <p className='px-1 py-6 text-center text-[11px] text-ws-ink-ghost'>
              Không có người phụ trách nào.
            </p>
          ) : (
            filtered.map((a) => {
              const selected = selectedId === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => onSelect(a.id)}
                  className={cn(
                    'w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-all group border min-w-0',
                    selected
                      ? 'border-ws-line bg-ws-surface text-ws-ink shadow-ws-rest'
                      : 'text-ws-ink-soft border-transparent hover:bg-ws-surface hover:border-ws-line hover:shadow-xs',
                  )}
                >
                  <span
                    className={cn(
                      'w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 overflow-hidden',
                      selected
                        ? 'bg-ws-accent-bg text-ws-accent'
                        : 'bg-ws-surface-sunken text-ws-ink-soft',
                    )}
                  >
                    {a.avatarUrl ? (
                      <Image
                        src={a.avatarUrl}
                        alt={a.fullName}
                        width={32}
                        height={32}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      a.fullName.charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className='flex-1 min-w-0'>
                    <p
                      className={cn(
                        'font-bold truncate text-[13px]',
                        selected ? 'text-ws-ink' : 'text-ws-ink-soft',
                      )}
                    >
                      {a.fullName}
                    </p>
                    {a.referenceId && (
                      <p
                        className={cn(
                          'truncate text-[11px] font-medium mt-0.5',
                          'text-ws-ink-faint',
                        )}
                      >
                        {formatReferenceId(a.referenceId)}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
                      // Bộ đếm vàng đất (`ws-count-*`) cho hàng đang chọn —
                      // cùng ngôn ngữ với chip số trên tab và trên nút Báo cáo.
                      selected
                        ? 'bg-ws-count-bg text-ws-count-fg'
                        : 'bg-ws-line/70 text-ws-ink-soft',
                    )}
                  >
                    {a.count}
                  </span>
                  {selected && (
                    <Check className='w-3.5 h-3.5 shrink-0 text-ws-accent' />
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
