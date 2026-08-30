import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GALLERY } from "~/server/db/gallery-queries";
import { isVideo, sourceUrl } from "~/lib/media";
import StandaloneViewer from "./StandaloneViewer";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Open Graph tags for a shared link. This is the reason the viewer is a real
 * route rather than only a modal: a guest sending a photo to a friend should get
 * a preview rather than a bare URL.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const mediaId = Number(id);
  if (!Number.isSafeInteger(mediaId) || mediaId <= 0)
    return { title: "Not found" };

  const item = await GALLERY.getMediaItem(mediaId);
  if (!item) return { title: "Not found" };

  // No timestamp in the title. Capture times order the gallery but are not
  // shown, and a shared link should read like a memory, not a log line.
  const title = "A moment from our Ntheo";

  return {
    title: `${title} | Wanza <> Kiangai`,
    description: "From our Ntheo celebration.",
    openGraph: {
      title,
      images: isVideo(item)
        ? item.posterUrl
          ? [item.posterUrl]
          : []
        : [{ url: sourceUrl(item), width: item.width, height: item.height }],
    },
  };
}

export default async function MediaPage({ params }: Params) {
  const { id } = await params;
  const mediaId = Number(id);
  if (!Number.isSafeInteger(mediaId) || mediaId <= 0) notFound();

  const context = await GALLERY.getChapterFor(mediaId);

  if (!context) {
    const single = await GALLERY.getMediaItem(mediaId);
    if (!single) notFound();
    return <StandaloneViewer items={[single]} startId={single.id} />;
  }

  return <StandaloneViewer items={context.items} startId={mediaId} />;
}
