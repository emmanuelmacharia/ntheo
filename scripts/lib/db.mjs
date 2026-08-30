/** Shared plumbing for the one-off media scripts: env, connection, range reads. */
import mysql from "mysql2/promise";
import fs from "node:fs";

export function readEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(".env", "utf8")
      .split("\n")
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [
          line.slice(0, i).trim(),
          line
            .slice(i + 1)
            .trim()
            .replace(/^["']|["']$/g, ""),
        ];
      }),
  );
}

export async function connect() {
  const env = readEnv();
  return mysql.createConnection({
    host: env.SINGLE_STORE_HOST,
    port: Number(env.SINGLE_STORE_PORT),
    user: env.SINGLE_STORE_USER,
    password: env.SINGLE_STORE_PASSWORD,
    database: env.SINGLE_STORE_DATABASE_NAME,
    ssl: {},
    // Store and read timestamps as literal wall clock, no local conversion.
    // Drizzle parses DB timestamps as UTC, so without this mysql2 writes a
    // locally shifted string and the app reads every capture time three hours
    // late. Capture times are wall clock by design; see scripts/lib/exif.mjs.
    timezone: "Z",
  });
}

/**
 * Fetches a byte range. The CDN honours these, which is what keeps a full pass
 * over 343 files at roughly 22MB instead of 1.39GB.
 */
export async function fetchRange(url, from, to) {
  const response = await fetch(url, { headers: { Range: `bytes=${from}-${to}` } });
  if (!response.ok && response.status !== 206) {
    throw new Error(`HTTP ${response.status}`);
  }
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    filename: parseFilename(response.headers.get("content-disposition")),
    totalBytes: parseTotalBytes(response.headers.get("content-range")),
  };
}

/**
 * Retries on failure. Pulling several multi-megabyte originals at once makes the
 * CDN throttle, and a throttled request comes back as a 404 rather than a 429,
 * so a single attempt reports a file as missing when it is simply busy.
 */
export async function fetchWhole(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return {
        buffer: Buffer.from(await response.arrayBuffer()),
        filename: parseFilename(response.headers.get("content-disposition")),
        totalBytes: null,
      };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

function parseFilename(header) {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) return decodeURIComponent(utf8[1]);
  const plain = /filename="([^"]+)"/i.exec(header);
  return plain ? plain[1] : null;
}

function parseTotalBytes(header) {
  const m = /\/(\d+)$/.exec(header ?? "");
  return m ? Number(m[1]) : null;
}

/** Runs `worker` over `items` with a fixed number of parallel slots. */
export async function pool(items, size, worker) {
  const queue = [...items];
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, queue.length) }, async () => {
      while (queue.length) {
        const item = queue.shift();
        await worker(item, index++);
      }
    }),
  );
}
