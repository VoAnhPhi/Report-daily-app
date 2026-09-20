import { OmitType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  BusinessFormPriority,
  BusinessFormTaskStatus,
  BusinessFormTaskType,
  CooperationCategory,
} from '@prisma/client';
import {
  TaskAttachmentDto,
  TaskItemDto,
  MAX_TASK_ATTACHMENTS,
} from './user-task.dto';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const nullableId = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export class AdminQueryTasksDto {
  @IsOptional()
  @IsEnum(BusinessFormTaskStatus, { each: true })
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  status?: BusinessFormTaskStatus[];

  @IsOptional()
  @IsEnum(BusinessFormTaskType, { each: true })
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  type?: BusinessFormTaskType[];

  @IsOptional()
  @IsEnum(CooperationCategory)
  category?: CooperationCategory;

  @IsOptional()
  @IsEnum(BusinessFormPriority)
  priority?: BusinessFormPriority;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  shared?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  createdByAdmin?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  deleted?: boolean;

  @IsOptional()
  @IsString()
  businessFormId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  startFrom?: string;

  @IsOptional()
  @IsDateString()
  startTo?: string;

  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @IsOptional()
  @IsDateString()
  dueTo?: string;

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
 * Xuất Excel báo cáo công việc
 */
export class ExportTasksDto extends OmitType(AdminQueryTasksDto, [
  'assigneeId',
  'shared',
  'deleted',
  'search',
  'startFrom',
  'dueFrom',
  'dueTo',
  'page',
  'limit',
] as const) {
  // Axios nối mảng thành `assigneeIds[]=`, lại tách khác nhau tuỳ 1 hay nhiều
  // phần tử. Gửi chuỗi phân tách bằng dấu phẩy cho tất định.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  assigneeIds!: string[];

  @IsDateString()
  startFrom!: string;
}

export class AdminCreateTaskDto {
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

  @IsOptional()
  @IsEnum(BusinessFormTaskType)
  type?: BusinessFormTaskType;

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
  @IsString()
  mainAssigneeId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedUserIds?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

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

/**
 * Patch shape for an existing task. Every field is optional; only the
 * keys present in the body are written. Setting `status` to `done`
 * stamps `completedById`/`completedAt` server-side; clearing it back
 * to a non-terminal state clears them.
 */
export class AdminUpdateTaskDto {
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
  @IsEnum(BusinessFormTaskType)
  type?: BusinessFormTaskType;

  @IsOptional()
  @IsEnum(CooperationCategory)
  category?: CooperationCategory;

  @IsOptional()
  @IsEnum(BusinessFormPriority)
  priority?: BusinessFormPriority;

  @IsString()
  @IsOptional()
  @Transform(nullableId)
  businessFormId?: string | null;

  @IsOptional()
  @IsString()
  @Transform(nullableId)
  mainAssigneeId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedUserIds?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

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

export class AdminTaskAssignmentDto {
  @IsOptional()
  @IsString()
  @Transform(nullableId)
  mainAssigneeId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedUserIds?: string[];

  @IsOptional()
  @Transform(trimString)
  @IsString()
  note?: string;
}

export class AdminTaskAnalyticsDto {
  total!: number;
  pending!: number;
  in_progress!: number;
  done!: number;
  cancelled!: number;
  overdue!: number;
}

export class AdminTaskPersonalFolderDto {
  taskCount!: number;
}

export class AdminTaskPartnerFolderDto {
  businessFormId!: string;
  companyName!: string;
  taskCount!: number;
  status!: string;
}

export class AdminUserTaskOverviewDto {
  analytics!: AdminTaskAnalyticsDto;

  personalFolder!: AdminTaskPersonalFolderDto;

  sharedFolder!: AdminTaskPersonalFolderDto;

  partnerFolders!: AdminTaskPartnerFolderDto[];
}
