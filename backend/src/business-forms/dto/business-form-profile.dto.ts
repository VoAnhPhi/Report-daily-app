import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { BusinessFormStatus } from '@prisma/client';

import {
  BusinessFormResponseDto,
  BusinessFormUserSummaryDto,
} from './business-form-response.dto';

/**
 * Query for `/admin/business-forms/profiles` — same filter shape as
 * `ListBusinessFormsQueryDto`. Pagination applies to the
 * grouped profiles, not the raw form rows.
 */
export class ListBusinessFormProfilesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(BusinessFormStatus)
  status?: BusinessFormStatus;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeDeleted?: boolean = false;

  @IsOptional()
  @IsString()
  search?: string;
}

export class BusinessFormProfileSummaryDto {
  userId!: string;

  taxCode!: string;

  companyName!: string;

  owner?: BusinessFormUserSummaryDto | null;

  requestCount!: number;

  statusCounts!: Record<BusinessFormStatus, number>;

  hasActiveForms!: boolean;

  latestCreatedAt!: Date;

  latestForm!: {
    id: string;
    status: BusinessFormStatus;
    createdAt: Date;
    updatedAt: Date;
    contactName: string;
    contactPhone: string;
  };
}

export class BusinessFormProfileDetailDto {
  profile!: BusinessFormProfileSummaryDto;

  forms!: BusinessFormResponseDto[];
}

export class PaginatedBusinessFormProfilesDto {
  data!: BusinessFormProfileSummaryDto[];

  total!: number;

  page!: number;

  limit!: number;

  totalPages!: number;
}
