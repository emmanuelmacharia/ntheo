/**
 * Media backfill, stages 1 and 2. See docs/adr/0002.
 *
 * The database was never told the shape of what it stores, so this reads it back
 * out of the files themselves: dimensions with orientation applied, capture time,
 * GPS, duration, streamability, a blur placeholder, and a web-safe Display Copy
 * for the raw and HEIC files no browser can render.
 *
 * Resumable. Only rows with metadata_status = 'pending' are touched unless
 * --force is passed, so a partial run costs nothing to repeat.
 *
 *   node scripts/backfill-media.mjs [--limit N] [--force] [--id N] [--dry]
 *   node scripts/backfill-media.mjs --times-only   (re-reads capture times only)
 */
import sharp from "sharp";
import { UTApi, UTFile } from "uploadthing/server";
import { connect, fetchRange, fetchWhole, pool, readEnv } from "./lib/db.mjs";
import { decodeHeic } from "./lib/heic.mjs";
import {
  TAGS,
  applyOrientation,
  extractRawPreview,
  extractThumbnail,
  findLargestJpeg,
  gpsToDecimal,
  jpegDimensions,
  parseExif,
  parseExifDate,
  pngDimensions,
} from "./lib/exif.mjs";
import {
  isStreamable,
  readHeicDimensions,
  readMovieHeader,
  readTrackDimensions,
} from "./lib/isobmff.mjs";

const HEAD_BYTES = 131072; // 128KB: enough for EXIF, the thumbnail, and a moov
const LQIP_WIDTH = 24;
const DISPLAY_MAX_EDGE = 3200; // Display Copies are for the web; originals stay untouched
const CONCURRENCY = 6;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

const options = {
  limit: value("--limit") ? Number(value("--limit")) : null,
  id: value("--id"),
  force: flag("--force"),
  dry: flag("--dry"),
  timesOnly: flag("--times-only"),
};

const env = readEnv();
const utapi = env.UPLOADTHING_TOKEN ? new UTApi({ token: env.UPLOADTHING_TOKEN }) : null;

const isImage = (type) => type.startsWith("image/");
const isVideo = (type) => type.startsWith("video/");
const isRaw = (type) => /nikon|x-raw|dng|cr2|arw/i.test(type);
const isHeic = (type) => /heic|heif/i.test(type);

/**
 * Last resort when a file carries no metadata at all: camera apps name files
 * after the moment they were taken. IMG_20250809_143022, PXL_20250809_..., and
 * plain 20250809_143022 all appear in the wild.
 */
function dateFromFilename(name) {
  if (!name) return null;
  const m = /(20\d{2})(\d{2})(\d{2})[_-]?(\d{2})?(\d{2})?(\d{2})?/.exec(name);
  if (!m) return null;

  const [, y, mo, d, h = "12", mi = "00", s = "00"] = m;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(Number(y), month - 1, day, Number(h), Number(mi), Number(s)));
  return date.getTime() <= Date.now() ? date : null;
}

