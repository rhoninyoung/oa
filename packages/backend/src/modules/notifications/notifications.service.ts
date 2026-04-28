import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';

export interface TransitionNotification {
  type: 'EMAIL' | 'DINGTALK';
  scheduleId: string;
  projectName: string;
  iterationName: string;
  groupName: string;
  actorName: string;
  action: 'submit' | 'approve' | 'reject' | 'reschedule';
  rejectReason?: string;
  timestamp: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly MAX_ATTEMPTS = 3;
  private readonly RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enqueue a notification for async delivery
   */
  async enqueue(notification: TransitionNotification, recipientEmail?: string, dingtalkWebhookUrl?: string) {
    if (recipientEmail) {
      const key = `email|${notification.scheduleId}|${notification.action}|${Date.now()}`;
      await this.prisma.notificationOutbox.upsert({
        where: { idempotencyKey: key },
        create: {
          idempotencyKey: key,
          type: 'EMAIL',
          payload: {
            to: recipientEmail,
            subject: this.buildEmailSubject(notification),
            body: this.buildEmailBody(notification),
            ...notification,
          } as any,
        },
        update: {},
      });
    }

    if (dingtalkWebhookUrl) {
      const key = `dingtalk|${notification.scheduleId}|${notification.action}|${Date.now()}`;
      await this.prisma.notificationOutbox.upsert({
        where: { idempotencyKey: key },
        create: {
          idempotencyKey: key,
          type: 'DINGTALK',
          payload: {
            webhookUrl: dingtalkWebhookUrl,
            content: this.buildDingTalkContent(notification),
            ...notification,
          } as any,
        },
        update: {},
      });
    }
  }

  /**
   * Process all pending outbox entries — called by cron/worker
   */
  async processOutbox(): Promise<{ processed: number; failed: number }> {
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
        continue;
      }

      try {
        const payload = entry.payload as any;

        if (entry.type === 'EMAIL') {
          await this.sendEmail(payload.to, payload.subject, payload.body);
        } else if (entry.type === 'DINGTALK') {
          await this.sendDingTalk(payload.webhookUrl, payload.content);
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
      } catch (err: any) {
        this.logger.error(`[Outbox] Failed to send ${entry.type} notification: ${err.message}`);
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

  private buildEmailSubject(n: TransitionNotification): string {
    const actionText = { submit: '提交', approve: '批准', reject: '拒绝', reschedule: '重新排期' };
    return `【排期审批通知】${n.iterationName} - ${n.groupName} - ${actionText[n.action]}`;
  }

  private buildEmailBody(n: TransitionNotification): string {
    const actionText = { submit: '提交', approve: '批准', reject: '拒绝', reschedule: '重新排期' };
    let body = `【排期审批通知】\n\n`;
    body += `排期名称：${n.iterationName} - ${n.groupName}\n`;
    body += `项目：${n.projectName}\n`;
    body += `组长：${n.actorName}\n`;
    body += `操作：${actionText[n.action]}\n`;
    body += `时间：${n.timestamp}\n`;
    if (n.rejectReason) {
      body += `理由：${n.rejectReason}\n`;
    }
    return body;
  }

  private buildDingTalkContent(n: TransitionNotification): string {
    const actionText = { submit: '提交', approve: '批准', reject: '拒绝', reschedule: '重新排期' };
    let content = `【排期审批通知】\n`;
    content += `排期名称：${n.iterationName} - ${n.groupName}\n`;
    content += `项目：${n.projectName}\n`;
    content += `组长：${n.actorName}\n`;
    content += `操作：${actionText[n.action]}\n`;
    content += `时间：${n.timestamp}\n`;
    if (n.rejectReason) {
      content += `理由：${n.rejectReason}\n`;
    }
    return content;
  }

  private async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // In production, integrate with nodemailer:
    // const transporter = nodemailer.createTransport({ ... });
    // await transporter.sendMail({ from: '"OA System" <no-reply@example.com>', to, subject, text: body });
    this.logger.log(`[Email] To: ${to}, Subject: ${subject}`);
    // For MVP: just log (actual email sending requires SMTP config)
    if (process.env.SMTP_URL) {
      const { default: nodemailer } = await import('nodemailer');
      const transporter = nodemailer.createTransport(process.env.SMTP_URL);
      await transporter.sendMail({
        from: '"OA System" <no-reply@example.com>',
        to,
        subject,
        text: body,
      });
    }
  }

  private async sendDingTalk(webhookUrl: string, content: string): Promise<void> {
    // In production, send HTTP POST to DingTalk webhook:
    // await fetch(webhookUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ msgtype: 'text', text: { content } }),
    // });
    this.logger.log(`[DingTalk] Webhook: ${webhookUrl}, Content: ${content}`);
    if (webhookUrl && webhookUrl.startsWith('http')) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msgtype: 'text', text: { content } }),
      });
    }
  }
}
