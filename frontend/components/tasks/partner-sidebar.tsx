'use client';

import { useMyBusinessForms } from '@/hooks/queries/business-forms/business-forms-queries';
import { Building2, Search, Loader2, Check, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BusinessFormStatus,
  STATUS_LABEL_VI,
} from '@/types/business-form.type';
import { TASK_TAB, type TaskTab } from '@/components/tasks/task-utils';
import { useOnBehalfParam } from '@/contexts/caregiver-context';

// Màu badge trạng thái duyệt của đối tác.
const STATUS_BADGE_CLASS: Record<BusinessFormStatus, string> = {
  pending: 'bg-ws-pending-bg text-ws-pending-fg',
  in_review: 'bg-ws-progress-bg text-ws-progress-fg',
  needs_more_info: 'bg-ws-prio-high-bg text-ws-prio-high',
  approved: 'bg-ws-done-bg text-ws-done-fg',
  rejected: 'bg-ws-void-bg text-ws-void-fg',
};

interface PartnerSidebarProps {
  selectedId?: string;
  onSelect: (id?: string) => void;
  className?: string;
  activeTab: TaskTab;
  /**
   * Mở hộp thoại thêm đối tác. Lối vào này nằm NGAY TRONG cột đối tác thay vì
   * trên hàng công cụ: người dùng nhận ra mình thiếu đối tác đúng lúc đang
   * nhìn danh sách đối tác, không phải lúc nhìn hàng nút phía trên.
   */
  onCreatePartner?: () => void;
}

export function PartnerSidebar({
  selectedId,
  onSelect,
  className,
  activeTab,
  onCreatePartner,
}: PartnerSidebarProps) {
  const { searchTerm, debouncedTerm, handleSearch } = useDebouncedSearch();
  // Làm thay: liệt kê đối tác của người được chăm (undefined = chính mình).
  const onBehalfOfUserId = useOnBehalfParam();
  const { data, isLoading: isLoadingPartners } = useMyBusinessForms({
    search: debouncedTerm || undefined,
    limit: 100,
    onBehalfOfUserId,
  });

  const partners = data?.data || [];

  // Sidebar đối tác chỉ áp cho tab "đối tác".
  if (activeTab !== TASK_TAB.PARTNER) return null;

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
            Đối tác
          </h3>
          {onCreatePartner && (
            <button
              type='button'
              onClick={onCreatePartner}
              title='Thêm đối tác'
              aria-label='Thêm đối tác'
              className='ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ws-ink-faint transition-colors hover:bg-ws-surface hover:text-ws-ink'
            >
              <Plus className='h-4 w-4' />
            </button>
          )}
        </div>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ws-ink-ghost' />
          <Input
            placeholder='Tìm đối tác...'
            className='pl-8 h-8 bg-ws-surface border-ws-line text-[11px] transition-all rounded-lg shadow-xs'
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List Business Form */}
      <ScrollArea className='w-full flex-1 [&>div>div]:!block'>
        <div className='px-3 pt-3 space-y-2 flex flex-col items-stretch pb-6 min-w-0'>
          <button
            onClick={() => onSelect(undefined)}
            className={cn(
              'w-full text-left p-2.5 rounded-xl text-xs flex items-start gap-2.5 transition-all group border min-w-0',
              /* Nổi lên bằng nền trắng, không tô đen — cùng khuôn với cột
                 Người phụ trách bên cạnh. Xem ghi chú ở
                 `main-assignee-sidebar.tsx`. */
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
              <Building2 className='w-3.5 h-3.5' />
            </div>
            <div className='flex-1 min-w-0'>
              <p
                className={cn(
                  'font-bold truncate leading-tight mt-0.5 text-[13px]',
                  !selectedId ? 'text-ws-ink' : 'text-ws-ink-soft',
                )}
              >
                Tất cả đối tác
              </p>
              <p className='text-[11px] truncate mt-0.5 font-medium text-ws-ink-faint opacity-70'>
                Hiển thị mọi công việc
              </p>
            </div>
            {!selectedId && (
              <Check className='w-3.5 h-3.5 shrink-0 mt-1 text-ws-accent' />
            )}
          </button>

          {isLoadingPartners ? (
            <div className='flex flex-col items-center justify-center py-10 gap-2 text-ws-ink-ghost'>
              <Loader2 className='w-4 h-4 animate-spin opacity-50' />
            </div>
          ) : (
            partners.map((partner) => (
              <button
                key={partner.id}
                onClick={() => onSelect(partner.id)}
                className={cn(
                  'w-full text-left p-2.5 rounded-xl text-xs flex items-start gap-2.5 transition-all group border min-w-0',
                  selectedId === partner.id
                    ? 'border-ws-line bg-ws-surface text-ws-ink shadow-ws-rest'
                    : 'text-ws-ink-soft border-transparent hover:bg-ws-surface hover:border-ws-line hover:shadow-xs',
                )}
              >
                <div
                  className={cn(
                    'p-1.5 rounded-lg transition-colors shrink-0',
                    selectedId === partner.id
                      ? 'bg-ws-accent-bg text-ws-accent'
                      : 'bg-ws-line/50 text-ws-ink-faint group-hover:bg-ws-surface-sunken',
                  )}
                >
                  <Building2 className='w-3.5 h-3.5' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p
                    className={cn(
                      'font-bold truncate leading-tight mt-0.5 text-[13px]',
                      selectedId === partner.id
                        ? 'text-ws-ink'
                        : 'text-ws-ink-soft',
                    )}
                  >
                    {partner.companyName}
                  </p>

                  <div className='flex flex-col gap-1 mt-1.5'>
                    {/* Hàng đang chọn giờ có nền trắng như hàng thường, nên
                        chip trạng thái giữ ĐÚNG màu trạng thái của nó thay vì
                        bị nhuộm trắng mờ — trước đây chọn một đối tác là mất
                        luôn thông tin "đang hoạt động / tạm ngưng". */}
                    <span
                      className={cn(
                        'inline-flex w-fit items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-tight',
                        STATUS_BADGE_CLASS[partner.status],
                      )}
                    >
                      {STATUS_LABEL_VI[partner.status]}
                    </span>
                    <p className='text-[11px] truncate font-medium text-ws-ink-faint opacity-70'>
                      MST: {partner.taxCode}
                    </p>
                  </div>
                </div>
                {selectedId === partner.id && (
                  <Check className='w-3.5 h-3.5 shrink-0 mt-1 text-ws-accent' />
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
