/**
 * Reads a file's shape in the browser, at upload time.
 *
 * This is what keeps the backfill script a one-off historical cleanup rather
 * than something that has to be re-run. Every new upload arrives already knowing
 * its dimensions, when it was taken, and carrying a blur placeholder.
 *
 * Capture time is read as the wall clock the camera showed and sent as a
 * "YYYY-MM-DDTHH:mm:ss" string with no zone, matching how the rest of the
 * gallery stores it. See scripts/lib/exif.mjs.
 */

const HEAD_BYTES = 131072;
const LQIP_WIDTH = 24;

export type ClientMediaMetadata = {
  width?: number;
  height?: number;
  lqip?: string;
  capturedAt?: string;
  captureSource?: "exif" | "mp4" | "filename" | "none";
  durationSeconds?: number;
  posterBlob?: Blob;
  /** Filled in by the upload flow once the poster blob has been stored. */
  posterUrl?: string;
};

/** Minimal EXIF read: just the capture time and the orientation flag. */
function readExifBasics(buffer: ArrayBuffer): { date?: string; orientation?: number } {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Find "Exif\0\0" inside the APP1 segment.
  let tiff = -1;
  for (let i = 0; i < bytes.length - 6; i++) {
    if (
      bytes[i] === 0x45 && bytes[i + 1] === 0x78 && bytes[i + 2] === 0x69 &&
      bytes[i + 3] === 0x66 && bytes[i + 4] === 0 && bytes[i + 5] === 0
    ) {
      tiff = i + 6;
      break;
    }
  }
  if (tiff < 0 || tiff + 8 > view.byteLength) return {};

  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);

  const result: { date?: string; orientation?: number } = {};

  const readIfd = (offset: number, depth = 0) => {
    if (depth > 2 || offset <= 0 || tiff + offset + 2 > view.byteLength) return;
    const count = u16(tiff + offset);
    if (count > 512) return;

    for (let i = 0; i < count; i++) {
      const entry = tiff + offset + 2 + i * 12;
      if (entry + 12 > view.byteLength) break;

      const tag = u16(entry);
      const type = u16(entry + 2);
      const length = u32(entry + 4);

      if (tag === 0x0112 && type === 3) result.orientation = u16(entry + 8);
      if (tag === 0x8769) readIfd(u32(entry + 8), depth + 1);

      // DateTimeOriginal, then the IFD0 DateTime as a fallback.
      if ((tag === 0x9003 || (tag === 0x0132 && !result.date)) && type === 2) {
        const at = tiff + u32(entry + 8);
        if (at + 19 <= view.byteLength) {
          let text = "";
          for (let c = 0; c < length - 1 && c < 19; c++) text += String.fromCharCode(bytes[at + c]!);
          const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(text);
          if (m && (tag === 0x9003 || !result.date)) {
            result.date = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
          }
        }
      }
    }
  };

  readIfd(u32(tiff + 4));
  return result;
}

/** Camera apps name files after the moment: IMG_20250809_143022 and friends. */
function dateFromFilename(name: string): string | undefined {
  const m = /(20\d{2})(\d{2})(\d{2})[_-]?(\d{2})?(\d{2})?(\d{2})?/.exec(name);
  if (!m) return undefined;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4] ?? "12"}:${m[5] ?? "00"}:${m[6] ?? "00"}`;
}

function toLqip(source: CanvasImageSource, width: number, height: number): string | undefined {
  if (!width || !height) return undefined;
  const canvas = document.createElement("canvas");
  const scale = LQIP_WIDTH / width;
  canvas.width = LQIP_WIDTH;
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  try {
    return canvas.toDataURL("image/jpeg", 0.4);
  } catch {
    return undefined;
  }
}

async function readImage(file: File): Promise<ClientMediaMetadata> {
  const head = await file.slice(0, HEAD_BYTES).arrayBuffer();
  const exif = readExifBasics(head);

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("could not decode image"));
      element.src = url;
    });

    // Browsers apply EXIF orientation to naturalWidth/naturalHeight, so these
    // are already the dimensions that will be displayed.
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      lqip: toLqip(image, image.naturalWidth, image.naturalHeight),
      capturedAt: exif.date ?? dateFromFilename(file.name),
      captureSource: exif.date ? "exif" : dateFromFilename(file.name) ? "filename" : "none",
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readVideo(file: File): Promise<ClientMediaMetadata> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    const ready = await new Promise<HTMLVideoElement>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("video timed out")), 30000);
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, (video.duration || 2) / 2);
      };
      video.onseeked = () => {
        clearTimeout(timeout);
        resolve(video);
      };
      video.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("could not decode video"));
      };
    });

    const width = ready.videoWidth;
    const height = ready.videoHeight;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(ready, 0, 0, width, height);

    const posterBlob = await new Promise<Blob | undefined>((resolve) =>
      canvas.toBlob((blob) => resolve(blob ?? undefined), "image/jpeg", 0.82),
    );

    return {
      width,
      height,
      lqip: toLqip(ready, width, height),
      durationSeconds: Number.isFinite(ready.duration) ? Math.round(ready.duration) : undefined,
      capturedAt: dateFromFilename(file.name),
      captureSource: dateFromFilename(file.name) ? "filename" : "none",
      posterBlob,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Never throws: a file we cannot read still uploads, it just arrives plainer. */
export async function readMediaMetadata(file: File): Promise<ClientMediaMetadata> {
  try {
    if (file.type.startsWith("image/")) return await readImage(file);
    if (file.type.startsWith("video/")) return await readVideo(file);
  } catch {
    // HEIC and raw files cannot be decoded here; the backfill handles those.
  }
  return {};
}
