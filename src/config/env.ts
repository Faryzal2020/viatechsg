import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || './data.db',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  email: {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@localhost',
    to: process.env.EMAIL_TO || '',
    subject: process.env.EMAIL_SUBJECT || 'New Submission Received',
  },
};

export function isMailerConfigured(): boolean {
  return Boolean(config.smtp.host && config.email.to);
}
