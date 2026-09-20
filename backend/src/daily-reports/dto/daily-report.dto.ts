import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  DailyReportHelpRequestStatus,
  DailyReportQuestionKind,
  DailyReportReviewDecision,
  DailyReportScopeType,
  DailyReportStatus,
} from '@prisma/client';
import { UnprocessableEntityException } from '@nestjs/common';
import {
  MAX_ANSWER_ATTACHMENTS,
  MAX_ANSWER_CONTENT_LENGTH,
  MAX_LINKED_TASKS,
  MAX_MENTIONED_USERS,
  DAILY_REPORT_GENERATE_MINUTE,
  DAILY_REPORT_HARD_STOP_MINUTE,
  DAILY_REPORT_LEADER_SUMMARY_MINUTE,
  DAILY_REPORT_REMINDER_MINUTE,
} from '../constants/daily-report.constants';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const DAY_STR_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Tệp đính kèm — cùng khuôn { id, name, url } với công việc. */
export class ReportAttachmentDto {
  @IsString()
  @MaxLength(100)
  id!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1024)
  url!: string;
}

/** Một câu trả lời gửi lên khi lưu nháp / nộp. */
export class SaveAnswerDto {
  @IsString()
  questionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ANSWER_CONTENT_LENGTH)
  content?: string;

  /**
   * FE tự biết người dùng đã sửa hay còn giữ nguyên gợi ý — gửi cờ này tường
   * minh. Không gửi → nội dung khác rỗng bị coi là đã sửa (isAutoDrafted=false).
   */
  @IsOptional()
  @IsBoolean()
  isAutoDrafted?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_LINKED_TASKS)
  linkedTaskIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_MENTIONED_USERS)
  mentionedUserIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportAttachmentDto)
  @ArrayMaxSize(MAX_ANSWER_ATTACHMENTS)
  attachments?: ReportAttachmentDto[];
}

/** PATCH /daily-reports/:id — lưu nháp. */
export class SaveDailyReportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveAnswerDto)
  @ArrayMaxSize(20)
  answers!: SaveAnswerDto[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  achievedKpiIds?: string[];
}

/** POST /daily-reports/:id/submit — cho phép lưu + nộp một lần gọi. */
export class SubmitDailyReportDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveAnswerDto)
  @ArrayMaxSize(20)
  answers?: SaveAnswerDto[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  achievedKpiIds?: string[];
}

export class CreateDailyReportKpiDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

export class UpdateDailyReportKpiDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** POST /daily-reports/:id/reopen. */
export class ReopenDailyReportDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

/** GET /daily-reports/my — lịch sử. */
export class QueryMyReportsDto {
  @Matches(DAY_STR_REGEX)
  @IsDateString({ strict: true, strictSeparator: true })
  from!: string;

  @Matches(DAY_STR_REGEX)
  @IsDateString({ strict: true, strictSeparator: true })
  to!: string;

  @IsOptional()
  @IsString()
  scopeId?: string;

  @IsOptional()
  @IsIn([
    DailyReportStatus.DRAFT,
    DailyReportStatus.SUBMITTED,
    DailyReportStatus.REOPENED,
    DailyReportStatus.ARCHIVED,
  ])
  status?: DailyReportStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/** GET /daily-reports/scope/:scopeId/board. */
export class QueryBoardDto {
  @IsOptional()
  @Matches(DAY_STR_REGEX)
  @IsDateString({ strict: true, strictSeparator: true })
  date?: string;

