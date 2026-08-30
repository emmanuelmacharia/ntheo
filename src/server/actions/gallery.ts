"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { GALLERY, type MediaItem } from "../db/gallery-queries";
import { media_table, timeline_table } from "../db/schema";
import { authUser } from "./auth";

/** Loads one Chapter's Media Items. Called as each section nears the viewport. */
export async function fetchChapterMedia(chapterId: number): Promise<MediaItem[]> {
  try {
    return await GALLERY.getChapterMedia(chapterId);
  } catch (error) {
    console.error("Failed to load chapter media", error);
    return [];
  }
}

export async function fetchPlaybackMedia(eventId?: number): Promise<MediaItem[]> {
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

export async function renameTimelineNode(id: number, title: string) {
  await requireCurator();

  const clean = title.trim().slice(0, 120);
  if (!clean) return new Error("Title cannot be empty");

  await db.update(timeline_table).set({ title: clean }).where(eq(timeline_table.id, id));
  revalidatePath("/gallery");
  return "renamed";
}

export async function setTimelineVisibility(id: number, visible: boolean) {
  await requireCurator();
  await db.update(timeline_table).set({ visible }).where(eq(timeline_table.id, id));
  revalidatePath("/gallery");
  return "updated";
}

/** Moves a Chapter up or down among its siblings by swapping sort orders. */
export async function moveChapter(id: number, direction: "up" | "down") {
  await requireCurator();

  const [node] = await db.select().from(timeline_table).where(eq(timeline_table.id, id)).limit(1);
  if (!node?.parentId) return new Error("Not a chapter");

  const siblings = await db
    .select()
    .from(timeline_table)
    .where(eq(timeline_table.parentId, node.parentId))
    .orderBy(timeline_table.sortOrder);

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

  revalidatePath("/gallery");
  return "moved";
}

export async function setMediaFeatured(id: number, featured: boolean) {
  await requireCurator();
  await db.update(media_table).set({ featured }).where(eq(media_table.id, id));
  revalidatePath("/gallery");
  return "updated";
}

/** Hiding is how we remove things. We never delete a guest's upload. */
export async function setMediaVisibility(id: number, visible: boolean) {
  await requireCurator();
  await db.update(media_table).set({ visible }).where(eq(media_table.id, id));
  revalidatePath("/gallery");
  return "updated";
}

export async function setChapterCover(chapterId: number, mediaId: number) {
  await requireCurator();
  await db
    .update(timeline_table)
    .set({ coverMediaId: mediaId })
    .where(eq(timeline_table.id, chapterId));
  revalidatePath("/gallery");
  return "updated";
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
  if (input.durationSeconds) patch.durationSeconds = Math.round(input.durationSeconds);

  await db.update(media_table).set(patch).where(eq(media_table.id, input.mediaId));
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
    .where(and(sql`${media_table.type} LIKE 'video/%'`, isNull(media_table.posterUrl)));

  return rows.map((r) => ({ ...r, id: Number(r.id) }));
}
