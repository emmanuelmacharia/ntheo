"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, Clapperboard, XCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useUploadThing } from "~/components/utils/uploadthing";
import { saveVideoPoster } from "~/server/actions/gallery";

/**
 * Stage 3 of the backfill: generates a Poster for every video, in the browser.
 *
 * ffmpeg is not installed and a transcoding service is a monthly bill for a
 * one-day archive, so the browser does the decoding. This works only because the
 * CDN sends `Access-Control-Allow-Origin: *`, which leaves the canvas untainted
 * and `toBlob` callable. See docs/adr/0003.
 *
 * It also gives us exact `videoWidth` and `videoHeight`, already rotated, which
 * is better than anything we can parse out of a QuickTime container.
 */

type Pending = { id: number; url: string; type: string; streamable: boolean };
type Status = "waiting" | "working" | "done" | "failed";

const SEEK_SECONDS = 1;

export default function PosterCapture({ videos }: { videos: Pending[] }) {
  const [statuses, setStatuses] = useState<Record<number, Status>>({});
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { startUpload } = useUploadThing("imageUploader");

  const captureOne = useCallback(
    async (item: Pending) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) throw new Error("No capture surface");

      video.crossOrigin = "anonymous";
      video.src = item.url;
      video.muted = true;

      const frame = await new Promise<{ blob: Blob; width: number; height: number; duration: number }>(
        (resolve, reject) => {
          const fail = (reason: string) => reject(new Error(reason));
          const timeout = setTimeout(() => fail("timed out"), 45000);

          const onSeeked = () => {
            clearTimeout(timeout);
            const width = video.videoWidth;
            const height = video.videoHeight;
            if (!width || !height) return fail("no video dimensions");

            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d");
            if (!context) return fail("no 2d context");

            context.drawImage(video, 0, 0, width, height);
            canvas.toBlob(
              (blob) =>
                blob
                  ? resolve({ blob, width, height, duration: video.duration })
                  : fail("canvas produced nothing, the frame may be tainted"),
              "image/jpeg",
              0.82,
            );
          };

          video.addEventListener("error", () => fail("video failed to load"), { once: true });
          video.addEventListener(
            "loadeddata",
            () => {
              // Seek a second in: frame zero is often a black or blurred frame.
              video.currentTime = Math.min(SEEK_SECONDS, (video.duration || 2) / 2);
            },
            { once: true },
          );
          video.addEventListener("seeked", onSeeked, { once: true });
          video.load();
        },
      );

      const file = new File([frame.blob], `poster-${item.id}.jpg`, { type: "image/jpeg" });
      const uploaded = await startUpload([file]);
      const posterUrl = uploaded?.[0]?.ufsUrl ?? uploaded?.[0]?.url;
      if (!posterUrl) throw new Error("poster upload failed");

      await saveVideoPoster({
        mediaId: item.id,
        posterUrl,
        width: frame.width,
        height: frame.height,
        durationSeconds: Number.isFinite(frame.duration) ? frame.duration : undefined,
      });
    },
    [startUpload],
  );

  const run = useCallback(async () => {
    setRunning(true);
    setNote(null);

    // One at a time. Several videos decoding at once is how a laptop stalls.
    for (const item of videos) {
      setStatuses((s) => ({ ...s, [item.id]: "working" }));
      try {
        await captureOne(item);
        setStatuses((s) => ({ ...s, [item.id]: "done" }));
      } catch (error) {
        setStatuses((s) => ({ ...s, [item.id]: "failed" }));
        setNote(error instanceof Error ? error.message : "unknown error");
      }
    }

    setRunning(false);
  }, [videos, captureOne]);

  const done = Object.values(statuses).filter((s) => s === "done").length;
  const failed = Object.values(statuses).filter((s) => s === "failed").length;

  if (!videos.length) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <CheckCircle2 className="text-gold mx-auto mb-3 h-8 w-8" />
        <p className="text-muted-foreground">Every video already has a poster.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Button onClick={run} disabled={running} variant="burntOrange" size="lg">
          <Clapperboard className="mr-1 h-4 w-4" />
          {running ? "Capturing…" : `Capture ${videos.length} posters`}
        </Button>
        <p className="text-muted-foreground text-sm">
          {done} done{failed > 0 ? `, ${failed} failed` : ""}. Keep this tab open, each
          video is decoded here in the browser.
        </p>
      </div>

      {note && <p className="text-destructive mb-4 text-sm">Last error: {note}</p>}

      <ul className="divide-border divide-y rounded-lg border">
        {videos.map((item) => {
          const status = statuses[item.id] ?? "waiting";
          return (
            <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
              <span className="truncate font-mono text-xs">{item.id}</span>
              <span className="text-muted-foreground truncate">{item.type}</span>
              <span className="flex w-24 shrink-0 items-center justify-end gap-1.5">
                {status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                {status === "failed" && <XCircle className="text-destructive h-4 w-4" />}
                <span
                  className={
                    status === "working" ? "text-burnt-orange animate-pulse" : "text-muted-foreground"
                  }
                >
                  {status}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {/* The decoding surface. Hidden, but must stay in the document. */}
      <video ref={videoRef} className="hidden" playsInline muted preload="auto" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
