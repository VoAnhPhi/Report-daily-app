import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto, RefreshTokenDto, RegisterDto } from './simple-auth.dto';
import { SimpleAuthService } from './simple-auth.service';

@Controller('auth')
export class SimpleAuthController {
  constructor(private readonly auth: SimpleAuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('current-user')
  currentUser(@Req() req: Request & { user: { id: string } }) {
    return this.auth.currentUser(req.user.id);
  }

  @Public()
  @Post('logout')
  logout() {
    return { success: true, message: 'Đã đăng xuất' };
  }
}
