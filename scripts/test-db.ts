import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const REF = "zrxineexwmucsoyttwrx";
const PASS = "jy5uBpWUDl25qNdM";
const POOLER = "aws-0-eu-central-1.pooler.supabase.com";

const variants = [
  `postgresql://postgres.${REF}:${PASS}@${POOLER}:6543/postgres`,
  `postgresql://postgres.${REF}:${PASS}@${POOLER}:5432/postgres`,
  `postgresql://postgres:${PASS}@${POOLER}:5432/postgres`,
  `postgresql://postgres:${PASS}@${POOLER}:6543/postgres`,
];

async function main() {
  for (const url of variants) {
    const label = url.replace(PASS, "***").replace(POOLER, "pooler");
    const sql = postgres(url, { ssl: "require", max: 1, connect_timeout: 8 });
    try {
      const res = await sql`SELECT current_user`;
      console.log("✓", label, "→", res[0].current_user);
      await sql.end();
      break;
    } catch (e: any) {
      console.log("✗", label, "→", e.message.slice(0, 60));
      await sql.end();
    }
  }
}

main();
