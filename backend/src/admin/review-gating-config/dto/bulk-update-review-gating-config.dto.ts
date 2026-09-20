import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';

class ReviewGatingConfigUpdateItem {
  @IsString()
  featureKey: string;

  @IsBoolean()
  isEnabled: boolean;
}

export class BulkUpdateReviewGatingConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewGatingConfigUpdateItem)
  updates: ReviewGatingConfigUpdateItem[];
}
