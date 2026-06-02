import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface ConfirmationMail {
  to: string;
  name?: string | null;
  link: string;
  lang?: string;
}

// Thin wrapper around Resend. When RESEND_API_KEY is absent (local dev) it logs
// the link instead of sending, so the confirmation flow stays testable offline.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: Resend | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('RESEND_API_KEY');
    this.client = key ? new Resend(key) : null;
    this.from = this.config.get<string>('MAIL_FROM', 'ShoDumo <noreply@shodumo.com>');
  }

  async sendConfirmation(mail: ConfirmationMail): Promise<void> {
    const { subject, html, text } = this.confirmationTemplate(mail);

    if (!this.client) {
      this.logger.warn(
        `RESEND_API_KEY unset — confirmation link for ${mail.to}: ${mail.link}`,
      );
      return;
    }

    const { error } = await this.client.emails.send({
      from: this.from,
      to: mail.to,
      subject,
      html,
      text,
    });
    if (error) {
      this.logger.error(`Resend failed for ${mail.to}: ${error.message}`);
      throw new Error('Failed to send confirmation email');
    }
  }

  private confirmationTemplate(mail: ConfirmationMail): {
    subject: string;
    html: string;
    text: string;
  } {
    const en = (mail.lang || 'uk') === 'en';
    const greeting = mail.name ? `${en ? 'Hi' : 'Привіт'}, ${mail.name}!` : en ? 'Hi!' : 'Привіт!';
    const subject = en ? 'Confirm your ShoDumo account' : 'Підтвердіть ваш акаунт ShoDumo';
    const cta = en ? 'Confirm email' : 'Підтвердити email';
    const lead = en
      ? 'Tap the button below to finish creating your ShoDumo account.'
      : 'Натисніть кнопку нижче, щоб завершити створення акаунта ShoDumo.';
    const expiry = en
      ? 'This link expires in 24 hours.'
      : 'Посилання дійсне протягом 24 годин.';
    const fallback = en
      ? "If the button doesn't work, copy this link into your browser:"
      : 'Якщо кнопка не працює, скопіюйте це посилання у браузер:';

    const html = `<!doctype html><html><body style="font-family:system-ui,Arial,sans-serif;background:#f6f6f8;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
    <h1 style="font-size:20px;margin:0 0 8px">${greeting}</h1>
    <p style="color:#444;margin:0 0 24px">${lead}</p>
    <a href="${mail.link}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ff5436);color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600">${cta}</a>
    <p style="color:#888;font-size:13px;margin:24px 0 4px">${expiry}</p>
    <p style="color:#888;font-size:13px;margin:0 0 8px">${fallback}</p>
    <p style="font-size:13px;word-break:break-all"><a href="${mail.link}">${mail.link}</a></p>
  </div>
</body></html>`;
    const text = `${greeting}\n\n${lead}\n\n${mail.link}\n\n${expiry}`;
    return { subject, html, text };
  }
}
