/**
 * Justified row layout, the same idea Flickr and Google Photos use.
 *
 * Each row is scaled to fill the container width exactly, so nothing is ever
 * cropped and rows share a clean baseline. Chronology reads left to right, which
 * is the whole reason this replaced the masonry toggle: CSS columns fill top to
 * bottom, so column one would hold the morning while column two held the
 * ceremony, side by side. See docs/adr/0004.
 */

export type Sized = { width: number; height: number };

export type PlacedTile<T> = {
  item: T;
  width: number;
  height: number;
};

export type LaidOutRow<T> = {
  tiles: PlacedTile<T>[];
  height: number;
};

export type JustifyOptions = {
  containerWidth: number;
  targetHeight?: number;
  gap?: number;
  /** How far the last row may stretch before it is left at target height. */
  lastRowFillThreshold?: number;
};

/** Guards against a zero or absurd ratio from a row we failed to measure. */
function aspectRatio(item: Sized): number {
  const ratio = item.width / item.height;
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  return Math.min(Math.max(ratio, 0.2), 6);
}

export function justify<T extends Sized>(
  items: T[],
  { containerWidth, targetHeight = 280, gap = 8, lastRowFillThreshold = 0.6 }: JustifyOptions,
): LaidOutRow<T>[] {
  if (!items.length || containerWidth <= 0) return [];

  // On a narrow screen a "row" of several photos makes each one thumbnail-sized,
  // so phones get one full-width image at a time instead.
  const maxPerRow = containerWidth < 520 ? 1 : containerWidth < 900 ? 3 : 5;

  const rows: LaidOutRow<T>[] = [];
  let current: T[] = [];
  let ratioSum = 0;

  const close = (isLast: boolean) => {
    if (!current.length) return;

    const gaps = gap * (current.length - 1);
    const available = containerWidth - gaps;
    let height = available / ratioSum;

    // A final row holding one wide photo would blow up to fill the width, so it
    // keeps the target height unless it is nearly full anyway.
    if (isLast) {
      const naturalWidth = ratioSum * targetHeight + gaps;
      if (naturalWidth < containerWidth * lastRowFillThreshold) height = targetHeight;
    }

    const tiles = current.map((item) => ({
      item,
      width: Math.floor(aspectRatio(item) * height),
      height: Math.floor(height),
    }));

    // Hand any rounding remainder to the widest tile so the row edge stays flush.
    const used = tiles.reduce((sum, t) => sum + t.width, 0) + gaps;
    const drift = containerWidth - used;
    if (!isLast && drift !== 0 && tiles.length) {
      const widest = tiles.reduce((a, b) => (b.width > a.width ? b : a));
      widest.width += drift;
    }

    rows.push({ tiles, height: Math.floor(height) });
    current = [];
    ratioSum = 0;
  };

  for (const item of items) {
    current.push(item);
    ratioSum += aspectRatio(item);

    const gaps = gap * (current.length - 1);
    const projected = ratioSum * targetHeight + gaps;
    if (projected >= containerWidth || current.length >= maxPerRow) close(false);
  }
  close(true);

  return rows;
}

/**
 * The `sizes` attribute for a tile, so the browser fetches an appropriately
 * scaled file rather than a 6MB original to fill 300 pixels.
 */
export function tileSizes(width: number): string {
  return `(max-width: 520px) 100vw, ${Math.max(width, 100)}px`;
}
