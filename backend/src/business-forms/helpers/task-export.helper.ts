import * as ExcelJS from 'exceljs';

/** Trần số dòng cho một lần xuất Excel. Vượt thì báo lỗi, không cắt bớt âm thầm. */
export const MAX_EXPORT_ROWS = 5000;

/** Bảng màu ARGB cho file xuất (viền, header, hyperlink, khối việc chung). */
export const EXPORT_COLORS = {
  border: 'FFCBD5E1',
  headerFill: 'FF334155',
  headerFont: 'FFFFFFFF',
  hyperlink: 'FF0563C1',
  sharedFill: 'FFF1F5F9',
} as const;

/** Chiều cao + cỡ chữ dòng header. */
export const EXPORT_HEADER_HEIGHT = 24;
export const EXPORT_HEADER_FONT_SIZE = 12;

/** Độ dài tối đa: slug tên file, tên sheet Excel (31), phần chừa hậu tố ` (n)`. */
export const SLUG_MAX_LEN = 40;
export const EXCEL_SHEET_NAME_MAX = 31;
export const EXCEL_SHEET_NAME_TRUNC = EXCEL_SHEET_NAME_MAX - 4;

/** Cấu hình 12 cột tĩnh của sheet báo cáo (cột tệp đính kèm dựng động sau). */
export const TASK_EXPORT_COLUMNS: { header: string; key: string; width: number }[] =
  [
    { header: 'Mã CV', key: 'code', width: 16 },
    { header: 'Ngày bắt đầu', key: 'start', width: 14 },
    { header: 'Hạn chót', key: 'due', width: 14 },
    { header: 'Phụ trách', key: 'assignee', width: 24 },
    { header: 'Người hỗ trợ', key: 'related', width: 30 },
    { header: 'Tiêu đề', key: 'title', width: 40 },
    { header: 'Mô tả', key: 'description', width: 50 },
    { header: 'Việc hoàn thành', key: 'itemsDone', width: 44 },
    { header: 'Việc chưa hoàn thành', key: 'itemsTodo', width: 44 },
    { header: 'Trạng thái', key: 'status', width: 14 },
    { header: 'Loại công việc', key: 'category', width: 22 },
    { header: 'Đối tác', key: 'company', width: 32 },
  ];

/** Khung xám mảnh cho mọi ô của file xuất. */
export const THIN_BORDER = {
  top: { style: 'thin', color: { argb: EXPORT_COLORS.border } },
  left: { style: 'thin', color: { argb: EXPORT_COLORS.border } },
  bottom: { style: 'thin', color: { argb: EXPORT_COLORS.border } },
  right: { style: 'thin', color: { argb: EXPORT_COLORS.border } },
} as const satisfies Partial<ExcelJS.Borders>;

/**
 * Tên tiếng Việt -> ASCII gạch nối. Header HTTP chỉ chở được ASCII, tên có
 * dấu sẽ bị trình duyệt cắt hoặc thay bằng tên mặc định.
 */
export function slugify(raw: string): string {
  return (
    raw
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, SLUG_MAX_LEN) || 'khong-ten'
  );
}

/** Excel cấm `\ / ? * [ ] :` trong tên sheet, tối đa 31 ký tự, không trùng. */
export function sheetName(raw: string, used: Set<string>): string {
  const base = (
    raw.replace(/[\\/?*[\]:]/g, ' ').trim() || 'Không tên'
  ).slice(0, EXCEL_SHEET_NAME_MAX);
  let name = base;
  for (let i = 2; used.has(name); i++)
    name = `${base.slice(0, EXCEL_SHEET_NAME_TRUNC)} (${i})`;
  used.add(name);
  return name;
}
