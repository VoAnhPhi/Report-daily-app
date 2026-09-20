import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BusinessFormPriority } from '@prisma/client';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Body for PATCH /admin/business-forms/:id/priority. Setting priority to
 * `normal` and slaDueAt to null clears the escalation. Reason is optional
 * but recommended whenever priority is `high`/`urgent`.
 */
export class AdminPriorityDto {
  @IsEnum(BusinessFormPriority)
  priority!: BusinessFormPriority;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return null;
    return value;
  })
  @Type(() => Date)
  @IsDate()
  slaDueAt?: Date | null;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  reason?: string;
}
