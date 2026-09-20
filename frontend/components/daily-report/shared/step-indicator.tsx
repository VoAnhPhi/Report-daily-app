import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Thanh báo bước của một luồng nhiều bước ("Bước 2/3"). Người dùng thấy mình
 * đang ở đâu và còn bao xa, nên một form dài được chia nhỏ mà không đáng sợ
 * (`Progress Indicators`, ui-ux-pro-max).
 *
 * Bước là CHỈ BÁO, không phải nút: quay lại đi bằng nút "Quay lại" ở chân hộp,
 * để thứ tự kiểm tra từng bước không bị bỏ qua. Trình đọc màn hình nghe
 * `aria-current='step'` ở bước hiện tại.
 */
export function StepIndicator({
  steps,
  current,
  className,
}: {
  steps: string[];
  /** Chỉ số bước đang đứng, bắt đầu từ 0. */
  current: number;
  className?: string;
}) {
  return (
    <ol
      aria-label={`Bước ${current + 1} trên ${steps.length}`}
      className={cn('flex items-center gap-2', className)}
    >
      {steps.map((label, index) => {
        const done = index < current;
        const isCurrent = index === current;
        return (
          <li
            key={label}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'flex min-w-0 items-center gap-2',
              index < steps.length - 1 && 'flex-1',
            )}
          >
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ws-chip font-semibold tabular-nums transition-colors',
                done && 'bg-ws-done-fg text-ws-solid-ink',
                isCurrent && 'bg-ws-ink text-ws-solid-ink',
                !done && !isCurrent && 'bg-ws-surface-sunken text-ws-ink-faint',
              )}
            >
              {done ? (
                <Check aria-hidden='true' className='h-3.5 w-3.5' />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                'min-w-0 truncate text-ws-chip',
                isCurrent
                  ? 'font-semibold text-ws-ink'
                  : 'hidden text-ws-ink-soft sm:inline',
              )}
            >
              {label}
              {done && <span className='sr-only'> (xong)</span>}
            </span>
            {index < steps.length - 1 && (
              <span
                aria-hidden='true'
                className={cn(
                  'h-px min-w-3 flex-1',
                  done ? 'bg-ws-done-fg' : 'bg-ws-line',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
