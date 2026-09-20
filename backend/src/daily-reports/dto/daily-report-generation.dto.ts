import type { DailyReportStatus } from '@prisma/client';
import type { ScopeMemberInfo } from '../services/daily-report-scope.service';

/** Các lý do khiến thao tác tạo báo cáo hôm nay chưa thể thực hiện. */
export type DailyReportGenerationBlockedReason =
  | 'SCOPE_DISABLED'
  | 'SCOPE_ARCHIVED'
  | 'NON_REPORTING_DAY'
  | 'BEFORE_GENERATION_TIME'
  | 'PAST_HARD_STOP'
  | 'NO_TEMPLATE'
  | 'EMPTY_SNAPSHOT';

export interface DailyReportGenerationMember extends ScopeMemberInfo {
  reportStatus: DailyReportStatus | null;
}

export interface DailyReportGenerationExcludedMember extends ScopeMemberInfo {
  reason: 'NOT_IN_SNAPSHOT';
}

export interface DailyReportGenerationPreview {
  scopeId: string;
  scopeName: string;
  reportDate: string;
  timezone: string;
  snapshotAt: string;
  generationLabel: string;
  hardStopLabel: string;
  templateVersionId: string | null;
  canGenerate: boolean;
  blockedReason?: DailyReportGenerationBlockedReason;
  counts: {
    snapshotMembers: number;
    existingReports: number;
    toCreate: number;
  };
  includedMembers: DailyReportGenerationMember[];
  excludedMembers: DailyReportGenerationExcludedMember[];
}

export interface DailyReportGenerationResult {
  scopeId: string;
  reportDate: string;
  snapshotAt: string;
  totalMembers: number;
  createdReports: number;
  existingReports: number;
  notificationRecipients: number;
}
