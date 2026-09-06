import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { redisClient } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<
    string,
    { status: string; latencyMs?: number; error?: string }
  > = {};

  // 1. Check PostgreSQL
  try {
    const dbStart = Date.now();
    await query("SELECT 1");
    checks.database = {
      status: "healthy 🟢",
      latencyMs: Date.now() - dbStart,
    };
  } catch (err: any) {
    checks.database = {
      status: "unhealthy 🔴",
      error: err.message,
    };
  }

  // 2. Check Redis
  try {
    const redisStart = Date.now();
    const pingRes = await redisClient.ping();
    checks.redis = {
      status: pingRes === "PONG" ? "healthy 🟢" : "degraded 🟡",
      latencyMs: Date.now() - redisStart,
    };
  } catch (err: any) {
    checks.redis = {
      status: "offline / fallback (in-memory scheduler active) 🟡",
      error: err.message,
    };
  }

  const isHealthy = checks.database.status.includes("healthy");

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      totalLatencyMs: Date.now() - startTime,
      services: checks,
    },
    { status: isHealthy ? 200 : 503 },
  );
}
