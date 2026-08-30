"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChapterSummary, MediaItem } from "~/server/db/gallery-queries";
import { fetchChapterMedia } from "~/server/actions/gallery";
import { getCachedChapter, setCachedChapter, warmImages } from "~/lib/image-cache";
import { useNearViewport } from "~/lib/use-near-viewport";
import { isVideo, sourceUrl } from "~/lib/media";
import JustifiedGrid from "./JustifiedGrid";

type Props = {
  chapter: ChapterSummary;
  index: number;
  onOpen: (item: MediaItem, chapterItems: MediaItem[]) => void;
  onLoaded?: (chapterId: number, items: MediaItem[]) => void;
};

/** Start fetching a chapter's contents this far before it reaches the viewport. */
const LOAD_MARGIN = 1600;

/** Start warming its photographs even earlier, at low priority. */
const WARM_MARGIN = 3000;

/** Roughly the width a tile occupies once the row is packed. */
const TYPICAL_TILE_WIDTH = 320;

/** Let the first screens settle before backfilling the rest of the timeline. */
const STAGGER_START_MS = 1200;
const STAGGER_STEP_MS = 400;

/**
 * One Chapter of the gallery, fetched and warmed as it approaches the viewport.
 *
 * Chapters are the unit of pagination. They hold a few dozen items each, which
 * is a single indexed read, and they are how the gallery is organised anyway, so
 * there is no cursor arithmetic to get wrong.
 *
 * Contents are cached for the life of the tab, so returning from the viewer does
 * not refetch or re-render empty tiles.
 */
export default function ChapterSection({ chapter, index, onOpen, onLoaded }: Props) {
  const [items, setItems] = useState<MediaItem[] | null>(
    () => getCachedChapter<MediaItem[]>(chapter.id) ?? null,
  );
  const sectionRef = useRef<HTMLElement | null>(null);
  const requested = useRef(false);

  const load = useCallback(() => {
    if (requested.current) return;
    requested.current = true;

    fetchChapterMedia(chapter.id)
      .then((loaded) => {
        setCachedChapter(chapter.id, loaded);
        setItems(loaded);
        onLoaded?.(chapter.id, loaded);
      })
      .catch(() => {
        // Let a later scroll try again rather than leaving a permanent skeleton.
        requested.current = false;
      });
  }, [chapter.id, onLoaded]);

  /**
   * Chapter contents load on whichever comes first: the section approaching the
   * viewport, or a staggered timer.
   *
   * The timer is not belt and braces, it is the only guarantee. Scroll events,
   * IntersectionObserver and requestAnimationFrame are all suspended while a tab
   * is not painting, and any of them being missed leaves a chapter stuck on its
   * skeleton forever. A chapter is one small indexed read, so filling them in
   * over a few seconds costs little and means the gallery is always complete by
   * the time someone scrolls to it.
   *
   * Photographs are not warmed this way. That stays tied to the viewport, so a
   * visitor who reads the first chapter never downloads the whole wedding.
   */
  useEffect(() => {
    if (items) return;
    const delay = index < 2 ? 0 : STAGGER_START_MS + (index - 2) * STAGGER_STEP_MS;
    const timer = setTimeout(load, delay);
    return () => clearTimeout(timer);
  }, [index, items, load]);

  useNearViewport(sectionRef, LOAD_MARGIN, load, index >= 2 && !items);

  const warm = useCallback(() => {
    if (!items?.length) return;
    // Videos are left alone: they stream, and warming one would pull down
    // megabytes nobody has asked to watch.
    warmImages(
      items
        .filter((item) => !isVideo(item))
        .map((item) => ({ src: sourceUrl(item), cssWidth: TYPICAL_TILE_WIDTH })),
    );
  }, [items]);

  useNearViewport(sectionRef, WARM_MARGIN, warm, Boolean(items?.length));

  return (
    <section ref={sectionRef} id={`chapter-${chapter.id}`} className="scroll-mt-24">
      <header className="mb-6">
        <div className="flex items-baseline gap-4">
          <h3 className="font-display text-foreground text-2xl font-semibold sm:text-[1.7rem]">
            {chapter.title}
          </h3>
          <span className="bg-border h-px flex-1" />
          <span className="text-muted-foreground shrink-0 text-[11px] tracking-[0.18em] uppercase tabular-nums">
            {chapter.itemCount} {chapter.itemCount === 1 ? "moment" : "moments"}
          </span>
        </div>
      </header>

      {items ? (
        <JustifiedGrid
          items={items}
          onOpen={(item) => onOpen(item, items)}
          priorityCount={index === 0 ? 4 : 0}
        />
      ) : (
        <ChapterSkeleton count={Math.min(chapter.itemCount, 8)} />
      )}
    </section>
  );
}

function ChapterSkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-wrap gap-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-muted/70 h-[180px] animate-pulse rounded-md sm:h-[240px]"
          style={{ width: `${18 + ((i * 7) % 14)}%`, minWidth: 120 }}
        />
      ))}
    </div>
  );
}
