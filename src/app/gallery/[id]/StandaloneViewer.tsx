"use client";

import { useRouter } from "next/navigation";
import MediaViewer from "~/components/gallery/MediaViewer";
import type { MediaItem } from "~/server/db/gallery-queries";

/** The full-page viewer a shared link or a refresh lands on. */
export default function StandaloneViewer({
  items,
  startId,
}: {
  items: MediaItem[];
  startId: number;
}) {
  const router = useRouter();

  return (
    <MediaViewer
      items={items}
      startId={startId}
      standalone
      onClose={() => router.push("/gallery")}
    />
  );
}
