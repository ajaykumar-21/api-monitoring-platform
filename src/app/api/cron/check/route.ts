import { NextResponse } from 'next/server';
import { query, initDb } from '@/lib/db';
import { executePingCheck } from '@/lib/worker/pingEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await initDb();
    const monitorsRes = await query('SELECT id, name, url FROM monitors WHERE is_active = true');
    const monitors = monitorsRes.rows;

    console.log(`[CRON] Executing scheduled health checks for ${monitors.length} active monitors...`);

    const results = await Promise.all(
      monitors.map(async (m) => {
        try {
          const res = await executePingCheck(m.id);
          return { id: m.id, name: m.name, result: res };
        } catch (err: any) {
          return { id: m.id, name: m.name, error: err.message };
        }
      })
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checkedCount: monitors.length,
      results,
    });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}

