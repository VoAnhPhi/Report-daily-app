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

export class ListBusinessFormsQueryDto {
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
