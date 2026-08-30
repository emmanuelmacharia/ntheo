/**
 * HEIC decoding via libheif compiled to WebAssembly.
 *
 * Needed because Apple writes HEIC with an HEVC payload, and the libheif bundled
 * inside sharp is built for AV1 only, so `sharp(heicBuffer)` throws. These files
 * also carry no embedded JPEG preview to fall back on, so without a real decoder
 * the five HEICs in the library would have to be hidden.
 *
 * The decoder honours the rotation box, so the dimensions it reports are already
 * the ones a browser would display. Do not apply EXIF orientation on top.
 */
import sharp from "sharp";

let decoderModule = null;

async function getLibheif() {
  decoderModule ??= (await import("libheif-js")).default ?? (await import("libheif-js"));
  return decoderModule;
}

/** Returns { jpeg, width, height } or null when the file cannot be decoded. */
export async function decodeHeic(buffer, { quality = 86, maxEdge = 3200 } = {}) {
  const libheif = await getLibheif();

  const images = new libheif.HeifDecoder().decode(buffer);
  if (!images?.length) return null;

  const image = images[0];
  const width = image.get_width();
  const height = image.get_height();
  if (!width || !height) return null;

  const imageData = {
    data: new Uint8ClampedArray(width * height * 4),
    width,
    height,
  };

  await new Promise((resolve, reject) => {
    image.display(imageData, (result) =>
      result ? resolve(result) : reject(new Error("libheif display failed")),
    );
  });

  // The Display Copy is capped for the web. `width` and `height` describe the
  // original, which is what the layout needs, and the ratio is unchanged.
  const jpeg = await sharp(Buffer.from(imageData.data.buffer), {
    raw: { width, height, channels: 4 },
  })
    .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();

  return { jpeg, width, height };
}
