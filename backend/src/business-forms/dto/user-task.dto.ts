import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsDateString,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export const MAX_TASK_ATTACHMENTS = 20;
import {
  BusinessFormPriority,
  BusinessFormTaskStatus,
  BusinessFormTaskType,
  CooperationCategory,
  Prisma,
} from '@prisma/client';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Select cho quét nhắc hạn. */
export const REMINDER_TASK_SELECT = {
  id: true,
  title: true,
  dueDate: true,
  mainAssigneeId: true,
  createdById: true,
  businessForm: { select: { userId: true } },
  assignments: { select: { userId: true } },
} satisfies Prisma.BusinessFormTaskSelect;

/** Task cho luồng nhắc hạn (sắp hết hạn / quá hạn). */
export type ReminderTask = Prisma.BusinessFormTaskGetPayload<{
  select: typeof REMINDER_TASK_SELECT;
}>;

/** Shape tối thiểu để kiểm tra quyền truy cập task (owner/creator/phụ trách chính/liên quan). */
export type TaskAccessInput = {
  createdById: string;
  mainAssigneeId?: string | null;
  businessForm?: { userId: string | null } | null;
  assignments?: Array<{ userId: string }>;
};

export class TaskAttachmentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  url!: string;
}

export class TaskItemDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;

  @IsBoolean()
  @IsOptional()
  done?: boolean;

  @IsBoolean()
  @IsOptional()
  deleted?: boolean;

  @IsBoolean()
  @IsOptional()
  purge?: boolean;

  /** Hạn cần đưa việc con vào báo cáo; độc lập với hạn hoàn thành. */
  @IsOptional()
  @IsDateString()
  reportDueAt?: string | null;

  /** Hạn hoàn thành việc con; độc lập với hạn báo cáo. */
  @IsOptional()
  @IsDateString()
  completionDueAt?: string | null;
}

export class CreateUserTaskDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(BusinessFormTaskType)
  type!: BusinessFormTaskType;

  @IsOptional()
  @IsIn([BusinessFormTaskStatus.pending, BusinessFormTaskStatus.in_progress])
  status?: BusinessFormTaskStatus;

  @IsOptional()
  @IsEnum(CooperationCategory)
  category?: CooperationCategory;

  @IsOptional()
  @IsEnum(BusinessFormPriority)
  priority?: BusinessFormPriority;

  @IsString()
  @IsOptional()
  businessFormId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedUserIds?: string[];

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TASK_ATTACHMENTS, {
    message: `Tối đa ${MAX_TASK_ATTACHMENTS} tệp đính kèm cho mỗi công việc`,
  })
  @ValidateNested({ each: true })
  @Type(() => TaskAttachmentDto)
  attachments?: TaskAttachmentDto[];

  @IsOptional()
  items?: TaskItemDto[];
}

export class UpdateUserTaskDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(BusinessFormTaskStatus)
  status?: BusinessFormTaskStatus;

  @IsOptional()
  @IsEnum(CooperationCategory)
  category?: CooperationCategory;

  @IsOptional()
  @IsEnum(BusinessFormPriority)
  priority?: BusinessFormPriority;

  @IsOptional()
  @IsString()
  mainAssigneeId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedUserIds?: string[];

  @IsDateString()
  @IsOptional()
  startDate?: string | null;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TASK_ATTACHMENTS, {
    message: `Tối đa ${MAX_TASK_ATTACHMENTS} tệp đính kèm cho mỗi công việc`,
  })
  @ValidateNested({ each: true })
  @Type(() => TaskAttachmentDto)
  attachments?: TaskAttachmentDto[];

  @IsOptional()
  items?: TaskItemDto[];

  @IsOptional()
  @Transform(trimString)
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAttachmentDto)
  evidence?: TaskAttachmentDto[];
}

export class UpdateTaskStatusDto {
  @IsEnum(BusinessFormTaskStatus)
  status!: BusinessFormTaskStatus;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAttachmentDto)
  evidence?: TaskAttachmentDto[];
}

export class LeaveTaskDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateTaskActivityDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAttachmentDto)
  attachments?: TaskAttachmentDto[];

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  mentionedUserIds?: string[];
}

export class UpdateTaskActivityDto extends CreateTaskActivityDto {}

export class ReactTaskActivityDto {
  @IsString()
  @IsNotEmpty()
  emoji!: string;
}

/** Phân trang danh sách việc chung giữa người xem và một thành viên. */
export class QuerySharedTasksDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

/**
 * Lọc dòng thời gian công việc. `log` gộp mọi loại không phải bình luận:
 * `status_changed` + `member_changed` + `item_purged`.
 */
export enum TaskActivityFilter {
  all = 'all',
  comment = 'comment',
  log = 'log',
}

export class QueryTaskActivitiesDto {
  @IsEnum(TaskActivityFilter)
  @IsOptional()
  filter?: TaskActivityFilter = TaskActivityFilter.all;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
