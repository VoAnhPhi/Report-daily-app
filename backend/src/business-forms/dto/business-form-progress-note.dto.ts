import { PartialType } from '@nestjs/mapped-types';
import { BusinessFormProgressStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateBusinessFormProgressNoteDto {
  @IsEnum(BusinessFormProgressStatus)
  status!: BusinessFormProgressStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({}, { each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsBoolean()
  isVisibleToUser?: boolean;

  @IsOptional()
  @IsBoolean()
  hideSupplierIdentity?: boolean;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  supplierName?: string;
}

export class UpdateBusinessFormProgressNoteDto extends PartialType(
  CreateBusinessFormProgressNoteDto,
) {}

/**
 * Admin-facing response shape — includes visibility flags + author identity.
 */
export class BusinessFormProgressNoteAdminResponseDto {
  id!: string;
  status!: BusinessFormProgressStatus;
  note?: string | null;
  imageUrls!: string[];
  isVisibleToUser!: boolean;
  hideSupplierIdentity!: boolean;
  supplierName?: string | null;

  createdById!: string;
  createdBy?: { id: string; fullName: string } | null;

  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Public/user-facing response shape — strips visibility flags and author
 * identity. `supplierName` is null when admin chose to hide identity.
 */
export class BusinessFormProgressNotePublicResponseDto {
  id!: string;
  status!: BusinessFormProgressStatus;
  note?: string | null;
  imageUrls!: string[];
  supplierName?: string | null;
  createdAt!: Date;
}

type ProgressNoteRow = {
  id: string;
  status: BusinessFormProgressStatus;
  note: string | null;
  imageUrls: string[];
  isVisibleToUser: boolean;
  hideSupplierIdentity: boolean;
  supplierName: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; fullName: string } | null;
};

export function toAdminProgressNote(
  row: ProgressNoteRow,
): BusinessFormProgressNoteAdminResponseDto {
  return {
    id: row.id,
    status: row.status,
    note: row.note,
    imageUrls: row.imageUrls,
    isVisibleToUser: row.isVisibleToUser,
    hideSupplierIdentity: row.hideSupplierIdentity,
    supplierName: row.supplierName,
    createdById: row.createdById,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Filter to user-visible only and redact supplier identity when anonymized.
 * Admin-only metadata (visibility flags, createdBy, updatedAt) is dropped.
 */
export function toPublicProgressNotes(
  rows: ProgressNoteRow[],
): BusinessFormProgressNotePublicResponseDto[] {
  return rows
    .filter((r) => r.isVisibleToUser)
    .map((r) => ({
      id: r.id,
      status: r.status,
      note: r.note,
      imageUrls: r.imageUrls,
      supplierName: r.hideSupplierIdentity ? null : r.supplierName,
      createdAt: r.createdAt,
    }));
}
