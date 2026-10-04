// node gen-keys.mjs > .env — пароль Postgres, секрет JWT и ключи anon/service_role, подписанные им (HS256, как legacy-ключи облака).
import { createHmac, randomBytes } from "node:crypto";

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const secret = randomBytes(48).toString("base64url");
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 10 * 365 * 24 * 3600;
const sign = (role) => {
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role, iss: "supabase", iat, exp })}`;
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
};

console.log(`POSTGRES_PASSWORD=${randomBytes(24).toString("hex")}`);
console.log(`JWT_SECRET=${secret}`);
console.log(`ANON_KEY=${sign("anon")}`);
console.log(`SERVICE_ROLE_KEY=${sign("service_role")}`);
