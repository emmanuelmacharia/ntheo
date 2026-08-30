"use client";

import { useCallback, useRef, useState } from "react";
import type { EventSummary, MediaItem } from "~/server/db/gallery-queries";
import ChapterSection from "./ChapterSection";
import MediaViewer from "./MediaViewer";

type Props = { events: EventSummary[] };

/**
 * The gallery itself: Events, their Chapters, and the immersive viewer.
 *
 * Paging in the viewer runs across everything loaded so far rather than stopping
 * at a Chapter edge, so holding the arrow key walks the whole day the way the
 * day actually happened.
 */
export default function GalleryTimeline({ events }: Props) {
  const [viewing, setViewing] = useState<{ items: MediaItem[]; id: number } | null>(null);
  const loaded = useRef(new Map<number, MediaItem[]>());

  const recordChapter = useCallback((chapterId: number, items: MediaItem[]) => {
    loaded.current.set(chapterId, items);
  }, []);

  const open = useCallback(
    (item: MediaItem, chapterItems: MediaItem[]) => {
      // Stitch every loaded Chapter together, in the order they appear on screen,
      // so the viewer can run past the end of the Chapter that was clicked.
      const ordered: MediaItem[] = [];
      for (const event of events) {
        for (const chapter of event.chapters) {
          const items =
            loaded.current.get(chapter.id) ??
            (chapter.id === item.chapterId ? chapterItems : undefined);
          if (items) ordered.push(...items);
        }
      }
      setViewing({ items: ordered.length ? ordered : chapterItems, id: item.id });
    },
    [events],
  );

  return (
    <>
      {events.map((event, eventIndex) => (
        <section key={event.id} className="mb-20">
          <header className="mb-12">
            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
              <h2 className="font-display text-foreground text-3xl font-semibold sm:text-[2.5rem]">
                {event.title}
              </h2>
              <p className="text-muted-foreground text-sm">
                <span className="text-burnt-orange font-medium">{event.itemCount}</span> moments
              </p>
            </div>
            {/* A gold hairline, the one flourish these sections get. */}
            <div className="bg-gold/45 mt-4 h-px w-full" />
          </header>

          <div className="space-y-14">
            {event.chapters.map((chapter, index) => (
              <ChapterSection
                key={chapter.id}
                chapter={chapter}
                index={eventIndex === 0 ? index : index + 2}
                onOpen={open}
                onLoaded={recordChapter}
              />
            ))}
          </div>
        </section>
      ))}

      {viewing && (
        <MediaViewer
          items={viewing.items}
          startId={viewing.id}
          onClose={() => {
            setViewing(null);
            window.history.replaceState(null, "", "/gallery");
          }}
        />
      )}
    </>
  );
}
