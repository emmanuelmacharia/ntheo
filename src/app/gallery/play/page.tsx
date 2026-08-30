import { GALLERY } from "~/server/db/gallery-queries";
import StoryPlayer, { type PlaybackSlide } from "~/components/gallery/StoryPlayer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Play the day | Wanza <> Kiangai",
};

/**
 * The cinematic recap. Slides run in capture order, and each carries its Chapter
 * so the player can group the progress bar and draw a title card at each change.
 */
export default async function PlayPage() {
  const [events, media] = await Promise.all([
    GALLERY.getTimeline(),
    GALLERY.getAllForPlayback(),
  ]);

  const chapterTitles = new Map(
    events.flatMap((event) => event.chapters.map((c) => [c.id, c.title] as const)),
  );

  let previousChapter: number | null | undefined;
  const slides: PlaybackSlide[] = media.map((item) => {
    const isChapterStart = item.chapterId !== previousChapter;
    previousChapter = item.chapterId;
    return {
      item,
      chapterId: item.chapterId,
      chapterTitle: item.chapterId ? chapterTitles.get(item.chapterId) : undefined,
      isChapterStart,
    };
  });

  return <StoryPlayer slides={slides} />;
}
