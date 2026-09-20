import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OriginSource, Prisma, RegistrationChannel, RegistrationChannelConfidence, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/services/prisma.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from './simple-auth.dto';

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  phoneNumber: true,
  referenceId: true,
  role: true,
  status: true,
  isActive: true,
  verificationDate: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type PublicUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

@Injectable()
export class SimpleAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        emailVerified: true,
        passwordHash,
        fullName: dto.fullName.trim(),
        phoneNumber: dto.phoneNumber?.trim() || '',
        country: dto.country?.trim() || 'VN',
        referenceId: `USR-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
        role: Role.user,
        status: UserStatus.active,
        isActive: true,
        verificationDate: new Date(),
        source: OriginSource.acta,
        registrationChannel: RegistrationChannel.register_web,
        registrationChannelConfidence: RegistrationChannelConfidence.declared,
      },
      select: userSelect,
    });

    return {
      message: 'Tạo tài khoản thành công',
      user,
    };
  }

  async login(dto: LoginDto) {
    const username = dto.username.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: username }, { referenceId: dto.username.trim() }],
        deletedAt: null,
      },
      select: { ...userSelect, passwordHash: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (!user.isActive || user.status === UserStatus.inactive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    const publicUser = this.toPublicUser(user);
    return {
      success: true,
      accessToken: await this.signAccessToken(publicUser),
      refreshToken: await this.signRefreshToken(publicUser),
      user: publicUser,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwt.verifyAsync<{ id: string }>(dto.refreshToken, {
        secret: this.refreshSecret,
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id, deletedAt: null },
        select: userSelect,
      });
      if (!user || !user.isActive || user.status === UserStatus.inactive) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }
      return {
        accessToken: await this.signAccessToken(user),
        refreshToken: await this.signRefreshToken(user),
      };
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  async currentUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: userSelect,
    });
    if (!user || !user.isActive || user.status === UserStatus.inactive) {
      throw new UnauthorizedException('Tài khoản không khả dụng');
    }
    return user;
  }

  private get accessSecret(): string {
    return this.config.get<string>('app.jwtSecretKey') || process.env.JWT_SECRET_KEY || 'local-access-secret';
  }

  private get refreshSecret(): string {
    return this.config.get<string>('app.jwtRefreshSecretKey') || process.env.JWT_REFRESH_SECRET_KEY || 'local-refresh-secret';
  }

  private signAccessToken(user: PublicUser) {
    return this.jwt.signAsync(
      { id: user.id, email: user.email, phoneNumber: user.phoneNumber, referenceId: user.referenceId, role: user.role, status: user.status },
      { secret: this.accessSecret, expiresIn: '15m' },
    );
  }

  private signRefreshToken(user: PublicUser) {
    return this.jwt.signAsync({ id: user.id }, { secret: this.refreshSecret, expiresIn: '30d' });
  }

  private toPublicUser(user: PublicUser | (PublicUser & { passwordHash: string })) {
    const { passwordHash: _passwordHash, ...publicUser } = user as PublicUser & { passwordHash?: string };
    return publicUser;
  }
}
