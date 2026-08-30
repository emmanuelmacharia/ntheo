/**
 * ISO base media file format reading: MP4, QuickTime MOV, and HEIC.
 *
 * We need four facts per video: how long it runs, when it was shot, whether the
 * browser can stream it, and how big the picture is. The first three come from
 * the header. Dimensions we treat as best effort, because the browser hands us
 * exact values during poster capture anyway (see docs/adr/0003).
 */

const MAC_EPOCH = Date.UTC(1904, 0, 1);

/**
 * The ceremony was in Kenya, which is UTC+3 year round with no daylight saving.
 *
 * Unlike EXIF, an mvhd creation_time is a real UTC instant. Photos are stored as
 * the wall clock their camera showed, so videos are shifted into that same wall
 * clock. Without this a video and a photo taken in the same minute land three
 * hours apart on the timeline.
 */
const EVENT_UTC_OFFSET_HOURS = 3;

/** Walks the boxes at one level. Returns [{type, start, size, dataStart}]. */
export function readBoxes(buf, start = 0, end = buf.length) {
  const boxes = [];
  let offset = start;

  while (offset + 8 <= end) {
    let size = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    if (!/^[\x20-\x7e]{4}$/.test(type)) break;

    let dataStart = offset + 8;
    if (size === 1) {
      // 64-bit size, stored in the eight bytes after the type.
      if (offset + 16 > end) break;
      size = Number(buf.readBigUInt64BE(offset + 8));
      dataStart = offset + 16;
    } else if (size === 0) {
      size = end - offset; // runs to the end of the file
    }
    if (size < 8) break;

    boxes.push({ type, start: offset, size, dataStart, dataEnd: Math.min(offset + size, end) });
    offset += size;
  }
  return boxes;
}

/** Depth-first search for the first box of a given type. */
export function findBox(buf, type, start = 0, end = buf.length, depth = 0) {
  if (depth > 8) return null;

  for (const box of readBoxes(buf, start, end)) {
    if (box.type === type) return box;

    // Containers worth descending into. `meta` is a full box, so its children
    // begin four bytes late.
    if (["moov", "trak", "mdia", "minf", "stbl", "iprp", "ipco", "moof"].includes(box.type)) {
      const hit = findBox(buf, type, box.dataStart, box.dataEnd, depth + 1);
      if (hit) return hit;
    } else if (box.type === "meta") {
      const hit = findBox(buf, type, box.dataStart + 4, box.dataEnd, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * True when `moov` precedes `mdat`, which is what lets a browser render the
 * first frame without downloading the whole file. One file in the library fails
 * this and is poster-only as a result.
 */
export function isStreamable(headBuf) {
  for (const box of readBoxes(headBuf)) {
    if (box.type === "moov") return true;
    if (box.type === "mdat") return false;
  }
  return false; // no moov in the head we fetched
}

/** Duration in seconds and capture time, both from the movie header. */
export function readMovieHeader(buf) {
  const mvhd = findBox(buf, "mvhd");
  if (!mvhd) return { durationSeconds: null, capturedAt: null };

  const version = buf[mvhd.dataStart];
  const base = mvhd.dataStart + 4;

  // A moov box can extend past the head we fetched, leaving a truncated mvhd.
  // Reading past the end throws, which would fail the whole row over a field we
  // treat as optional anyway.
  const needed = version === 1 ? 28 : 16;
  if (base + needed > buf.length) return { durationSeconds: null, capturedAt: null };

  let created;
  let timescale;
  let duration;
  if (version === 1) {
    created = Number(buf.readBigUInt64BE(base));
    timescale = buf.readUInt32BE(base + 16);
    duration = Number(buf.readBigUInt64BE(base + 20));
  } else {
    created = buf.readUInt32BE(base);
    timescale = buf.readUInt32BE(base + 8);
    duration = buf.readUInt32BE(base + 12);
  }

  const durationSeconds =
    timescale > 0 && duration > 0 ? Math.round((duration / timescale) * 10) / 10 : null;

  // Some cameras leave creation_time at zero. Anything before 1990 or in the
  // future is a broken clock, not a memory, so we discard it and let the item
  // become an Undated Item rather than inventing a position on the timeline.
  let capturedAt = null;
  if (created > 0) {
    const utc = new Date(MAC_EPOCH + created * 1000);
    const year = utc.getUTCFullYear();
    if (year >= 1990 && utc.getTime() <= Date.now() + 86400000) {
      capturedAt = new Date(utc.getTime() + EVENT_UTC_OFFSET_HOURS * 3600_000);
    }
  }

  return { durationSeconds, capturedAt };
}

/**
 * Largest track dimensions, with the display matrix applied.
 *
 * A phone held upright records landscape pixels plus a 90 degree rotation
 * matrix. Ignoring the matrix would hand the layout a landscape aspect ratio
 * for a portrait video, which is the video version of the EXIF orientation trap.
 */
export function readTrackDimensions(buf) {
  const moov = findBox(buf, "moov");
  if (!moov) return { width: null, height: null };

  let best = { width: null, height: null, area: 0 };

  for (const box of readBoxes(buf, moov.dataStart, moov.dataEnd)) {
    if (box.type !== "trak") continue;
    const tkhd = findBox(buf, "tkhd", box.dataStart, box.dataEnd, 1);
    if (!tkhd) continue;

    // width and height are the final two 16.16 fixed-point values of the box.
    // Skip any track whose header ran past the bytes we actually fetched, since
    // the trailing values would then be read from the wrong place.
    const end = tkhd.start + tkhd.size;
    if (end > buf.length || end - 8 < tkhd.dataStart) continue;

    let width = buf.readUInt32BE(end - 8) / 65536;
    let height = buf.readUInt32BE(end - 4) / 65536;

    // The 3x3 matrix sits immediately before them, 36 bytes. A phone held
    // upright records landscape pixels plus a 90 degree rotation.
    const matrixAt = end - 8 - 36;
    if (matrixAt > tkhd.dataStart) {
      const b = buf.readInt32BE(matrixAt + 4) / 65536;
      const c = buf.readInt32BE(matrixAt + 8) / 65536;
      if (Math.abs(b) > 0.9 && Math.abs(c) > 0.9) [width, height] = [height, width];
    }

    const area = width * height;
    if (area > best.area && width >= 1 && height >= 1) {
      best = { width: Math.round(width), height: Math.round(height), area };
    }
  }

  return { width: best.width, height: best.height };
}

/**
 * HEIC image size, from the largest spatial extents property in the file.
 *
 * A HEIC holds several `ispe` boxes, one per item: the primary image, its
 * thumbnail, and often a set of 512x512 grid tiles that the primary image is
 * assembled from. Taking the first one lands on a tile or a thumbnail, so we
 * take the largest by area. The library has a 12000x5596 panorama that only
 * reads correctly this way.
 */
export function readHeicDimensions(buf) {
  const marker = Buffer.from("ispe");
  let best = { width: null, height: null, area: 0 };
  let at = 0;

  while ((at = buf.indexOf(marker, at + 1)) > 0) {
    if (at + 16 > buf.length) break;
    const width = buf.readUInt32BE(at + 8);
    const height = buf.readUInt32BE(at + 12);
    const area = width * height;
    // Guard against matching the four ASCII bytes inside compressed data.
    if (width > 0 && height > 0 && width < 100000 && height < 100000 && area > best.area) {
      best = { width, height, area };
    }
  }

  return { width: best.width, height: best.height };
}
