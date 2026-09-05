import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { initDb } from "../src/lib/db";

async function main() {
  console.log("🐘 Initializing PostgreSQL database tables...");
  await initDb();
  console.log("✨ PostgreSQL setup complete!");
}

main().catch((err) => {
  console.error("❌ Failed to initialize PostgreSQL:", err);
  process.exit(1);
});
