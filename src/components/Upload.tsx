"use client";
import React, { useState } from "react";
import { UploadDropzone } from "./utils/uploadthing";
import { z } from "zod";

interface ImageDimenions {
  width: number;
  height: number;
}

interface FilesInput extends File {
  width: number;
  height: number;
}

const Upload = () => {
  const [dimensionsMap, setDimensionsMap] = useState<
    Record<string, ImageDimenions | null | undefined>
  >({});
  const [files, setFiles] = useState<FilesInput[]>([]);
  const getImageDimensions = (file: File): Promise<ImageDimenions | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        // handling images first
        const img = new Image();

        img.onload = () => resolve({ width: img.width, height: img.height });

        img.onerror = () => resolve(null);

        img.src = event.target?.result as string;
      };

      reader.onerror = () => resolve(null);

      reader.readAsDataURL(file);
    });
  };

  const handleFilesChange = async (files: File[]) => {
    console.log("called on upload?", files);
    const dimsArr = await Promise.all(files.map(getImageDimensions));
    console.log(dimsArr);
    const newFiles: FilesInput[] = files.map((file, i) => {
      const dimensions = dimsArr[i];
      if (!dimensions) {
        throw new Error(`Could not get dimensions for file: ${file.name}`);
      }
      return {
        ...file,
        width: dimensions.width,
        height: dimensions.height,
      };
    });
    const newMap: Record<string, ImageDimenions | null | undefined> = {};
    files.forEach((file: File, i: number) => {
      newMap[file.name] = dimsArr[i];
    });
    setDimensionsMap((prevMap) => {
      const newMap: Record<string, ImageDimenions> = {};
      newFiles.forEach((file) => {
        newMap[file.name] = { width: file.width, height: file.height };
      });
      return { ...prevMap, ...newMap }; // Merge the new map with the old one
    });
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    console.log(newMap);
  };

  return (
    <section className="flex items-center justify-around">
      <UploadDropzone
        className="bg-pink/5 ut-button:bg-gold ut-button:ut-readying:bg-burgundy/20 ut-button:ut-uploading:bg-burnt-orange/20 ut-button:border-0 ut-button:focus-within:ring-2 ut-button:focus-within:ring-offset-0 ut-button:focus-within:ring-burnt-orange ut-allowed-content:ut-uploading:text-burgundy ut-button:ut-uploading:after:bg-burnt-orange/50 ut-button:after:bg-burnt-orange/50"
        endpoint="imageUploader"
        input={files[0]!}
        onChange={handleFilesChange}
        onBeforeUploadBegin={(ut) => {
          console.log("Here is the uploaded file ----->", ut);
          return ut;
        }}
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
