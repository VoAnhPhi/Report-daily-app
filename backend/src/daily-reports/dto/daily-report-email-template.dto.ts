import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDailyReportEmailTemplateDto {
  @IsString()
  subject!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsObject()
  quillDelta?: Record<string, unknown>;

  @IsInt()
  @Min(1)
  expectedRevision!: number;
}

export class PublishDailyReportEmailTemplateDto {
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}

export class TestDailyReportEmailTemplateDto {
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
