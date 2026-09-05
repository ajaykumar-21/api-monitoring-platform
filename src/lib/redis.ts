import Redis from "ioredis";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy(times) {
    // Retry up to 3 times before entering quiet offline mode
    if (times > 3) {
      return null;
    }
    return Math.min(times * 100, 2000);
  },
});

redisClient.on("error", (err) => {
  if (process.env.NODE_ENV === "development") {
    // Silent warn in dev mode if Redis is not running locally
  } else {
    console.error("[REDIS ERROR]", err.message);
  }
});
