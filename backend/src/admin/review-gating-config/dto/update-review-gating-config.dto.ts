import { IsBoolean } from 'class-validator';

export class UpdateReviewGatingConfigDto {
  @IsBoolean()
  isEnabled: boolean;
}
