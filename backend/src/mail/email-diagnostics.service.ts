import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { applyMailDeliveryGuard } from './mail-delivery.guard';
import { PrismaService } from '../common/services/prisma.service';

export interface EmailDiagnosticResult {
  resendApiKeyValid: boolean;
  domainVerified: boolean;
  fromEmailValid: boolean;
  recentEmailStatus: {
    totalSent: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    bounceRate: number;
  };
  issues: string[];
  recommendations: string[];
}

@Injectable()
export class EmailDiagnosticsService {
  private readonly logger = new Logger(EmailDiagnosticsService.name);
  private resend: Resend;

  constructor(private readonly prisma: PrismaService) {
    this.resend = applyMailDeliveryGuard(
      new Resend(process.env.RESEND_API_KEY),
      this.logger,
    );
  }

  /**
   * Comprehensive email system diagnostics
   */
  async runDiagnostics(): Promise<EmailDiagnosticResult> {
    const result: EmailDiagnosticResult = {
      resendApiKeyValid: false,
      domainVerified: false,
      fromEmailValid: false,
      recentEmailStatus: {
        totalSent: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        bounceRate: 0,
      },
      issues: [],
      recommendations: [],
    };

    try {
      // 1. Check Resend API Key validity
      await this.checkResendApiKey(result);

      // 2. Check domain verification
      await this.checkDomainVerification(result);

      // 3. Check from email validity
      await this.checkFromEmailValidity(result);

      // 4. Analyze recent email performance
      await this.analyzeRecentEmailPerformance(result);

      // 5. Generate recommendations
      this.generateRecommendations(result);
    } catch (error) {
      this.logger.error('Error running email diagnostics:', error);
      result.issues.push(`Diagnostic error: ${error.message}`);
    }

    return result;
  }

  private async checkResendApiKey(
    result: EmailDiagnosticResult,
  ): Promise<void> {
    try {
      if (!process.env.RESEND_API_KEY) {
        result.issues.push('RESEND_API_KEY environment variable is not set');
        return;
      }

      // Test API key by making a simple API call
      const domains = await this.resend.domains.list();
      result.resendApiKeyValid = true;
      this.logger.log('Resend API key is valid');
    } catch (error) {
      result.resendApiKeyValid = false;
      result.issues.push(`Resend API key is invalid: ${error.message}`);
      this.logger.error('Resend API key validation failed:', error);
    }
  }

  private async checkDomainVerification(
    result: EmailDiagnosticResult,
  ): Promise<void> {
    try {
      const domains = await this.resend.domains.list();
      const domainsList = Array.isArray(domains.data) ? domains.data : [];
      const actaDomain = domainsList.find(
        (domain: { name: string; status: string }) =>
          domain.name === 'acta.vn' || domain.name.endsWith('.acta.vn'),
      );

      if (actaDomain) {
        result.domainVerified = actaDomain.status === 'verified';
        if (!result.domainVerified) {
          result.issues.push(
            `Domain ${actaDomain.name} is not verified. Status: ${actaDomain.status}`,
          );
        }
      } else {
        result.issues.push('Domain acta.vn is not configured in Resend');
        result.recommendations.push(
          'Add and verify acta.vn domain in Resend dashboard',
        );
      }
    } catch (error) {
      result.issues.push(
        `Failed to check domain verification: ${error.message}`,
      );
    }
  }

  private async checkFromEmailValidity(
    result: EmailDiagnosticResult,
  ): Promise<void> {
    try {
      // Test sending a simple email to verify from address
      const testResponse = await this.resend.emails.send({
        from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
        to: 'test@example.com', // This will fail but we can check the error
        subject: 'Test Email',
        html: '<p>Test</p>',
      });

      // If we get here without error, the from address is valid
      result.fromEmailValid = true;
    } catch (error) {
      if (
        error.message.includes('Invalid from address') ||
        error.message.includes('Domain not verified')
      ) {
        result.issues.push(`From email address is invalid: ${error.message}`);
        result.recommendations.push(
          'Verify the from email address in Resend dashboard',
        );
      } else {
        // Other errors (like invalid recipient) are expected for this test
        result.fromEmailValid = true;
      }
    }
  }

