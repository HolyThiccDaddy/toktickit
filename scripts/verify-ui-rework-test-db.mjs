// Read only the dedicated test environment; never fall back to server/.env.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const server = fileURLToPath(new URL("../server/", import.meta.url));
const require = createRequire(new URL("../server/package.json", import.meta.url));
const { parse } = require("dotenv");
let config, target;
try {
  config = parse(readFileSync(new URL("../server/.env.test", import.meta.url)));
  target = new URL(config.DATABASE_URL ?? "");
  assert.ok(["postgresql:", "postgres:"].includes(target.protocol));
  assert.match(decodeURIComponent(target.pathname).replace(/^\//, ""), /_test$/i);
} catch {
  throw new Error("Refusing database verification: server/.env.test must name a PostgreSQL database ending in _test. URL hidden.");
}
process.env.DATABASE_URL = target.toString();
const environment = { ...process.env, ...config, DATABASE_URL: target.toString() };
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url: target.toString() } } });

function run(args) {
  return execFileSync(process.execPath, args, { cwd: server, env: environment, windowsHide: true, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

async function snapshot() {
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`;
  const state = [];
  for (const { table_name: table } of tables) {
    assert.match(table, /^[A-Za-z_][A-Za-z0-9_]*$/);
    // The inherited account upserts refresh @updatedAt even when values agree.
    // Keep credential hashes, roles, activity/password flags and every other
    // stored field in the comparison; exclude only those two audit timestamps.
    const value = ["User", "RequesterUser"].includes(table) ? "(to_jsonb(t) - 'updatedAt')::text" : "to_jsonb(t)::text";
    const [row] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count, md5(coalesce(string_agg(${value}, '' ORDER BY ${value}), '')) AS fingerprint FROM "public"."${table}" t`);
    state.push({ table, ...row });
  }
  return state;
}

try {
  console.log("Guard passed: server/.env.test contains a PostgreSQL database whose parsed name ends in _test; URL hidden.");
  console.log(run(["node_modules/prisma/build/index.js", "migrate", "deploy"]));
  console.log("Seed run 1:");
  console.log(run(["dist/prisma/seed.js"]));
  const before = await snapshot();
  console.log("Seed run 2:");
  console.log(run(["dist/prisma/seed.js"]));
  const after = await snapshot();
  assert.deepEqual(after, before, "Repeated seed changed stored rows.");
  const digest = createHash("sha256").update(JSON.stringify(after)).digest("hex");
  console.log(JSON.stringify({ repeatedSeed: "PASS", unchangedOperationalTables: after.length, excludedAuditFields: ["User.updatedAt", "RequesterUser.updatedAt"], rowCounts: after.map(({ table, count }) => ({ table, count })), stateSha256: digest }, null, 2));
} catch (error) {
  // Avoid dumping Prisma connection configuration or child-process environments.
  console.error(error instanceof assert.AssertionError ? error.message : "Database verification failed. Inspect the dedicated test environment and local PostgreSQL service; no credentials are logged.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
