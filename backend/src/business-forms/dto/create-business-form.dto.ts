import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BusinessFormProductDto } from './business-form-product.dto';
import { BusinessFormAttachmentDto } from './business-form-attachment.dto';

export class LegalDocFileDto {
  @IsString()
  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

const trimAndStripDigits = ({ value }: { value: unknown }) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().replace(/\D/g, '')
    : value;

// Tax code can be 8–13 alphanumeric chars (business OR individual). Strip any
// non-alphanumeric chars (whitespace, invisible Unicode marks from copy-paste)
// so they don't fail validation while looking visually valid.
const trimAndStripAlnum = ({ value }: { value: unknown }) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).replace(/[^A-Za-z0-9]/g, '')
    : value;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateBusinessFormDto {
  @IsOptional()
  @IsBoolean()
  isIndividual?: boolean;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  companyName!: string;

  @Transform(trimAndStripAlnum)
  @IsString()
  @Matches(/^[A-Za-z0-9]{8,13}$/, {
    message: 'Mã số thuế gồm 8–13 ký tự (chữ hoặc số)',
  })
  taxCode!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  contactName!: string;

  @Transform(trimString)
  @IsString()
  @Matches(/^(\+84|0)\d{9,10}$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  contactPhone!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(4000)
  productInfo?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocFileDto)
  gpkdFileUrl?: LegalDocFileDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocFileDto)
  congBoSpFileUrl?: LegalDocFileDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocFileDto)
  kiemNghiemFileUrl?: LegalDocFileDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocFileDto)
  nhanSpFileUrl?: LegalDocFileDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocFileDto)
  maVachFileUrl?: LegalDocFileDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocFileDto)
  tccsFileUrl?: LegalDocFileDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocFileDto)
  coFileUrl?: LegalDocFileDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocFileDto)
  dangKyNhFileUrl?: LegalDocFileDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocFileDto)
  gmpFileUrl?: LegalDocFileDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocFileDto)
  otherDocFileUrl?: LegalDocFileDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BusinessFormProductDto)
  products?: BusinessFormProductDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => BusinessFormAttachmentDto)
  attachments?: BusinessFormAttachmentDto[];
}
