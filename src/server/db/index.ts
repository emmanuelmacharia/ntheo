import { drizzle } from "drizzle-orm/singlestore";
import mysql from "mysql2/promise";
import { env } from "~/env";
import * as schema from "./schema";

/**
 * A pool, not a single connection.
 *
 * This used to open one long-lived connection at module load with a top-level
 * await. SingleStore closes idle connections, and nothing here reconnected, so
 * the app fell over once the socket went away. Every request also re-registered
 * an `error` listener on the same connection, which is what produced the
 * MaxListenersExceededWarning.
 *
 * A pool reconnects on its own and is the right shape for the gallery, where
 * every page is dynamic and reads on each request.
 */
const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

function createPool() {
  return mysql.createPool({
    host: env.SINGLE_STORE_HOST,
    port: parseInt(env.SINGLE_STORE_PORT),
    user: env.SINGLE_STORE_USER,
    password: env.SINGLE_STORE_PASSWORD,
    database: env.SINGLE_STORE_DATABASE_NAME,
    ssl: {},
    // Timestamps are stored as literal wall clock and read back as UTC, which is
    // what the gallery expects. Keeps the driver in step with the one-off
    // scripts in /scripts. See scripts/lib/exif.mjs.
    timezone: "Z",
    waitForConnections: true,
    // Deployed as serverless functions, so each instance wants a small pool.
    connectionLimit: 5,
    maxIdle: 2,
    idleTimeout: 30_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
  });
}

// Reused across hot reloads in development so the dev server does not open a
// fresh pool on every edit.
const pool = globalForDb.pool ?? createPool();
if (env.NODE_ENV !== "production") globalForDb.pool = pool;

pool.on("connection", (connection) => {
  connection.on("error", (error) => {
    // The pool will discard and replace this connection; log and carry on
    // rather than letting an unhandled event take the process down.
    console.error("Database connection error:", error);
  });
});

export { pool as client };
export const db = drizzle(pool, { schema });
