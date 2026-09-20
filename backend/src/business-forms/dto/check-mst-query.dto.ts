import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

// Keep only alphanumerics (drop whitespace / invisible copy-paste marks).
// Tax code may be 8–13 alphanumeric chars (business or individual); the VietQR
// lookup itself only resolves 10/13-digit codes and guards that internally.
const trimAndStripAlnum = ({ value }: { value: unknown }) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).replace(/[^A-Za-z0-9]/g, '')
    : value;

export class CheckMstQueryDto {
  @Transform(trimAndStripAlnum)
  @IsString()
  @Matches(/^[A-Za-z0-9]{8,13}$/, {
    message: 'Mã số thuế gồm 8–13 ký tự (chữ hoặc số)',
  })
  taxCode!: string;
}