/** A ~24px JPEG, base64 encoded, small enough to inline in the HTML payload. */
async function makeLqip(buffer, orientation = 1) {
  const rotation = { 3: 180, 6: 90, 8: 270 }[orientation] ?? 0;
  const out = await sharp(buffer)
    .rotate(rotation)
    .resize(LQIP_WIDTH, null, { fit: "inside" })
    .jpeg({ quality: 40 })
    .toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

/** Stage 1 for photos: everything we can learn from the first 128KB. */
async function probeImage(row, head) {
  const { buffer, filename } = head;
  const result = { originalFilename: filename, captureSource: "none" };

  const exif = parseExif(buffer);

  if (exif) {
    const orientation = exif.ifd0[TAGS.ORIENTATION] ?? 1;

    const raw =
      exif.exif[TAGS.PIXEL_X] && exif.exif[TAGS.PIXEL_Y]
        ? { width: exif.exif[TAGS.PIXEL_X], height: exif.exif[TAGS.PIXEL_Y] }
        : (jpegDimensions(buffer) ??
          (exif.ifd0[TAGS.IMAGE_WIDTH]
            ? { width: exif.ifd0[TAGS.IMAGE_WIDTH], height: exif.ifd0[TAGS.IMAGE_HEIGHT] }
            : null));

    if (raw) Object.assign(result, applyOrientation(raw.width, raw.height, orientation));

    const shot =
      parseExifDate(exif.exif[TAGS.DATE_TIME_ORIGINAL]) ??
      parseExifDate(exif.ifd0[TAGS.DATE_TIME]);
    if (shot) {
      result.capturedAt = shot;
      result.captureSource = "exif";
    }

    const lat = gpsToDecimal(exif.gps[TAGS.GPS_LAT], exif.gps[TAGS.GPS_LAT_REF]);
    const lng = gpsToDecimal(exif.gps[TAGS.GPS_LNG], exif.gps[TAGS.GPS_LNG_REF]);
    if (lat !== null && lng !== null) {
      result.gpsLat = lat;
      result.gpsLng = lng;
    }

    const thumb = extractThumbnail(buffer, exif);
    if (thumb) {
      try {
        result.lqip = await makeLqip(thumb, orientation);
      } catch {
        // A malformed thumbnail is not worth failing the row over.
      }
    }
  }

  if (!result.width && isHeic(row.type)) {
    Object.assign(result, readHeicDimensions(buffer));
  }
  if (!result.width && row.type === "image/png") {
    Object.assign(result, pngDimensions(buffer) ?? {});
  }
  if (!result.width) {
    Object.assign(result, jpegDimensions(buffer) ?? {});
  }

  if (!result.capturedAt) {
    const guessed = dateFromFilename(filename);
    if (guessed) {
      result.capturedAt = guessed;
      result.captureSource = "filename";
    }
  }

  return result;
}

/** Stage 1 for videos. Posters and exact dimensions come later, in the browser. */
async function probeVideo(row, head) {
  const { buffer, filename } = head;
  const result = { originalFilename: filename, captureSource: "none" };

  result.streamable = isStreamable(buffer);

  const { durationSeconds, capturedAt } = readMovieHeader(buffer);
  if (durationSeconds) result.durationSeconds = durationSeconds;
  if (capturedAt) {
    result.capturedAt = capturedAt;
    result.captureSource = "mp4";
  }

  const dims = readTrackDimensions(buffer);
  if (dims.width) Object.assign(result, dims);

  if (!result.capturedAt) {
    const guessed = dateFromFilename(filename);
    if (guessed) {
      result.capturedAt = guessed;
      result.captureSource = "filename";
    }
  }

  return result;
}

/**
 * Stage 2: give the unrenderable files something a browser can actually show.
 *
 * Both formats need the whole file rather than a head fetch. A Nikon raw keeps
 * its full-size preview in a SubIFD partway in, and an Apple HEIC puts its
 * `meta` box after the mdat, at the very end. So this re-probes from the
 * complete buffer rather than trusting stage 1's 128KB window.
 */
async function makeDisplayCopy(row, result) {
  if (!utapi && !options.dry) throw new Error("UPLOADTHING_TOKEN missing");

  const { buffer: whole, filename } = await fetchWhole(row.url);
  if (filename && !result.originalFilename) result.originalFilename = filename;

  const exif = parseExif(whole);
  const orientation = exif?.ifd0[TAGS.ORIENTATION] ?? 1;

  // Capture time and GPS often live past the 128KB window in these formats.
  if (exif && !result.capturedAt) {
    const shot =
      parseExifDate(exif.exif[TAGS.DATE_TIME_ORIGINAL]) ??
      parseExifDate(exif.ifd0[TAGS.DATE_TIME]);
    if (shot) {
      result.capturedAt = shot;
      result.captureSource = "exif";
    }
    const lat = gpsToDecimal(exif.gps[TAGS.GPS_LAT], exif.gps[TAGS.GPS_LAT_REF]);
    const lng = gpsToDecimal(exif.gps[TAGS.GPS_LNG], exif.gps[TAGS.GPS_LNG_REF]);
    if (lat !== null && lng !== null) {
      result.gpsLat = lat;
      result.gpsLng = lng;
    }
  }

  let jpeg = null;

  if (isHeic(row.type)) {
    // libheif already applies the rotation box, so its dimensions are final and
    // EXIF orientation must not be applied a second time.
    const decoded = await decodeHeic(whole);
    if (decoded) {
      jpeg = decoded.jpeg;
      result.width = decoded.width;
      result.height = decoded.height;
    } else if (!result.width) {
      Object.assign(result, readHeicDimensions(whole));
    }
  }

  if (!jpeg) {
    // Preferred source is the format's own index; the scanner is the safety net.
    let source = isRaw(row.type) ? extractRawPreview(whole, exif) : null;
    if (!source || (await sharp(source).metadata()).width < 1024) {
      source = findLargestJpeg(whole)?.buffer ?? source;
    }
    if (!source) {
      try {
        source = await sharp(whole).jpeg({ quality: 86 }).toBuffer();
      } catch {
        source = null;
      }
    }
    if (!source) return null;

    const full = await sharp(source)
      .rotate({ 3: 180, 6: 90, 8: 270 }[orientation] ?? 0)
      .jpeg({ quality: 86 })
      .toBuffer();

    // Record the preview's true size before capping the served copy.
    const fullMeta = await sharp(full).metadata();
    if (!result.width || fullMeta.width > result.width) {
      result.width = fullMeta.width;
      result.height = fullMeta.height;
    }

    jpeg = await sharp(full)
      .resize(DISPLAY_MAX_EDGE, DISPLAY_MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 86 })
      .toBuffer();
  }

  if (!result.lqip) result.lqip = await makeLqip(jpeg, 1);
  const meta = await sharp(jpeg).metadata();

  if (options.dry) return `dry-run:${meta.width}x${meta.height}:${Math.round(jpeg.length / 1024)}KB`;

  const name = `display-${row.id}.jpg`;
  const upload = await utapi.uploadFiles(new UTFile([jpeg], name, { type: "image/jpeg" }));
  if (upload.error) throw new Error(upload.error.message);
  return upload.data.ufsUrl ?? upload.data.url;
}

