import { NextResponse } from 'next/server';
import { query, initDb } from '@/lib/db';
import { executePingCheck } from '@/lib/worker/pingEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await initDb();

    // Only select monitors that are DUE based on their interval_sec setting:
    // 1. Monitors that have NEVER been checked yet (tested_at IS NULL), OR
    // 2. Monitors whose last check occurred more than `interval_sec` seconds ago
    const dueMonitorsRes = await query(`
      SELECT m.id, m.name, m.url, m.interval_sec, l.tested_at as last_tested_at
      FROM monitors m
      LEFT JOIN LATERAL (
        SELECT tested_at 
        FROM ping_logs 
        WHERE monitor_id = m.id 
        ORDER BY tested_at DESC 
        LIMIT 1
      ) l ON true
      WHERE m.is_active = true
        AND (
          l.tested_at IS NULL 
          OR l.tested_at <= NOW() - (COALESCE(m.interval_sec, 60) || ' seconds')::interval
        )
    `);

    const dueMonitors = dueMonitorsRes.rows;

    console.log(`[CRON] ${dueMonitors.length} monitor(s) due for health check.`);

    if (dueMonitors.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No monitors due for check at this minute',
        timestamp: new Date().toISOString(),
        checkedCount: 0,
        results: [],
      });
    }

    const results = await Promise.all(
      dueMonitors.map(async (m) => {
        try {
          const res = await executePingCheck(m.id);
          return { id: m.id, name: m.name, intervalSec: m.interval_sec, result: res };
        } catch (err: any) {
          return { id: m.id, name: m.name, intervalSec: m.interval_sec, error: err.message };
        }
      })
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checkedCount: dueMonitors.length,
      results,
    });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}
