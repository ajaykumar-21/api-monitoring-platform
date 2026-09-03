import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const pageRes = await query('SELECT * FROM status_pages WHERE slug = $1 AND is_public = true', [slug]);

    if (pageRes.rows.length === 0) {
      return NextResponse.json({ error: 'Status page not found or private' }, { status: 404 });
    }

    const statusPage = pageRes.rows[0];

    let monitorIds: string[] = [];
    try {
      monitorIds = JSON.parse(statusPage.monitors);
    } catch {
      // empty
    }

    if (monitorIds.length === 0) {
      return NextResponse.json({
        title: statusPage.title,
        isAllOperational: true,
        monitors: [],
      });
    }

    const monitorsRes = await query(
      'SELECT * FROM monitors WHERE id = ANY($1::text[]) AND is_active = true',
      [monitorIds]
    );

    const enriched = await Promise.all(
      monitorsRes.rows.map(async (m) => {
        const logsRes = await query(
          'SELECT * FROM ping_logs WHERE monitor_id = $1 ORDER BY tested_at DESC LIMIT 30',
          [m.id]
        );
        const logs = logsRes.rows;

        const total = logs.length;
        const success = logs.filter((l) => l.is_success).length;
        const uptimePercentage = total > 0 ? (success / total) * 100 : 100;
        const avgResponseTimeMs =
          total > 0 ? Math.round(logs.reduce((acc, l) => acc + l.response_time, 0) / total) : 0;

        return {
          id: m.id,
          name: m.name,
          currentStatus: m.current_status,
          uptimePercentage: parseFloat(uptimePercentage.toFixed(2)),
          avgResponseTimeMs,
          latestLog: logs[0] || null,
          recentHistory: logs.slice(0, 15).reverse().map((l) => ({
            isSuccess: l.is_success,
            responseTime: l.response_time,
          })),
        };
      })
    );

    const isAllOperational = enriched.every((m) => m.currentStatus === 'UP');

    return NextResponse.json({
      title: statusPage.title,
      isAllOperational,
      monitors: enriched,
    });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}
