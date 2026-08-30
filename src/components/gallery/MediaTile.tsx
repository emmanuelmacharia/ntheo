"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "~/server/db/gallery-queries";
import { canAutoplay, durationLabel, isVideo, sourceUrl } from "~/lib/media";
import { tileSizes } from "~/lib/justified";
import { cn } from "~/lib/utils";

/** Never run more than this many videos at once, however many are on screen. */
const MAX_CONCURRENT_PLAYERS = 2;

/** Stop after this long, so scrolling past a clip costs seconds, not megabytes. */
const AUTOPLAY_SECONDS = 8;

let activePlayers = 0;

type Props = {
  item: MediaItem;
  width: number;
  height: number;
  priority?: boolean;
  onOpen?: (item: MediaItem) => void;
};

export default function MediaTile({ item, width, height, priority, onOpen }: Props) {
  const video = isVideo(item);

  return (
    <button
      type="button"
      onClick={() => onOpen?.(item)}
      style={{ width, height }}
      className="group relative overflow-hidden rounded-md bg-black/5 focus-visible:ring-gold focus-visible:ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      aria-label={video ? "Play video from the day" : "Open photo from the day"}
    >
      {video ? (
        <VideoTile item={item} width={width} height={height} />
      ) : (
        <Image
          src={sourceUrl(item)}
          alt="A moment from the day"
          width={width}
          height={height}
          sizes={tileSizes(width)}
          priority={priority}
          placeholder={item.lqip ? "blur" : "empty"}
          blurDataURL={item.lqip ?? undefined}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      )}

      {/* A gentle warm wash on hover. No timestamp: the tile is the content. */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {item.featured && (
        <span className="bg-gold pointer-events-none absolute top-2 right-2 h-1.5 w-1.5 rounded-full shadow" />
      )}
    </button>
  );
}

/**
 * Plays muted when scrolled into view, pauses when it leaves, and stops itself
 * after a few seconds. Falls back to a Poster with a play badge when the file
 * cannot stream or has no Poster yet.
 */
function VideoTile({ item, width, height }: { item: MediaItem; width: number; height: number }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const holdsSlot = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !canAutoplay(item)) return;

    // Respect a metered connection: the browser tells us when the user asked to
    // save data, and a wall of autoplaying video is the fastest way to spend it.
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let stopTimer: ReturnType<typeof setTimeout> | undefined;

    const release = () => {
      if (holdsSlot.current) {
        activePlayers--;
        holdsSlot.current = false;
      }
    };

    const stop = () => {
      clearTimeout(stopTimer);
      element.pause();
      setPlaying(false);
      release();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          if (activePlayers >= MAX_CONCURRENT_PLAYERS || holdsSlot.current) return;
          activePlayers++;
          holdsSlot.current = true;

          void element.play().then(
            () => {
              setPlaying(true);
              stopTimer = setTimeout(stop, AUTOPLAY_SECONDS * 1000);
            },
            () => release(),
          );
        } else {
          stop();
        }
      },
      { threshold: [0, 0.6, 1] },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      clearTimeout(stopTimer);
      release();
    };
  }, [item]);

  const poster = item.posterUrl ?? undefined;

  return (
    <>
      {item.streamable ? (
        <video
          ref={ref}
          // See the note in MediaViewer: declaring type="video/quicktime" stops
          // the browser requesting the file at all.
          src={item.url}
          muted
          playsInline
          loop={false}
          preload="metadata"
          poster={poster}
          className="h-full w-full object-cover"
          style={{ width, height }}
        />
      ) : (
        <div
          className="from-burnt-orange/25 via-coral/20 to-gold/30 h-full w-full bg-gradient-to-br"
          style={{
            backgroundImage: poster ? `url(${poster})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      {!poster && !playing && !item.streamable && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur-sm">
            <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
          </span>
        </span>
      )}

      <span
        className={cn(
          "absolute top-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm transition-opacity",
          playing && "opacity-0",
        )}
      >
        {durationLabel(item.durationSeconds) ?? "Video"}
      </span>
    </>
  );
}
