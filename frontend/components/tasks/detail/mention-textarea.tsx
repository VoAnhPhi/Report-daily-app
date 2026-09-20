'use client';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface MentionCandidate {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
}

/** Phím điều hướng dropdown gợi ý @mention (KeyboardEvent.key). */
const KEY = {
  NEXT: 'ArrowDown',
  PREV: 'ArrowUp',
  CONFIRM: ['Enter', 'Tab'],
  CLOSE: 'Escape',
} as const;

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  /** Người có thể được tag. */
  candidates: MentionCandidate[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  /** Bắn khi người dùng chọn một người từ dropdown — nguồn id đáng tin để tag. */
  onMentionSelect?: (candidate: MentionCandidate) => void;
}

/**
 * Textarea kèm gợi ý @mention. Gõ `@` (đầu dòng hoặc sau khoảng trắng) mở dropdown
 * lọc theo tên người liên quan; chọn sẽ chèn `@Tên `.
 */
export function MentionTextarea({
  value,
  onChange,
  candidates,
  placeholder,
  className,
  disabled,
  onKeyDown,
  onPaste,
  onMentionSelect,
}: MentionTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Chặn chèn lặp: trên cảm ứng, một lần chạm bắn cả onTouchStart lẫn
  // onMouseDown (mouse tổng hợp) → hai lần insert. Cờ mở lại ở frame kế.
  const insertLockRef = useRef(false);
  // Chuỗi sau '@' đang gõ.
  const [query, setQuery] = useState<string | null>(null);
  const [anchor, setAnchor] = useState(0); // vị trí ký tự '@'
  const [active, setActive] = useState(0); // dòng gợi ý đang chọn
  // Vị trí ô nhập tại thời điểm mở.
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  // Ứng viên khớp chuỗi đang gõ sau '@' (lọc không phân biệt hoa/thường);
  // rỗng khi không ở trong ngữ cảnh mention (query === null).
  const matches =
    query !== null
      ? candidates.filter((c) =>
          c.fullName.toLowerCase().includes(query.toLowerCase()),
        )
      : [];
  // Dropdown chỉ mở khi đang gõ '@...' và có ít nhất 1 ứng viên khớp.
  const open = query !== null && matches.length > 0;

  const closeMenu = () => {
    setQuery(null);
    setMenuRect(null);
  };

  // Phát hiện ngữ cảnh @mention quanh con trỏ và bật/tắt dropdown cho phù hợp.
  const detect = (text: string, caret: number) => {
    const upto = text.slice(0, caret);
    const at = upto.lastIndexOf('@'); // '@' gần con trỏ nhất
    if (at === -1) return closeMenu();
    const between = upto.slice(at + 1); // phần đang gõ sau '@'
    // Có xuống dòng hoặc quá dài → coi như không phải mention.
    if (/[\n]/.test(between) || between.length > 30) return closeMenu();
    // '@' phải đứng đầu dòng hoặc ngay sau khoảng trắng (tránh email a@b...).
    const prev = at > 0 ? text[at - 1] : ' ';
    if (prev !== ' ' && prev !== '\n') return closeMenu();
    setAnchor(at);
    setQuery(between);
    setActive(0);
    setMenuRect(ref.current?.getBoundingClientRect() ?? null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);
    detect(text, e.target.selectionStart ?? text.length);
  };

  // Chèn '@Tên ' thay cho đoạn đang gõ (từ '@' tới con trỏ), rồi đặt con trỏ ngay sau tên.
  const insert = (c: MentionCandidate) => {
    // Bỏ qua sự kiện thứ hai của cùng một lần chạm/click.
    if (insertLockRef.current) return;
    insertLockRef.current = true;
    const caret = ref.current?.selectionStart ?? value.length;
    const before = value.slice(0, anchor);
    const after = value.slice(caret);
    const inserted = `@${c.fullName} `;
    onChange(`${before}${inserted}${after}`);
    onMentionSelect?.(c);
    closeMenu();
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
      insertLockRef.current = false;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (open) {
      if (e.key === KEY.NEXT) {
        e.preventDefault();
        setActive((a) => (a + 1) % matches.length);
        return;
      }
      if (e.key === KEY.PREV) {
        e.preventDefault();
        setActive((a) => (a - 1 + matches.length) % matches.length);
        return;
      }
      if (KEY.CONFIRM.includes(e.key as (typeof KEY.CONFIRM)[number])) {
        e.preventDefault();
        insert(matches[active]);
        return;
      }
      if (e.key === KEY.CLOSE) {
        e.preventDefault();
        closeMenu();
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Chiều cao vùng nhìn thấy — ưu tiên visualViewport để đúng khi bàn phím ảo (mobile) bật.
  const viewportH =
    typeof window !== 'undefined'
      ? (window.visualViewport?.height ?? window.innerHeight)
      : 0;

  // Tính chỗ đặt dropdown theo khoảng trống quanh ô nhập.
  const spaceBelow = menuRect ? viewportH - menuRect.bottom : 0; // chỗ trống phía dưới
  const spaceAbove = menuRect ? menuRect.top : 0; // chỗ trống phía trên
  // Đặt bên dưới nếu đủ chỗ (≥180px) hoặc dưới rộng hơn trên; ngược lại đặt bên trên.
  const placeBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove;
  // Kẹp chiều cao dropdown trong [120, 320]px theo khoảng trống đã chọn (trừ 12px đệm).
  const maxMenuHeight = Math.max(
    120,
    Math.min(320, (placeBelow ? spaceBelow : spaceAbove) - 12),
  );

  return (
    <div className='relative'>
      <Textarea
        ref={ref}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={onPaste}
        onBlur={() => window.setTimeout(closeMenu, 150)}
        className={className}
      />
      {open &&
        menuRect &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: menuRect.left,
              ...(placeBelow
                ? { top: menuRect.bottom + 4 }
                : { bottom: Math.max(8, viewportH - menuRect.top + 4) }),
              width: menuRect.width,
              maxHeight: maxMenuHeight,
              zIndex: 9999,
              pointerEvents: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
            onWheel={(e) => {
              e.currentTarget.scrollTop += e.deltaY;
            }}
            className='ws-scroll overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg'
          >
            {matches.map((c, i) => (
              <button
                key={c.id}
                type='button'
                onMouseDown={(e) => {
                  e.preventDefault();
                  insert(c);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  insert(c);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                  i === active ? 'bg-zinc-100' : 'hover:bg-zinc-50',
                )}
              >
                <span className='flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600'>
                  {c.avatarUrl ? (
                    <Image
                      src={c.avatarUrl}
                      alt=''
                      width={24}
                      height={24}
                      className='h-full w-full object-cover'
                    />
                  ) : (
                    c.fullName.charAt(0).toUpperCase()
                  )}
                </span>
                <span className='truncate font-medium text-zinc-800'>
                  {c.fullName}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