/**
 * Downloads the whole photo purely to build a placeholder.
 *
 * Roughly half the library came through WhatsApp or a re-encoder, which strips
 * the EXIF thumbnail that makes placeholders free. Those files leave us no
 * cheap option, and a gallery where half the tiles pop in grey is worse than a
 * one-off download during a script that runs once.
 */
async function lqipFromWholeFile(row, result) {
  const { buffer } = await fetchWhole(row.url);
  result.lqip = await makeLqip(buffer, 1);

  if (!result.width) {
    const meta = await sharp(buffer).metadata();
    // sharp reports pre-rotation values, same trap as the EXIF header.
    Object.assign(result, applyOrientation(meta.width, meta.height, meta.orientation ?? 1));
  }
}

async function processRow(row, db) {
  const needsWholeFile = isRaw(row.type) || isHeic(row.type);

  const head = await fetchRange(row.url, 0, HEAD_BYTES - 1);
  const result = isVideo(row.type)
    ? await probeVideo(row, head)
    : await probeImage(row, head);

  // Repairs capture times in place without re-downloading whole files for
  // placeholders and Display Copies that are already stored.
  if (options.timesOnly) {
    result.metadataStatus = "ok";
    if (!options.dry) {
      await db.query(
        `UPDATE ntheo_media SET captured_at = ?, capture_source = ? WHERE id = ?`,
        [result.capturedAt ?? null, result.captureSource ?? "none", row.id],
      );
    }
    return result;
  }

  if (isImage(row.type) && !needsWholeFile && !result.lqip) {
    try {
      await lqipFromWholeFile(row, result);
    } catch {
      // No placeholder is survivable; the tile just starts empty.
    }
  }

  if (needsWholeFile) {
    const displayUrl = await makeDisplayCopy(row, result);
    if (displayUrl) {
      result.displayUrl = displayUrl;
    } else {
      result.visible = false; // hidden, never deleted
    }
  }

  // A photo with no shape cannot be laid out, so that is the one hard failure.
  const ok = isVideo(row.type) ? true : Boolean(result.width && result.height);
  result.metadataStatus = ok ? "ok" : "failed";

  if (!options.dry) await writeRow(db, row.id, result);
  return result;
}

