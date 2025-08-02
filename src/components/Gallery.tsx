import { fetchMedia } from "~/server/actions/actions";
import ClientGallery from "./ClientGallery";

const Gallery = async () => {
  const media = await fetchMedia();

  if (media instanceof Error) {
    return <div>No media found</div>;
  }

  return <ClientGallery media={media} />;
};

export default Gallery;
