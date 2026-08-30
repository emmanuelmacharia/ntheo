/**
 * Applies a .sql file to the SingleStore database one statement at a time.
 *
 * Why not `drizzle-kit migrate`: this repo has no migration history, so a
 * generated migration tries to CREATE TABLE over ntheo_user, ntheo_invite and
 * ntheo_media, which already exist and hold live data.
 *
 * Re-runnable. "already exists" and "duplicate column" errors are reported as
 * skips, so a partially applied file can be run again safely.
 *
 *   node scripts/apply-sql.mjs drizzle/0001_gallery_metadata.sql
 */
import mysql from "mysql2/promise";
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/apply-sql.mjs <path-to-sql>");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace(/^["']|["']$/g, ""),
      ];
    }),
);

const statements = fs
  .readFileSync(file, "utf8")
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const ALREADY_APPLIED = /already exists|duplicate column|duplicate key name/i;

const db = await mysql.createConnection({
  host: env.SINGLE_STORE_HOST,
  port: Number(env.SINGLE_STORE_PORT),
  user: env.SINGLE_STORE_USER,
  password: env.SINGLE_STORE_PASSWORD,
  database: env.SINGLE_STORE_DATABASE_NAME,
  ssl: {},
});

console.log(`${file}: ${statements.length} statements\n`);

let applied = 0;
let skipped = 0;

for (const sql of statements) {
  const label = sql.replace(/\s+/g, " ").slice(0, 72);
  try {
    await db.query(sql);
    applied++;
    console.log(`  ok      ${label}`);
  } catch (error) {
    if (ALREADY_APPLIED.test(error.message)) {
      skipped++;
      console.log(`  skip    ${label}`);
      continue;
    }
    console.error(`\n  FAILED  ${label}\n  ${error.message}\n`);
    console.error(
      `Stopped after ${applied} applied, ${skipped} skipped. Nothing else ran.`,
    );
    await db.end();
    process.exit(1);
  }
}

console.log(`\n${applied} applied, ${skipped} already present.`);
await db.end();
