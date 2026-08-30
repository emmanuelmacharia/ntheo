import type { MediaItem } from "~/server/db/gallery-queries";

/**
 * Capture times are stored as the wall clock the camera showed, labelled UTC,
 * so every reader has to use the UTC getters. Reading them any other way shifts
 * the whole day by the viewer's own timezone. See scripts/lib/exif.mjs.
 */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function isVideo(item: Pick<MediaItem, "type">) {
  return item.type.toLowerCase().startsWith("video/");
}

/** What the browser should actually load: a Display Copy when the original is raw. */
export function sourceUrl(item: Pick<MediaItem, "url" | "displayUrl">) {
  return item.displayUrl ?? item.url;
}

/**
 * The still to show for an item in a thumbnail or Cover slot.
 *
 * `sourceUrl` returns the video file for a video, which is right for playback
 * and wrong for anywhere the item is drawn as a picture: next/image cannot
 * process a QuickTime file. Here a video resolves to its Poster.
 */
export function stillUrl(
  item: Pick<MediaItem, "url" | "displayUrl" | "type" | "posterUrl">,
): string | null {
  if (isVideo(item)) return item.posterUrl;
  return item.displayUrl ?? item.url;
}

/** "3:42 PM". The only metadata the gallery puts on a photo. */
export function clockLabel(date: Date | string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  const hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const suffix = hours < 12 ? "AM" : "PM";
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${minutes} ${suffix}`;
}

export function dayLabel(date: Date | string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "12:00 PM to 1:21 PM", shown under a chapter's title. */
export function rangeLabel(start: Date | string | null, end: Date | string | null) {
  const from = clockLabel(start);
  const to = clockLabel(end);
  if (!from) return null;
  return !to || from === to ? from : `${from} to ${to}`;
}

export function durationLabel(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Autoplay is bounded by playback seconds times bitrate, not by file size, so
 * the only file we refuse outright is the one that cannot stream: its `moov`
 * sits at the end, meaning the browser must download all 43MB before drawing a
 * single frame.
 */
export function canAutoplay(item: MediaItem) {
  return isVideo(item) && item.streamable;
}
