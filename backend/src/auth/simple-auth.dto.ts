import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
