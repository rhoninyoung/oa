import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private readonly MAX_ATTEMPTS = 3;
  private readonly RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  async emit(scheduleId: string, type: string, payload: Record<string, unknown>): Promise<void> {
    const key = `${type}|${scheduleId}|${Date.now()}`;
    await this.prisma.notificationOutbox.upsert({
      where: { idempotencyKey: key },
      create: { idempotencyKey: key, type: type as any, payload: payload as any },
      update: { payload: payload as any, dispatchedAt: null },
    });
    this.logger.log('[Outbox] Emitted:', { type, scheduleId });
  }

  async dispatchAll(): Promise<{ processed: number; failed: number }> {
    const pending = await this.prisma.notificationOutbox.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { dispatchedAt: null },
          {
            lastAttempt: { lt: new Date(Date.now() - this.RETRY_INTERVAL_MS) },
          },
        ],
      },
      take: 50,
    });

    let processed = 0;
    let failed = 0;

    for (const entry of pending) {
      if (entry.attempts >= this.MAX_ATTEMPTS) {
        await this.prisma.notificationOutbox.update({
          where: { id: entry.id },
          data: { status: 'FAILED' },
        });
        this.logger.warn(`[Outbox] Max attempts reached for ${entry.id}, marking FAILED`);
        continue;
      }

      try {
        const payload = entry.payload as any;

        if (entry.type === 'EMAIL') {
          await this.sendEmail(payload);
        } else if (entry.type === 'DINGTALK') {
          await this.sendDingTalk(payload);
        }

        await this.prisma.notificationOutbox.update({
          where: { id: entry.id },
          data: {
            status: 'RESOLVED',
            dispatchedAt: new Date(),
            lastAttempt: new Date(),
            attempts: { increment: 1 },
          },
        });
        processed++;
        this.logger.log(`[Outbox] Successfully sent ${entry.type} notification ${entry.id}`);
      } catch (err: any) {
        this.logger.error(`[Outbox] Failed to send ${entry.type} notification ${entry.id}: ${err.message}`);
        await this.prisma.notificationOutbox.update({
          where: { id: entry.id },
          data: {
            lastAttempt: new Date(),
            attempts: { increment: 1 },
            error: err.message,
          },
        });
        failed++;
      }
    }

    return { processed, failed };
  }

  private async sendEmail(payload: any): Promise<void> {
    const { to, subject, body } = payload;
    this.logger.log(`[Email] To: ${to}, Subject: ${subject}`);

    if (process.env.SMTP_URL) {
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport(process.env.SMTP_URL);
        await transporter.sendMail({
          from: '"OA System" <no-reply@example.com>',
          to,
          subject,
          text: body,
        });
        this.logger.log(`[Email] Sent successfully to ${to}`);
      } catch (err: any) {
        throw new Error(`Email send failed: ${err.message}`);
      }
    } else {
      this.logger.log('[Email] SMTP_URL not configured, skipping actual send');
    }
  }

  private async sendDingTalk(payload: any): Promise<void> {
    const { webhookUrl, content } = payload;
    this.logger.log(`[DingTalk] Webhook: ${webhookUrl}`);

    if (webhookUrl && webhookUrl.startsWith('http')) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ msgtype: 'text', text: { content } }),
        });
        if (!response.ok) {
          throw new Error(`DingTalk API returned ${response.status}`);
        }
        this.logger.log('[DingTalk] Sent successfully');
      } catch (err: any) {
        throw new Error(`DingTalk send failed: ${err.message}`);
      }
    } else {
      this.logger.log('[DingTalk] No valid webhook URL, skipping');
    }
  }
}
