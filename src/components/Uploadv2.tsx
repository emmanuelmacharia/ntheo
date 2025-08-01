"use client";

import { LoaderIcon, Upload } from "lucide-react";
import { useUploadThing } from "./utils/uploadthing";
import { useRef, useState } from "react";

type Input = Parameters<typeof useUploadThing>;

const useUploadThingInputProps = (...args: Input) => {
  const $ut = useUploadThing(...args);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    const result = await $ut.startUpload(selectedFiles);
    console.log("uploaded files", result);

    // TODO: persist in DB
  };

  return {
    inputProps: {
      onChange,
      accept: "image/*, video/*",
      multiple: true,
    },
    isUploading: $ut.isUploading,
  };
};

export function UploadV2() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { inputProps } = useUploadThingInputProps("imageUploader", {
    onUploadBegin() {
      setUploading(true);
      console.log("Beginning upload");
    },
    onClientUploadComplete(files) {
      setUploading(false);
      console.log("completed", files);
    },
    onUploadError() {
      setUploading(false);
      console.log("we errored out");
    },
  });
  return (
    <>
      {uploading && (
        <div className="border-muted hover:bg-muted/50 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors">
          <LoaderIcon className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-foreground mb-2 text-lg font-medium">
            Uploading...
          </p>
        </div>
      )}
      {!uploading && (
        <div
          className="border-muted hover:bg-muted/50 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors"
          //   onDrop={handleDrop}
          //   onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-foreground mb-2 text-lg font-medium">
            Drop your photos here, or click to browse
          </p>
          <p className="text-muted-foreground">
            Support for JPEG, PNG, WebP files
          </p>
          <input
            id="upload-button"
            type="file"
            className="hidden"
            ref={fileInputRef}
            {...inputProps}
          />
        </div>
      )}
    </>
  );
}
