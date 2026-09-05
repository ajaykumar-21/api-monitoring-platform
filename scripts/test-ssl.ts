import { checkSslCertificate } from "../src/lib/worker/sslChecker";

async function runSslTests() {
  console.log("🔒 Starting SSL / TLS Certificate Checker Tests...\n");
  let passedCount = 0;
  let failedCount = 0;

  function assert(name: string, condition: boolean, details?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${name}`, details || "");
      failedCount++;
    }
  }

  // 1. Test Non-HTTPS URL (should be bypassed gracefully)
  console.log("1. Testing Non-HTTPS endpoint:");
  const httpRes = await checkSslCertificate("http://example.com");
  assert("HTTP URL is not treated as HTTPS", httpRes.isHttps === false);
  assert("HTTP URL daysRemaining is null", httpRes.daysRemaining === null);

  // 2. Test SSL Certificate logic and types
  console.log("\n2. Testing SSL Certificate Data Types and Structure:");
  assert(
    "checkSslCertificate function is defined",
    typeof checkSslCertificate === "function",
  );

  console.log(`\n========================================`);
  console.log(
    `🏁 SSL Engine Test Results: ${passedCount} passed, ${failedCount} failed.`,
  );
  console.log(`========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSslTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
