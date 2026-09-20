/**
 * Lịch sử: gom danh sách bản phẳng thành hàng theo ngày (kèm mức tổng hợp của
 * ngày), rồi gộp các ngày trống liền nhau thành một dải.
 */

import type { DailyReportStatus } from '@/types/daily-report.type';

/** Mức tổng hợp của cả một NGÀY, gộp từ mọi bản trong ngày. */
import { listDayStrs } from './date';
import {
  classifySubmission,
  isSubmissionDone,
  type SubmissionState,
} from './status';

export type DayLevel = 'complete' | 'partial' | 'missedAll' | 'noData';

/** Một bản trong ngày, đã kèm trạng thái đã tính sẵn. */
export interface DaySubmission<T> {
  item: T;
  state: SubmissionState;
}

export interface HistoryDay<T> {
  kind: 'day';
  day: string;
  level: DayLevel;
  submissions: DaySubmission<T>[];
  /** Số bản đã xong / tổng số bản trong ngày. */
  doneCount: number;
  totalCount: number;
  /** Tên các nhóm chưa xong — hiện thẳng trên hàng ngày. */
  pendingScopeNames: string[];
}

/** Một dải ngày liền nhau không có bản báo cáo nào. */
export interface EmptyRange {
  kind: 'empty';
  from: string;
  to: string;
  dayCount: number;
}

export type HistoryRow<T> = HistoryDay<T> | EmptyRange;

export interface MinimalReportRow {
  reportDate: string;
  status: DailyReportStatus;
  submittedAt: string | null;
  isMissed: boolean;
  scope: { id: string; name: string };
}

/**
 * Gom danh sách bản phẳng thành từng ngày, mới nhất trước.
 *
 * Sắp xếp các bản TRONG một ngày theo tên nhóm rồi tới id. Bắt buộc phải sort
 * ở đây: server chỉ `orderBy reportDate desc`, không có khoá phụ, nên thứ tự
 * giữa các bản cùng ngày do database quyết định và có thể đổi giữa hai lần
 * tải. Không sort thì danh sách nhóm nhảy chỗ, và mọi thứ chọn "bản đầu tiên"
 * đều là chọn bừa.
 */
export function groupByDay<T extends MinimalReportRow>(
  rows: T[],
  from: string,
  to: string,
): HistoryDay<T>[] {
  const byDay = new Map<string, T[]>();
  for (const r of rows) {
    const list = byDay.get(r.reportDate);
    if (list) list.push(r);
    else byDay.set(r.reportDate, [r]);
  }

  return listDayStrs(from, to)
    .reverse()
    .map((day) => {
      const raw = [...(byDay.get(day) ?? [])].sort(
        (a, b) =>
          a.scope.name.localeCompare(b.scope.name, 'vi') ||
          a.scope.id.localeCompare(b.scope.id),
      );
      const submissions = raw.map((item) => ({
        item,
        state: classifySubmission(item),
      }));
      const doneCount = submissions.filter((b) =>
        isSubmissionDone(b.state),
      ).length;
      const totalCount = submissions.length;

      /* Bốn mức, và `noData` KHÔNG phải một trạng thái báo cáo — nó là
         "không có dữ liệu". Ngày đó có thể là ngày nghỉ của nhóm, hoặc người
         dùng chưa vào nhóm. Gộp nó với "không nộp" là kết luận sai thay người
         dùng, đúng điều docs 11 mục 3 cấm. */
      const level: DayLevel =
        totalCount === 0
          ? 'noData'
          : doneCount === totalCount
            ? 'complete'
            : doneCount === 0
              ? 'missedAll'
              : 'partial';

      return {
        kind: 'day' as const,
        day,
        level,
        submissions,
        doneCount,
        totalCount,
        pendingScopeNames: submissions
          .filter((b) => !isSubmissionDone(b.state))
          .map((b) => b.item.scope.name),
      };
    });
}

/**
 * Gộp các ngày KHÔNG có bản nào nằm liền nhau thành một dải.
 *
 * Một tháng thường có 8–10 ngày nghỉ; để mỗi ngày một hàng thì chúng chiếm
 * một phần ba danh sách mà không mang thông tin gì ngoài "hôm đó không phải
 * nộp". Gộp lại giữ nguyên thông tin đó trong một dòng.
 */
export function mergeEmptyDays<T>(days: HistoryDay<T>[]): HistoryRow<T>[] {
  const out: HistoryRow<T>[] = [];
  let newest: string | null = null;
  let oldest: string | null = null;
  let count = 0;

  const flush = () => {
    if (newest === null || oldest === null) return;
    // Danh sách chạy mới → cũ, nên `newest` là ngày MỚI hơn `oldest`.
    out.push({ kind: 'empty', from: oldest, to: newest, dayCount: count });
    newest = null;
    oldest = null;
    count = 0;
  };

  for (const n of days) {
    if (n.level === 'noData') {
      if (newest === null) newest = n.day;
      oldest = n.day;
      count += 1;
      continue;
    }
    flush();
    out.push(n);
  }
  flush();

  return out;
}
