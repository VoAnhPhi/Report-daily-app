import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailDiagnosticsService } from './email-diagnostics.service';
import { UserLookupAdapter } from './adapters/user-lookup.adapter';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailDiagnosticsService,
    UserLookupAdapter,
    PrismaService,
    {
      provide: 'UsersLookupPort',
      useClass: UserLookupAdapter,
    },
  ],
  exports: [EmailService, EmailDiagnosticsService, PrismaService],
})
export class EmailModule {}
