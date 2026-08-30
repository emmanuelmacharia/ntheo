import { GALLERY } from "~/server/db/gallery-queries";
import CuratorClient from "./CuratorClient";

export const dynamic = "force-dynamic";

export default async function CuratePage() {
  const events = await GALLERY.getCurationWorkspace();

  return (
    <div>
      <h1 className="font-display text-foreground text-3xl font-semibold">
        Curate the day
      </h1>
      <p className="text-muted-foreground mt-2 mb-8 max-w-3xl">
        Shape the gallery and the story here. Create and order chapters, place
        each media item, choose covers, and decide what is shown or featured.
        Hidden chapters and media stay in this editor so every change is
        reversible.
      </p>
      <CuratorClient events={events} />
    </div>
  );
}
