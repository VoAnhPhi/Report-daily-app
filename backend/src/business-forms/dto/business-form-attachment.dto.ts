import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Free-form attachment uploaded with a label (e.g. file purpose) and an
 * optional note explaining why the file is attached. Used for "Hồ sơ khác"
 * on structured categories and as the primary upload mechanism for the
 * Tư vấn / Khác categories.
 */
export class BusinessFormAttachmentDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsString()
  @IsUrl({ require_tld: false })
  fileUrl!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  note?: string;
}
