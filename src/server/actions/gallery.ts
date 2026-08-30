"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { GALLERY, type MediaItem } from "../db/gallery-queries";
import { media_table, timeline_table } from "../db/schema";
import { authUser } from "./auth";

/** Loads one Chapter's Media Items. Called as each section nears the viewport. */
export async function fetchChapterMedia(
  chapterId: number,
): Promise<MediaItem[]> {
  try {
    return await GALLERY.getChapterMedia(chapterId);
  } catch (error) {
    console.error("Failed to load chapter media", error);
    return [];
  }
}

export async function fetchPlaybackMedia(
  eventId?: number,
): Promise<MediaItem[]> {
  try {
    return await GALLERY.getAllForPlayback(eventId);
  } catch (error) {
    console.error("Failed to load playback media", error);
    return [];
  }
}

/**
 * Curation is restricted to signed-in staff. Everything else in the gallery is
 * public for now, which is a deliberate choice recorded in the plan.
 */
async function requireCurator() {
  const user = await authUser();
  if (!user || user instanceof Error) throw new Error("Not authorised");
  return user;
}

function revalidateCuration() {
  revalidatePath("/admin/curate");
  revalidatePath("/gallery");
  revalidatePath("/gallery/play");
}

export async function renameTimelineNode(id: number, title: string) {
  await requireCurator();

  const clean = title.trim().slice(0, 120);
  if (!clean) return new Error("Title cannot be empty");

  await db
    .update(timeline_table)
    .set({ title: clean })
    .where(eq(timeline_table.id, id));
  revalidateCuration();
  return "renamed";
}

export async function createChapter(eventId: number, title: string) {
  await requireCurator();

  const clean = title.trim().slice(0, 120);
  if (!clean) throw new Error("Chapter title cannot be empty");

  const [event] = await db
    .select({ id: timeline_table.id, parentId: timeline_table.parentId })
    .from(timeline_table)
    .where(eq(timeline_table.id, eventId))
    .limit(1);
  if (!event || event.parentId !== null) throw new Error("Event not found");

  const [last] = await db
    .select({
      value: sql<number>`COALESCE(MAX(${timeline_table.sortOrder}), -1)`,
    })
    .from(timeline_table)
    .where(eq(timeline_table.parentId, eventId));

  const slug = `${
    clean
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "chapter"
  }-${Date.now().toString(36)}`;

  await db.insert(timeline_table).values({
    parentId: eventId,
    title: clean,
    slug,
    sortOrder: Number(last?.value ?? -1) + 1,
  });

  revalidateCuration();
  return "created";
}

export async function setTimelineVisibility(id: number, visible: boolean) {
  await requireCurator();
  await db
    .update(timeline_table)
    .set({ visible })
    .where(eq(timeline_table.id, id));
  revalidateCuration();
  return "updated";
}

/** Moves a Chapter up or down among its siblings by swapping sort orders. */
export async function moveChapter(id: number, direction: "up" | "down") {
  await requireCurator();

  const [node] = await db
    .select()
    .from(timeline_table)
    .where(eq(timeline_table.id, id))
    .limit(1);
  if (!node?.parentId) return new Error("Not a chapter");

  const siblings = await db
    .select()
    .from(timeline_table)
    .where(eq(timeline_table.parentId, node.parentId))
    .orderBy(asc(timeline_table.sortOrder), asc(timeline_table.id));

  const index = siblings.findIndex((s) => Number(s.id) === Number(id));
  const swapWith = siblings[direction === "up" ? index - 1 : index + 1];
  if (!swapWith) return "at the end already";

  await db
    .update(timeline_table)
    .set({ sortOrder: swapWith.sortOrder })
    .where(eq(timeline_table.id, node.id));
  await db
    .update(timeline_table)
    .set({ sortOrder: node.sortOrder })
    .where(eq(timeline_table.id, swapWith.id));

  revalidateCuration();
  return "moved";
}

export async function setMediaFeatured(id: number, featured: boolean) {
  await requireCurator();
  await db.update(media_table).set({ featured }).where(eq(media_table.id, id));
  revalidateCuration();
  return "updated";
}

/** Hiding is how we remove things. We never delete a guest's upload. */
export async function setMediaVisibility(id: number, visible: boolean) {
  await requireCurator();
  await db.update(media_table).set({ visible }).where(eq(media_table.id, id));
  if (!visible) {
    await db
      .update(timeline_table)
      .set({ coverMediaId: null })
      .where(eq(timeline_table.coverMediaId, id));
  }
  revalidateCuration();
  return "updated";
}

export async function setChapterCover(chapterId: number, mediaId: number) {
  await requireCurator();
  const [item] = await db
    .select({ id: media_table.id })
    .from(media_table)
    .where(
      and(
        eq(media_table.id, mediaId),
        eq(media_table.chapterId, chapterId),
        eq(media_table.visible, true),
      ),
    )
    .limit(1);
  if (!item) throw new Error("Cover must belong to this chapter");

  await db
    .update(timeline_table)
    .set({ coverMediaId: mediaId })
    .where(eq(timeline_table.id, chapterId));
  revalidateCuration();
  return "updated";
}

