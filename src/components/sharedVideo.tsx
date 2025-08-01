import React from "react";
import type { DB_MediaType } from "~/server/db/schema";

const sharedVideo = (props: {
  videoConfig: {
    video: DB_MediaType;
    viewMode: "masonry" | "grid";
  };
}) => {
  return <div>sharedVideo</div>;
};

export default sharedVideo;
