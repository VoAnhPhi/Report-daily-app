import { ShrineEventAction, ShrineStatus } from '@prisma/client';

/**
 * Hằng số dùng chung cho module ĐIỆN KIẾN CHỦ.
 *
 * Mọi chuỗi ở đây là chuỗi HIỂN THỊ cho người dùng cuối hoặc cho trang quản trị,
 * nên bắt buộc tiếng Việt có dấu (Hard Invariant #5).
 */

/** Số ngày một lời mời còn hiệu lực trước khi chuyển sang `expired`. */
export const SHRINE_INVITE_TTL_DAYS = 30;

/**
 * Đường dẫn trang thành viên trên acta-shrines — nơi đăng nhập để tự xin ghi
 * danh hoặc RÚT TÊN.
 *
 * ⚠ Đây là MỘT NỬA của một hợp đồng hai kho. Nửa kia là thư mục `app/toi/` của
 * kho `acta-shrines`. Mọi lá thư ĐIỆN KIẾN CHỦ đều in ra `<portalUrl>/toi` như
 * là chỗ để rút lại đồng ý, nên đổi một bên mà quên bên kia là biến quyền rút
 * lại đồng ý — thứ Luật 91/2025 bắt buộc phải thực hiện được — thành một trang
 * 404.
 *
 * ⚠ Đặt ở ĐÂY chứ không ở `src/mail/templates/`: theo §42, `*.constants.ts` nằm
 * trong nền chung giữa CORE và WORKERS, còn tệp `.tsx` mẫu thư thì không. Một
 * hằng số nền chung được tham chiếu từ `shrine-notify.service.ts` (cũng là nền
 * chung) phải sống trong nền chung, nếu không cổng đo trôi sẽ không nhìn thấy
 * nó khi nó đổi.
 */
export const SHRINE_MEMBER_PATH = '/toi';

/** Độ dài tối đa của biệt danh do thành viên tự đặt (NGHIEP-VU §4). */
export const SHRINE_NICKNAME_MAX_LENGTH = 40;

/** Độ dài tối đa của tên hiển thị đã chốt (đủ chỗ cho họ tên đầy đủ tiếng Việt). */
export const SHRINE_DISPLAY_NAME_MAX_LENGTH = 120;

/** Độ dài tối đa của lý do từ chối / thu hồi. */
export const SHRINE_REASON_MAX_LENGTH = 500;

/**
 * Phiên bản văn bản đồng ý đang hiển thị cho thành viên.
 *
 * Luật 91/2025 đòi đồng ý phải KIỂM CHỨNG ĐƯỢC — nghĩa là phải chứng minh được
 * người dùng đã đọc ĐÚNG bản văn nào. Mỗi lần sửa nội dung màn hình đồng ý phải
 * tăng chuỗi này; giá trị được ghi vào `ShrineStar.consentTextVersion`.
 */
export const SHRINE_CONSENT_TEXT_VERSION = 'v1.0-2026-08-07';

/** Phiên bản thuật toán gán vị trí. Ghi vào `ShrineStar.placementVersion`. */
export const SHRINE_PLACEMENT_VERSION = 1;

/** Tiền tố miền băm vị trí — đổi tiền tố là dịch chỗ TOÀN BỘ sao. */
export const SHRINE_POSITION_HASH_PREFIX = 'acta-shrine:pos:v1:';

/** Số ký tự base32 lấy từ HMAC để làm khoá URL công khai. */
export const SHRINE_SLUG_LENGTH = 12;

/**
 * Mẫu mã thành viên chấp nhận ở ô tra cứu.
 *
 * ⚠ KHÔNG dùng `^vn-\d{5}$`. Đo trên DB dev: 8.202 bản ghi có 14 bản KHÔNG theo
 * dạng `vn-` (us-, jp-, ru-, cn-, in-, fr-, de-, một bản `VN-` VIẾT HOA) và một
 * bản dài 19 ký tự bắt đầu bằng `REF`. Regex hẹp sẽ làm 14 người thật không tra
 * cứu được. So khớp DB đi kèm `mode: 'insensitive'`.
 *
 * Hai nhánh, có chủ ý:
 *   - nhánh 1 `[A-Za-z]{2,}-.+` là mẫu đã chốt cho mọi mã có gạch nối;
 *   - nhánh 2 `[A-Za-z]{2,}[A-Za-z0-9]+` mở thêm cho mã KHÔNG có gạch nối, vì bản
 *     `REF…` 19 ký tự có thể rơi vào dạng đó. Nhánh 2 là tập BỔ SUNG, không thu
 *     hẹp nhánh 1 một ký tự nào — thà lọt vài chuỗi rác (rồi trả `found: false`
 *     và bị chặn bởi giới hạn tần suất) còn hơn khoá cửa một thành viên thật.
 */
export const SHRINE_REFERENCE_ID_PATTERN =
  /^(?:[A-Za-z]{2,}-.+|[A-Za-z]{2,}[A-Za-z0-9]+)$/;

/** Độ dài tối đa chấp nhận cho mã thành viên gõ vào ô tra cứu. */
export const SHRINE_REFERENCE_ID_MAX_LENGTH = 64;

