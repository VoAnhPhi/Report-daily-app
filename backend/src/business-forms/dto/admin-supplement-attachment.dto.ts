import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Slot keys that an admin-supplemented attachment may be pinned to. Matches
 * the typed legal-doc URL fields on `BusinessForm`. Null/omitted = free-form
 * attachment ("Hồ sơ khác").
 */
export const ADMIN_SUPPLEMENT_DOC_TYPES = [
  'gpkdFileUrl',
  'congBoSpFileUrl',
  'kiemNghiemFileUrl',
  'nhanSpFileUrl',
  'maVachFileUrl',
  'tccsFileUrl',
  'coFileUrl',
  'dangKyNhFileUrl',
  'gmpFileUrl',
  'otherDocFileUrl',
] as const;

export type AdminSupplementDocType = (typeof ADMIN_SUPPLEMENT_DOC_TYPES)[number];

export class AdminSupplementAttachmentDto {
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

  @IsOptional()
  @IsIn(ADMIN_SUPPLEMENT_DOC_TYPES as unknown as string[])
  documentType?: AdminSupplementDocType;
}
