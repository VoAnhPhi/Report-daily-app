import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * Năm cặp màu avatar của bảng màu (`--color-ws-ava-*`). Avatar là DANH TÍNH,
 * không phải trạng thái, nên đây là ngoại lệ có chủ ý của luật màu
 * (`docs/features/task-workspace-ui/MASTER.md` mục 2).
 *
 * Chuỗi viết nguyên văn: Tailwind chỉ sinh CSS cho tên lớp tĩnh.
 */
const AVATAR_TONES = [
  'bg-ws-ava-a-bg text-ws-ava-a-fg',
  'bg-ws-ava-b-bg text-ws-ava-b-fg',
  'bg-ws-ava-c-bg text-ws-ava-c-fg',
  'bg-ws-ava-d-bg text-ws-ava-d-fg',
  'bg-ws-ava-e-bg text-ws-ava-e-fg',
] as const;

const SIZE_CLASS = {
  /** Ảnh người duyệt ở góc ô ngày; chữ vẫn giữ sàn 10px. */
  xxs: 'h-4 w-4 text-ws-nano',
  xs: 'h-5 w-5 text-ws-nano',
  sm: 'h-7 w-7 text-ws-micro',
  md: 'h-9 w-9 text-ws-chip',
  lg: 'h-11 w-11 text-ws-body',
} as const;

function toneOf(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const last = parts[parts.length - 1];
  return last.charAt(0).toUpperCase();
}

/**
 * Avatar một người của cụm Báo cáo: ảnh nếu có, không thì CHỮ CÁI của tên trên
 * nền màu cố định theo người.
 *
 * Không dùng `AvatarFallback` của `components/ui/avatar.tsx`: component đó bỏ
 * qua `children` và luôn vẽ icon người xám, nên mười người không ảnh trông y
 * hệt nhau. Chữ cái nằm DƯỚI ảnh; ảnh tải xong thì che nó đi.
 */
export function PersonAvatar({
  name,
  url,
  seed,
  size = 'sm',
  className,
}: {
  name: string;
  url?: string | null;
  /** Khoá chọn màu; mặc định là tên. Truyền id để hai người trùng tên khác màu. */
  seed?: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  return (
    <Avatar
      aria-hidden='true'
      className={cn('relative shrink-0', SIZE_CLASS[size], className)}
    >
      <span
        className={cn(
          /* `select-none`: bôi đen danh sách để copy không kéo theo chữ cái. */
          'absolute inset-0 flex select-none items-center justify-center rounded-full font-semibold',
          toneOf(seed ?? name),
        )}
      >
        {initialsOf(name)}
      </span>
      <AvatarImage
        src={url ?? undefined}
        alt=''
        className='relative rounded-full'
      />
    </Avatar>
  );
}

/**
 * Cụm avatar chồng mép, tối đa `max` người rồi "+n". Dùng cho người duyệt của
 * một bộ phận: đủ để nhận ra ai mà không chiếm cả hàng.
 */
export function AvatarStack({
  people,
  max = 3,
  size = 'xs',
  className,
}: {
  people: { id: string; fullName: string; avatarUrl: string | null }[];
  max?: number;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className={cn('flex items-center -space-x-1.5', className)}>
      {shown.map((person) => (
        <PersonAvatar
          key={person.id}
          name={person.fullName}
          url={person.avatarUrl}
          seed={person.id}
          size={size}
          className='ring-2 ring-ws-surface'
        />
      ))}
      {rest > 0 && (
        <span
          aria-hidden='true'
          className={cn(
            'relative flex items-center justify-center rounded-full bg-ws-surface-sunken font-semibold text-ws-ink-soft ring-2 ring-ws-surface',
            SIZE_CLASS[size],
          )}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
