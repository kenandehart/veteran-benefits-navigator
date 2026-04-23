import 'dotenv/config';
import { Resend } from 'resend';
import { logger } from '../logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;
const APP_URL = process.env.APP_URL;

if (!RESEND_API_KEY) {
  logger.fatal('RESEND_API_KEY must be set.');
  throw new Error('RESEND_API_KEY must be set. Refusing to start.');
}
if (!EMAIL_FROM) {
  logger.fatal('EMAIL_FROM must be set.');
  throw new Error('EMAIL_FROM must be set. Refusing to start.');
}
if (!APP_URL) {
  logger.fatal('APP_URL must be set.');
  throw new Error('APP_URL must be set. Refusing to start.');
}

export const appUrl: string = APP_URL;
const emailFrom: string = EMAIL_FROM;

export const resend = new Resend(RESEND_API_KEY);

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<void> {
  const text =
    'You requested a password reset for your VA Benefits Navigator account.\n\n' +
    'Click this link to set a new password:\n' +
    `${resetUrl}\n\n` +
    "This link expires in 1 hour. If you didn't request this, you can safely ignore this email.\n\n" +
    '—\n' +
    'VA Benefits Navigator\n' +
    'vabenefits.app\n';

  const { error } = await resend.emails.send({
    from: emailFrom,
    to: email,
    subject: 'Reset your password',
    text,
  });

  if (error) {
    logger.error({ err: error }, 'Resend API returned error sending password reset');
    throw new Error('Failed to send password reset email');
  }
}
