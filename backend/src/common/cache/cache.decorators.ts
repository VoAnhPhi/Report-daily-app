import { SetMetadata } from '@nestjs/common';

export const CACHE_TTL_MS = 'CACHE_TTL_MS';
export const CACHE_TAGS = 'CACHE_TAGS';
export const NO_CACHE = 'NO_CACHE';
export const CACHE_SCOPE = 'CACHE_SCOPE';

export type CacheScopeType = 'user' | 'global';

export function CacheTTLms(ms: number) {
  return SetMetadata(CACHE_TTL_MS, ms);
}

// Attach one or more cache tags so we can invalidate groups
export function CacheTags(...tags: string[]) {
  return SetMetadata(CACHE_TAGS, tags);
}

// Specify cache scope: 'user' (default) includes userId in cache key, 'global' excludes it
export function CacheScope(scope: CacheScopeType) {
  return SetMetadata(CACHE_SCOPE, scope);
}

/**
 * Chỉ dựng khoá đệm từ ĐÚNG các tham số truy vấn được liệt kê (review 15/09/2026).
 *
 * ⚠ Mặc định `SmartCacheInterceptor` băm TOÀN BỘ `req.query` vào khoá. Với một
 * route công khai đắt (vd `GET /public/diem-cau` nạp ~2249 kho) thì `?x=1`,
 * `?x=2`, … mỗi lượt là một khoá mới: trượt đệm, nạp lại cả bảng, ghi thêm vài MB
 * vào Redis — một cách phá đệm không cần token, chỉ cần một vòng `for`.
 *
 * Khai decorator này thì tham số KHÔNG có trong danh sách bị bỏ khỏi khoá. Nó
 * không đổi dữ liệu handler nhận được (`ValidationPipe` + `whitelist` vẫn cắt
 * khoá lạ như cũ) — chỉ đổi cách hai lượt gọi được coi là "cùng một câu hỏi".
 *
 * ⚠ Danh sách PHẢI khớp đủ mọi tham số handler thật sự đọc. Sót một khoá là hai
 * câu hỏi khác nhau dùng chung một câu trả lời — đệm trả nhầm dữ liệu. Route
 * không khai decorator giữ nguyên hành vi cũ.
 */
export const CACHE_QUERY_KEYS = 'CACHE_QUERY_KEYS';

export function CacheQueryKeys(...keys: string[]) {
  return SetMetadata(CACHE_QUERY_KEYS, keys);
}

// Force skip cache for a route
export function NoCache() {
  return SetMetadata(NO_CACHE, true);
}

// Mark a mutating handler to invalidate tags after success
export const INVALIDATE_TAGS = 'INVALIDATE_TAGS';

export function InvalidateTags(...tags: string[]) {
  return SetMetadata(INVALIDATE_TAGS, tags);
}