async function writeRow(db, id, r) {
  const columns = {
    width: r.width ?? null,
    height: r.height ?? null,
    lqip: r.lqip ?? null,
    captured_at: r.capturedAt ?? null,
    capture_source: r.captureSource ?? "none",
    display_url: r.displayUrl ?? null,
    // int column: SingleStore rejects a fractional value outright rather than
    // rounding it, and durations are parsed to one decimal place.
    duration_seconds: r.durationSeconds ? Math.round(r.durationSeconds) : null,
    streamable: r.streamable ?? true,
    original_filename: r.originalFilename ?? null,
    gps_lat: r.gpsLat ?? null,
    gps_lng: r.gpsLng ?? null,
    visible: r.visible ?? true,
    metadata_status: r.metadataStatus,
  };

  const assignments = Object.keys(columns)
    .map((c) => `\`${c}\` = ?`)
    .join(", ");
  await db.query(`UPDATE ntheo_media SET ${assignments} WHERE id = ?`, [
    ...Object.values(columns),
    id,
  ]);
}

const db = await connect();

const where = options.id
  ? `WHERE id = ${Number(options.id)}`
  : options.force || options.timesOnly
    ? ""
    : `WHERE metadata_status = 'pending'`;
const limit = options.limit ? ` LIMIT ${options.limit}` : "";
const [rows] = await db.query(
  `SELECT id, url, type, size FROM ntheo_media ${where} ORDER BY id${limit}`,
);

console.log(`${rows.length} rows to process${options.dry ? " (dry run, no writes)" : ""}\n`);

const counts = { ok: 0, failed: 0, error: 0 };
let done = 0;

await pool(rows, CONCURRENCY, async (row) => {
  const label = `${String(++done).padStart(3)}/${rows.length} ${row.type.padEnd(17)}`;
  try {
    const r = await processRow(row, db);
    counts[r.metadataStatus]++;

    const shape = r.width ? `${r.width}x${r.height}` : "no size";
    const when = r.capturedAt ? r.capturedAt.toISOString().slice(0, 16).replace("T", " ") : "undated";
    const extras = [
      r.lqip ? "lqip" : null,
      r.displayUrl ? "display" : null,
      r.gpsLat ? "gps" : null,
      r.durationSeconds ? `${r.durationSeconds}s` : null,
      r.streamable === false ? "NOT streamable" : null,
      r.visible === false ? "HIDDEN" : null,
    ].filter(Boolean);

    console.log(
      `${label} ${shape.padEnd(11)} ${when.padEnd(17)} ${r.captureSource.padEnd(8)} ${extras.join(" ")}`,
    );
  } catch (error) {
    counts.error++;
    console.log(`${label} ERROR ${error.message}`);
    if (!options.dry) {
      await db
        .query(`UPDATE ntheo_media SET metadata_status = 'failed' WHERE id = ?`, [row.id])
        .catch(() => {});
    }
  }
});

console.log(`\nok ${counts.ok}, failed ${counts.failed}, errored ${counts.error}`);
await db.end();
