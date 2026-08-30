/**
 * EXIF and TIFF reading, enough for what the gallery needs and no more.
 *
 * We care about four things per photo: the true display dimensions, when the
 * shutter actually fired, where it fired (stored, never rendered), and the
 * embedded thumbnail we turn into a blur placeholder.
 *
 * The embedded thumbnail is the reason this file exists. Every phone JPEG in
 * the library carries a ~19KB JPEG preview inside its APP1 segment, which sits
 * inside the first 128KB we range-fetch anyway. That makes placeholders free.
 */

const TYPE_SIZES = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];

export const TAGS = {
  IMAGE_WIDTH: 0x0100,
  IMAGE_HEIGHT: 0x0101,
  ORIENTATION: 0x0112,
  MAKE: 0x010f,
  MODEL: 0x0110,
  DATE_TIME: 0x0132,
  SUB_IFDS: 0x014a,
  EXIF_IFD: 0x8769,
  GPS_IFD: 0x8825,
  DATE_TIME_ORIGINAL: 0x9003,
  OFFSET_TIME_ORIGINAL: 0x9011,
  PIXEL_X: 0xa002,
  PIXEL_Y: 0xa003,
  THUMB_OFFSET: 0x0201,
  THUMB_LENGTH: 0x0202,
  COMPRESSION: 0x0103,
  GPS_LAT_REF: 0x0001,
  GPS_LAT: 0x0002,
  GPS_LNG_REF: 0x0003,
  GPS_LNG: 0x0004,
};

/** Locates the TIFF header inside a JPEG's APP1 segment. Returns -1 if absent. */
export function findExifStart(buf) {
  if (buf.length < 4) return -1;
  // A bare TIFF (NEF and friends) starts with the byte-order mark directly.
  const bom = buf.toString("ascii", 0, 2);
  if ((bom === "II" || bom === "MM") && buf.readUInt16BE(0) !== 0xffd8) return 0;

  const marker = buf.indexOf(Buffer.from("Exif\0\0"));
  return marker < 0 ? -1 : marker + 6;
}

/**
 * Reads one IFD into a plain map of tag number to value. Pointer tags are left
 * as raw offsets so the caller can decide whether to follow them.
 */
