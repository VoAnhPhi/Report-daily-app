import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const nullable = ({ value }: { value: unknown }) =>
  value === null || value === undefined || value === '' ? null : value;

/**
 * Body for PATCH /admin/business-forms/:id/potential. All fields optional;
 * setting any to null/empty clears it.
 */
export class AdminPotentialDto {
  @IsOptional()
  @Transform(nullable)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  potentialScore?: number | null;

  @IsOptional()
  @Transform(nullable)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedRevenue?: number | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null) return null;
    if (typeof value === 'string') return value.trim();
    return value;
  })
  @IsString()
  @MaxLength(2000)
  cooperationFit?: string | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null) return null;
    if (typeof value === 'string') return value.trim();
    return value;
  })
  @IsString()
  @MaxLength(2000)
  potentialNote?: string | null;
}
