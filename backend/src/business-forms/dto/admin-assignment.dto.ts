import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * PATCH /admin/business-forms/:id/assignment body. Setting `assignedToAdminId`
 * to null/empty string un-assigns. The acting admin (assigner) is taken from
 * the JWT payload, never from the body.
 */
export class AdminAssignmentDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? null : value,
  )
  assignedToAdminId?: string | null;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  note?: string;
}
