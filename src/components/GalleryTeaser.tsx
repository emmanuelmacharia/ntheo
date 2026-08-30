import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clapperboard } from "lucide-react";
import { GALLERY } from "~/server/db/gallery-queries";
import { clockLabel, sourceUrl } from "~/lib/media";
import { justify } from "~/lib/justified";

/**
 * A single justified row on the homepage that leads into the gallery.
 *
 * Replaces the old grid, which showed the last 20 uploads in fixed 200px boxes
 * and offered no route to the other 320. Widths are computed on the server from
 * a nominal container width: it is one static row, so there is no need to ship a
 * measuring client component to the homepage.
 */
export default async function GalleryTeaser() {
  const highlights = await GALLERY.getHighlights(7);

  if (!highlights.length) {
    return (
      <section className="py-16 text-center" id="gallery">
        <Clapperboard className="text-muted-foreground/60 mx-auto mb-4 h-10 w-10" />
        <p className="text-muted-foreground text-lg">
          No photos yet. Be the first to share a memory from the day.
        </p>
      </section>
    );
  }

  const rows = justify(highlights, { containerWidth: 1200, targetHeight: 200, gap: 8 });
  const row = rows[0];

  return (
    <section className="py-16" id="gallery">
      <div className="mb-8 text-center">
        <h2 className="font-display text-foreground mb-3 text-4xl font-semibold">Our Gallery</h2>
        <p className="text-muted-foreground text-xl">
          Every moment of the day, from everyone who was there
        </p>
      </div>

      <div className="flex justify-center gap-2 overflow-hidden">
        {row?.tiles.map((tile, index) => (
          <Link
            key={tile.item.id}
            href={`/gallery/${tile.item.id}`}
            className="group relative shrink-0 overflow-hidden rounded-md"
            style={{ width: tile.width, height: tile.height }}
          >
            <Image
              src={sourceUrl(tile.item)}
              alt={clockLabel(tile.item.capturedAt) ?? "A moment from the day"}
              width={tile.width}
              height={tile.height}
              sizes={`${tile.width}px`}
              placeholder={tile.item.lqip ? "blur" : "empty"}
              blurDataURL={tile.item.lqip ?? undefined}
              priority={index < 2}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/gallery"
          className="bg-burnt-orange inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-medium text-white transition hover:opacity-90"
        >
          See the whole day
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
