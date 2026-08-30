"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { justify } from "~/lib/justified";
import type { MediaItem } from "~/server/db/gallery-queries";
import MediaTile from "./MediaTile";

const GAP = 8;

type Props = {
  items: MediaItem[];
  targetHeight?: number;
  onOpen?: (item: MediaItem) => void;
  priorityCount?: number;
};

/**
 * Rows are packed on the client because only the client knows the real container
 * width. Every item carries its true aspect ratio from the database, so each
 * tile's box is reserved before a single byte of image downloads and nothing
 * shifts as photos arrive.
 */
export default function JustifiedGrid({
  items,
  targetHeight = 260,
  onOpen,
  priorityCount = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const next = entry?.contentRect.width ?? 0;
      // Ignore sub-pixel jitter, which would otherwise re-pack on every scroll
      // on browsers that animate the scrollbar.
      setWidth((current) => (Math.abs(current - next) > 1 ? next : current));
    });

    observer.observe(element);
    setWidth(element.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const rows = useMemo(
    () => (width > 0 ? justify(items, { containerWidth: width, targetHeight, gap: GAP }) : []),
    [items, width, targetHeight],
  );

  // Before measuring, reserve roughly the right height so the page does not jump.
  const estimatedHeight = width === 0 ? Math.ceil(items.length / 4) * (targetHeight + GAP) : undefined;

  let rendered = 0;

  return (
    <div ref={containerRef} style={{ minHeight: estimatedHeight }} className="w-full">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="flex"
          style={{ gap: GAP, marginBottom: rowIndex === rows.length - 1 ? 0 : GAP }}
        >
          {row.tiles.map((tile) => (
            <MediaTile
              key={tile.item.id}
              item={tile.item}
              width={tile.width}
              height={tile.height}
              priority={rendered++ < priorityCount}
              onOpen={onOpen}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
