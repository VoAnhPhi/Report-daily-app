import { IsBoolean } from 'class-validator';

export class AdminApprovalGateDto {
  @IsBoolean()
  isEnabled: boolean;
}
