"use client";

import Image from "next/image";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Link2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaItem } from "~/server/db/gallery-queries";
import { isVideo, sourceUrl } from "~/lib/media";
import { warmImages } from "~/lib/image-cache";
import { cn } from "~/lib/utils";

/** How many neighbours to warm up either side of the current item. */
const PRELOAD_RADIUS = 2;

type Props = {
  items: MediaItem[];
  startId: number;
  onClose: () => void;
  standalone?: boolean;
};

/**
 * The immersive viewer.
 *
 * The backdrop is the media's own colours, blurred hard and laid over the paper
 * the rest of the site uses. A flat dark sheet reads as a separate application
 * and fights the photograph; this keeps the gallery feeling continuous and lets
 * each image sit in a wash of its own light.
 *
 * No clock labels. Every time we hold is the moment the shutter fired, but a
 * precise stamp on each frame is noise rather than information.
 */
export default function MediaViewer({ items, startId, onClose, standalone }: Props) {
  const startIndex = Math.max(
    0,
    items.findIndex((i) => i.id === startId),
  );
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const [copied, setCopied] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);

  const current = items[index];

  const go = useCallback(
    (delta: number) => {
      setZoomed(false);
      setIndex((i) => Math.min(items.length - 1, Math.max(0, i + delta)));
    },
    [items.length],
  );

  // Keep the address bar honest as you page, without pushing history entries
  // that would make Back walk the gallery one photo at a time.
  useEffect(() => {
    if (!current) return;
    window.history.replaceState(null, "", `/gallery/${current.id}`);
  }, [current]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [go, onClose]);

  /**
   * Warm the neighbours at the size the viewer will actually show them.
   *
   * This used to render hidden <Image width={32}> elements, which requested the
   * smallest rendition and so warmed a file the full-size view never asks for.
   * Paging still paid for the real download.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const neighbours = items.slice(
      Math.max(0, index - PRELOAD_RADIUS),
      index + PRELOAD_RADIUS + 1,
    );
    warmImages(
      neighbours
        .filter((n) => n.id !== items[index]?.id && !isVideo(n))
        .map((n) => ({ src: sourceUrl(n), cssWidth: window.innerWidth })),
    );
  }, [index, items]);

  if (!current) return null;

  const backdrop = current.lqip ?? (isVideo(current) ? current.posterUrl : sourceUrl(current));

  const share = async () => {
    const url = `${window.location.origin}/gallery/${current.id}`;
    try {
      if (navigator.share) await navigator.share({ url, title: "A moment from the day" });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // A cancelled share sheet is not an error worth surfacing.
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#fbf7f1]"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onTouchStart={(e) => {
        const t = e.changedTouches[0];
        if (t) touchStart.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const t = e.changedTouches[0];
        const start = touchStart.current;
        if (!t || !start) return;

        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        // Horizontal intent only, so a vertical scroll never changes the photo.
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          go(dx < 0 ? 1 : -1);
        } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
          const now = Date.now();
          if (now - lastTap.current < 300) setZoomed((z) => !z);
          lastTap.current = now;
        }
        touchStart.current = null;
      }}
    >
      {/* The shimmer: the image's own colours, blown up and blurred to a wash. */}
      {backdrop && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            key={current.id}
            className="animate-in fade-in absolute inset-0 scale-125 bg-cover bg-center opacity-45 blur-3xl duration-700"
            style={{ backgroundImage: `url(${backdrop})` }}
          />
          <div className="absolute inset-0 bg-[#fbf7f1]/55" />
        </div>
      )}

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="text-foreground/80 hover:text-foreground inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur transition hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {standalone ? "The gallery" : "Back"}
        </button>

        <div className="flex items-center gap-1">
          <span className="text-muted-foreground mr-2 text-xs tabular-nums">
            {index + 1} / {items.length}
          </span>
          <IconButton onClick={share} label={copied ? "Link copied" : "Copy link"}>
            <Link2 className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Download original"
            onClick={() => window.open(current.url, "_blank", "noopener")}
          >
            <Download className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-16">
        {index > 0 && <Arrow side="left" onClick={() => go(-1)} />}
        {index < items.length - 1 && <Arrow side="right" onClick={() => go(1)} />}

        {isVideo(current) ? (
          // Given as much of the screen as it can take, with its own controls.
          <video
            key={current.id}
            /**
             * `src` on the element, with no <source> and no `type`.
             *
             * Chrome reports canPlayType('video/quicktime') === "", so declaring
             * the real MIME made it skip the file without issuing a request at
             * all: readyState 0, networkState 3, nothing in the network log. 27
             * of the 31 videos here are QuickTime. Left to sniff the container
             * the browser plays them, because the contents are H.264.
             */
            src={current.url}
            controls
            autoPlay
            playsInline
            // Buffer ahead rather than fetching only the header.
            preload="auto"
            poster={current.posterUrl ?? undefined}
            className="max-h-[86vh] max-w-full rounded-xl shadow-2xl shadow-black/20"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setZoomed((z) => !z)}
            className={cn(
              "relative flex h-full w-full items-center justify-center",
              zoomed ? "cursor-zoom-out overflow-auto" : "cursor-zoom-in",
            )}
            aria-label={zoomed ? "Zoom out" : "Zoom in"}
          >
            <Image
              key={current.id}
              src={sourceUrl(current)}
              alt="A moment from the day"
              width={current.width}
              height={current.height}
              sizes="100vw"
              placeholder={current.lqip ? "blur" : "empty"}
              blurDataURL={current.lqip ?? undefined}
              className={cn(
                "rounded-xl shadow-2xl shadow-black/20 transition-transform duration-300",
                zoomed
                  ? "max-w-none scale-[1.9] cursor-zoom-out"
                  : "max-h-[86vh] w-auto max-w-full object-contain",
              )}
              priority
            />
          </button>
        )}
      </div>

    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="text-foreground/70 hover:text-foreground focus-visible:ring-gold grid h-9 w-9 place-items-center rounded-full bg-white/70 shadow-sm backdrop-blur transition hover:bg-white focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

function Arrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={cn(
        "text-foreground/70 hover:text-foreground absolute top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full bg-white/70 p-2.5 shadow-sm backdrop-blur transition hover:bg-white sm:grid",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="h-6 w-6" />
    </button>
  );
}
