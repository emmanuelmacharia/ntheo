import { fetchVideosNeedingPosters } from "~/server/actions/gallery";
import PosterCapture from "~/components/gallery/PosterCapture";

export const dynamic = "force-dynamic";

export default async function BackfillPage() {
  const videos = await fetchVideosNeedingPosters();

  return (
    <div>
      <h1 className="font-display text-foreground text-3xl font-semibold">Video posters</h1>
      <p className="text-muted-foreground mt-2 mb-8 max-w-2xl">
        Videos without a poster frame show as a plain gradient in the gallery. This
        decodes each one here in the browser, grabs a frame a second in, and stores
        it. It only needs running once.
      </p>
      <PosterCapture videos={videos} />
    </div>
  );
}
