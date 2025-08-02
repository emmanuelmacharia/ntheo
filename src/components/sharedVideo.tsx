import React from "react";
import type { DB_MediaType } from "~/server/db/schema";

const sharedVideo = (props: {
  videoConfig: {
    video: DB_MediaType;
    viewMode: "masonry" | "grid";
  };
}) => {
  const { video, viewMode } = props.videoConfig;
  return (
    <div
      className="relative flex max-h-[350px] w-full items-center rounded-lg"
      style={{
        height: viewMode === "masonry" ? "200px" : "200px",
      }}
    >
      <video width="320" height="240" controls preload="none">
        <source src={video.url} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default sharedVideo;
