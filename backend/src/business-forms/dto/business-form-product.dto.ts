import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class BusinessFormProductDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price!: number;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  imageUrl?: string;
}
