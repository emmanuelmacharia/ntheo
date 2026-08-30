/**
 * Warms images ahead of the scroll, and remembers what it has already warmed.
 *
 * Two things this exists to prevent. First, a tile that only begins downloading
 * once it scrolls into view, which on a 4MB photo means seconds of empty frame.
 * Second, warming the wrong file: `next/image` serves a different rendition per
 * width, so preloading a thumbnail does nothing for the full-size view that
 * follows. The URL has to match the one the real element will request, which is
 * why the device sizes below are duplicated from next.config.js.
 */

/** Must stay in step with `images.deviceSizes` in next.config.js. */
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920];
const QUALITY = 75;

/** The exact URL `next/image` will request for this source at this width. */
export function optimizedUrl(src: string, cssWidth: number, quality = QUALITY): string {
  const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const target = cssWidth * dpr;
  const width = DEVICE_SIZES.find((size) => size >= target) ?? DEVICE_SIZES[DEVICE_SIZES.length - 1]!;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

/**
 * Every rendition this tab has already asked for.
 *
 * Module scope on purpose: it survives component remounts, so returning to the
 * gallery from the viewer does not re-request what is already in flight or in
 * the browser cache.
 */
const warmed = new Set<string>();

/** Cap on how many warms we will have outstanding, so prefetch never starves the visible page. */
const MAX_IN_FLIGHT = 6;
let inFlight = 0;
const queue: string[] = [];

function pump() {
  while (inFlight < MAX_IN_FLIGHT && queue.length) {
    const url = queue.shift()!;
    inFlight++;

    const image = new Image();
    const done = () => {
      inFlight--;
      pump();
    };
    image.onload = done;
    image.onerror = done;
    // Low priority: the visible page should win any contention for sockets.
    image.fetchPriority = "low";
    image.decoding = "async";
    image.src = url;
  }
}

/** Requests `src` at the rendition a `cssWidth`-wide element would use. Idempotent. */
export function warmImage(src: string, cssWidth: number) {
  if (typeof window === "undefined") return;

  const url = optimizedUrl(src, cssWidth);
  if (warmed.has(url)) return;
  warmed.add(url);

  queue.push(url);
  pump();
}

export function warmImages(sources: { src: string; cssWidth: number }[]) {
  for (const { src, cssWidth } of sources) warmImage(src, cssWidth);
}

/** True when this exact rendition has already been requested in this tab. */
export function isWarm(src: string, cssWidth: number) {
  return warmed.has(optimizedUrl(src, cssWidth));
}

/**
 * Chapter contents, kept for the life of the tab.
 *
 * Without this, every remount of a chapter, including coming back from a
 * full-page viewer, issues the same server action again and re-renders empty
 * tiles while it waits.
 */
const chapterCache = new Map<number, unknown>();

export function getCachedChapter<T>(chapterId: number): T | undefined {
  return chapterCache.get(chapterId) as T | undefined;
}

export function setCachedChapter<T>(chapterId: number, items: T) {
  chapterCache.set(chapterId, items);
}
