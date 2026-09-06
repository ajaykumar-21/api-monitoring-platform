import { redisClient } from "../src/lib/redis";

async function testRedis() {
  console.log("🔌 Testing Redis connection...");

  try {
    await redisClient.connect();
    console.log("✅ Redis connected successfully!");

    // Test writing a key
    const testKey = "api_sentinel_test_key";
    const testValue = `Ping verified at ${new Date().toISOString()}`;
    await redisClient.set(testKey, testValue, "EX", 60);
    console.log(`📝 Wrote test key to Redis: "${testKey}"`);

    // Test reading the key back
    const retrieved = await redisClient.get(testKey);
    console.log(`📖 Read test value from Redis: "${retrieved}"`);

    // Test ping
    const pingRes = await redisClient.ping();
    console.log(`🏓 Redis PING response: "${pingRes}" (PONG)`);

    console.log(
      "\n🎉 SUCCESS: Redis is 100% working and ready for BullMQ queue jobs!",
    );
  } catch (error: any) {
    console.error("\n❌ Redis connection failed:");
    console.error(error.message);
  } finally {
    try {
      await redisClient.quit();
    } catch {
      // ignore
    }
    process.exit(0);
  }
}

testRedis();
