import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  BusinessFormPriority,
  BusinessFormTaskAssignmentStatus,
  BusinessFormTaskStatus,
  BusinessFormTaskType,
  CooperationCategory,
} from '@prisma/client';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class QueryUserTasksDto {
  @IsOptional()
  businessFormId?: string;

  @IsEnum(BusinessFormTaskType)
  @IsOptional()
  type?: BusinessFormTaskType;

  @IsEnum(BusinessFormTaskStatus)
  @IsOptional()
  status?: BusinessFormTaskStatus;

  @IsEnum(CooperationCategory)
  @IsOptional()
  category?: CooperationCategory;

  @IsEnum(BusinessFormPriority)
  @IsOptional()
  priority?: BusinessFormPriority;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  createdByAdmin?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  shared?: boolean;

  @IsEnum(BusinessFormTaskAssignmentStatus)
  @IsOptional()
  assignmentStatus?: BusinessFormTaskAssignmentStatus;

  @IsOptional()
  @IsString()
  mainAssigneeId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  deleted?: boolean;

  @IsOptional()
  @Transform(trimString)
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

  // Phân trang: chỉ có tác dụng khi truyền `page` — dùng cho board/list infinite
  // scroll theo từng cột status. Không truyền `page` = giữ hành vi trả mảng đầy đủ.
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

  // Lọc theo ghim của người xem: true = chỉ việc đã ghim (cho khu ghim nổi đầu
  // cột, KHÔNG phân trang); false = bỏ việc đã ghim (cho danh sách phân trang
  // theo tháng); bỏ trống = không lọc. Transform GIỮ undefined khi param vắng
  // (khác createdByAdmin/shared) để không mất trạng thái "không lọc".
  @IsOptional()
  // Boolean 3-trạng-thái ở query (true/false/undefined). Repo có convention dùng
  // string enum cho filter đa-trạng-thái (xem "Pitfall 3" ở list-leaderboard-query.dto.ts);
  // ở đây CỐ Ý dùng boolean nên phải tự né bẫy: @Type(String) chặn
  // enableImplicitConversion ép Boolean('false')===true — để @Transform nhận
  // string thô rồi parse đúng (giữ được false + undefined).
  @Type(() => String)
  @Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === 'true',
  )
  @IsBoolean()
  pinned?: boolean;
}

/** Query cho danh sách người phụ trách chính (bộ lọc tab việc chung / chờ tham gia). */
export class SharedAssigneesQueryDto {
  @IsEnum(BusinessFormTaskAssignmentStatus)
  @IsOptional()
  status?: BusinessFormTaskAssignmentStatus;
}
