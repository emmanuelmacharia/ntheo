"use client";
import React from "react";
import { UploadDropzone } from "./utils/uploadthing";

const Upload = () => {
  return (
    <section className="flex items-center justify-around">
      <UploadDropzone
        className="bg-pink/5 ut-button:bg-gold ut-button:ut-readying:bg-burgundy/20 ut-button:ut-uploading:bg-burnt-orange/20 ut-button:border-0 ut-button:focus-within:ring-2 ut-button:focus-within:ring-offset-0 ut-button:focus-within:ring-burnt-orange ut-allowed-content:ut-uploading:text-burgundy ut-button:ut-uploading:after:bg-burnt-orange/50 ut-button:after:bg-burnt-orange/50"
        endpoint="imageUploader"
        onClientUploadComplete={(res) => {
          console.log("Files ", res);
        }}
        onUploadError={(error: Error) => {
          console.log(error);
        }}
      />
    </section>
  );
};

export default Upload;
