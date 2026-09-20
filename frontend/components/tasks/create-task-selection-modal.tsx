'use client';

import { User, Building2, type LucideIcon } from 'lucide-react';
import ResponsiveModal from '@/components/modals/responsive-modal';
import { cn } from '@/lib/utils';
import { TaskType } from '@/types/task.type';
import { TASK_TYPE_CONFIG } from './task-utils';

interface CreateTaskSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPersonal: () => void;
  onSelectPartner: () => void;
}

/** Một loại việc để chọn: icon + nhãn + mô tả + hành động khi bấm. */
interface SelectionOption {
  key: 'personal' | 'partner';
  type: TaskType;
  icon: LucideIcon;
  label: string;
  hint: string;
  onSelect: () => void;
}

/**
 * Thẻ chọn loại việc.
 *
 * Hai thẻ KHÔNG dùng hai màu khác nhau. Loại việc là dữ liệu phân loại, mã hoá
 * bằng KIỂU NÉT viền — đúng cùng quy ước với viền trái của thẻ việc trên bảng
 * cột, nên người dùng gặp lại đúng ngôn ngữ đó ở mọi nơi.
 */
function SelectionCard({
  option,
  onClose,
}: {
  option: SelectionOption;
  onClose: () => void;
}) {
  const Icon = option.icon;
  const visual = TASK_TYPE_CONFIG[option.type];
  return (
    <button
      type='button'
      onClick={(e) => {
        e.currentTarget.blur();
        option.onSelect();
        onClose();
      }}
      className={cn(
        'group flex flex-col items-center gap-3 rounded-2xl border border-ws-line bg-ws-surface p-6 text-center',
        'transition-all duration-200 hover:border-ws-line-strong hover:bg-ws-surface-alt hover:shadow-ws-raised',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ws-focus',
      )}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: 'var(--color-ws-line-strong)',
        borderLeftStyle: visual.borderStyle,
      }}
    >
      <span className='rounded-xl border border-ws-line bg-ws-surface-alt p-3 text-ws-ink-soft transition-transform duration-200 group-hover:scale-110'>
        <Icon className='h-7 w-7' />
      </span>
      <span className='text-[13.5px] font-semibold text-ws-ink'>
        {option.label}
      </span>
      <span className='text-[12.5px] leading-relaxed text-ws-ink-faint'>
        {option.hint}
      </span>
    </button>
  );
}

export function CreateTaskSelectionModal({
  isOpen,
  onClose,
  onSelectPersonal,
  onSelectPartner,
}: CreateTaskSelectionModalProps) {
  const options: SelectionOption[] = [
    {
      key: 'personal',
      type: TaskType.PERSONAL,
      icon: User,
      label: 'Việc cá nhân',
      hint: 'Việc của riêng bạn, không gắn hồ sơ đối tác nào.',
      onSelect: onSelectPersonal,
    },
    {
      key: 'partner',
      type: TaskType.PARTNER_TASK,
      icon: Building2,
      label: 'Việc đối tác',
      hint: 'Gắn vào một hồ sơ hợp tác để theo dõi theo đối tác.',
      onSelect: onSelectPartner,
    },
  ];

  return (
    <ResponsiveModal
      className='ws-scope'
      overlayClassName='bg-ws-overlay'
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      maxWidth='sm:max-w-[560px]'
    >
      <div className='p-6'>
        <div className='mb-1'>
          <h2 className='text-[15.5px] font-bold tracking-[-0.01em] text-ws-ink'>
            Tạo công việc mới
          </h2>
          <p className='mt-1 text-[12.5px] text-ws-ink-faint'>
            Chọn loại việc — chọn rồi vẫn đổi được ở bước sau.
          </p>
        </div>

        <div className='mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2'>
          {options.map((option) => (
            <SelectionCard key={option.key} option={option} onClose={onClose} />
          ))}
        </div>
      </div>
    </ResponsiveModal>
  );
}