/**
 * Một câu duy nhất cho MỌI trường hợp tra cứu trượt.
 *
 * ⚠ Không bao giờ phân biệt "mã không tồn tại" / "tài khoản đã khoá" / "đã bị thu
 * hồi" — chính hình dạng thông báo lỗi là nơi rò rỉ thông tin.
 */
export const SHRINE_NOT_FOUND_MESSAGE =
  'Không tìm thấy mã thành viên này.';

/** Nhãn tiếng Việt của từng trạng thái, dùng cho trang quản trị và thông báo. */
export const SHRINE_STATUS_LABELS: Record<ShrineStatus, string> = {
  pending_member_consent: 'Chờ thành viên đồng ý',
  pending_admin_review: 'Chờ quản trị viên duyệt',
  pending_second_approval: 'Chờ quản trị viên thứ hai duyệt',
  enrolled: 'Đã ghi danh',
  declined: 'Thành viên đã từ chối',
  rejected: 'Quản trị viên đã từ chối',
  withdrawn: 'Thành viên đã rút tên',
  revoked: 'Đã bị thu hồi',
  expired: 'Lời mời đã hết hạn',
  suspended: 'Tạm tắt — tài khoản ngừng hoạt động',
};

/** Nhãn tiếng Việt của từng hành động trong tab Lịch sử. */
export const SHRINE_EVENT_ACTION_LABELS: Record<ShrineEventAction, string> = {
  invited: 'Quản trị viên gửi lời mời',
  invite_expired: 'Lời mời hết hạn',
  requested: 'Thành viên xin ghi danh',
  member_consented: 'Thành viên đồng ý ghi danh',
  member_declined: 'Thành viên từ chối lời mời',
  member_withdrew: 'Thành viên rút tên',
  admin_proposed: 'Quản trị viên đề xuất',
  admin_second_approved: 'Quản trị viên thứ hai duyệt',
  admin_approved: 'Quản trị viên duyệt đơn',
  admin_rejected: 'Quản trị viên từ chối đơn',
  admin_renamed: 'Quản trị viên sửa tên hiển thị',
  admin_revoked: 'Quản trị viên thu hồi ngôi sao',
  position_assigned: 'Gán vị trí ngôi sao',
  position_recomputed: 'Tính lại vị trí ngôi sao',
  account_deactivated: 'Tài khoản ngừng hoạt động — sao tắt',
  account_reactivated: 'Tài khoản hoạt động trở lại — sao sáng lại',
};

/**
 * Các trạng thái cho phép bắt đầu lại một lượt ghi danh mới.
 *
 * Một ngôi sao đang ở `enrolled` hay bất kỳ `pending_*` nào thì không được mời
 * lại hay xin lại — nếu không, hai luồng sẽ ghi đè nhau và bằng chứng đồng ý cũ
 * bị thay bằng bằng chứng mới mà không có vết.
 */
export const SHRINE_RESTARTABLE_STATUSES: ShrineStatus[] = [
  ShrineStatus.declined,
  ShrineStatus.rejected,
  ShrineStatus.withdrawn,
  ShrineStatus.revoked,
  ShrineStatus.expired,
];

/**
 * ⚠ `suspended` CỐ Ý không nằm trong danh sách trên.
 *
 * Một ngôi sao `suspended` thuộc về tài khoản đã rời `active`, mà `loadOwner` chặn
 * mọi tài khoản như vậy ngay từ đầu mọi đường ghi danh — thêm nó vào đây chỉ đổi
 * câu báo lỗi từ "trạng thái không cho phép" thành "tài khoản không hoạt động",
 * không mở thêm được cửa nào. Cửa ra đúng của `suspended` là tài khoản hoạt động
 * trở lại (sao tự sáng lại, giữ nguyên tên cũ) hoặc quản trị viên thu hồi hẳn.
 */

/**
 * Số mili-giây tối thiểu giữa hai lượt tự quét lệch trạng thái tài khoản.
 *
 * Việc quét chạy LƯỜI trên đường đọc (xem `ShrineService.maybeSweepAccountStatuses`)
 * chứ không bằng `@Cron`: theo §42 một cron mới phải nằm ở kho WORKERS, và module
 * này cố ý không có tác vụ nền nào. Bảng `shrine_stars` chỉ có một dòng cho mỗi
 * thành viên từng bước vào luồng ghi danh nên một lượt quét là vài mili-giây.
 */
export const SHRINE_ACCOUNT_SWEEP_INTERVAL_MS = 60_000;

/** Trần số ngôi sao xử lý trong MỘT lượt tự quét lười. */
export const SHRINE_ACCOUNT_SWEEP_BATCH = 200;

/** Giới hạn số thành viên được mời trong một lượt. */
export const SHRINE_MAX_INVITE_BATCH = 100;

/** Từ khoá cấm trong biệt danh (NGHIEP-VU §4 — kiểm duyệt cơ bản). */
export const SHRINE_BANNED_NICKNAME_TOKENS = [
  'acta',
  'admin',
  'quantri',
  'quanly',
  'ceo',
  'chutich',
  'giamdoc',
  'bantochuc',
  'hethong',
  'system',
  'support',
  'hotro',
];
