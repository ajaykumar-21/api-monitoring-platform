import { query } from '../db';
import { sendWebhookAlert } from '../alerts/notifier';
import axios from 'axios';

export interface PingResult {
  statusCode: number | null;
  responseTimeMs: number;
  isSuccess: boolean;
  errorMessage: string | null;
}

export async function executePingCheck(monitorId: string): Promise<PingResult> {
  const monitorRes = await query('SELECT * FROM monitors WHERE id = $1', [monitorId]);
  if (monitorRes.rows.length === 0 || !monitorRes.rows[0].is_active) {
    return { statusCode: null, responseTimeMs: 0, isSuccess: false, errorMessage: 'Monitor inactive or deleted' };
  }

  const monitor = monitorRes.rows[0];

  // Get alert channels for user
  const channelRes = await query('SELECT * FROM alert_channels WHERE user_id = $1 AND is_active = true', [monitor.user_id]);
  const alertChannels = channelRes.rows;

  let headersObj: Record<string, string> = {};
  if (monitor.headers) {
    try {
      headersObj = JSON.parse(monitor.headers);
    } catch {
      // Ignore invalid headers json
    }
  }

  const startTime = Date.now();
  let statusCode: number | null = null;
  let isSuccess = false;
  let errorMessage: string | null = null;

  try {
    const response = await axios({
      method: monitor.method || 'GET',
      url: monitor.url,
      headers: {
        'User-Agent': 'APISentinel-Uptime-Bot/1.0',
        ...headersObj,
      },
      data: monitor.body ? monitor.body : undefined,
      timeout: monitor.timeout_ms || 10000,
      validateStatus: () => true,
    });

    const endTime = Date.now();
    const responseTimeMs = endTime - startTime;
    statusCode = response.status;

    const expected = monitor.expected_status || 200;
    if (statusCode === expected) {
      isSuccess = true;
    } else {
      isSuccess = false;
      errorMessage = `Expected HTTP ${expected}, received ${statusCode}`;
    }

    // Insert PingLog
    const pingLogId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    await query(
      'INSERT INTO ping_logs (id, monitor_id, status_code, response_time, is_success, error_message, tested_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [pingLogId, monitor.id, statusCode, responseTimeMs, isSuccess, errorMessage]
    );

    await handleStateTransition(monitor, alertChannels, isSuccess, statusCode, responseTimeMs, errorMessage);

    return { statusCode, responseTimeMs, isSuccess, errorMessage };
  } catch (err: unknown) {
    const endTime = Date.now();
    const responseTimeMs = endTime - startTime;
    const errStr = err instanceof Error ? err.message : String(err);
    errorMessage = errStr.includes('timeout') ? `Timeout after ${monitor.timeout_ms}ms` : errStr;

    const pingLogId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    await query(
      'INSERT INTO ping_logs (id, monitor_id, status_code, response_time, is_success, error_message, tested_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [pingLogId, monitor.id, null, responseTimeMs, false, errorMessage]
    );

    await handleStateTransition(monitor, alertChannels, false, null, responseTimeMs, errorMessage);

    return { statusCode: null, responseTimeMs, isSuccess: false, errorMessage };
  }
}

async function handleStateTransition(
  monitor: any,
  alertChannels: any[],
  isSuccess: boolean,
  statusCode: number | null,
  responseTimeMs: number,
  errorMessage: string | null
) {
  if (isSuccess) {
    if (monitor.current_status === 'DOWN') {
      console.log(`[STATUS RECOVERY] Monitor ${monitor.name} (${monitor.url}) has recovered!`);

      await query(
        'UPDATE monitors SET current_status = $1, consecutive_failures = 0, updated_at = NOW() WHERE id = $2',
        ['UP', monitor.id]
      );

      await query(
        "UPDATE incidents SET status = 'RESOLVED', resolved_at = NOW() WHERE monitor_id = $1 AND status = 'OPEN'",
        [monitor.id]
      );

      for (const channel of alertChannels) {
        if (channel.type === 'WEBHOOK') {
          await sendWebhookAlert(channel.target, {
            monitorId: monitor.id,
            monitorName: monitor.name,
            url: monitor.url,
            event: 'RECOVERED',
            statusCode,
            responseTimeMs,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else if (monitor.consecutive_failures > 0) {
      await query('UPDATE monitors SET consecutive_failures = 0 WHERE id = $1', [monitor.id]);
    }
  } else {
    const newFailCount = (monitor.consecutive_failures || 0) + 1;
    const threshold = monitor.failure_threshold || 2;

    if (newFailCount >= threshold && monitor.current_status !== 'DOWN') {
      console.log(`[STATUS ALERT] Monitor ${monitor.name} (${monitor.url}) is DOWN after ${newFailCount} failures!`);

      await query(
        'UPDATE monitors SET current_status = $1, consecutive_failures = $2, updated_at = NOW() WHERE id = $3',
        ['DOWN', newFailCount, monitor.id]
      );

      const openIncidentRes = await query(
        "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'OPEN'",
        [monitor.id]
      );

      if (openIncidentRes.rows.length === 0) {
        const incidentId = 'inc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        await query(
          "INSERT INTO incidents (id, monitor_id, status, started_at, cause) VALUES ($1, $2, 'OPEN', NOW(), $3)",
          [incidentId, monitor.id, errorMessage || `Failed ${newFailCount} consecutive checks`]
        );
      }

      for (const channel of alertChannels) {
        if (channel.type === 'WEBHOOK') {
          await sendWebhookAlert(channel.target, {
            monitorId: monitor.id,
            monitorName: monitor.name,
            url: monitor.url,
            event: 'DOWN',
            reason: errorMessage || 'HTTP failure / timeout',
            statusCode,
            responseTimeMs,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else {
      await query('UPDATE monitors SET consecutive_failures = $1 WHERE id = $2', [newFailCount, monitor.id]);
    }
  }
}
