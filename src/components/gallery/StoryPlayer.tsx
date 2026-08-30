"use client";

import Image from "next/image";
import Link from "next/link";
import { Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaItem } from "~/server/db/gallery-queries";
import { isVideo, sourceUrl } from "~/lib/media";
import { warmImages } from "~/lib/image-cache";

/** How long a photo holds the screen, once it has actually loaded. */
const IMAGE_SECONDS = 4;

/**
 * Ordinary videos are clipped so one long clip cannot stall the whole recap.
 * A Featured video is exempt and plays to the end: marking one is an editorial
 * statement that this is a moment worth stopping for.
 */
const VIDEO_MAX_SECONDS = 10;

/** Give up waiting for a slow photo and move on rather than stalling. */
const LOAD_TIMEOUT_SECONDS = 6;

/** How many slides ahead to pull into the browser cache. */
const PRELOAD_AHEAD = 4;

/** A press longer than this is a hold, not a tap. */
const HOLD_MS = 220;

export type PlaybackSlide = {
  item: MediaItem;
  chapterId: number | null;
  chapterTitle?: string;
  /** True for the first slide of a Chapter, which draws a title card first. */
  isChapterStart?: boolean;
};

/**
 * Plays the day back as a film.
 *
 * The timing rule that matters: a slide's clock does not start until its
 * photograph has loaded. Without that the recap advanced on a fixed timer while
 * multi-megabyte originals were still downloading, so it played a sequence of
 * empty frames and looked broken. Upcoming slides are warmed several ahead, so
 * by the time each one's turn arrives it is usually already decoded.
 *
 * No soundtrack. Browsers block audio until the viewer interacts, so a track
 * would mean an unmute prompt as the first thing anyone sees, and licensing a
 * song for a public page is a question this gallery does not need to answer.
 * Videos carry their own audio behind the mute control.
 */
