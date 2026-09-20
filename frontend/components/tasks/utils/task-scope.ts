/**
 * Phạm vi lọc danh sách việc: bốn tab của trang, và biên đầu / cuối ngày dạng
 * ISO cho tham số truy vấn.
 *
 * Năm export này là một cụm dùng chung thật — `app/(routes)/tasks/page.tsx`
 * nhập cả năm trong đúng một câu import.
 */

/** 4 tab của trang Công việc — dùng chung cho page + sidebar (hết magic string 'partner'). */
/**
 * 5 tab của trang Công việc — dùng chung cho page + sidebar.
 *
 * `adminInternal` CẤY TỪ `staging` trong lượt merge 26/08/2026. Nhánh này tách
 * tiện ích ra `./utils/` TRƯỚC khi `staging` thêm tab đó (`dc0aa7ed`), nên bản
 * tách chỉ có bốn tab. Bỏ nó không chỉ gãy biên dịch mà còn dựng lại đúng cái
 * bẫy chép dưới đây.
 *
 * Tab này sinh ra từ một lỗi ĐÃ XẢY RA THẬT, không phải từ suy đoán. Trợ lý
 * tạo việc `CV260825004` giao cho một nhân sự; người đó NHẬN ĐƯỢC THÔNG BÁO
 * nhưng vào màn Công việc thì không thấy việc đâu, gõ vào ô tìm kiếm cũng
 * không ra, trong khi quản trị viên vẫn thấy bình thường. Việc ấy mang
 * `type = admin_internal`, mà bốn tab cũ chỉ phủ được ba loại: `personal` →
 * `TaskType.PERSONAL`, `partner` → `TaskType.PARTNER_TASK`, còn
 * `shared`/`sharedPending` lọc theo cờ `shared` chứ không theo loại. Không tab
 * nào nhận `admin_internal` về, nên loại việc đó VÔ HÌNH với chính người được
 * giao. Ô tìm kiếm không cứu được: nó chạy TRONG phạm vi tab đang mở, tức tìm
 * trong một tập vốn đã không chứa việc cần tìm.
 *
 * Luật rút ra, áp cho mọi lần sau: MỖI giá trị của `TaskType` phải có đúng một
 * tab nhận nó về. Thêm loại việc mới mà quên thêm tab là dựng lại đúng cái bẫy
 * này — và bẫy này im lặng, vì không có gì báo lỗi, chỉ có một người dùng nhìn
 * vào danh sách trống của chính mình.
 */
export const TASK_TABS = [
  'personal',
  'partner',
  'adminInternal',
  'shared',
  'sharedPending',
] as const;

export type TaskTab = (typeof TASK_TABS)[number];

/** Truy cập tab theo tên thay vì literal rời rạc. */
export const TASK_TAB = {
  PERSONAL: 'personal',
  PARTNER: 'partner',
  ADMIN_INTERNAL: 'adminInternal',
  SHARED: 'shared',
  SHARED_PENDING: 'sharedPending',
} as const satisfies Record<string, TaskTab>;

/** Date-only (YYYY-MM-DD) → ISO ở đầu/cuối ngày địa phương; undefined khi rỗng. */
export const dayStartIso = (d?: string) =>
  d ? new Date(`${d}T00:00:00`).toISOString() : undefined;

export const dayEndIso = (d?: string) =>
  d ? new Date(`${d}T23:59:59.999`).toISOString() : undefined;