  @IsOptional()
  @IsIn(['all', 'submitted', 'pending', 'missed'])
  status?: 'all' | 'submitted' | 'pending' | 'missed';
}

/**
 * GET /daily-reports/scope/:scopeId/pending-review - danh sách bản chờ kết
 * luận, XUYÊN NGÀY.
 *
 * CỐ Ý không có `date`: cả điểm của endpoint này là không bị bó vào một ngày,
 * khác `QueryBoardDto`. Người duyệt vắng hai ngày thì hai ngày đó phải hiện ra
 * cùng nhau (lỗi UAT 16/09/2026).
 */
export class QueryPendingReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * GET /daily-reports/scope/:scopeId/summary.
 *
 * Ba danh sách trong response phân trang ĐỘC LẬP (vòng sửa 16/09/2026, điểm 7):
 * "Chi tiết theo thành viên", yêu cầu hỗ trợ chưa giải quyết, và yêu cầu đã
 * giải quyết. Trước đó hai danh sách hỗ trợ bị chặn cứng ở 50 dòng, tức dữ liệu
 * mất im lặng khi khoảng ngày rộng.
 *
 * Bốn con số của cả nhóm và danh bạ thành viên KHÔNG theo trang - xem
 * `totals` và `memberDirectory` trong `getSummary`.
 */
export class QuerySummaryDto {
  @Matches(DAY_STR_REGEX)
  @IsDateString({ strict: true, strictSeparator: true })
  from!: string;

  @Matches(DAY_STR_REGEX)
  @IsDateString({ strict: true, strictSeparator: true })
  to!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  memberPage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  memberLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  openHelpPage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  resolvedHelpPage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  helpLimit?: number;

  /**
   * Thứ tự của "Chi tiết theo thành viên". `rate` (mặc định) là kém đều đặn
   * lên trước - câu hỏi thường trực của trưởng nhóm. `department` xếp theo tên
   * bộ phận rồi tên người, để xem theo bộ phận; phải xếp ở SERVER vì client chỉ
   * giữ một trang.
   */
  @IsOptional()
  @IsIn(['rate', 'department'])
  memberSort?: 'rate' | 'department';

  /**
   * Người đang xem ở chế độ "Theo thành viên". Stat của người này LUÔN được trả
   * trong `focusedMember`, dù họ không nằm trong trang đang xem: dòng tiêu đề
   * của màn đó đọc `submitted/expected` từ đó.
   */
  @IsOptional()
  @IsString()
  memberFocus?: string;

  /**
   * Chỉ giữ thành viên thuộc bộ phận này (id của `DailyReportReviewGroup`), hoặc
   * `none` cho người chưa thuộc bộ phận nào. Lọc ở server vì danh sách đã phân
   * trang.
   */
  @IsOptional()
  @IsString()
  memberDepartment?: string;

  /**
   * Chỉ giữ thành viên có ÍT NHẤT một bản ở trạng thái duyệt này trong khoảng.
   * Lọc ở server cùng lý do với `memberSort`.
   */
  @IsOptional()
  @IsIn([
    'CHUA_NOP',
    'CHO_DUYET',
    'QUA_HAN_DUYET',
    'DA_DUYET',
    'TIEP_TUC',
    'QUA_HAN_BO_SUNG',
    'BI_TRA_LAI',
    'DA_MO_LAI',
  ])
  reviewState?: string;
}

/** Lịch sử của một thành viên trong scope — chỉ manager/admin. */
export class QueryScopeMemberHistoryDto extends QueryMyReportsDto {
  @IsString()
  memberId!: string;
}

/** POST /daily-report-scopes — bật báo cáo cho một nhóm/đội. */
export class CreateReportScopeDto {
  @IsIn([DailyReportScopeType.assign_group, DailyReportScopeType.team])
  scopeType!: DailyReportScopeType;

  @IsOptional()
  @IsString()
  assignGroupId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  /** null/bỏ trống = dùng bộ câu hỏi mặc định của hệ thống. */
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  @ArrayMaxSize(7)
  weekdays?: number[];

  @IsOptional()
  @IsBoolean()
  notifyLeaderOnMissing?: boolean;

  /** Giờ khóa report theo phút từ 00:00; mặc định 23:00. */
  @IsOptional()
  @IsInt()
  @Min(DAILY_REPORT_GENERATE_MINUTE + 1)
  @Max(23 * 60 + 59)
  cutoffMinute?: number;

  /** Số phút trước cutoff để mở cửa sổ reminder; mặc định 390 phút. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  reminderBeforeMinutes?: number;

  /** Mốc gửi summary và hạn nộp cho trưởng nhóm; mặc định 17:20. */
  @IsOptional()
  @IsInt()
  @Min(DAILY_REPORT_GENERATE_MINUTE + 1)
  @Max(23 * 60 + 59)
  leaderSummaryMinute?: number;
}

/** PATCH /daily-report-scopes/:id. */
export class UpdateReportScopeDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  @ArrayMaxSize(7)
  weekdays?: number[];

