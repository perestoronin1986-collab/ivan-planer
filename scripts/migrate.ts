import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });

  const file = process.argv[2] || "./drizzle/0000_init.sql";
  const migration = readFileSync(file, "utf-8");
  const statements = migration
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Running ${statements.length} statements...`);
  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt);
      console.log("✓", stmt.slice(0, 60).replace(/\n/g, " "));
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log("⚠ skip (exists):", stmt.slice(0, 60).replace(/\n/g, " "));
      } else {
        console.error("✗", e.message);
        await sql.end();
        process.exit(1);
      }
    }
  }

  await sql.end();
  console.log("Done!");
}

main();
