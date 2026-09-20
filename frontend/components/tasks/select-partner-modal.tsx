'use client';

import { useMyBusinessForms } from '@/hooks/queries/business-forms/business-forms-queries';
import { Building2, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { STATUS_LABEL_VI } from '@/types/business-form.type';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useOnBehalfParam } from '@/contexts/caregiver-context';

import ResponsiveModal from '@/components/modals/responsive-modal';

interface SelectPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (businessFormId: string) => void;
}

export function SelectPartnerModal({
  isOpen,
  onClose,
  onSelect,
}: SelectPartnerModalProps) {
  const { searchTerm, debouncedTerm, handleSearch } = useDebouncedSearch();
  // Làm thay: liệt kê đối tác của NGƯỜI ĐƯỢC CHĂM, không phải của mình.
  const onBehalfOfUserId = useOnBehalfParam();
  const { data, isLoading } = useMyBusinessForms({
    search: debouncedTerm || undefined,
    status: 'approved',
    limit: 50,
    onBehalfOfUserId,
  });

  const businessForms = data?.data || [];

  return (
    <ResponsiveModal
      className='ws-scope'
      overlayClassName='bg-ws-overlay'
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      maxWidth='sm:max-w-[600px]'
      /* Tự lo cuộn — cùng khuôn với các hộp thoại khác của màn /tasks: một cột
         flex, tiêu đề `shrink-0`, danh sách `flex-1 min-h-0` cuộn. */
      scrollable={false}
    >
      <div className='flex max-h-[85vh] flex-col overflow-hidden bg-ws-surface'>
        {/* Tiêu đề + ô tìm: `shrink-0` chứ không `sticky` — nó không nằm trong
            vùng cuộn nào nên `sticky top-0` xưa nay chỉ là class trơ. */}
        <div className='shrink-0 bg-ws-surface pt-6 pb-2 px-6 space-y-4'>
          <div>
            <h2 className='text-xl font-bold'>Chọn đối tác</h2>
            <p className='text-sm text-ws-ink-faint'>
              Chọn hồ sơ đối tác để tạo công việc liên quan
            </p>
          </div>

          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ws-ink-ghost' />
            <Input
              placeholder='Tìm tên công ty hoặc MST...'
              className='pl-9 h-10 bg-ws-surface-alt border-ws-line'
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        <div className='ws-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4'>
          {isLoading ? (
            <div className='flex flex-col items-center justify-center py-20 gap-3 text-ws-ink-ghost'>
              <Loader2 className='w-8 h-8 animate-spin opacity-50' />
              <span className='text-sm font-medium'>Đang tải danh sách...</span>
            </div>
          ) : businessForms.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-20 gap-2 text-ws-ink-ghost'>
              <Building2 className='w-12 h-12 opacity-20' />
              <p className='text-sm font-medium'>Không tìm thấy đối tác nào</p>
            </div>
          ) : (
            <div className='flex flex-col gap-1.5'>
              {businessForms.map((form) => (
                <button
                  key={form.id}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSelect(form.id);
                    onClose();
                  }}
                  className='w-full text-left p-3.5 rounded-xl hover:bg-ws-accent-bg hover:border-ws-accent/30 border border-transparent transition-all flex items-start gap-4 group min-w-0 bg-ws-surface'
                >
                  <div className='p-2 bg-ws-surface-sunken rounded-xl group-hover:bg-ws-surface group-hover:shadow-sm transition-all shrink-0 border border-transparent group-hover:border-ws-accent/30'>
                    <Building2 className='w-5 h-5 text-ws-ink-faint group-hover:text-ws-accent' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between gap-2'>
                      <h4 className='font-bold text-ws-ink truncate group-hover:text-ws-accent text-sm'>
                        {form.companyName}
                      </h4>
                      <span
                        className={cn(
                          'text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-sm shrink-0',
                          form.status === 'approved'
                            ? 'bg-ws-done-bg text-ws-done-fg'
                            : form.status === 'pending'
                              ? 'bg-ws-pending-bg text-ws-pending-fg'
                              : 'bg-ws-surface-sunken text-ws-ink-soft',
                        )}
                      >
                        {STATUS_LABEL_VI[form.status]}
                      </span>
                    </div>
                    <div className='flex items-center gap-3 mt-1 min-w-0'>
                      <span className='text-[11px] text-ws-ink-faint font-medium shrink-0'>
                        MST: {form.taxCode}
                      </span>
                      <span className='text-[11px] text-ws-ink-ghost truncate font-normal italic'>
                        Nhấn để chọn đối tác này
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ResponsiveModal>
  );
}
