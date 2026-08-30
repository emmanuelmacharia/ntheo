"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ImageIcon,
  Pencil,
  Plus,
  Star,
} from "lucide-react";
import type {
  CuratorChapter,
  CuratorEvent,
  CuratorMedia,
} from "~/server/db/gallery-queries";
import {
  assignMediaToChapter,
  createChapter,
  moveChapter,
  moveMedia,
  renameTimelineNode,
  setChapterCover,
  setEventCover,
  setMediaFeatured,
  setMediaVisibility,
  setTimelineVisibility,
} from "~/server/actions/gallery";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { isVideo, stillUrl } from "~/lib/media";
import { cn } from "~/lib/utils";

type Mutate = (work: () => Promise<unknown>, message: string) => void;

export default function CuratorClient({ events }: { events: CuratorEvent[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const mutate: Mutate = (work, message) => {
    setNotice(null);
    startTransition(async () => {
      try {
        await work();
        setNotice(message);
        router.refresh();
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : "That change could not be saved.",
        );
      }
    });
  };

  if (events.length === 0) {
    return (
      <p className="rounded-lg border bg-white p-6">
        No event is available to curate.
      </p>
    );
  }

  return (
    <div className={cn("space-y-10", pending && "cursor-wait")}>
      {notice && (
        <p
          aria-live="polite"
          className="border-gold/40 bg-gold/10 rounded-lg border px-4 py-3 text-sm"
        >
          {notice}
        </p>
      )}
      {events.map((event) => (
        <EventEditor
          key={event.id}
          event={event}
          pending={pending}
          mutate={mutate}
        />
      ))}
    </div>
  );
}

function EventEditor({
  event,
  pending,
  mutate,
}: {
  event: CuratorEvent;
  pending: boolean;
  mutate: Mutate;
}) {
  const [newTitle, setNewTitle] = useState("");
  const total =
    event.chapters.reduce((sum, chapter) => sum + chapter.media.length, 0) +
    event.unassigned.length;
  const addChapter = () => {
    const title = newTitle.trim();
    if (!title) return;
    mutate(async () => createChapter(event.id, title), `Created "${title}".`);
    setNewTitle("");
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
              Event
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                event.visible
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-stone-200 text-stone-700",
              )}
            >
              {event.visible ? "Shown" : "Hidden"}
            </span>
          </div>
          <h2 className="font-display mt-1 text-2xl font-semibold">
            {event.title}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {event.chapters.length} chapters, {total} media items
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button
            variant={event.visible ? "outline" : "default"}
            disabled={pending}
            onClick={() =>
              mutate(
                async () => setTimelineVisibility(event.id, !event.visible),
                event.visible
                  ? "Event hidden. You can show it again here."
                  : "Event shown in the gallery and story.",
              )
            }
          >
            {event.visible ? "Hide event" : "Show event"}
          </Button>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addChapter()}
            placeholder="New chapter title"
            aria-label="New chapter title"
            disabled={pending}
            className="sm:w-64"
          />
          <Button
            variant="burntOrange"
            onClick={addChapter}
            disabled={pending || !newTitle.trim()}
          >
            <Plus /> New chapter
          </Button>
        </div>
      </div>

      {event.chapters.map((chapter, index) => (
        <ChapterEditor
          key={chapter.id}
          chapter={chapter}
          chapters={event.chapters}
          eventCoverMediaId={event.coverMediaId}
          pending={pending}
          mutate={mutate}
          canMoveUp={index > 0}
          canMoveDown={index < event.chapters.length - 1}
        />
      ))}
      <ChapterEditor
        chapter={null}
        chapters={event.chapters}
        eventId={event.id}
        eventCoverMediaId={event.coverMediaId}
        media={event.unassigned}
        pending={pending}
        mutate={mutate}
      />
    </section>
  );
}

