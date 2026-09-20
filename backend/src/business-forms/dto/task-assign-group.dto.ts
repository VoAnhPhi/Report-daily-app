import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const MAX_TASK_ASSIGN_GROUP_MEMBERS = 100;

export class CreateTaskAssignGroupDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_TASK_ASSIGN_GROUP_MEMBERS)
  memberIds?: string[];
}

export class UpdateTaskAssignGroupDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_TASK_ASSIGN_GROUP_MEMBERS)
  memberIds?: string[];
}

export type GroupWithMembers = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  viewerId?: string;
  owner?: {
    id: string;
    fullName: string;
    referenceId: string | null;
    avatar: { fileUrl: string | null } | null;
    isOwner?: boolean;
  };
  members: Array<{
    user: {
      id: string;
      fullName: string;
      referenceId: string | null;
      avatar: { fileUrl: string | null } | null;
    };
  }>;
};
