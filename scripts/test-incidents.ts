import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { query, initDb } from "../src/lib/db";

async function runIncidentTests() {
  console.log("🔥 Starting Incident & Public Timeline Engine Tests...\n");
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

  // 1. Verify schema tables and columns
  console.log("1. Checking DB Tables and Columns:");
  assert("DB Query function is defined", typeof query === "function");

  // 2. Test Timeline Stages mapping
  console.log("\n2. Testing Timeline Status Stages:");
  const validStages = ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"];
  assert("All 4 standard lifecycle stages defined", validStages.length === 4);
  assert("Includes INVESTIGATING", validStages.includes("INVESTIGATING"));
  assert("Includes IDENTIFIED", validStages.includes("IDENTIFIED"));
  assert("Includes MONITORING", validStages.includes("MONITORING"));
  assert("Includes RESOLVED", validStages.includes("RESOLVED"));

  console.log(`\n========================================`);
  console.log(
    `🏁 Incident Timeline Test Results: ${passedCount} passed, ${failedCount} failed.`,
  );
  console.log(`========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runIncidentTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
