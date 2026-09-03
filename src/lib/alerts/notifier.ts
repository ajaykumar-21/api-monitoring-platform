import axios from "axios";

export interface AlertPayload {
  monitorId: string;
  monitorName: string;
  url: string;
  event: "DOWN" | "RECOVERED";
  reason?: string;
  statusCode?: number | null;
  responseTimeMs?: number;
  timestamp: string;
}

export async function sendWebhookAlert(
  webhookUrl: string,
  payload: AlertPayload,
) {
  try {
    const isSlackOrDiscord =
      webhookUrl.includes("discord.com") || webhookUrl.includes("slack.com");
    let body: any = payload;

    if (isSlackOrDiscord) {
      const isDown = payload.event === "DOWN";
      const color = isDown ? "#ef4444" : "#22c55e";
      const title = isDown
        ? `🔴 ALERT: ${payload.monitorName} is DOWN`
        : `🟢 RECOVERED: ${payload.monitorName} is back UP`;

      body = {
        username: "API Sentinel Monitor",
        embeds: [
          {
            title,
            color: parseInt(color.replace("#", ""), 16),
            fields: [
              { name: "URL", value: payload.url, inline: false },
              { name: "Reason", value: payload.reason || "N/A", inline: true },
              {
                name: "Status Code",
                value: String(payload.statusCode ?? "Timeout/Error"),
                inline: true,
              },
              {
                name: "Response Time",
                value: `${payload.responseTimeMs ?? 0}ms`,
                inline: true,
              },
            ],
            timestamp: payload.timestamp,
          },
        ],
        text: `${title} - ${payload.url}`,
      };
    }

    await axios.post(webhookUrl, body, { timeout: 5000 });
    console.log(
      `[ALERT] Sent webhook notification for monitor "${payload.monitorName}" to ${webhookUrl}`,
    );
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    console.error(
      `[ALERT ERROR] Failed to send webhook to ${webhookUrl}: ${errStr}`,
    );
  }
}