function readIfd(buf, tiff, offset, littleEndian) {
  const out = {};
  if (offset <= 0 || tiff + offset + 2 > buf.length) return out;

  const u16 = (o) => (littleEndian ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = (o) => (littleEndian ? buf.readUInt32LE(o) : buf.readUInt32BE(o));

  const count = u16(tiff + offset);
  // A corrupt count can be enormous; cap it rather than looping into nonsense.
  if (count > 512) return out;

  for (let i = 0; i < count; i++) {
    const entry = tiff + offset + 2 + i * 12;
    if (entry + 12 > buf.length) break;

    const tag = u16(entry);
    const type = u16(entry + 2);
    const length = u32(entry + 4);
    const size = (TYPE_SIZES[type] ?? 0) * length;
    if (size === 0) continue;

    const valueAt = size <= 4 ? entry + 8 : tiff + u32(entry + 8);
    if (valueAt < 0 || valueAt + Math.min(size, 4) > buf.length) continue;

    try {
      if (type === 2) {
        out[tag] = buf.toString("ascii", valueAt, valueAt + length).split("\0")[0];
      } else if (type === 3 || type === 4 || type === 1) {
        // Multi-value tags matter here: Nikon stores several SubIFD pointers in
        // tag 0x014a, and the full-size preview lives in one of the later ones.
        const read = (i) =>
          type === 1 ? buf[valueAt + i] : type === 3 ? u16(valueAt + i * 2) : u32(valueAt + i * 4);
        const step = type === 1 ? 1 : type === 3 ? 2 : 4;

        if (length === 1) {
          out[tag] = read(0);
        } else {
          const values = [];
          for (let i = 0; i < length && valueAt + i * step + step <= buf.length; i++) {
            values.push(read(i));
          }
          out[tag] = values;
        }
      } else if (type === 5 || type === 10) {
        const parts = [];
        for (let r = 0; r < length && valueAt + r * 8 + 8 <= buf.length; r++) {
          const num = u32(valueAt + r * 8);
          const den = u32(valueAt + r * 8 + 4);
          parts.push(den === 0 ? 0 : num / den);
        }
        out[tag] = parts.length === 1 ? parts[0] : parts;
      }
    } catch {
      // A single unreadable tag should never sink the whole file.
    }
  }
  return out;
}

/** Parses every IFD we care about. Returns null when there is no EXIF at all. */
export function parseExif(buf) {
  const tiff = findExifStart(buf);
  if (tiff < 0 || tiff + 8 > buf.length) return null;

  const littleEndian = buf.toString("ascii", tiff, tiff + 2) === "II";
  const u32 = (o) => (littleEndian ? buf.readUInt32LE(o) : buf.readUInt32BE(o));

  const ifd0Offset = u32(tiff + 4);
  const ifd0 = readIfd(buf, tiff, ifd0Offset, littleEndian);

  // IFD1 holds the thumbnail. Its offset trails IFD0's entry list.
  let ifd1 = {};
  const entryCount = littleEndian
    ? buf.readUInt16LE(tiff + ifd0Offset)
    : buf.readUInt16BE(tiff + ifd0Offset);
  const nextOffset = tiff + ifd0Offset + 2 + entryCount * 12;
  if (nextOffset + 4 <= buf.length) {
    ifd1 = readIfd(buf, tiff, u32(nextOffset), littleEndian);
  }

  return {
    tiff,
    littleEndian,
    ifd0,
    ifd1,
    exif: ifd0[TAGS.EXIF_IFD] ? readIfd(buf, tiff, ifd0[TAGS.EXIF_IFD], littleEndian) : {},
    gps: ifd0[TAGS.GPS_IFD] ? readIfd(buf, tiff, ifd0[TAGS.GPS_IFD], littleEndian) : {},
    subIfds: ifd0[TAGS.SUB_IFDS],
    readIfd: (offset) => readIfd(buf, tiff, offset, littleEndian),
  };
}

/**
 * Reads "2025:07:31 09:23:44" as the wall clock the camera showed.
 *
 * Deliberately ignores OffsetTimeOriginal. Only some phones write it, and
 * honouring it where present converts those photos to true UTC while the rest
 * keep local time, so a 15:37 photo sorts before a 14:40 one taken an hour
 * earlier. Everyone at this wedding stood in the same timezone, which makes the
 * wall clock the one consistent ordering key, and it is also exactly what the
 * clock labels should say. Video capture times are shifted to match, in
 * isobmff.mjs.
 *
 * Stored as a UTC-labelled wall clock, so read it back with the UTC getters.
 */
export function parseExifDate(value) {
  if (typeof value !== "string") return null;
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value.trim());
  if (!m) return null;

  const [, y, mo, d, h, mi, s] = m.map(Number);
  if (y < 1990 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  return new Date(Date.UTC(y, mo - 1, d, h, mi, s));
}

/** Converts EXIF degrees/minutes/seconds plus a hemisphere ref to a decimal. */
export function gpsToDecimal(parts, ref) {
  if (!Array.isArray(parts) || parts.length < 3) return null;
  const [deg, min, sec] = parts;
  const value = deg + min / 60 + sec / 3600;
  if (!Number.isFinite(value)) return null;
  return ref === "S" || ref === "W" ? -value : value;
}

/**
 * Orientations 5 through 8 mean the camera was held sideways, so the stored
 * pixels are transposed relative to what a browser draws. Swapping here is what
 * keeps portrait photos from being handed to the layout as landscape.
 */
export function applyOrientation(width, height, orientation) {
  if (!width || !height) return { width: null, height: null };
  return orientation >= 5 && orientation <= 8
    ? { width: height, height: width }
    : { width, height };
}

/** Walks JPEG segment markers to the start-of-frame, which holds the real size. */
export function jpegDimensions(buf) {
  if (buf.readUInt16BE(0) !== 0xffd8) return null;
  let offset = 2;

  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buf[offset + 1];
    // SOF0-SOF15, excluding the non-frame markers DHT, JPG and DAC.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    if (offset + 4 > buf.length) break;
    offset += 2 + buf.readUInt16BE(offset + 2);
  }
  return null;
}

