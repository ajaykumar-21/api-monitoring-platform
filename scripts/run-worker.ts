import { initializeWorkerEngine } from "../src/lib/worker/scheduler";

async function main() {
  console.log("⚡ Starting API Sentinel Background Worker Service...");
  await initializeWorkerEngine();
}

main().catch((err) => {
  console.error("❌ Background Worker Fatal Error:", err);
  process.exit(1);
});