function ChapterEditor({
  chapter,
  chapters,
  eventId,
  eventCoverMediaId,
  media,
  pending,
  mutate,
  canMoveUp,
  canMoveDown,
}: {
  chapter: CuratorChapter | null;
  chapters: CuratorChapter[];
  eventId?: number;
  eventCoverMediaId: number | null;
  media?: CuratorMedia[];
  pending: boolean;
  mutate: Mutate;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chapter?.title ?? "Unassigned");
  const items = chapter?.media ?? media ?? [];
  const ownerEventId = chapter?.eventId ?? eventId!;
  const saveTitle = () => {
    if (!chapter) return;
    const clean = title.trim();
    setEditing(false);
    if (!clean) return setTitle(chapter.title);
    if (clean !== chapter.title)
      mutate(
        async () => renameTimelineNode(chapter.id, clean),
        "Chapter title saved.",
      );
  };

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-sm",
        chapter && !chapter.visible && "border-dashed bg-stone-50",
      )}
    >
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {editing && chapter ? (
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setTitle(chapter.title);
                    setEditing(false);
                  }
                }}
                className="h-9 max-w-md"
              />
            ) : (
              <h3 className="font-display text-lg font-semibold">
                {chapter?.title ?? "Unassigned media"}
              </h3>
            )}
            {chapter && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  chapter.visible
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-stone-200 text-stone-700",
                )}
              >
                {chapter.visible ? "Shown" : "Hidden"}
              </span>
            )}
            {chapter?.coverMediaId && (
              <span className="bg-gold/20 text-burgundy rounded-full px-2 py-0.5 text-xs font-medium">
                Cover selected
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {items.length} {items.length === 1 ? "media item" : "media items"}
            {!chapter &&
              ". Place these into a chapter when they belong in the story."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {chapter && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                disabled={pending}
              >
                <Pencil /> Rename
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canMoveUp || pending}
                onClick={() =>
                  mutate(
                    async () => moveChapter(chapter.id, "up"),
                    "Chapter moved earlier.",
                  )
                }
              >
                <ChevronUp /> Earlier
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canMoveDown || pending}
                onClick={() =>
                  mutate(
                    async () => moveChapter(chapter.id, "down"),
                    "Chapter moved later.",
                  )
                }
              >
                <ChevronDown /> Later
              </Button>
              <Button
                variant={chapter.visible ? "outline" : "default"}
                size="sm"
                disabled={pending}
                onClick={() =>
                  mutate(
                    async () =>
                      setTimelineVisibility(chapter.id, !chapter.visible),
                    chapter.visible
                      ? "Chapter hidden. You can show it again here."
                      : "Chapter shown in the gallery and story.",
                  )
                }
              >
                {chapter.visible ? "Hide chapter" : "Show chapter"}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen((value) => !value)}
          >
            <ChevronsUpDown /> {open ? "Close media" : "Manage media"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-stone-50/70 p-4">
          {items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No media here yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item, index) => (
                <MediaEditor
                  key={item.id}
                  item={item}
                  chapter={chapter}
                  chapters={chapters}
                  eventId={ownerEventId}
                  eventCoverMediaId={eventCoverMediaId}
                  pending={pending}
                  mutate={mutate}
                  canMoveUp={index > 0}
                  canMoveDown={index < items.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function MediaEditor({
  item,
  chapter,
  chapters,
  eventId,
  eventCoverMediaId,
  pending,
  mutate,
  canMoveUp,
  canMoveDown,
}: {
  item: CuratorMedia;
  chapter: CuratorChapter | null;
  chapters: CuratorChapter[];
  eventId: number;
  eventCoverMediaId: number | null;
  pending: boolean;
  mutate: Mutate;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const image = stillUrl(item);
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-white",
        !item.visible && "border-dashed opacity-70",
      )}
    >
      <div className="relative aspect-[4/3] bg-stone-100">
        {image ? (
          <Image
            src={image}
            alt="Gallery media item"
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm">
            <ImageIcon /> Video without a poster
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="rounded bg-black/65 px-2 py-1 text-[11px] font-medium text-white">
            {isVideo(item) ? "Video" : "Photo"} #{item.id}
          </span>
          {item.featured && (
            <span className="bg-gold text-burgundy rounded px-2 py-1 text-[11px] font-semibold">
              Featured
            </span>
          )}
          {!item.visible && (
            <span className="rounded bg-stone-900 px-2 py-1 text-[11px] font-semibold text-white">
              Hidden
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 p-3">
        <label className="block text-xs font-medium">
          Chapter
          <select
            className="border-input mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm"
            value={chapter?.id ?? ""}
            disabled={pending}
            onChange={(e) => {
              const chapterId = e.target.value ? Number(e.target.value) : null;
              mutate(
                async () => assignMediaToChapter(item.id, chapterId, eventId),
                chapterId === null
                  ? "Media moved to Unassigned."
                  : "Media moved to its new chapter.",
              );
            }}
          >
            <option value="">Unassigned</option>
            {chapters.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
                {option.visible ? "" : " (hidden)"}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canMoveUp || pending}
            onClick={() =>
              mutate(
                async () => moveMedia(item.id, "up"),
                "Media moved earlier.",
              )
            }
          >
            <ChevronUp /> Earlier
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canMoveDown || pending}
            onClick={() =>
              mutate(
                async () => moveMedia(item.id, "down"),
                "Media moved later.",
              )
            }
          >
            <ChevronDown /> Later
          </Button>
          <Button
            variant={item.featured ? "golden" : "outline"}
            size="sm"
            disabled={pending}
            onClick={() =>
              mutate(
                async () => setMediaFeatured(item.id, !item.featured),
                item.featured
                  ? "Removed from featured media."
                  : "Media marked as featured.",
              )
            }
          >
            <Star className={item.featured ? "fill-current" : ""} />{" "}
            {item.featured ? "Unfeature" : "Feature"}
          </Button>
          <Button
            variant={item.visible ? "outline" : "default"}
            size="sm"
            disabled={pending}
            onClick={() =>
              mutate(
                async () => setMediaVisibility(item.id, !item.visible),
                item.visible
                  ? "Media hidden. You can show it again here."
                  : "Media shown in the gallery and story.",
              )
            }
          >
            {item.visible ? "Hide media" : "Show media"}
          </Button>
        </div>

        {chapter && (
          <Button
            variant={chapter.coverMediaId === item.id ? "golden" : "ghost"}
            size="sm"
            className="w-full"
            disabled={
              pending || !item.visible || chapter.coverMediaId === item.id
            }
            onClick={() =>
              mutate(
                async () => setChapterCover(chapter.id, item.id),
                "Chapter cover updated.",
              )
            }
          >
            <ImageIcon />{" "}
            {chapter.coverMediaId === item.id
              ? "Current chapter cover"
              : "Use as chapter cover"}
          </Button>
        )}
        <Button
          variant={eventCoverMediaId === item.id ? "golden" : "ghost"}
          size="sm"
          className="w-full"
          disabled={pending || !item.visible || eventCoverMediaId === item.id}
          onClick={() =>
            mutate(
              async () => setEventCover(eventId, item.id),
              "Gallery cover updated.",
            )
          }
        >
          <ImageIcon />{" "}
          {eventCoverMediaId === item.id
            ? "Current gallery cover"
            : "Use as gallery cover"}
        </Button>
      </div>
    </div>
  );
}
