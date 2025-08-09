import { fetchLimitedMedia } from "~/server/actions/actions";
import ClientGallery from "./ClientGallery";
import { Clapperboard } from "lucide-react";

const Gallery = async () => {
  const media = await fetchLimitedMedia();

  if (media instanceof Error) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 pb-12">
        <Clapperboard className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <p className="text-muted-foreground mb-8 text-xl">
          No photos or videos found yet. Be the first to share your memories of
          the event
        </p>
      </div>
    );
  }

  return <ClientGallery media={media} />;
};

export default Gallery;
