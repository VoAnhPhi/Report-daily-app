'use client';

import { useState } from 'react';
import { Check, Lock } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import {
  FOCUS_RING_SURFACE as FOCUS_RING,
  TOOLTIP_CONTENT_CLASS,
  TOOLTIP_CONTENT_STYLE,
} from '../utils/classes';
import { ListSearch, normalizeSearchVi } from './list-search';
import { PersonAvatar } from './person-avatar';

export interface PickablePerson {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  /** Dòng phụ dưới tên, ví dụ "Đang là người duyệt". */
  note?: string;
  /** Có giá trị = không chọn được; câu này là lý do, hiện trong chú giải. */
  disabledReason?: string;
  /** Nhãn ngắn in trên thẻ khi không chọn được, ví dụ "Chưa kích hoạt". */
  disabledLabel?: string;
}

/**
 * Lưới chọn NHIỀU người bằng thẻ có avatar - thay cho danh sách ô tích chữ
 * của form Bộ phận (UAT 16/09/2026 lượt 2: "nhìn nhiều chữ thấy sợ").
 *
 * - Cả thẻ là một nút `aria-pressed`, cao ít nhất 56px: dễ chạm, không phải
 *   ngắm vào một ô tích 16px.
 * - Đã chọn thì viền đậm + dấu tích trên avatar, không chỉ đổi màu nền.
 * - Người không chọn được vẫn hiện (để trưởng nhóm biết họ có trong nhóm) nhưng
 *   mờ, xếp cuối, có nhãn và chú giải nói vì sao.
 * - Ô tìm hiện khi danh sách dài hơn 8 người; "Chọn tất cả" chỉ chọn người
 *   đang hiện và chọn được.
 */
export function PersonPickGrid({
  people,
  selected,
  onToggle,
  onSelectMany,
  label,
  emptyText,
}: {
  people: PickablePerson[];
  selected: string[];
  onToggle: (id: string) => void;
  /** Có thì hiện nút "Chọn tất cả / Bỏ chọn tất cả" cho những người đang lọc. */
  onSelectMany?: (ids: string[], select: boolean) => void;
  label: string;
  emptyText: string;
}) {
  const [query, setQuery] = useState('');
  const needle = normalizeSearchVi(query.trim());
  const visible = people
    .filter(
      (p) =>
        needle.length === 0 || normalizeSearchVi(p.fullName).includes(needle),
    )
    .sort(
      (a, b) =>
        Number(Boolean(a.disabledReason)) - Number(Boolean(b.disabledReason)),
    );
  const pickable = visible.filter((p) => !p.disabledReason).map((p) => p.id);
  const allPicked =
    pickable.length > 0 && pickable.every((id) => selected.includes(id));

  if (people.length === 0) {
    return <p className='text-ws-meta text-ws-ink-faint'>{emptyText}</p>;
  }

  return (
    <div className='space-y-2.5'>
      {(people.length > 8 || onSelectMany) && (
        <div className='flex flex-wrap items-center gap-2'>
          {people.length > 8 && (
            <ListSearch
              value={query}
              onChange={setQuery}
              label={`Tìm trong ${label.toLowerCase()}`}
              className='min-w-0 flex-1 basis-48'
            />
          )}
          {onSelectMany && pickable.length > 1 && (
            <button
              type='button'
              onClick={() => onSelectMany(pickable, !allPicked)}
              className={cn(
                'inline-flex h-11 shrink-0 items-center rounded-ws-control px-3 text-ws-chip font-semibold text-ws-ink-soft hover:bg-ws-surface-sunken hover:text-ws-ink sm:h-9',
                FOCUS_RING,
              )}
            >
              {allPicked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <p className='py-6 text-center text-ws-meta text-ws-ink-faint'>
          Không có ai khớp “{query.trim()}”.
        </p>
      ) : (
        <TooltipProvider delayDuration={200}>
          <ul
            aria-label={label}
            className='grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]'
          >
            {visible.map((person) => {
              const isOn = selected.includes(person.id);
              const isDisabled = Boolean(person.disabledReason);
              const card = (
                <button
                  type='button'
                  aria-pressed={isOn}
                  aria-disabled={isDisabled || undefined}
                  onClick={() => {
                    if (!isDisabled) onToggle(person.id);
                  }}
                  className={cn(
                    'flex min-h-14 w-full items-center gap-2.5 rounded-ws-block border px-2.5 py-2 text-left transition-colors',
                    isOn
                      ? 'border-ws-ink bg-ws-surface shadow-ws-rest'
                      : 'border-ws-line bg-ws-surface hover:border-ws-line-strong',
                    isDisabled &&
                      'cursor-not-allowed border-dashed bg-ws-surface-alt opacity-70 hover:border-ws-line',
                    FOCUS_RING,
                  )}
                >
                  <span className='relative shrink-0'>
                    <PersonAvatar
                      name={person.fullName}
                      url={person.avatarUrl}
                      seed={person.id}
                      size='md'
                      className={cn(isDisabled && 'grayscale')}
                    />
                    {isOn && (
                      <span
                        aria-hidden='true'
                        className='absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ws-ink text-ws-solid-ink ring-2 ring-ws-surface'
                      >
                        <Check className='h-2.5 w-2.5' strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='line-clamp-2 break-words text-ws-body font-medium text-ws-ink'>
                      {person.fullName || 'Chưa có tên'}
                    </span>
                    {isDisabled ? (
                      <span className='flex items-center gap-1 text-ws-micro text-ws-ink-soft'>
                        <Lock aria-hidden='true' className='h-3 w-3' />
                        {person.disabledLabel ?? 'Không chọn được'}
                      </span>
                    ) : (
                      person.note && (
                        <span className='block truncate text-ws-micro text-ws-ink-soft'>
                          {person.note}
                        </span>
                      )
                    )}
                  </span>
                </button>
              );
              return (
                <li key={person.id}>
                  {isDisabled ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{card}</TooltipTrigger>
                      <TooltipContent
                        className={TOOLTIP_CONTENT_CLASS}
                        style={TOOLTIP_CONTENT_STYLE}
                      >
                        {person.disabledReason}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    card
                  )}
                </li>
              );
            })}
          </ul>
        </TooltipProvider>
      )}
    </div>
  );
}
