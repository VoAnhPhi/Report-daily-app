import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateBusinessFormDto } from './create-business-form.dto';

export class AdminUpdateBusinessFormDto extends PartialType(
  CreateBusinessFormDto,
) {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
