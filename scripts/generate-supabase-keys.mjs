import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("Set JWT_SECRET env var first.");
  process.exit(1);
}

const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 365 * 5; // 5 years

const anon = jwt.sign({ role: "anon", iss: "supabase", iat, exp }, JWT_SECRET);
const service = jwt.sign({ role: "service_role", iss: "supabase", iat, exp }, JWT_SECRET);

console.log("ANON_KEY=" + anon);
console.log("SERVICE_ROLE_KEY=" + service);
