import { fetchMedia } from "~/server/actions/actions";
import ClientGallery from "./ClientGallery";

const Gallery = async () => {
  const media = await fetchMedia();

  if (media instanceof Error) {
    return (
      <div className="flex items-center justify-start py-12">
        <p className="text-muted-foreground mb-8 text-xl">
          No photos found yet. Be the first to share your memories of the event
        </p>
      </div>
    );
  }

  return <ClientGallery media={media} />;
};

export default Gallery;
