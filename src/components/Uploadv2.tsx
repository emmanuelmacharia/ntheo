"use client";

import { LoaderIcon, Upload } from "lucide-react";
import { useUploadThing } from "./utils/uploadthing";
import { useRef, useState } from "react";
import { createMedia } from "~/server/actions/actions";
import { readMediaMetadata } from "~/lib/media-metadata";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

type Input = Parameters<typeof useUploadThing>;

const useUploadThingInputProps = (...args: Input) => {
  const $ut = useUploadThing(...args);
  const [completionState, setCompletionState] = useState<{
    isComplete: boolean;
    title: string;
    description: string;
    error: boolean;
  }>({
    isComplete: false,
    title: "",
    description: "",
    error: false,
  });

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);

    // Measure everything before uploading: dimensions with orientation applied,
    // capture time from EXIF, a blur placeholder, and a poster frame for video.
    // Doing it here is what keeps the backfill script a one-off cleanup.
    const metadata = await Promise.all(selectedFiles.map(readMediaMetadata));

    // Video posters are separate files, so they go up in their own batch and are
    // matched back by the index of the video they came from.
    const posters = metadata
      .map((meta, index) =>
        meta.posterBlob
          ? {
              index,
              file: new File([meta.posterBlob], `poster-${index}.jpg`, {
                type: "image/jpeg",
              }),
            }
          : null,
      )
      .filter((entry): entry is { index: number; file: File } => entry !== null);

    if (posters.length) {
      try {
        const uploaded = await $ut.startUpload(posters.map((p) => p.file));
        posters.forEach((entry, i) => {
          const url = uploaded?.[i]?.ufsUrl;
          if (url) metadata[entry.index]!.posterUrl = url;
        });
      } catch {
        // A missing poster is cosmetic; the upload itself still matters.
      }
    }

    const result = await $ut.startUpload(selectedFiles);

    if (result?.length) {
      const withMetadata = result.map((file, index) => {
        // Drop the raw poster blob: it has already been uploaded, and sending it
        // through the server action would serialise megabytes for nothing.
        const { posterBlob: _posterBlob, ...meta } = metadata[index] ?? {};
        return { ...file, meta };
      });
      const dbTransactionResult = await createMedia(withMetadata);
      if (dbTransactionResult instanceof Error) {
        setCompletionState({
          isComplete: true,
          title: "We ran into an issue!",
          description: dbTransactionResult.message,
          error: true,
        });
      } else {
        setCompletionState({
          isComplete: true,
          title: "Your upload was successful",
          description: dbTransactionResult,
          error: false,
        });
      }
    }
  };

  const resetCompletionState = () => {
    setCompletionState({
      isComplete: false,
      title: "",
      description: "",
      error: false,
    });
  };

  return {
    inputProps: {
      onChange,
      accept: "image/*, video/*",
      multiple: true,
    },
    isUploading: $ut.isUploading,
    completionState,
    resetCompletionState,
  };
};

export function UploadV2() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { inputProps, completionState, resetCompletionState } =
    useUploadThingInputProps("imageUploader", {
      onUploadBegin() {
        setUploading(true);
      },
      onClientUploadComplete(files) {
        setUploading(false);
      },
      onUploadError() {
        setUploading(false);
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
          <p className="text-muted-foreground">Please wait</p>
        </div>
      )}
      {!uploading && (
        <div
          className="border-muted hover:bg-muted/50 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-foreground mb-2 text-lg font-medium">
            Drop your photos and videos here, or click to browse
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

      <AlertDialog open={completionState.isComplete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{completionState.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {completionState.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {completionState.error && (
              <AlertDialogCancel onClick={resetCompletionState}>
                Try again later
              </AlertDialogCancel>
            )}
            {!completionState.error && (
              <AlertDialogAction onClick={resetCompletionState}>
                Done
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
