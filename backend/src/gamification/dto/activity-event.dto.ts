import { IsString, IsOptional, IsObject } from 'class-validator';

export class ActivityEventDto {
  @IsString()
  userId: string;

  @IsString()
  activityType: string;

  @IsString()
  @IsOptional()
  targetType?: string;

  @IsString()
  @IsOptional()
  targetId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
