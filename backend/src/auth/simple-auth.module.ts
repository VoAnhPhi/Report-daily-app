import { Module } from '@nestjs/common';
import { SimpleAuthController } from './simple-auth.controller';
import { SimpleAuthService } from './simple-auth.service';

@Module({
  controllers: [SimpleAuthController],
  providers: [SimpleAuthService],
  exports: [SimpleAuthService],
})
export class SimpleAuthModule {}
