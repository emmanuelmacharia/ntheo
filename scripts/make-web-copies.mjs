/**
 * Generates web-sized Display Copies for the large photos.
 *
 * The originals run 2 to 7MB, and Next's image optimizer downloads the whole
 * original once per rendition it produces. Painting one screen of the gallery
 * therefore pulled hundreds of megabytes through the optimizer, which is why
 * large photos appeared blank for seconds and why some renditions timed out
 * with a 500.
 *
 * This resizes each large photo once, to something a web page actually needs,
 * and points `display_url` at it. The original is never touched and is still
 * what the download button hands you.
 *
 *   node scripts/make-web-copies.mjs [--limit N] [--min-bytes N] [--dry]
 */
import sharp from "sharp";
import { UTApi, UTFile } from "uploadthing/server";
import { connect, fetchWhole, pool, readEnv } from "./lib/db.mjs";

/** Long edge of the served copy. Comfortably above a full-screen viewer. */
const MAX_EDGE = 2560;
const QUALITY = 82;
const CONCURRENCY = 2; // the CDN throttles concurrent multi-megabyte reads

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : null;
};

const options = {
  limit: value("--limit") ? Number(value("--limit")) : null,
  minBytes: value("--min-bytes") ? Number(value("--min-bytes")) : 1_500_000,
  dry: flag("--dry"),
};

const env = readEnv();
const utapi = new UTApi({ token: env.UPLOADTHING_TOKEN });

const db = await connect();

const [rows] = await db.query(
  `SELECT id, url, type, size
   FROM ntheo_media
   WHERE type LIKE 'image/%'
     AND display_url IS NULL
     AND size > ?
   ORDER BY size DESC
   ${options.limit ? `LIMIT ${options.limit}` : ""}`,
  [options.minBytes],
);

const totalMb = rows.reduce((sum, r) => sum + Number(r.size), 0) / 1048576;
console.log(
  `${rows.length} photos over ${(options.minBytes / 1048576).toFixed(1)}MB, ` +
    `${totalMb.toFixed(0)}MB to read${options.dry ? " (dry run)" : ""}\n`,
);

let done = 0;
let savedBytes = 0;
const counts = { ok: 0, skipped: 0, failed: 0 };

await pool(rows, CONCURRENCY, async (row) => {
  const label = `${String(++done).padStart(3)}/${rows.length}`;
  const originalMb = Number(row.size) / 1048576;

  try {
    const { buffer } = await fetchWhole(row.url);

    const resized = await sharp(buffer)
      // Honour EXIF orientation, then strip metadata from the derivative. The
      // original keeps its EXIF; capture times are already in the database.
      .rotate()
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    // If the resize barely helps, keep serving the original rather than storing
    // a second near-identical file.
    if (resized.length > Number(row.size) * 0.85) {
      counts.skipped++;
      console.log(`${label} skip   ${originalMb.toFixed(1)}MB, resize saved too little`);
      return;
    }

    if (options.dry) {
      counts.ok++;
      savedBytes += Number(row.size) - resized.length;
      console.log(
        `${label} dry    ${originalMb.toFixed(1)}MB -> ${(resized.length / 1048576).toFixed(2)}MB`,
      );
      return;
    }

    const upload = await utapi.uploadFiles(
      new UTFile([resized], `web-${row.id}.jpg`, { type: "image/jpeg" }),
    );
    if (upload.error) throw new Error(upload.error.message);

    const url = upload.data.ufsUrl ?? upload.data.url;
    await db.query(`UPDATE ntheo_media SET display_url = ? WHERE id = ?`, [url, row.id]);

    counts.ok++;
    savedBytes += Number(row.size) - resized.length;
    console.log(
      `${label} ok     ${originalMb.toFixed(1)}MB -> ${(resized.length / 1048576).toFixed(2)}MB`,
    );
  } catch (error) {
    counts.failed++;
    console.log(`${label} FAILED ${error.message}`);
  }
});

console.log(
  `\n${counts.ok} written, ${counts.skipped} skipped, ${counts.failed} failed. ` +
    `Serving ${(savedBytes / 1048576).toFixed(0)}MB less per full pass.`,
);
await db.end();
