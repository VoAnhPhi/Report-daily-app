/**
 * Người liên quan tới việc: màu avatar theo băm id, gộp thành viên nhóm vào
 * danh sách người hỗ trợ (bỏ trùng theo id), và lọc lại danh sách được nhắc @
 * theo nội dung thực tế còn giữ tên hay không.
 */

import type { UserReferenceResponse } from '@/types/user.type';
import type { TaskGroupMember } from '@/types/task-group.type';

/**
 * Năm cặp màu avatar — ngoại lệ có chủ ý của luật đếm hue: avatar là DANH TÍNH,
 * không phải trạng thái, nên được phép có hue riêng. Chọn nhóm bằng băm ổn định
 * của id để cùng một người luôn ra cùng màu ở mọi màn.
 *
 * Class viết nguyên văn (không ghép chuỗi) để Tailwind quét thấy.
 */
const AVATAR_PALETTE = [
  'bg-ws-ava-a-bg text-ws-ava-a-fg',
  'bg-ws-ava-b-bg text-ws-ava-b-fg',
  'bg-ws-ava-c-bg text-ws-ava-c-fg',
  'bg-ws-ava-d-bg text-ws-ava-d-fg',
  'bg-ws-ava-e-bg text-ws-ava-e-fg',
] as const;

export function getAvatarPalette(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

/** Gộp thành viên nhóm vào danh sách người hỗ trợ hiện tại (bỏ trùng theo id). */
export const mergeGroupMembers = (
  current: UserReferenceResponse[],
  members: TaskGroupMember[],
): UserReferenceResponse[] => {
  const existing = new Set(current.map((u) => u.id));
  const added = members
    .filter((m) => !existing.has(m.id))
    .map(
      (m) =>
        ({
          id: m.id,
          fullName: m.fullName,
          avatarUrl: m.avatarUrl,
          referenceId: m.referenceId ?? '',
        }) as unknown as UserReferenceResponse,
    );
  return [...current, ...added];
};

/** Thoát ký tự đặc biệt để nhúng chuỗi vào RegExp. */
export const escapeRegExp = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Lọc lại danh sách người đã chọn từ dropdown, chỉ giữ ai mà `@Tên` còn nằm
 * trong nội dung như một token trọn vẹn (người dùng có thể đã xoá tên đi).
 *
 * Tên dài xét trước và vùng đã khớp bị nuốt, nên `@An Bình` không đồng thời
 * tính là nhắc `An`. Ranh giới phải chặn `@An` sáng bên trong `@Anh`.
 */
export const resolveMentionIds = (
  text: string,
  selected: { id: string; name: string }[],
): string[] => {
  if (selected.length === 0) return [];
  const sorted = [...selected].sort((a, b) => b.name.length - a.name.length);
  const re = new RegExp(
    `(?:^|\\s)@(${sorted.map((m) => escapeRegExp(m.name)).join('|')})(?![\\p{L}\\p{N}])`,
    'gu',
  );
  const found = new Set<string>();
  let hit: RegExpExecArray | null;
  while ((hit = re.exec(text)) !== null) {
    const matched = sorted.find((s) => s.name === hit![1]);
    if (matched) found.add(matched.id);
    re.lastIndex = hit.index + hit[0].length;
  }
  return Array.from(found);
};
