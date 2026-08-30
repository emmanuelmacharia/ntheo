import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

const auth = (req: Request) => ({ id: "fakeId" }); // Fake auth function

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({
    image: {
      // Phone photos run 2-7MB. 32MB leaves room for a DSLR raw without
      // inviting anything absurd.
      maxFileSize: "32MB",
      maxFileCount: 20,
    },
    video: {
      // Was 512MB, which is how a 114MB clip got into the library. UploadThing
      // only accepts a fixed set of size literals, and 64MB is the one nearest
      // the intent: it still takes 30 of the 31 videos already stored.
      maxFileSize: "64MB",
      maxFileCount: 20,
    },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      //   const user = await auth(req);

      // If you throw, the user will not be able to upload
      //   if (!user) throw new UploadThingError("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      //   return { userId: user.id };
      return { request: req };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: metadata.request.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
