"use client";

import { LoaderIcon, Upload } from "lucide-react";
import { useUploadThing } from "./utils/uploadthing";
import { useRef, useState } from "react";
import { createMedia } from "~/server/actions/actions";
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

interface ImageDimenions {
  width: number;
  height: number;
}

const getImageDimensions = (file: File): ImageDimenions | null => {
  let dimensions: ImageDimenions | null = null;
  const reader = new FileReader();
  reader.onload = (event) => {
    // handling images first
    const img = new Image();

    img.onload = () => {
      dimensions = { width: img.width, height: img.height };
    };

    img.onerror = () => {
      dimensions = null;
    };

    img.src = event.target?.result as string;
  };

  reader.onerror = () => {
    dimensions = null;
  };

  reader.readAsDataURL(file);

  return dimensions;
};

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

    selectedFiles.map((file) => {
      const imageType = "image/";
      const fileType = file.type;

      if (fileType.includes(imageType)) {
        const dimensions = getImageDimensions(file);
        return { ...file, ...dimensions };
      }

      return file;
    });

    const result = await $ut.startUpload(selectedFiles);

    if (result?.length) {
      const dbTransactionResult = await createMedia(result);
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
