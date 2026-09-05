import { NextResponse } from "next/server";
import { query, initDb } from "@/lib/db";

const DEMO_USER_ID = "demo-user-1";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await initDb();
    const { slug } = await params;

    let pageRes = await query("SELECT * FROM status_pages WHERE slug = $1", [
      slug,
    ]);

    // If status page doesn't exist yet, auto-create it
    if (pageRes.rows.length === 0) {
      await query(
        "INSERT INTO status_pages (id, user_id, title, slug, is_public, monitors, created_at, updated_at) VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())",
        [
          "status_page_" + slug,
          DEMO_USER_ID,
          "Platform System Status",
          slug,
          JSON.stringify([]),
        ],
      );
      pageRes = await query("SELECT * FROM status_pages WHERE slug = $1", [
        slug,
      ]);
    }

    const statusPage = pageRes.rows[0];

    if (!statusPage.is_public) {
      return NextResponse.json(
        { error: "This status page is private." },
        { status: 403 },
      );
    }

    let monitorIds: string[] = [];
    try {
      monitorIds = JSON.parse(statusPage.monitors || "[]");
    } catch {
      monitorIds = [];
    }

    let monitorsRes;
    if (monitorIds.length > 0) {
      monitorsRes = await query(
        "SELECT * FROM monitors WHERE id = ANY($1::text[]) AND is_active = true ORDER BY created_at ASC",
        [monitorIds],
      );
    } else {
      // Default: Display all active monitors if none explicitly filtered
      monitorsRes = await query(
        "SELECT * FROM monitors WHERE user_id = $1 AND is_active = true ORDER BY created_at ASC",
        [statusPage.user_id || DEMO_USER_ID],
      );
    }

    const enriched = await Promise.all(
      monitorsRes.rows.map(async (m) => {
        const logsRes = await query(
          "SELECT * FROM ping_logs WHERE monitor_id = $1 ORDER BY tested_at DESC LIMIT 30",
          [m.id],
        );
        const logs = logsRes.rows;

        const total = logs.length;
        const success = logs.filter((l) => l.is_success).length;
        const uptimePercentage = total > 0 ? (success / total) * 100 : 100;
        const avgResponseTimeMs =
          total > 0
            ? Math.round(
                logs.reduce((acc, l) => acc + l.response_time, 0) / total,
              )
            : 0;

        return {
          id: m.id,
          name: m.name,
          currentStatus: m.current_status,
          uptimePercentage: parseFloat(uptimePercentage.toFixed(2)),
          avgResponseTimeMs,
          latestLog: logs[0] || null,
          recentHistory: logs
            .slice(0, 15)
            .reverse()
            .map((l) => ({
              isSuccess: l.is_success,
              responseTime: l.response_time,
            })),
        };
      }),
    );

    const isAllOperational =
      enriched.length === 0 || enriched.every((m) => m.currentStatus === "UP");

    // Fetch active incidents (investigating, identified, monitoring, open)
    const activeIncidentsRes = await query(
      `SELECT i.*, m.name as monitor_name 
       FROM incidents i
       JOIN monitors m ON i.monitor_id = m.id
       WHERE m.user_id = $1 AND i.status != 'RESOLVED'
       ORDER BY i.started_at DESC`,
      [statusPage.user_id || DEMO_USER_ID],
    );

    const activeIncidents = await Promise.all(
      activeIncidentsRes.rows.map(async (inc) => {
        const updatesRes = await query(
          `SELECT * FROM incident_updates WHERE incident_id = $1 ORDER BY created_at DESC`,
          [inc.id],
        );
        return {
          id: inc.id,
          title: inc.title || `Service Interruption: ${inc.monitor_name}`,
          severity: inc.severity || "MAJOR",
          status: inc.status,
          monitorName: inc.monitor_name,
          startedAt: inc.started_at,
          cause: inc.cause,
          updates: updatesRes.rows.map((u) => ({
            id: u.id,
            status: u.status,
            message: u.message,
            createdAt: u.created_at,
          })),
        };
      }),
    );

    // Fetch resolved incidents from the past 7 days
    const pastIncidentsRes = await query(
      `SELECT i.*, m.name as monitor_name 
       FROM incidents i
       JOIN monitors m ON i.monitor_id = m.id
       WHERE m.user_id = $1 AND i.status = 'RESOLVED' AND i.started_at >= NOW() - INTERVAL '7 days'
       ORDER BY i.resolved_at DESC LIMIT 10`,
      [statusPage.user_id || DEMO_USER_ID],
    );

    const pastIncidents = await Promise.all(
      pastIncidentsRes.rows.map(async (inc) => {
        const updatesRes = await query(
          `SELECT * FROM incident_updates WHERE incident_id = $1 ORDER BY created_at DESC`,
          [inc.id],
        );
        return {
          id: inc.id,
          title: inc.title || `Resolved: ${inc.monitor_name}`,
          severity: inc.severity || "MAJOR",
          status: inc.status,
          monitorName: inc.monitor_name,
          startedAt: inc.started_at,
          resolvedAt: inc.resolved_at,
          cause: inc.cause,
          updates: updatesRes.rows.map((u) => ({
            id: u.id,
            status: u.status,
            message: u.message,
            createdAt: u.created_at,
          })),
        };
      }),
    );

    return NextResponse.json({
      title: statusPage.title || "Platform System Status",
      isAllOperational: isAllOperational && activeIncidents.length === 0,
      monitors: enriched,
      activeIncidents,
      pastIncidents,
    });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}
