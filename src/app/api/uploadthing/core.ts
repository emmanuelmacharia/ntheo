import { createUploadthing, type FileRouter } from "uploadthing/next";
import z from "zod";

const ImageDimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

const FileSchema = z.object({
  lastModified: z.number(),
  name: z.string().min(1, "File name cannot be empty"),
  size: z.number().positive("File size must be positive"),
  type: z.string().min(1, "File type cannot be empty"),
});

const FilesInputSchema = FileSchema.merge(ImageDimensionsSchema);

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({
    image: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "512MB",
      maxFileCount: 20,
    },
    video: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "512MB",
      maxFileCount: 20,
    },
  })
    .input(FilesInputSchema)
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req, files }) => {
      // This code runs on your server before upload
      //   const user = await auth(req);

      // If you throw, the user will not be able to upload
      //   if (!user) throw new UploadThingError("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      //   return { userId: user.id };
      console.log("there runs the request", files, files[0]);
      return { request: req };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.request);

      console.log("file url", file.ufsUrl);

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: metadata.request.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
