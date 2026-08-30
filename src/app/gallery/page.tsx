import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Camera, Play } from "lucide-react";
import { GALLERY } from "~/server/db/gallery-queries";
import { stillUrl } from "~/lib/media";
import GalleryTimeline from "~/components/gallery/GalleryTimeline";
import { Footer } from "~/components/footer";

export const dynamic = "force-dynamic";

/**
 * The cover photograph, chosen by hand. The Cover picker finds a reasonable
 * frame automatically, but the image that opens the archive is an editorial
 * decision, not an algorithmic one.
 */
const HERO_MEDIA_ID = 3377699720528052;

export default async function GalleryPage() {
  const [events, hero] = await Promise.all([
    GALLERY.getTimeline(),
    GALLERY.getMediaItem(HERO_MEDIA_ID),
  ]);
  const total = events.reduce((sum, event) => sum + event.itemCount, 0);
  // Three chapters hold only video, so a Cover can be a video. `stillUrl`
  // resolves those to their Poster, since next/image cannot read a QuickTime.
  const cover = hero ?? events[0]?.cover;
  const coverSrc = cover ? stillUrl(cover) : null;

  return (
    <main className="min-h-screen bg-[#fbf7f1]">
      {/* The cover is a real photograph from the day rather than a title card,
          which is the difference between a photo book and a landing page. */}
      <section className="relative h-[62vh] min-h-[420px] w-full overflow-hidden">
        {cover && coverSrc ? (
          <Image
            src={coverSrc}
            alt=""
            fill
            priority
            sizes="100vw"
            placeholder={cover.lqip ? "blur" : "empty"}
            blurDataURL={cover.lqip ?? undefined}
            className="object-cover"
          />
        ) : (
          <div className="from-burnt-orange to-gold h-full w-full bg-gradient-to-br" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/35" />

        <div className="absolute inset-x-0 top-0 p-5 sm:p-7">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/80 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Wanza <span aria-hidden>|</span> Kiangai
          </Link>
        </div>

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-[1400px] px-5 pb-10 sm:px-8 sm:pb-14">
            <p className="text-gold text-[11px] font-semibold tracking-[0.3em] uppercase">
              Our Ntheo
            </p>

            <h1 className="font-display mt-3 max-w-4xl text-[2.75rem] leading-[0.95] font-semibold text-white sm:text-7xl">
              The day, as it happened
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/gallery/play"
                className="text-burgundy inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-white/90"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Play the day
              </Link>
              <p className="text-sm text-white/75">
                {total} photos and videos, in the order they were taken
              </p>
            </div>
          </div>
        </div>

        {/* The same pattern the site header uses, as a seam rather than a banner. */}
        <div
          className="absolute inset-x-0 bottom-0 h-1.5 opacity-90"
          style={{ backgroundImage: `url('/african-pattern.png')`, backgroundSize: "220px 220px" }}
        />
      </section>

      <div className="mx-auto max-w-[1400px] px-4 pt-16 pb-24 sm:px-8">
        {events.length ? <GalleryTimeline events={events} /> : <EmptyState />}
      </div>

      <Footer />
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Camera className="text-muted-foreground/50 mb-5 h-11 w-11" />
      <p className="text-muted-foreground mb-6 text-lg">
        Nothing has been shared yet. Be the first to add a memory from the day.
      </p>
      <Link
        href="/#media-upload"
        className="bg-burnt-orange rounded-full px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
      >
        Upload photos
      </Link>
    </div>
  );
}
