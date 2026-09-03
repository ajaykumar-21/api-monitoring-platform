import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const monitorRes = await query('SELECT * FROM monitors WHERE id = $1', [id]);

    if (monitorRes.rows.length === 0) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
    }

    const monitor = monitorRes.rows[0];

    const logsRes = await query(
      'SELECT * FROM ping_logs WHERE monitor_id = $1 ORDER BY tested_at DESC LIMIT 100',
      [id]
    );

    const incidentsRes = await query(
      'SELECT * FROM incidents WHERE monitor_id = $1 ORDER BY started_at DESC LIMIT 20',
      [id]
    );

    const logs = logsRes.rows;
    const totalPings = logs.length;
    const successfulPings = logs.filter((l) => l.is_success).length;
    const uptimePercentage = totalPings > 0 ? (successfulPings / totalPings) * 100 : 100;

    const responseTimes = logs.map((l) => l.response_time);
    const avgLatency =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;
    const maxLatency = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const minLatency = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;

    const chartData = [...logs].reverse().map((log) => ({
      time: new Date(log.tested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      responseTime: log.response_time,
      isSuccess: log.is_success ? 1 : 0,
      statusCode: log.status_code || 0,
    }));

    return NextResponse.json({
      monitor: {
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
        method: monitor.method,
        intervalSec: monitor.interval_sec,
        expectedStatus: monitor.expected_status,
        currentStatus: monitor.current_status,
        isActive: monitor.is_active,
        pingLogs: logs.map((l) => ({
          id: l.id,
          statusCode: l.status_code,
          responseTime: l.response_time,
          isSuccess: l.is_success,
          errorMessage: l.error_message,
          testedAt: l.tested_at,
        })),
        incidents: incidentsRes.rows.map((inc) => ({
          id: inc.id,
          status: inc.status,
          startedAt: inc.started_at,
          resolvedAt: inc.resolved_at,
          cause: inc.cause,
        })),
      },
      stats: {
        uptimePercentage: parseFloat(uptimePercentage.toFixed(2)),
        avgLatency,
        maxLatency,
        minLatency,
        totalPings,
        successfulPings,
        failedPings: totalPings - successfulPings,
      },
      chartData,
    });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    await query(
      `UPDATE monitors 
      SET name = $1, url = $2, method = $3, interval_sec = $4, expected_status = $5, timeout_ms = $6, headers = $7, body = $8, is_active = $9, updated_at = NOW() 
      WHERE id = $10`,
      [
        body.name,
        body.url,
        body.method,
        body.intervalSec,
        body.expectedStatus,
        body.timeoutMs,
        body.headers,
        body.body,
        body.isActive,
        id,
      ]
    );

    const updated = (await query('SELECT * FROM monitors WHERE id = $1', [id])).rows[0];
    return NextResponse.json({ monitor: updated });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query('DELETE FROM monitors WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}
