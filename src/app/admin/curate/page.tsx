import { GALLERY } from "~/server/db/gallery-queries";
import CuratorClient from "./CuratorClient";

export const dynamic = "force-dynamic";

export default async function CuratePage() {
  const events = await GALLERY.getTimeline();

  return (
    <div>
      <h1 className="font-display text-foreground text-3xl font-semibold">Curate the day</h1>
      <p className="text-muted-foreground mt-2 mb-10 max-w-2xl">
        Chapters were proposed from gaps in capture time, and their names are
        placeholders. Click a name to rename it, use the arrows to reorder, and the
        eye to hide one. Nothing here deletes anything.
      </p>
      <CuratorClient events={events} />
    </div>
  );
}
