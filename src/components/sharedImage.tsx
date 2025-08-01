import Image from "next/image";
import React from "react";
import type { DB_MediaType } from "~/server/db/schema";

const sharedImage = (props: {
  photoConfig: {
    image: DB_MediaType;
    viewMode: "masonry" | "grid";
  };
}) => {
  const { image, viewMode } = props.photoConfig;
  return (
    <div
      className="relative max-h-[350px] w-full rounded-lg"
      style={{
        height: viewMode === "masonry" ? "200px" : "200px",
      }}
    >
      <Image
        src={image.url}
        alt={`Photo taken at the ntheo`}
        className="h-auto w-full object-cover"
        fill={true}
        style={{ objectFit: "cover" }}
      />
    </div>
  );
};

export default sharedImage;