  @IsOptional()
  @IsBoolean()
  notifyLeaderOnMissing?: boolean;

  @IsOptional()
  @IsInt()
  @Min(DAILY_REPORT_GENERATE_MINUTE + 1)
  @Max(23 * 60 + 59)
  cutoffMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  reminderBeforeMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(DAILY_REPORT_GENERATE_MINUTE + 1)
  @Max(23 * 60 + 59)
  leaderSummaryMinute?: number;

  /**
   * Số ngày làm việc của cửa sổ duyệt, TÍNH CẢ ngày nộp.
   *
   * Đổi giá trị chỉ áp cho lần nộp SAU đó: hạn của mỗi lần nộp đã chốt cứng vào
   * `DailyReportRevision.reviewDeadlineAt` ngay lúc submit. Giao diện phải nói
   * rõ điều này, và nói rõ luôn là giá trị `1` thì không có ngày nhắc nào.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  reviewWindowDays?: number;
}

/** Kiểm tra quan hệ giữa ba mốc cấu hình theo scope sau khi đã áp default. */
export function assertValidSchedule(input: {
  cutoffMinute?: number;
  reminderBeforeMinutes?: number;
  leaderSummaryMinute?: number;
}): void {
  const cutoffMinute = input.cutoffMinute ?? DAILY_REPORT_HARD_STOP_MINUTE;
  const reminderBeforeMinutes =
    input.reminderBeforeMinutes ??
    DAILY_REPORT_HARD_STOP_MINUTE - DAILY_REPORT_REMINDER_MINUTE;
  const leaderSummaryMinute =
    input.leaderSummaryMinute ?? DAILY_REPORT_LEADER_SUMMARY_MINUTE;
  const reminderStart = cutoffMinute - reminderBeforeMinutes;

  if (leaderSummaryMinute >= cutoffMinute) {
    throw new UnprocessableEntityException(
      'leaderSummaryMinute phải nhỏ hơn cutoffMinute',
    );
  }
  if (reminderStart < DAILY_REPORT_GENERATE_MINUTE) {
    throw new UnprocessableEntityException(
      'Cửa sổ reminder không được bắt đầu trước 07:30',
    );
  }
  if (reminderStart >= leaderSummaryMinute) {
    throw new UnprocessableEntityException(
      'Reminder phải bắt đầu trước leaderSummaryMinute',
    );
  }
}

/** Query chung: ngày + làm thay. */
export class QueryTodayDto {
  @IsOptional()
  @Matches(DAY_STR_REGEX)
  @IsDateString({ strict: true, strictSeparator: true })
  date?: string;
}

export class QueryHelpRequestsDto {
  @IsOptional()
  @IsIn([
    DailyReportHelpRequestStatus.OPEN,
    DailyReportHelpRequestStatus.ACKNOWLEDGED,
    DailyReportHelpRequestStatus.RESOLVED,
    DailyReportHelpRequestStatus.CANCELLED,
  ])
  status?: DailyReportHelpRequestStatus;
}

export class DailyReportTemplateQuestionDto {
  /**
   * `today` và `done_blocked` CỐ Ý không nằm trong danh sách này: từ 25/08/2026
   * chúng chỉ còn tồn tại trên bản chụp của báo cáo cũ, không ai được tạo câu
   * hỏi MỚI mang hai kind đó nữa. Enum vẫn giữ chúng để đọc lịch sử — xem
   * `daily-report.prisma`.
   */
  @IsIn([
    DailyReportQuestionKind.done,
    DailyReportQuestionKind.blocked,
    DailyReportQuestionKind.need_help,
    DailyReportQuestionKind.tomorrow,
    DailyReportQuestionKind.custom,
  ])
  kind!: DailyReportQuestionKind;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  label!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  hint?: string;

  @IsBoolean()
  isRequired!: boolean;

  @IsBoolean()
  allowTaskLink!: boolean;

  @IsInt()
  @Min(1)
  @Max(100)
  sortOrder!: number;
}

export class CreateDailyReportTemplateDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => DailyReportTemplateQuestionDto)
  questions!: DailyReportTemplateQuestionDto[];
}

export class UpdateDailyReportTemplateDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => DailyReportTemplateQuestionDto)
  questions?: DailyReportTemplateQuestionDto[];
}

export class CloneDailyReportTemplateDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;
}

/** Kiểm tra weekdays hợp lệ (1..7) — gọi ở service vì class-validator không có Each-Min/Max gọn. */
export function assertValidWeekdays(weekdays?: number[]): void {
  if (!weekdays) return;
  if (
    weekdays.length === 0 ||
    new Set(weekdays).size !== weekdays.length ||
    weekdays.some((d) => d < 1 || d > 7)
  ) {
    throw new UnprocessableEntityException(
      'weekdays phải là danh sách không trùng, giá trị 1..7',
    );
  }
}

/** ISO date-string helper cho các DTO cần kiểm tra chuỗi ISO đầy đủ. */
export class IsoDateDto {
  @IsISO8601()
  value!: string;
}

/**
 * Tạo hoặc sửa MỘT nhóm duyệt: tên + những người duyệt + những thành viên.
 *
 * Dùng chung cho POST và PUT vì cả hai lưu TOÀN BỘ trạng thái của nhóm, không
 * cộng dồn: người dùng bỏ tích một thành viên rồi lưu thì nhóm phải khớp đúng
 * cái họ đang thấy trên màn.
 *
 * Cả hai danh sách bắt buộc >= 1. Nhóm không có người duyệt là một cách chia
 * không ai duyệt, nhóm không có thành viên là một cái tên trống - cả hai đều là
 * trạng thái vô nghĩa, và ý định đằng sau chúng là XOÁ nhóm.
 */
export class SaveDailyReportReviewGroupDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  reviewerIds!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @ArrayMaxSize(200)
  memberIds!: string[];

  /**
   * Mốc `updatedAt` của nhóm mà người dùng đang xem, lấy nguyên từ lần đọc danh
   * sách. Service so mốc này trước khi ghi và trả 409 nếu người khác vừa sửa -
   * một đội có nhiều trưởng nhóm, và người mở form trước không được âm thầm xoá
   * thay đổi của người lưu sau. Vắng mặt khi TẠO nhóm mới.
   */
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}

/**
 * Một việc người duyệt chuyển sang ngày làm việc kế tiếp, gửi kèm quyết định
 * `CONTINUED`.
 *
 * Mỗi phần tử phải có ÍT NHẤT MỘT trong ba trường. `note` chỉ bắt buộc khi
 * không có `taskId` VÀ không có `continuesCarryOverId` — tức khi mở một chuỗi
 * thủ công hoàn toàn mới. Có `continuesCarryOverId` thì nội dung kế thừa từ
 * dòng được trỏ tới. Luật này ở tầng service vì nó nhìn nhiều trường cùng lúc.
 */
export class CarryOverItemDto {
  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  continuesCarryOverId?: string;
}

/**
 * Phần tử người duyệt gửi kèm `CONTINUED`.
 *
 * `confirmCarryOverId` là đường XÁC NHẬN LẠI một dòng mà lượt duyệt trước đã
 * chuyển đi từ chính báo cáo này, thay vì tạo dòng thứ hai. Nó phải đứng một
 * mình: xác nhận là giữ nguyên dòng đã có.
 */
export class ReviewCarryOverItemDto extends CarryOverItemDto {
  @IsOptional()
  @IsString()
  confirmCarryOverId?: string;
}

/**
 * Kết luận của người duyệt trên một lần nộp.
 *
 * `comment` bắt buộc khi `REJECTED` (cùng khuôn `ReopenDailyReportDto`).
 * `carryOvers` bắt buộc >= 1 khi `CONTINUED`, và phải RỖNG ở hai quyết định
 * còn lại — kiểm chéo ba trường nằm ở service.
 */
export class ReviewDailyReportDto {
  @IsIn(Object.values(DailyReportReviewDecision))
  decision!: DailyReportReviewDecision;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  comment?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ReviewCarryOverItemDto)
  carryOvers?: ReviewCarryOverItemDto[];
}
