import Redis from 'ioredis';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

let rawUrl = (process.env.REDIS_URL || 'redis://localhost:6379').trim();
// Strip any accidental 'redis-cli --tls -u' prefix
const match = rawUrl.match(/(redis[s]?:\/\/[^\s]+)/);
if (match) {
  rawUrl = match[1];
}

// Ensure TLS is enabled for Upstash
const isUpstash = rawUrl.includes('upstash.io');
if (isUpstash && rawUrl.startsWith('redis://')) {
  rawUrl = rawUrl.replace('redis://', 'rediss://');
}

export const redisClient = new Redis(rawUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  tls: isUpstash ? { rejectUnauthorized: false } : undefined,
  retryStrategy(times) {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 100, 2000);
  },
});

redisClient.on('error', (err) => {
  if (process.env.NODE_ENV !== 'production') {
    // Gracefully handle in dev mode
  } else {
    console.error('[REDIS ERROR]', err.message);
  }
});
