import nodemailer, { type Transporter } from 'nodemailer';
import { config, isMailerConfigured } from '../config/env.js';
import { SubmissionRecord } from '../db/submissions.js';

let transporter: Transporter | null = null;

/**
 * Returns a singleton Nodemailer transporter based on .env config.
 */
export function getTransporter(): Transporter | null {
  if (!isMailerConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user
        ? {
            user: config.smtp.user,
            pass: config.smtp.pass,
          }
        : undefined,
    });
  }

  return transporter;
}

/**
 * Generates an HTML table from any submitted key-value payload.
 */
function buildHtmlBody(submission: SubmissionRecord): string {
  const entries = Object.entries(submission.payload);

  const rows = entries.map(([key, value]) => {
    const formattedValue =
      typeof value === 'object' && value !== null
        ? `<pre style="margin:0; font-family: monospace;">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`
        : escapeHtml(String(value ?? ''));

    return `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155; width: 35%; background: #f8fafc;">
          ${escapeHtml(key)}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">
          ${formattedValue}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 24px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background: #2563eb; padding: 18px 24px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 600;">${escapeHtml(config.email.subject)}</h2>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Submission #${submission.id} &bull; Received at ${escapeHtml(submission.createdAt)}</p>
          </div>
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
              ${rows || '<tr><td style="padding: 12px; color: #64748b;">(Empty submission payload)</td></tr>'}
            </table>
          </div>
          <div style="background: #f8fafc; padding: 12px 24px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center;">
            Sent by your automated backend notification service.
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates plain-text fallback representation.
 */
function buildTextBody(submission: SubmissionRecord): string {
  const lines = Object.entries(submission.payload).map(([k, v]) => {
    const val = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '');
    return `${k}: ${val}`;
  });

  return [
    `=== ${config.email.subject} ===`,
    `ID: ${submission.id}`,
    `Created: ${submission.createdAt}`,
    '----------------------------------------',
    ...lines,
    '----------------------------------------',
  ].join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface EmailResult {
  success: boolean;
  skipped?: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends an email containing the submission payload.
 */
export async function sendSubmissionEmail(submission: SubmissionRecord): Promise<EmailResult> {
  const mailTransporter = getTransporter();

  if (!mailTransporter) {
    console.warn(
      '[Mailer] Skipped sending email: SMTP credentials or EMAIL_TO are not set in .env.'
    );
    return {
      success: false,
      skipped: true,
      error: 'SMTP credentials or EMAIL_TO not configured in .env',
    };
  }

  try {
    const info = await mailTransporter.sendMail({
      from: config.email.from,
      to: config.email.to,
      subject: `${config.email.subject} [#${submission.id}]`,
      text: buildTextBody(submission),
      html: buildHtmlBody(submission),
    });

    console.log(`[Mailer] Email sent successfully (MessageId: ${info.messageId}) to ${config.email.to}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Mailer] Error sending email: ${errMessage}`);
    return {
      success: false,
      error: errMessage,
    };
  }
}
