import { query, initDb } from "../db";
import { executePingCheck } from "./pingEngine";
import { Queue, Worker } from "bullmq";
import { redisClient } from "../redis";

export const PING_QUEUE_NAME = "api-ping-queue";

let pingQueue: Queue | null = null;
let isMemorySchedulerRunning = false;

export async function initializeWorkerEngine() {
  console.log("🚀 Initializing API Sentinel Worker Engine (PostgreSQL)...");
  await initDb();

  let isRedisAvailable = false;
  try {
    await redisClient.connect();
    isRedisAvailable = true;
    console.log("✅ Redis connected! Running BullMQ Queue Worker.");
  } catch {
    console.warn(
      "⚠️ Redis not detected locally. Falling back to built-in In-Memory Worker Scheduler.",
    );
    isRedisAvailable = false;
  }

  if (isRedisAvailable) {
    pingQueue = new Queue(PING_QUEUE_NAME, { connection: redisClient as any });

    new Worker(
      PING_QUEUE_NAME,
      async (job: any) => {
        const { monitorId } = job.data;
        console.log(`[QUEUE JOB] Executing ping for monitor ID: ${monitorId}`);
        await executePingCheck(monitorId);
      },
      { connection: redisClient as any },
    );

    await syncBullMQSchedules();
  } else {
    startInMemoryScheduler();
  }
}

async function syncBullMQSchedules() {
  if (!pingQueue) return;

  const monitorsRes = await query(
    "SELECT * FROM monitors WHERE is_active = true",
  );
  for (const monitor of monitorsRes.rows) {
    const repeatIntervalMs = (monitor.interval_sec || 60) * 1000;
    await pingQueue.add(
      `ping-${monitor.id}`,
      { monitorId: monitor.id },
      {
        repeat: {
          every: repeatIntervalMs,
        },
        jobId: `repeat-${monitor.id}`,
      },
    );
  }
}

function startInMemoryScheduler() {
  if (isMemorySchedulerRunning) return;
  isMemorySchedulerRunning = true;

  console.log(
    "⏳ In-Memory Scheduler started. Checking monitors periodically...",
  );

  setInterval(async () => {
    try {
      const activeMonitorsRes = await query(
        "SELECT * FROM monitors WHERE is_active = true",
      );
      const now = Date.now();

      for (const monitor of activeMonitorsRes.rows) {
        const lastLogRes = await query(
          "SELECT tested_at FROM ping_logs WHERE monitor_id = $1 ORDER BY tested_at DESC LIMIT 1",
          [monitor.id],
        );
        const lastTestedAt = lastLogRes.rows[0]?.tested_at
          ? new Date(lastLogRes.rows[0].tested_at).getTime()
          : 0;
        const intervalMs = (monitor.interval_sec || 60) * 1000;

        if (now - lastTestedAt >= intervalMs) {
          console.log(
            `[WORKER] Ping interval reached for "${monitor.name}" (${monitor.url})`,
          );
          executePingCheck(monitor.id).catch((err) => {
            console.error(
              `[WORKER ERROR] Ping failed for ${monitor.name}:`,
              err.message,
            );
          });
        }
      }
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      console.error("[SCHEDULER LOOP ERROR]", errStr);
    }
  }, 10000);
}