export function pngDimensions(buf) {
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Pulls the embedded JPEG thumbnail out of IFD1, if the camera wrote one. */
export function extractThumbnail(buf, exif) {
  if (!exif) return null;
  const offset = exif.ifd1[TAGS.THUMB_OFFSET];
  const length = exif.ifd1[TAGS.THUMB_LENGTH];
  if (!offset || !length) return null;

  const start = exif.tiff + offset;
  const end = start + length;
  if (end > buf.length) return null;

  const thumb = buf.subarray(start, end);
  return thumb.readUInt16BE(0) === 0xffd8 ? thumb : null;
}

/**
 * Scans a buffer for embedded JPEG streams and returns the largest one that
 * actually decodes to a sensible size.
 *
 * This is the fallback that rescues files whose index we cannot follow: Nikon
 * raws whose preview sits in a SubIFD we failed to reach, and Apple HEICs, whose
 * `meta` box lives at the end of the file and whose HEVC payload the bundled
 * libheif cannot decode at all. Both formats embed a plain JPEG preview, so
 * finding it directly beats decoding the original.
 */
export function findLargestJpeg(buf, minWidth = 320) {
  const SOI = Buffer.from([0xff, 0xd8, 0xff]);
  let best = null;
  let at = 0;

  while ((at = buf.indexOf(SOI, at)) >= 0) {
    const dims = jpegDimensions(buf.subarray(at, Math.min(at + 65536, buf.length)));
    if (dims?.width >= minWidth) {
      // Find this stream's end marker, skipping the one that belongs to a
      // nested thumbnail if the sizes say we are still inside a larger image.
      let end = buf.indexOf(Buffer.from([0xff, 0xd9]), at + 3);
      if (end < 0) end = buf.length;

      const area = dims.width * dims.height;
      if (!best || area > best.area) {
        best = { start: at, end: end + 2, width: dims.width, height: dims.height, area };
      }
    }
    at += 3;
  }

  if (!best) return null;
  return {
    buffer: buf.subarray(best.start, best.end),
    width: best.width,
    height: best.height,
  };
}

/**
 * Finds the largest embedded JPEG preview in a raw file.
 *
 * Nikon writes a full-size JPEG into one of the SubIFDs, which is how we get a
 * viewable copy of a .NEF without a raw decoder anywhere in the stack.
 */
export function extractRawPreview(buf, exif) {
  if (!exif) return null;

  const candidates = [];
  const consider = (ifd) => {
    const offset = ifd[TAGS.THUMB_OFFSET];
    const length = ifd[TAGS.THUMB_LENGTH];
    if (offset && length && offset + length <= buf.length) {
      candidates.push({ offset, length });
    }
  };

  consider(exif.ifd0);
  consider(exif.ifd1);

  const subIfds = Array.isArray(exif.subIfds) ? exif.subIfds : [exif.subIfds];
  for (const pointer of subIfds) {
    if (typeof pointer === "number" && pointer > 0) consider(exif.readIfd(pointer));
  }

  if (!candidates.length) return null;
  const best = candidates.sort((a, b) => b.length - a.length)[0];

  const start = exif.tiff + best.offset;
  const preview = buf.subarray(start, start + best.length);
  return preview.readUInt16BE(0) === 0xffd8 ? preview : null;
}