export default function StoryPlayer({ slides }: { slides: PlaybackSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [showCard, setShowCard] = useState(Boolean(slides[0]?.isChapterStart));

  /**
   * Held with a finger or the mouse button down.
   *
   * Kept separate from `paused` so letting go never overrides someone who
   * deliberately pressed the pause button.
   */
  const [held, setHeld] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const didHold = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const slide = slides[index];
  const total = slides.length;

  /**
   * One progress segment per Chapter rather than per slide. With 341 slides the
   * per-slide bar rendered as a row of three-pixel slivers that said nothing.
   */
  const chapters = useMemo(() => {
    const list: { id: number | null; title?: string; start: number; count: number }[] = [];
    slides.forEach((s, i) => {
      const last = list[list.length - 1];
      if (!last || last.id !== s.chapterId) {
        list.push({ id: s.chapterId, title: s.chapterTitle, start: i, count: 1 });
      } else {
        last.count++;
      }
    });
    return list;
  }, [slides]);

  const currentChapter = useMemo(
    () => chapters.findIndex((c) => index >= c.start && index < c.start + c.count),
    [chapters, index],
  );

  // Everything that should stand still does so for either reason.
  const stopped = paused || held;

  const advance = useCallback(
    (delta: number) => {
      setProgress(0);
      setReady(false);
      setIndex((i) => {
        const next = Math.min(total - 1, Math.max(0, i + delta));
        setShowCard(Boolean(slides[next]?.isChapterStart) && next !== i);
        return next;
      });
    },
    [slides, total],
  );

  // Pull the next few slides into cache at the size this player shows them.
  useEffect(() => {
    if (typeof window === "undefined") return;
    warmImages(
      slides
        .slice(index, index + PRELOAD_AHEAD + 1)
        .filter((s) => !isVideo(s.item))
        .map((s) => ({ src: sourceUrl(s.item), cssWidth: window.innerWidth })),
    );
  }, [index, slides]);

  // A slide that never reports itself loaded should not freeze the recap.
  useEffect(() => {
    if (ready || showCard || !slide) return;
    const timer = setTimeout(() => setReady(true), LOAD_TIMEOUT_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [ready, showCard, slide, index]);

  // The title card holds briefly, then the chapter itself begins.
  useEffect(() => {
    if (!showCard || stopped) return;
    const timer = setTimeout(() => setShowCard(false), 1800);
    return () => clearTimeout(timer);
  }, [showCard, stopped, index]);

  // Drives the progress bar. Only runs once the slide is actually on screen.
  useEffect(() => {
    if (!slide || stopped || showCard || !ready) return;

    const duration = isVideo(slide.item)
      ? slide.item.featured
        ? (slide.item.durationSeconds ?? VIDEO_MAX_SECONDS)
        : Math.min(slide.item.durationSeconds ?? VIDEO_MAX_SECONDS, VIDEO_MAX_SECONDS)
      : IMAGE_SECONDS;

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const ratio = Math.min(1, (Date.now() - startedAt) / 1000 / duration);
      setProgress(ratio);
      if (ratio >= 1) {
        clearInterval(timer);
        if (index < total - 1) advance(1);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [slide, stopped, showCard, ready, index, total, advance]);

  // The progress bar stopping is not enough on a video slide; the footage has to
  // stop with it.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stopped) video.pause();
    else void video.play().catch(() => undefined);
  }, [stopped, index]);

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") advance(1);
      if (event.key === "ArrowLeft") advance(-1);
      if (event.key === " ") {
        event.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  if (!slide) {
    return (
      <div className="text-muted-foreground grid min-h-screen place-items-center bg-[#fbf7f1]">
        Nothing to play yet.
      </div>
    );
  }

  /**
   * Press and hold to pause, tap to move.
   *
   * A press only becomes a hold after a short delay, so an ordinary tap still
   * navigates. When it does become a hold, the release is swallowed rather than
   * counted as a tap, otherwise letting go would jump a slide.
   */
  const onPressStart = () => {
    didHold.current = false;
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      setHeld(true);
    }, HOLD_MS);
  };

  const onPressEnd = () => {
    clearTimeout(holdTimer.current);
    if (didHold.current) setHeld(false);
  };

  const onTap = (delta: number) => {
    if (didHold.current) {
      didHold.current = false;
      return;
    }
    advance(delta);
  };

  const finished = index === total - 1 && progress >= 1;
  const wash = slide.item.lqip ?? (isVideo(slide.item) ? slide.item.posterUrl : null);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#fbf7f1]">
      {wash && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            key={slide.item.id}
            className="animate-in fade-in absolute inset-0 scale-125 bg-cover bg-center opacity-50 blur-3xl duration-1000"
            style={{ backgroundImage: `url(${wash})` }}
          />
          <div className="absolute inset-0 bg-[#fbf7f1]/50" />
        </div>
      )}

      <div className="relative z-10 flex gap-1 px-3 pt-3">
        {chapters.map((chapter, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-black/10">
            <div
              className="bg-gold h-full transition-[width] duration-150 ease-linear"
              style={{
                width:
                  i < currentChapter
                    ? "100%"
                    : i === currentChapter
                      ? `${((index - chapter.start + progress) / chapter.count) * 100}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>

      <header className="relative z-10 flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="font-display text-foreground truncate text-base font-semibold">
            {chapters[currentChapter]?.title ?? "The day"}
          </p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {index + 1} of {total}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play" : "Pause"}
            className="text-foreground/70 hover:text-foreground grid h-9 w-9 place-items-center rounded-full bg-white/70 shadow-sm backdrop-blur transition hover:bg-white"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute" : "Mute"}
            className="text-foreground/70 hover:text-foreground grid h-9 w-9 place-items-center rounded-full bg-white/70 shadow-sm backdrop-blur transition hover:bg-white"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <Link
            href="/gallery"
            aria-label="Close"
            className="text-foreground/70 hover:text-foreground grid h-9 w-9 place-items-center rounded-full bg-white/70 shadow-sm backdrop-blur transition hover:bg-white"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-3 pb-4">
        {showCard ? (
          <div className="animate-in fade-in text-center duration-700">
            <p className="text-burnt-orange text-xs font-semibold tracking-[0.28em] uppercase">
              Next
            </p>
            <h2 className="font-display text-foreground mt-3 text-3xl font-semibold sm:text-5xl">
              {slide.chapterTitle}
            </h2>
          </div>
        ) : isVideo(slide.item) ? (
          <video
            key={slide.item.id}
            ref={videoRef}
            // See MediaViewer: a declared quicktime type stops the fetch dead.
            src={slide.item.url}
            autoPlay
            // A Featured video is played in full and unmuted, unless the viewer
            // has muted the recap themselves.
            muted={muted}
            playsInline
            preload="auto"
            poster={slide.item.posterUrl ?? undefined}
            onLoadedData={() => setReady(true)}
            onError={() => setReady(true)}
            className="max-h-[82vh] max-w-full rounded-xl shadow-2xl shadow-black/20"
          />
        ) : (
          <Image
            key={slide.item.id}
            src={sourceUrl(slide.item)}
            alt="A moment from the day"
            width={slide.item.width}
            height={slide.item.height}
            sizes="100vw"
            placeholder={slide.item.lqip ? "blur" : "empty"}
            blurDataURL={slide.item.lqip ?? undefined}
            priority
            /**
             * A warmed image is often already decoded by the time this element
             * mounts, and the load event then fires before React attaches
             * onLoad, so the slide would sit waiting for the timeout instead of
             * starting its four seconds. Checking `complete` on the node covers
             * that case; onLoad covers the rest.
             */
            ref={(node) => {
              if (node?.complete && node.naturalWidth > 0) setReady(true);
            }}
            onLoad={() => setReady(true)}
            onError={() => setReady(true)}
            className="animate-in fade-in max-h-[82vh] w-auto max-w-full rounded-xl object-contain shadow-2xl shadow-black/20 duration-700"
          />
        )}

        {/*
          Tap the left third to step back, the rest to go forward, and hold
          anywhere to pause. The handlers sit on both zones so a hold works
          wherever the finger lands, and `touch-none` keeps a long press on a
          phone from selecting the photo or opening the save menu.
        */}
        <button
          type="button"
          aria-label="Previous"
          onPointerDown={onPressStart}
          onPointerUp={onPressEnd}
          onPointerCancel={onPressEnd}
          onPointerLeave={onPressEnd}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => onTap(-1)}
          className="absolute inset-y-0 left-0 w-1/3 touch-none select-none cursor-w-resize"
        />
        <button
          type="button"
          aria-label="Next"
          onPointerDown={onPressStart}
          onPointerUp={onPressEnd}
          onPointerCancel={onPressEnd}
          onPointerLeave={onPressEnd}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => onTap(1)}
          className="absolute inset-y-0 right-0 w-2/3 touch-none select-none cursor-e-resize"
        />

        {/* A quiet acknowledgement that holding did something. */}
        {held && (
          <span className="text-foreground/70 pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
            Paused
          </span>
        )}
      </div>

      {finished && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#fbf7f1]/85 backdrop-blur">
          <div className="text-center">
            <p className="text-burnt-orange text-xs font-semibold tracking-[0.28em] uppercase">
              That was the day
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIndex(0);
                  setProgress(0);
                  setReady(false);
                  setShowCard(Boolean(slides[0]?.isChapterStart));
                }}
                className="text-foreground rounded-full bg-white px-5 py-2.5 text-sm font-medium shadow-sm transition hover:opacity-90"
              >
                Watch again
              </button>
              <Link
                href="/gallery"
                className="bg-burnt-orange rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Back to the gallery
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
