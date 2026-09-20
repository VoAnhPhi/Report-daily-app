import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BusinessFormRiskFlagCode } from '@prisma/client';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Body for POST /admin/business-forms/:id/risk-flags. Each (form, code)
 * pair is unique — repeating an existing code is treated as an "update
 * note" rather than a duplicate insert.
 */
export class AdminAddRiskFlagDto {
  @IsEnum(BusinessFormRiskFlagCode)
  code!: BusinessFormRiskFlagCode;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  note?: string;
}
