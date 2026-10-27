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
 * Generates an HTML notification email with the submitted contact details.
 */
function buildHtmlBody(submission: SubmissionRecord): string {
  const fields = [
    { label: 'First Name', value: submission.firstName },
    { label: 'Last Name', value: submission.lastName },
    {
      label: 'Email Address',
      value: `<a href="mailto:${escapeHtml(submission.email)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(submission.email)}</a>`,
      isHtml: true,
    },
    { label: 'Company', value: submission.company || '-' },
    { label: 'Country', value: submission.country || '-' },
    {
      label: 'Phone Number',
      value: submission.phoneNumber
        ? `<a href="tel:${escapeHtml(submission.phoneNumber)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(submission.phoneNumber)}</a>`
        : '-',
      isHtml: true,
    },
  ];

  const rowsHtml = fields
    .map(
      (f) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; width: 35%; background: #f8fafc;">
          ${escapeHtml(f.label)}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">
          ${f.isHtml ? f.value : escapeHtml(f.value)}
        </td>
      </tr>
    `
    )
    .join('');

  const notesHtml = submission.notes
    ? `
      <div style="margin-top: 20px;">
        <h4 style="margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Notes / Message</h4>
        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 18px; border-radius: 4px; color: #1e293b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
          ${escapeHtml(submission.notes)}
        </div>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 24px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background: #2563eb; padding: 20px 24px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 600;">${escapeHtml(config.email.subject)}</h2>
            <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">
              Submission #${submission.id} &bull; Received at ${escapeHtml(submission.createdAt)}
            </p>
          </div>
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
              ${rowsHtml}
            </table>
            ${notesHtml}
          </div>
          <div style="background: #f8fafc; padding: 12px 24px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center;">
            Sent automatically by your backend notification service.
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
  return [
    `=== ${config.email.subject} ===`,
    `ID: ${submission.id}`,
    `Created At: ${submission.createdAt}`,
    '----------------------------------------',
    `First Name:   ${submission.firstName}`,
    `Last Name:    ${submission.lastName}`,
    `Email:        ${submission.email}`,
    `Company:      ${submission.company || '-'}`,
    `Country:      ${submission.country || '-'}`,
    `Phone Number: ${submission.phoneNumber || '-'}`,
    '----------------------------------------',
    'Notes:',
    submission.notes || '(No notes provided)',
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
      subject: `${config.email.subject} [#${submission.id} - ${submission.firstName} ${submission.lastName}]`,
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
