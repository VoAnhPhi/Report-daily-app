import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BusinessFormAttachmentVerificationStatus } from '@prisma/client';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Body for PATCH /admin/business-forms/:id/attachments/:attachmentId/verification.
 * `status` always required; `note` optional but encouraged for any non-`valid`
 * state so the user understands what to fix.
 */
export class AdminVerifyAttachmentDto {
  @IsEnum(BusinessFormAttachmentVerificationStatus)
  status!: BusinessFormAttachmentVerificationStatus;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  note?: string;
}
