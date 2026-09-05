import { NextResponse } from "next/server";
import { query, initDb } from "@/lib/db";
import { z } from "zod";

const DEMO_USER_ID = "demo-user-1";

const createIncidentSchema = z.object({
  monitorId: z.string().min(1, "Monitor ID is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  severity: z
    .enum(["MINOR", "MAJOR", "CRITICAL", "MAINTENANCE"])
    .default("MAJOR"),
  status: z
    .enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"])
    .default("INVESTIGATING"),
  message: z.string().min(5, "Update message must be at least 5 characters"),
});

export async function GET() {
  try {
    await initDb();

    // Fetch all incidents joined with monitor details
    const incidentsRes = await query(
      `SELECT i.*, m.name as monitor_name, m.url as monitor_url 
       FROM incidents i
       JOIN monitors m ON i.monitor_id = m.id
       WHERE m.user_id = $1
       ORDER BY i.started_at DESC`,
      [DEMO_USER_ID],
    );

    const incidentsWithUpdates = await Promise.all(
      incidentsRes.rows.map(async (inc) => {
        const updatesRes = await query(
          `SELECT * FROM incident_updates 
           WHERE incident_id = $1 
           ORDER BY created_at ASC`,
          [inc.id],
        );

        return {
          id: inc.id,
          monitorId: inc.monitor_id,
          monitorName: inc.monitor_name,
          monitorUrl: inc.monitor_url,
          title: inc.title || `Service Interruption: ${inc.monitor_name}`,
          severity: inc.severity || "MAJOR",
          status: inc.status,
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

    return NextResponse.json({ incidents: incidentsWithUpdates });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const body = await req.json();
    const validated = createIncidentSchema.parse(body);

    const incidentId =
      "inc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const updateId =
      "upd_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    // Insert Incident
    await query(
      `INSERT INTO incidents (id, monitor_id, title, severity, status, started_at, cause) 
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [
        incidentId,
        validated.monitorId,
        validated.title,
        validated.severity,
        validated.status,
        validated.message,
      ],
    );

    // Insert Initial Timeline Update
    await query(
      `INSERT INTO incident_updates (id, incident_id, status, message, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [updateId, incidentId, validated.status, validated.message],
    );

    return NextResponse.json({ success: true, incidentId }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}
