import {
  DailyReportHelpRequest,
  DailyReportHelpRequestStatus,
} from '@prisma/client';

/**
 * Giao diện chỉ có HAI trạng thái cho một yêu cầu hỗ trợ: chưa giải quyết và
 * đã giải quyết. `ACKNOWLEDGED` (đã tiếp nhận) vẫn còn trong enum nhưng không
 * màn nào dùng, nên nó tính chung vào "chưa giải quyết". Chốt ngày 15/09/2026.
 */
export const OPEN_HELP_STATUSES: DailyReportHelpRequestStatus[] = [
  DailyReportHelpRequestStatus.OPEN,
  DailyReportHelpRequestStatus.ACKNOWLEDGED,
];

export const isHelpOpen = (status: DailyReportHelpRequestStatus): boolean =>
  OPEN_HELP_STATUSES.includes(status);

/** Trạng thái hỗ trợ của MỘT bản trên bảng nhóm. */
export type BoardHelpStatus = 'OPEN' | 'RESOLVED' | null;

/**
 * Một bản có thể mang nhiều yêu cầu (nộp lại với nội dung câu 3 khác): còn một
 * yêu cầu mở là "cần hỗ trợ", dù yêu cầu cũ hơn đã được giải quyết.
 */
export function helpStatusOf(
  helps: ReadonlyArray<Pick<DailyReportHelpRequest, 'status'>>,
): BoardHelpStatus {
  if (helps.some((help) => isHelpOpen(help.status))) return 'OPEN';
  if (
    helps.some((help) => help.status === DailyReportHelpRequestStatus.RESOLVED)
  ) {
    return 'RESOLVED';
  }
  return null;
}

/** Một yêu cầu hỗ trợ trả về client: map tường minh, không trả object Prisma. */
export interface HelpRequestView {
  id: string;
  reportId: string;
  answerId: string | null;
  requesterId: string;
  status: DailyReportHelpRequestStatus;
  content: string;
  linkedTaskIds: string[];
  mentionedUserIds: string[];
  acknowledgedById: string | null;
  acknowledgedAt: Date | null;
  resolvedById: string | null;
  resolvedAt: Date | null;
  cancelledById: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toHelpRequestView(
  help: DailyReportHelpRequest,
): HelpRequestView {
  return {
    id: help.id,
    reportId: help.reportId,
    answerId: help.answerId,
    requesterId: help.requesterId,
    status: help.status,
    content: help.content,
    linkedTaskIds: help.linkedTaskIds,
    mentionedUserIds: help.mentionedUserIds,
    acknowledgedById: help.acknowledgedById,
    acknowledgedAt: help.acknowledgedAt,
    resolvedById: help.resolvedById,
    resolvedAt: help.resolvedAt,
    cancelledById: help.cancelledById,
    cancelledAt: help.cancelledAt,
    createdAt: help.createdAt,
    updatedAt: help.updatedAt,
  };
}
