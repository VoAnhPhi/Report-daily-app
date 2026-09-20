import { PartialType } from '@nestjs/mapped-types';
import { CreateBusinessFormDto } from './create-business-form.dto';

export class UpdateBusinessFormDto extends PartialType(CreateBusinessFormDto) {}