  private async analyzeRecentEmailPerformance(
    result: EmailDiagnosticResult,
  ): Promise<void> {
    try {
      // Get emails from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentEmails = await this.prisma.sentEmail.findMany({
        where: {
          sentAt: {
            gte: sevenDaysAgo,
          },
        },
        include: {
          recipients: true,
        },
      });

      result.recentEmailStatus.totalSent = recentEmails.length;

      let successfulDeliveries = 0;
      let failedDeliveries = 0;
      let bouncedCount = 0;

      for (const email of recentEmails) {
        if (email.status === 'sent') {
          successfulDeliveries++;
        } else {
          failedDeliveries++;
        }

        // Count bounces from recipients
        bouncedCount += email.recipients.filter(
          (r) => r.status === 'failed',
        ).length;
      }

      result.recentEmailStatus.successfulDeliveries = successfulDeliveries;
      result.recentEmailStatus.failedDeliveries = failedDeliveries;
      result.recentEmailStatus.bounceRate =
        result.recentEmailStatus.totalSent > 0
          ? (bouncedCount / result.recentEmailStatus.totalSent) * 100
          : 0;

      // Add issues based on performance
      if (result.recentEmailStatus.bounceRate > 5) {
        result.issues.push(
          `High bounce rate: ${result.recentEmailStatus.bounceRate.toFixed(2)}%`,
        );
      }

      if (result.recentEmailStatus.failedDeliveries > 0) {
        result.issues.push(
          `${result.recentEmailStatus.failedDeliveries} emails failed to send`,
        );
      }
    } catch (error) {
      result.issues.push(
        `Failed to analyze email performance: ${error.message}`,
      );
    }
  }

  private generateRecommendations(result: EmailDiagnosticResult): void {
    if (!result.resendApiKeyValid) {
      result.recommendations.push(
        'Set up a valid RESEND_API_KEY environment variable',
      );
    }

    if (!result.domainVerified) {
      result.recommendations.push('Verify your domain in Resend dashboard');
      result.recommendations.push(
        'Set up SPF, DKIM, and DMARC records for your domain',
      );
    }

    if (!result.fromEmailValid) {
      result.recommendations.push(
        'Use a verified email address as the from address',
      );
      result.recommendations.push(
        'Consider using a subdomain like noreply@mail.acta.vn',
      );
    }

    if (result.recentEmailStatus.bounceRate > 5) {
      result.recommendations.push(
        'Clean your email list to reduce bounce rate',
      );
      result.recommendations.push('Implement email validation before sending');
    }

    if (result.recentEmailStatus.totalSent === 0) {
      result.recommendations.push(
        'No recent emails found - test the system with a small batch',
      );
    }

    // General recommendations
    result.recommendations.push(
      'Monitor Resend dashboard for delivery reports',
    );
    result.recommendations.push('Set up webhooks to track email events');
    result.recommendations.push(
      'Implement proper error handling for failed deliveries',
    );
  }

  /**
   * Test email sending with detailed error reporting
   */
  async testEmailSending(toEmail: string): Promise<{
    success: boolean;
    message: string;
    resendResponse?: unknown;
    error?: string;
  }> {
    try {
      const response = await this.resend.emails.send({
        from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
        to: toEmail,
        subject: 'ACTA Email System Test',
        html: `
          <h1>Email System Test</h1>
          <p>This is a test email to verify the email system is working correctly.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        `,
        headers: {
          'Content-Language': 'vi',
          'X-Language': 'Vietnamese',
        },
      });

      this.logger.log('Test email sent successfully:', response);

      return {
        success: true,
        message: 'Test email sent successfully',
        resendResponse: response,
      };
    } catch (error) {
      this.logger.error('Test email failed:', error);

      return {
        success: false,
        message: 'Test email failed',
        error: error.message,
        resendResponse: error.response?.data,
      };
    }
  }
}
