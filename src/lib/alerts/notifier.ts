import axios from 'axios';
import nodemailer from 'nodemailer';

export interface AlertPayload {
  monitorId: string;
  monitorName: string;
  url: string;
  event: 'DOWN' | 'RECOVERED';
  reason?: string;
  statusCode?: number | null;
  responseTimeMs?: number;
  timestamp: string;
}

// ----------------------------------------------------
// 1. Webhook Alerts (Slack / Discord / Custom HTTP)
// ----------------------------------------------------
export async function sendWebhookAlert(webhookUrl: string, payload: AlertPayload) {
  try {
    const isSlackOrDiscord = webhookUrl.includes('discord.com') || webhookUrl.includes('slack.com');
    let body: any = payload;

    if (isSlackOrDiscord) {
      const isDown = payload.event === 'DOWN';
      const color = isDown ? '#ef4444' : '#22c55e';
      const title = isDown
        ? `🔴 ALERT: ${payload.monitorName} is DOWN`
        : `🟢 RECOVERED: ${payload.monitorName} is back UP`;

      body = {
        username: 'API Sentinel Monitor',
        embeds: [
          {
            title,
            color: parseInt(color.replace('#', ''), 16),
            fields: [
              { name: 'URL', value: payload.url, inline: false },
              { name: 'Reason', value: payload.reason || 'N/A', inline: true },
              { name: 'Status Code', value: String(payload.statusCode ?? 'Timeout/Error'), inline: true },
              { name: 'Response Time', value: `${payload.responseTimeMs ?? 0}ms`, inline: true },
            ],
            timestamp: payload.timestamp,
          },
        ],
        text: `${title} - ${payload.url}`,
      };
    }

    await axios.post(webhookUrl, body, { timeout: 5000 });
    console.log(`[ALERT] 🚀 Webhook notification sent for "${payload.monitorName}" to ${webhookUrl}`);
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    console.error(`[ALERT ERROR] Failed to send webhook to ${webhookUrl}: ${errStr}`);
  }
}

// ----------------------------------------------------
// 2. Email Alerts (SMTP / Nodemailer)
// ----------------------------------------------------
export async function sendEmailAlert(toEmail: string, payload: AlertPayload) {
  const isDown = payload.event === 'DOWN';
  const subject = isDown
    ? `🚨 [DOWN ALERT] ${payload.monitorName} is DOWN`
    : `✅ [RECOVERED] ${payload.monitorName} is back UP`;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0b0f19; color: #ffffff; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: ${isDown ? '#ef4444' : '#10b981'}; margin: 0; font-size: 24px;">
          ${isDown ? '🔴 Service Outage Detected' : '🟢 Service Recovered'}
        </h1>
        <p style="color: #9ca3af; font-size: 14px; margin-top: 6px;">
          API Sentinel Uptime Monitoring Alert
        </p>
      </div>

      <div style="background-color: #131927; border: 1px solid #1f2937; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="color: #9ca3af; padding: 6px 0;">Monitor Name:</td>
            <td style="font-weight: bold; color: #ffffff; text-align: right; padding: 6px 0;">${payload.monitorName}</td>
          </tr>
          <tr>
            <td style="color: #9ca3af; padding: 6px 0;">Target URL:</td>
            <td style="font-family: monospace; color: #38bdf8; text-align: right; padding: 6px 0;">${payload.url}</td>
          </tr>
          <tr>
            <td style="color: #9ca3af; padding: 6px 0;">Status:</td>
            <td style="font-weight: bold; color: ${isDown ? '#ef4444' : '#10b981'}; text-align: right; padding: 6px 0;">
              ${payload.event}
            </td>
          </tr>
          <tr>
            <td style="color: #9ca3af; padding: 6px 0;">HTTP Status Code:</td>
            <td style="font-family: monospace; color: #ffffff; text-align: right; padding: 6px 0;">
              ${payload.statusCode !== null && payload.statusCode !== undefined ? payload.statusCode : 'N/A'}
            </td>
          </tr>
          <tr>
            <td style="color: #9ca3af; padding: 6px 0;">Response Time:</td>
            <td style="font-family: monospace; color: #ffffff; text-align: right; padding: 6px 0;">
              ${payload.responseTimeMs ?? 0}ms
            </td>
          </tr>
          ${
            payload.reason
              ? `<tr>
                  <td style="color: #9ca3af; padding: 6px 0;">Reason:</td>
                  <td style="color: #f87171; text-align: right; padding: 6px 0;">${payload.reason}</td>
                </tr>`
              : ''
          }
          <tr>
            <td style="color: #9ca3af; padding: 6px 0;">Timestamp:</td>
            <td style="color: #9ca3af; text-align: right; padding: 6px 0;">${new Date(payload.timestamp).toUTCString()}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          Sent by API Sentinel Platform &bull; Automated Uptime & Incident System
        </p>
      </div>
    </div>
  `;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'alerts@api-sentinel.local';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"API Sentinel" <${smtpFrom}>`,
        to: toEmail,
        subject,
        html: htmlBody,
      });

      console.log(`[EMAIL ALERT] 📧 Email successfully sent to ${toEmail} for "${payload.monitorName}" (${payload.event})`);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      console.error(`[EMAIL ALERT ERROR] Failed to send email to ${toEmail}: ${errStr}`);
    }
  } else {
    // Development fallback when SMTP is not configured in .env: Log clear visual dispatch
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│ 📧 [SIMULATED EMAIL ALERT] (Configure SMTP in .env for live) │
├─────────────────────────────────────────────────────────────┤
│ To:      ${toEmail}
│ Subject: ${subject}
│ Monitor: ${payload.monitorName} (${payload.url})
│ Event:   ${payload.event}
│ Cause:   ${payload.reason || 'Status check failed / recovered'}
│ Time:    ${payload.timestamp}
└─────────────────────────────────────────────────────────────┘
    `);
  }
}
