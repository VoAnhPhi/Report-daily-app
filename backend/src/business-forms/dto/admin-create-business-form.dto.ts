import { IsString, MinLength } from 'class-validator';
import { CreateBusinessFormDto } from './create-business-form.dto';

export class AdminCreateBusinessFormDto extends CreateBusinessFormDto {
  @IsString()
  @MinLength(1)
  userId!: string;
}
