import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export type UserRole = Role;

export class RecipientsDto {
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayUnique()
  emails?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  userIds?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  @ArrayUnique()
  roles?: UserRole[];
}

export class AttachmentDto {
  @IsString()
  @MaxLength(255)
  filename: string;

  @IsUrl()
  path: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customFilename?: string;
}

export class SendEmailDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  html?: string;

  @IsOptional()
  @IsObject()
  quillDelta?: {
    ops: Record<string, unknown>[];
  };

  @IsOptional()
  @IsBoolean()
  sanitizeHtml?: boolean = true;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  previewText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  greeting?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerNote?: string;

  @ValidateNested()
  @Type(() => RecipientsDto)
  recipients: RecipientsDto;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayUnique()
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayUnique()
  bcc?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  includeInactiveUsers?: boolean = false;

  /**
   * One separate message per recipient, in a single HTTP call.
   *
   * Without this flag a list of <= 100 addresses goes out as ONE Resend message
   * whose `to` array holds every address, so every recipient reads everybody
   * else's address. The batch path below already builds one message per address
   * (`to: email`), but it only ever runs above `maxBatchSize`, so a caller that
   * must not leak addresses had no way to reach it. This flag reaches it.
   *
   * Do NOT combine with `cc`/`bcc`: those are copied onto EVERY message in the
   * batch, so the copied address would receive N duplicates.
   *
   * Note: Resend validates a batch strictly — one malformed address rejects the
   * whole batch. Callers that assemble addresses from untrusted input should
   * filter them by shape first.
   */
  @IsOptional()
  @IsBoolean()
  perRecipientDelivery?: boolean;
}
