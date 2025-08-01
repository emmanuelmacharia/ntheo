import { fetchMockMedia } from "~/server/actions/actions";
import ClientGallery from "./ClientGallery";

const Gallery = async () => {
  const media = await fetchMockMedia();
  return <ClientGallery media={media} />;
};

export default Gallery;
