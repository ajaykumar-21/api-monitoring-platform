import { query } from "../db";
import {
  sendWebhookAlert,
  sendEmailAlert,
  AlertPayload,
} from "../alerts/notifier";
import {
  evaluateAllAssertions,
  AssertionRule,
  AssertionContext,
} from "./assertions";
import axios from "axios";

export interface PingResult {
  statusCode: number | null;
  responseTimeMs: number;
  isSuccess: boolean;
  errorMessage: string | null;
}

export async function executePingCheck(monitorId: string): Promise<PingResult> {
  const monitorRes = await query("SELECT * FROM monitors WHERE id = $1", [
    monitorId,
  ]);
  if (monitorRes.rows.length === 0 || !monitorRes.rows[0].is_active) {
    return {
      statusCode: null,
      responseTimeMs: 0,
      isSuccess: false,
      errorMessage: "Monitor inactive or deleted",
    };
  }

  const monitor = monitorRes.rows[0];

  // Get alert channels for user
  const channelRes = await query(
    "SELECT * FROM alert_channels WHERE user_id = $1 AND is_active = true",
    [monitor.user_id],
  );
  const alertChannels = channelRes.rows;

  let headersObj: Record<string, string> = {};
  if (monitor.headers) {
    try {
      headersObj = JSON.parse(monitor.headers);
    } catch {
      // Ignore invalid headers json
    }
  }

  let parsedAssertions: AssertionRule[] = [];
  if (monitor.assertions) {
    try {
      parsedAssertions = JSON.parse(monitor.assertions);
      if (!Array.isArray(parsedAssertions)) parsedAssertions = [];
    } catch {
      parsedAssertions = [];
    }
  }

  const startTime = Date.now();
  let statusCode: number | null = null;
  let isSuccess = false;
  let errorMessage: string | null = null;

  try {
    const response = await axios({
      method: monitor.method || "GET",
      url: monitor.url,
      headers: {
        "User-Agent": "APISentinel-Uptime-Bot/1.0",
        ...headersObj,
      },
      data: monitor.body ? monitor.body : undefined,
      timeout: monitor.timeout_ms || 10000,
      validateStatus: () => true,
      transformResponse: [(data) => data], // Keep raw response data for custom parsing
    });

    const endTime = Date.now();
    const responseTimeMs = endTime - startTime;
    statusCode = response.status;

    // Parse response body as raw text and JSON safely
    let rawBody = "";
    let jsonBody: any = undefined;

    if (typeof response.data === "string") {
      rawBody = response.data;
    } else if (Buffer.isBuffer(response.data)) {
      rawBody = (response.data as Buffer).toString("utf8");
    } else if (typeof response.data === "object" && response.data !== null) {
      jsonBody = response.data;
      try {
        rawBody = JSON.stringify(response.data);
      } catch {
        rawBody = String(response.data);
      }
    }

    if (jsonBody === undefined && rawBody) {
      try {
        jsonBody = JSON.parse(rawBody);
      } catch {
        jsonBody = undefined;
      }
    }

    const expected = monitor.expected_status || 200;
    const statusMatches = statusCode === expected;

    if (!statusMatches) {
      isSuccess = false;
      errorMessage = `Expected HTTP ${expected}, received ${statusCode}`;
    } else {
      isSuccess = true;
    }

    // Evaluate response assertions if status matched or if assertions are configured
    if (parsedAssertions.length > 0) {
      const assertionContext: AssertionContext = {
        statusCode,
        responseTimeMs,
        headers: response.headers as Record<
          string,
          string | string[] | undefined
        >,
        rawBody,
        jsonBody,
      };

      const assertionResult = evaluateAllAssertions(
        parsedAssertions,
        assertionContext,
      );

      if (!assertionResult.allPassed) {
        isSuccess = false;
        const assertionErrors = assertionResult.failedReasons.join("; ");
        errorMessage = !statusMatches
          ? `${errorMessage} | Assertion Failures: ${assertionErrors}`
          : `Assertion Failed: ${assertionErrors}`;
      }
    }

    if (isSuccess) {
      console.log(
        `[PING] 🟢 "${monitor.name}" ➔ HTTP ${statusCode} (${responseTimeMs}ms) [OK]`,
      );
    } else {
      console.log(
        `[PING] 🔴 "${monitor.name}" ➔ HTTP ${statusCode} (${responseTimeMs}ms) [FAILED: ${errorMessage}]`,
      );
    }

    // Insert PingLog
    const pingLogId =
      "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    await query(
      "INSERT INTO ping_logs (id, monitor_id, status_code, response_time, is_success, error_message, tested_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
      [
        pingLogId,
        monitor.id,
        statusCode,
        responseTimeMs,
        isSuccess,
        errorMessage,
      ],
    );

    await handleStateTransition(
      monitor,
      alertChannels,
      isSuccess,
      statusCode,
      responseTimeMs,
      errorMessage,
    );

    return { statusCode, responseTimeMs, isSuccess, errorMessage };
  } catch (err: unknown) {
    const endTime = Date.now();
    const responseTimeMs = endTime - startTime;
    const errStr = err instanceof Error ? err.message : String(err);
    errorMessage = errStr.includes("timeout")
      ? `Timeout after ${monitor.timeout_ms}ms`
      : errStr;

    console.log(
      `[PING] 🔴 "${monitor.name}" ➔ TIMEOUT/ERROR (${responseTimeMs}ms) [FAILED: ${errorMessage}]`,
    );

    const pingLogId =
      "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    await query(
      "INSERT INTO ping_logs (id, monitor_id, status_code, response_time, is_success, error_message, tested_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
      [pingLogId, monitor.id, null, responseTimeMs, false, errorMessage],
    );

    await handleStateTransition(
      monitor,
      alertChannels,
      false,
      null,
      responseTimeMs,
      errorMessage,
    );

    return { statusCode: null, responseTimeMs, isSuccess: false, errorMessage };
  }
}

