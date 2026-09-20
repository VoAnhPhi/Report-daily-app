import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Canonical field keys an admin can flag during `needs_more_info`. Anything
 * outside this whitelist is rejected at validation. Mirrored on FE to render
 * the field-flag picker.
 */
export const BUSINESS_FORM_FLAGGABLE_FIELDS = [
  // Core info
  'category',
  'companyName',
  'taxCode',
  'address',
  'contactName',
  'contactPhone',
  // Free-form descriptions
  'description',
  'productInfo',
  // Legal docs
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
  // Collections
  'products',
  'attachments',
] as const;

export type BusinessFormFlaggableField =
  (typeof BUSINESS_FORM_FLAGGABLE_FIELDS)[number];

export class CreateBusinessFormFieldFlagDto {
  @IsString()
  @IsIn(BUSINESS_FORM_FLAGGABLE_FIELDS as readonly string[])
  fieldKey!: BusinessFormFlaggableField;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export class BusinessFormFieldFlagsArrayDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateBusinessFormFieldFlagDto)
  flags!: CreateBusinessFormFieldFlagDto[];
}

export class BusinessFormFieldFlagResponseDto {
  id!: string;
  fieldKey!: string;
  reason!: string;
  createdAt!: Date;
}
