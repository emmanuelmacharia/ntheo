import { GALLERY } from "~/server/db/gallery-queries";
import InterceptedViewer from "./InterceptedViewer";

export const dynamic = "force-dynamic";

/**
 * Intercepts /gallery/[id] when it is reached from inside the gallery, so the
 * photo opens over the grid instead of replacing the page. A refresh or a shared
 * link falls through to the real route.
 */
export default async function InterceptedMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await GALLERY.getChapterFor(Number(id));
  if (!context) return null;

  return <InterceptedViewer items={context.items} startId={Number(id)} />;
}
