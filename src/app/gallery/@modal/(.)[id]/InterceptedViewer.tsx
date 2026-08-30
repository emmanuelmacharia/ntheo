"use client";

import { useRouter } from "next/navigation";
import MediaViewer from "~/components/gallery/MediaViewer";
import type { MediaItem } from "~/server/db/gallery-queries";

export default function InterceptedViewer({
  items,
  startId,
}: {
  items: MediaItem[];
  startId: number;
}) {
  const router = useRouter();
  // back() returns to the grid at the scroll position the guest left it.
  return <MediaViewer items={items} startId={startId} onClose={() => router.back()} />;
}