async function handleStateTransition(
  monitor: any,
  alertChannels: any[],
  isSuccess: boolean,
  statusCode: number | null,
  responseTimeMs: number,
  errorMessage: string | null,
) {
  if (isSuccess) {
    if (monitor.current_status === "DOWN") {
      console.log(
        `[STATE CHANGE] 🟢 Monitor "${monitor.name}" has RECOVERED! Disagreeing incidents resolved.`,
      );

      await query(
        "UPDATE monitors SET current_status = $1, consecutive_failures = 0, updated_at = NOW() WHERE id = $2",
        ["UP", monitor.id],
      );

      await query(
        "UPDATE incidents SET status = 'RESOLVED', resolved_at = NOW() WHERE monitor_id = $1 AND status = 'OPEN'",
        [monitor.id],
      );

      const payload: AlertPayload = {
        monitorId: monitor.id,
        monitorName: monitor.name,
        url: monitor.url,
        event: "RECOVERED",
        statusCode,
        responseTimeMs,
        timestamp: new Date().toISOString(),
      };

      if (alertChannels.length === 0) {
        console.log(
          `[ALERT] ℹ️ (No alert channels configured. Add Email/Webhook in /dashboard/alerts)`,
        );
      }

      for (const channel of alertChannels) {
        if (channel.type === "EMAIL") {
          await sendEmailAlert(channel.target, payload);
        } else if (channel.type === "WEBHOOK") {
          await sendWebhookAlert(channel.target, payload);
        }
      }
    } else if (monitor.consecutive_failures > 0) {
      await query(
        "UPDATE monitors SET consecutive_failures = 0 WHERE id = $1",
        [monitor.id],
      );
    }
  } else {
    const newFailCount = (monitor.consecutive_failures || 0) + 1;
    const threshold = monitor.failure_threshold || 2;

    if (newFailCount >= threshold && monitor.current_status !== "DOWN") {
      console.log(
        `[STATE CHANGE] 🔴 Outage confirmed! Monitor "${monitor.name}" reached failure threshold (${newFailCount}/${threshold}).`,
      );

      await query(
        "UPDATE monitors SET current_status = $1, consecutive_failures = $2, updated_at = NOW() WHERE id = $3",
        ["DOWN", newFailCount, monitor.id],
      );

      const openIncidentRes = await query(
        "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'OPEN'",
        [monitor.id],
      );

      if (openIncidentRes.rows.length === 0) {
        const incidentId =
          "inc_" +
          Date.now() +
          "_" +
          Math.random().toString(36).substring(2, 7);
        await query(
          "INSERT INTO incidents (id, monitor_id, status, started_at, cause) VALUES ($1, $2, 'OPEN', NOW(), $3)",
          [
            incidentId,
            monitor.id,
            errorMessage || `Failed ${newFailCount} consecutive checks`,
          ],
        );
      }

      const payload: AlertPayload = {
        monitorId: monitor.id,
        monitorName: monitor.name,
        url: monitor.url,
        event: "DOWN",
        reason: errorMessage || "HTTP failure / timeout",
        statusCode,
        responseTimeMs,
        timestamp: new Date().toISOString(),
      };

      if (alertChannels.length === 0) {
        console.log(
          `[ALERT] ℹ️ (No alert channels configured. Add Email/Webhook in /dashboard/alerts)`,
        );
      }

      for (const channel of alertChannels) {
        if (channel.type === "EMAIL") {
          await sendEmailAlert(channel.target, payload);
        } else if (channel.type === "WEBHOOK") {
          await sendWebhookAlert(channel.target, payload);
        }
      }
    } else {
      console.log(
        `[FAILURE COUNTER] "${monitor.name}" failed check #${newFailCount} (Alert triggers at ${threshold} consecutive fails)`,
      );
      await query(
        "UPDATE monitors SET consecutive_failures = $1 WHERE id = $2",
        [newFailCount, monitor.id],
      );
    }
  }
}
