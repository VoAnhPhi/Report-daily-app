import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../auth/jwt-payload';
import { CurrentUser } from '../../users/users.decorator';
import { BusinessFormsService } from '../services/business-forms.service';
import { CreateBusinessFormDto } from '../dto/create-business-form.dto';
import { UpdateBusinessFormDto } from '../dto/update-business-form.dto';
import { ListBusinessFormsQueryDto } from '../dto/list-business-forms-query.dto';
import { CheckMstQueryDto } from '../dto/check-mst-query.dto';
import {
  BusinessFormResponseDto,
  CheckMstResponseDto,
} from '../dto/business-form-response.dto';

@Controller('business-forms')
@UseGuards(JwtAuthGuard)
export class BusinessFormsController {
  constructor(private readonly service: BusinessFormsService) {}

  @Post()
  async create(
    @Body() dto: CreateBusinessFormDto,
    @CurrentUser() user: JwtPayload,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ): Promise<BusinessFormResponseDto> {
    return this.service.create(dto, user.id, onBehalfOfUserId);
  }

  @Get('cooperation-categories')
  listCooperationCategories(): { value: string; label: string }[] {
    return this.service.listCooperationCategories();
  }

  @Get('me')
  async findMine(
    @Query() query: ListBusinessFormsQueryDto,
    @CurrentUser() user: JwtPayload,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.service.findByOwner(user.id, query, onBehalfOfUserId);
  }

  @Get('me/:id')
  async findMineOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ): Promise<BusinessFormResponseDto> {
    return this.service.findByOwnerOne(user.id, id, onBehalfOfUserId);
  }

  @Get('check-mst')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async checkMst(
    @Query() query: CheckMstQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CheckMstResponseDto> {
    return this.service.checkMst(query.taxCode, user.id);
  }

  @Get('lookup-mst')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async lookupMst(@Query() query: CheckMstQueryDto) {
    return this.service.lookupMst(query.taxCode);
  }

  @Patch(':id')
  async updateOwn(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessFormDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.updateOwn(id, dto, user.id);
  }

  @Delete(':id')
  async deleteOwn(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: true }> {
    return this.service.softDeleteOwn(id, user.id);
  }
}
