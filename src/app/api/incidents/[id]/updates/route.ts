import { NextResponse } from "next/server";
import { query, initDb } from "@/lib/db";
import { z } from "zod";

const postUpdateSchema = z.object({
  status: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]),
  message: z.string().min(3, "Message must be at least 3 characters"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await initDb();
    const { id: incidentId } = await params;
    const body = await req.json();
    const validated = postUpdateSchema.parse(body);

    const updateId =
      "upd_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    // Insert new timeline update
    await query(
      `INSERT INTO incident_updates (id, incident_id, status, message, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [updateId, incidentId, validated.status, validated.message],
    );

    // Update the incident's current status (and resolved_at if resolved)
    if (validated.status === "RESOLVED") {
      await query(
        `UPDATE incidents 
         SET status = $1, resolved_at = NOW() 
         WHERE id = $2`,
        [validated.status, incidentId],
      );
    } else {
      await query(
        `UPDATE incidents 
         SET status = $1 
         WHERE id = $2`,
        [validated.status, incidentId],
      );
    }

    return NextResponse.json({ success: true, updateId });
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
