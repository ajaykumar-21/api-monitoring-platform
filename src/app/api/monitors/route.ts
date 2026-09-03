import { NextResponse } from 'next/server';
import { query, initDb } from '@/lib/db';
import { z } from 'zod';

const createMonitorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  url: z.string().url('Invalid URL format'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
  intervalSec: z.number().min(10).default(60),
  expectedStatus: z.number().min(100).max(599).default(200),
  timeoutMs: z.number().min(1000).max(30000).default(10000),
  headers: z.string().optional(),
  body: z.string().optional(),
  failureThreshold: z.number().min(1).default(2),
});

const DEMO_USER_ID = 'demo-user-1';

async function getOrCreateDemoUser() {
  await initDb();
  const userRes = await query('SELECT * FROM users WHERE id = $1', [DEMO_USER_ID]);
  if (userRes.rows.length === 0) {
    await query(
      'INSERT INTO users (id, email, name, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
      [DEMO_USER_ID, 'developer@sentinel.local', 'Portfolio Dev']
    );
  }
}

export async function GET() {
  try {
    await getOrCreateDemoUser();

    const monitorsRes = await query(
      'SELECT * FROM monitors WHERE user_id = $1 ORDER BY created_at DESC',
      [DEMO_USER_ID]
    );

    const enrichedMonitors = await Promise.all(
      monitorsRes.rows.map(async (monitor) => {
        const logsRes = await query(
          'SELECT * FROM ping_logs WHERE monitor_id = $1 ORDER BY tested_at DESC LIMIT 50',
          [monitor.id]
        );
        const logs = logsRes.rows;

        const incidentsRes = await query(
          "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'OPEN'",
          [monitor.id]
        );

        const totalPings = logs.length;
        const successfulPings = logs.filter((l) => l.is_success).length;
        const uptimePercentage = totalPings > 0 ? (successfulPings / totalPings) * 100 : 100;

        const avgResponseTime =
          totalPings > 0
            ? Math.round(logs.reduce((acc, l) => acc + l.response_time, 0) / totalPings)
            : 0;

        const latestLog = logs[0] || null;

        return {
          id: monitor.id,
          name: monitor.name,
          url: monitor.url,
          method: monitor.method,
          intervalSec: monitor.interval_sec,
          expectedStatus: monitor.expected_status,
          currentStatus: monitor.current_status,
          isActive: monitor.is_active,
          consecutiveFailures: monitor.consecutive_failures,
          uptimePercentage: parseFloat(uptimePercentage.toFixed(2)),
          avgResponseTimeMs: avgResponseTime,
          latestResponseTimeMs: latestLog ? latestLog.response_time : null,
          latestTestedAt: latestLog ? latestLog.tested_at : null,
          openIncidentsCount: incidentsRes.rows.length,
          recentLogs: logs.slice(0, 20),
        };
      })
    );

    return NextResponse.json({ monitors: enrichedMonitors });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await getOrCreateDemoUser();
    const body = await req.json();
    const validated = createMonitorSchema.parse(body);

    const monitorId = 'mon_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    await query(
      `INSERT INTO monitors 
      (id, user_id, name, url, method, interval_sec, expected_status, timeout_ms, headers, body, failure_threshold, is_active, current_status, consecutive_failures, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, 'UP', 0, NOW(), NOW())`,
      [
        monitorId,
        DEMO_USER_ID,
        validated.name,
        validated.url,
        validated.method,
        validated.intervalSec,
        validated.expectedStatus,
        validated.timeoutMs,
        validated.headers || null,
        validated.body || null,
        validated.failureThreshold,
      ]
    );

    const newMonitor = (await query('SELECT * FROM monitors WHERE id = $1', [monitorId])).rows[0];

    return NextResponse.json({ monitor: newMonitor }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}
