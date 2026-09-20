import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateBusinessFormFieldFlagDto } from './business-form-field-flag.dto';

export class AdminOptionalNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;

  @IsOptional()
  @IsBoolean()
  override?: boolean;
}

export class AdminRequiredNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  adminNote!: string;
}

/**
 * Variant of AdminRequiredNoteDto for `needs-more-info`. Optionally carries a
 * list of field-level flags so admin can pinpoint exactly which fields the
 * user must revise. When `flags` is provided the backend replaces the form's
 * existing flag set atomically.
 */
export class AdminNeedsMoreInfoDto extends AdminRequiredNoteDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateBusinessFormFieldFlagDto)
  flags?: CreateBusinessFormFieldFlagDto[];
}
