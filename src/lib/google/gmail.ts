import { google } from 'googleapis';
import { createOAuth2Client } from './auth';
import { getValidAccessToken } from './tokens';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

function createEmailMessage(to: string, subject: string, html: string): string {
  const message = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    html,
  ].join('\n');

  // Base64 URL-safe encoding
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendEmail(userId: string, { to, subject, html }: SendEmailOptions): Promise<void> {
  console.log('[Gmail] Sending email to:', to);

  const accessToken = await getValidAccessToken(userId);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const raw = createEmailMessage(to, subject, html);

  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
    },
  });

  console.log('[Gmail] Email sent successfully, messageId:', result.data.id);
}

interface CancellationEmailData {
  guestName: string;
  guestEmail: string;
  meetingTypeName: string;
  startTime: Date;
  endTime: Date;
  guestTimezone: string;
  bookingLink: string;
  customMessage?: string | null;
}

const DEFAULT_CANCELLATION_MESSAGE = "Unfortunately, we need to cancel your scheduled meeting. We apologize for any inconvenience this may cause.";

export async function sendCancellationEmail(userId: string, data: CancellationEmailData): Promise<void> {
  const formattedDate = format(new Date(data.startTime), 'EEEE, MMMM d, yyyy', { locale: enUS });
  const formattedTime = `${format(new Date(data.startTime), 'HH:mm')} - ${format(new Date(data.endTime), 'HH:mm')}`;
  const cancellationMessage = data.customMessage || DEFAULT_CANCELLATION_MESSAGE;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eee;
        }
        .logo {
          width: 60px;
          height: 60px;
        }
        .content {
          padding: 30px 0;
        }
        .meeting-details {
          background-color: #f9fafb;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .meeting-details p {
          margin: 8px 0;
        }
        .label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .value {
          font-weight: 500;
          color: #111827;
        }
        .cta-button {
          display: inline-block;
          background-color: #e81111;
          color: white !important;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-weight: 500;
          margin: 20px 0;
        }
        .cta-button:hover {
          background-color: #c50f0f;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="color: #e81111; margin: 0;">RevBridge</h2>
      </div>

      <div class="content">
        <h1 style="color: #111827; font-size: 24px;">Meeting Cancelled</h1>

        <p>Hi ${data.guestName},</p>

        <p>${cancellationMessage}</p>

        <div class="meeting-details">
          <p class="label">Meeting</p>
          <p class="value">${data.meetingTypeName}</p>

          <p class="label">Date</p>
          <p class="value">${formattedDate}</p>

          <p class="label">Time</p>
          <p class="value">${formattedTime} (${data.guestTimezone})</p>
        </div>

        <p>Please feel free to schedule a new meeting at a time that works for you:</p>

        <div style="text-align: center;">
          <a href="${data.bookingLink}" class="cta-button">Schedule New Meeting</a>
        </div>

        <p>If you have any questions, please don't hesitate to reach out.</p>

        <p>Best regards,<br>RevBridge Team</p>
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} RevBridge AI. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail(userId, {
    to: data.guestEmail,
    subject: `Meeting Cancelled: ${data.meetingTypeName}`,
    html,
  });
}