export async function setEventCover(eventId: number, mediaId: number) {
  await requireCurator();
  const [item] = await db
    .select({ id: media_table.id })
    .from(media_table)
    .where(
      and(
        eq(media_table.id, mediaId),
        eq(media_table.eventId, eventId),
        eq(media_table.visible, true),
      ),
    )
    .limit(1);
  if (!item) throw new Error("Cover must belong to this event");

  await db
    .update(timeline_table)
    .set({ coverMediaId: mediaId })
    .where(
      and(eq(timeline_table.id, eventId), isNull(timeline_table.parentId)),
    );
  revalidateCuration();
  return "updated";
}

export async function assignMediaToChapter(
  mediaId: number,
  chapterId: number | null,
  eventId: number,
) {
  await requireCurator();

  const [item] = await db
    .select({ chapterId: media_table.chapterId, eventId: media_table.eventId })
    .from(media_table)
    .where(eq(media_table.id, mediaId))
    .limit(1);
  if (!item) throw new Error("Media item not found");

  if (chapterId !== null) {
    const [chapter] = await db
      .select({ parentId: timeline_table.parentId })
      .from(timeline_table)
      .where(eq(timeline_table.id, chapterId))
      .limit(1);
    if (!chapter || Number(chapter.parentId) !== eventId) {
      throw new Error("Chapter does not belong to this event");
    }
  }

  const destination =
    chapterId === null
      ? and(eq(media_table.eventId, eventId), isNull(media_table.chapterId))
      : eq(media_table.chapterId, chapterId);
  const [last] = await db
    .select({ value: sql<number>`COALESCE(MAX(${media_table.sortOrder}), -1)` })
    .from(media_table)
    .where(destination);

  await db
    .update(media_table)
    .set({
      eventId,
      chapterId,
      sortOrder: Number(last?.value ?? -1) + 1,
    })
    .where(eq(media_table.id, mediaId));

  if (item.chapterId !== null && Number(item.chapterId) !== chapterId) {
    await db
      .update(timeline_table)
      .set({ coverMediaId: null })
      .where(
        and(
          eq(timeline_table.id, item.chapterId),
          eq(timeline_table.coverMediaId, mediaId),
        ),
      );
  }
  if (item.eventId !== null && Number(item.eventId) !== eventId) {
    await db
      .update(timeline_table)
      .set({ coverMediaId: null })
      .where(eq(timeline_table.coverMediaId, mediaId));
  }

  revalidateCuration();
  return "moved";
}

export async function moveMedia(id: number, direction: "up" | "down") {
  await requireCurator();

  const [item] = await db
    .select()
    .from(media_table)
    .where(eq(media_table.id, id))
    .limit(1);
  if (!item) throw new Error("Media item not found");
  if (item.chapterId === null && item.eventId === null) {
    throw new Error("Assign this media item to an event before ordering it");
  }

  const scope =
    item.chapterId === null
      ? and(
          eq(media_table.eventId, item.eventId as number),
          isNull(media_table.chapterId),
        )
      : eq(media_table.chapterId, item.chapterId);
  const siblings = await db
    .select({ id: media_table.id, sortOrder: media_table.sortOrder })
    .from(media_table)
    .where(scope)
    .orderBy(asc(media_table.sortOrder), asc(media_table.id));
  const index = siblings.findIndex((sibling) => Number(sibling.id) === id);
  const swapWith = siblings[direction === "up" ? index - 1 : index + 1];
  if (!swapWith) return "at the end already";

  await db
    .update(media_table)
    .set({ sortOrder: swapWith.sortOrder })
    .where(eq(media_table.id, item.id));
  await db
    .update(media_table)
    .set({ sortOrder: item.sortOrder })
    .where(eq(media_table.id, swapWith.id));

  revalidateCuration();
  return "moved";
}

/**
 * Records a Poster captured in the browser. Stage 3 of the backfill, and the
 * same path every future upload takes. See docs/adr/0003.
 */
export async function saveVideoPoster(input: {
  mediaId: number;
  posterUrl: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}) {
  await requireCurator();

  const patch: Record<string, unknown> = { posterUrl: input.posterUrl };
  // The browser reports dimensions with rotation already applied, which beats
  // anything we can parse out of a QuickTime container.
  if (input.width && input.height) {
    patch.width = input.width;
    patch.height = input.height;
  }
  if (input.durationSeconds)
    patch.durationSeconds = Math.round(input.durationSeconds);

  await db
    .update(media_table)
    .set(patch)
    .where(eq(media_table.id, input.mediaId));
  revalidatePath("/gallery");
  return "saved";
}

/** Videos still needing a Poster, oldest first. */
export async function fetchVideosNeedingPosters() {
  await requireCurator();
  const rows = await db
    .select({
      id: media_table.id,
      url: media_table.url,
      type: media_table.type,
      streamable: media_table.streamable,
    })
    .from(media_table)
    .where(
      and(
        sql`${media_table.type} LIKE 'video/%'`,
        isNull(media_table.posterUrl),
      ),
    );

  return rows.map((r) => ({ ...r, id: Number(r.id) }));
}
