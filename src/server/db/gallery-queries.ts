import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from ".";
import {
  media_table,
  timeline_table,
  type DB_MediaType,
  type DB_TimelineNodeType,
} from "./schema";

/**
 * Reads for the gallery. Everything here filters on `visible`, so hiding a
 * Media Item or a Chapter removes it from the site without deleting a guest's
 * upload.
 *
 * Pagination is per Chapter rather than by cursor. Chapters are the spine of the
 * gallery anyway, they hold a few dozen items each, and fetching one is a single
 * indexed read. See docs/adr/0001.
 */

export type ChapterSummary = {
  id: number;
  title: string;
  slug: string;
  startsAt: Date | null;
  endsAt: Date | null;
  itemCount: number;
  cover: MediaItem | null;
};

export type EventSummary = {
  id: number;
  title: string;
  slug: string;
  startsAt: Date | null;
  endsAt: Date | null;
  itemCount: number;
  cover: MediaItem | null;
  chapters: ChapterSummary[];
};

/** What the client actually needs to lay out and render one tile. */
export type MediaItem = {
  id: number;
  url: string;
  displayUrl: string | null;
  type: string;
  width: number;
  height: number;
  lqip: string | null;
  capturedAt: Date | null;
  posterUrl: string | null;
  durationSeconds: number | null;
  streamable: boolean;
  size: number;
  featured: boolean;
  chapterId: number | null;
};

export type CuratorMedia = MediaItem & {
  eventId: number | null;
  sortOrder: number;
  visible: boolean;
};

export type CuratorChapter = {
  id: number;
  eventId: number;
  title: string;
  visible: boolean;
  sortOrder: number;
  coverMediaId: number | null;
  media: CuratorMedia[];
};

export type CuratorEvent = {
  id: number;
  title: string;
  visible: boolean;
  sortOrder: number;
  coverMediaId: number | null;
  chapters: CuratorChapter[];
  unassigned: CuratorMedia[];
};

const MEDIA_FIELDS = {
  id: media_table.id,
  url: media_table.url,
  displayUrl: media_table.displayUrl,
  type: media_table.type,
  width: media_table.width,
  height: media_table.height,
  lqip: media_table.lqip,
  capturedAt: media_table.capturedAt,
  posterUrl: media_table.posterUrl,
  durationSeconds: media_table.durationSeconds,
  streamable: media_table.streamable,
  size: media_table.size,
  featured: media_table.featured,
  chapterId: media_table.chapterId,
};

/**
 * A tile with no dimensions cannot be placed in a justified row without
 * guessing, and guessing is what produced the cropping this gallery replaces.
 * Such rows stay out of the grid until the backfill gives them a shape.
 */
const RENDERABLE = and(
  eq(media_table.visible, true),
  eq(media_table.metadataStatus, "ok"),
  sql`${media_table.width} IS NOT NULL AND ${media_table.height} IS NOT NULL`,
);

const CURATABLE = and(
  eq(media_table.metadataStatus, "ok"),
  sql`${media_table.width} IS NOT NULL AND ${media_table.height} IS NOT NULL`,
);

function toItem(row: Record<string, unknown>): MediaItem {
  return {
    ...(row as MediaItem),
    width: Number(row.width),
    height: Number(row.height),
    size: Number(row.size),
  };
}

export const GALLERY = {
  /** Events with their Chapters, item counts and Covers. One page's worth of nav. */
  getTimeline: async function (): Promise<EventSummary[]> {
    const nodes = await db
      .select()
      .from(timeline_table)
      .where(eq(timeline_table.visible, true))
      .orderBy(asc(timeline_table.sortOrder), asc(timeline_table.id));

    const counts = await db
      .select({
        chapterId: media_table.chapterId,
        n: sql<number>`COUNT(*)`,
      })
      .from(media_table)
      .where(RENDERABLE)
      .groupBy(media_table.chapterId);

    const countByChapter = new Map(
      counts.map((c) => [Number(c.chapterId), Number(c.n)]),
    );

    const coverIds = nodes
      .map((n) => n.coverMediaId)
      .filter((id): id is number => id !== null);
    const covers = coverIds.length
      ? await db
          .select(MEDIA_FIELDS)
          .from(media_table)
          .where(
            and(
              RENDERABLE,
              sql`${media_table.id} IN (${sql.join(
                coverIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
            ),
          )
      : [];
    const coverById = new Map(covers.map((c) => [Number(c.id), toItem(c)]));

    const events: EventSummary[] = nodes
      .filter((n) => n.parentId === null)
      .map((event) => ({
        id: Number(event.id),
        title: event.title,
        slug: event.slug,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        cover: event.coverMediaId
          ? (coverById.get(Number(event.coverMediaId)) ?? null)
          : null,
        itemCount: 0,
        chapters: [],
      }));

    const eventById = new Map(events.map((e) => [e.id, e]));

    for (const node of nodes) {
      if (node.parentId === null) continue;
      const parent = eventById.get(Number(node.parentId));
      if (!parent) continue;

      const itemCount = countByChapter.get(Number(node.id)) ?? 0;
      if (itemCount === 0) continue; // an empty Chapter is noise, not navigation

      parent.chapters.push({
        id: Number(node.id),
        title: node.title,
        slug: node.slug,
        startsAt: node.startsAt,
        endsAt: node.endsAt,
        itemCount,
        cover: node.coverMediaId
          ? (coverById.get(Number(node.coverMediaId)) ?? null)
          : null,
      });
      parent.itemCount += itemCount;
    }

    return events.filter((e) => e.itemCount > 0);
  },

  /** Every Media Item in one Chapter, in curated order. */
  getChapterMedia: async function (chapterId: number): Promise<MediaItem[]> {
    const rows = await db
      .select(MEDIA_FIELDS)
      .from(media_table)
      .where(and(RENDERABLE, eq(media_table.chapterId, chapterId)))
      .orderBy(asc(media_table.sortOrder), asc(media_table.id));
    return rows.map(toItem);
  },

  /** One item, for the full-page viewer a shared link opens. */
  getMediaItem: async function (id: number): Promise<MediaItem | null> {
    const rows = await db
      .select(MEDIA_FIELDS)
      .from(media_table)
      .where(and(RENDERABLE, eq(media_table.id, id)))
      .limit(1);
    return rows[0] ? toItem(rows[0]) : null;
  },

  /** The Chapter a deep link landed in, so the viewer can page through it. */
  getChapterFor: async function (id: number) {
    const item = await GALLERY.getMediaItem(id);
    if (!item?.chapterId) return null;

    const [chapter] = await db
      .select()
      .from(timeline_table)
      .where(eq(timeline_table.id, item.chapterId))
      .limit(1);

    return chapter
      ? { chapter, items: await GALLERY.getChapterMedia(item.chapterId) }
      : null;
  },

  /** Everything, in timeline order. Feeds the play-the-day recap. */
  getAllForPlayback: async function (eventId?: number): Promise<MediaItem[]> {
    const nodes = await db
      .select()
      .from(timeline_table)
      .where(eq(timeline_table.visible, true))
      .orderBy(asc(timeline_table.sortOrder), asc(timeline_table.id));

    const visibleEvents = nodes.filter((node) => node.parentId === null);
    const eventOrder = new Map(
      visibleEvents.map((event, index) => [Number(event.id), index]),
    );
    const chapterOrder = new Map(
      nodes
        .filter(
          (node) =>
            node.parentId !== null && eventOrder.has(Number(node.parentId)),
        )
        .map((chapter, index) => [Number(chapter.id), index]),
    );

    const rows = await db
      .select({
        ...MEDIA_FIELDS,
        eventId: media_table.eventId,
        sortOrder: media_table.sortOrder,
      })
      .from(media_table)
      .where(
        eventId
          ? and(RENDERABLE, eq(media_table.eventId, eventId))
          : RENDERABLE,
      )
      .orderBy(asc(media_table.id));

    return rows
      .filter(
        (item) =>
          item.eventId !== null &&
          eventOrder.has(Number(item.eventId)) &&
          item.chapterId !== null &&
          chapterOrder.has(Number(item.chapterId)),
      )
      .sort((a, b) => {
        const eventDelta =
          (eventOrder.get(Number(a.eventId)) ?? Number.MAX_SAFE_INTEGER) -
          (eventOrder.get(Number(b.eventId)) ?? Number.MAX_SAFE_INTEGER);
        if (eventDelta) return eventDelta;

        const chapterDelta =
          (chapterOrder.get(Number(a.chapterId)) ?? Number.MAX_SAFE_INTEGER) -
          (chapterOrder.get(Number(b.chapterId)) ?? Number.MAX_SAFE_INTEGER);
        if (chapterDelta) return chapterDelta;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return Number(a.id) - Number(b.id);
      })
      .map(toItem);
  },

  /** A short strip of the best frames, for the homepage teaser. */
  getHighlights: async function (limit = 8): Promise<MediaItem[]> {
    const rows = await db
      .select(MEDIA_FIELDS)
      .from(media_table)
      .where(and(RENDERABLE, sql`${media_table.type} LIKE 'image/%'`))
      // Featured first, then the day in order. Undated Items last for the same
      // reason as the recap: NULL would otherwise lead the strip.
      .orderBy(
        sql`${media_table.featured} DESC`,
        sql`${media_table.capturedAt} IS NULL`,
        asc(media_table.capturedAt),
      )
      .limit(limit);
    return rows.map(toItem);
  },

  /** Curator view: Chapters including hidden ones, which the public list omits. */
  getTimelineForCurator: async function (): Promise<DB_TimelineNodeType[]> {
    return db
      .select()
      .from(timeline_table)
      .orderBy(asc(timeline_table.sortOrder), asc(timeline_table.id));
  },

  /** Complete editable state. Hidden and empty Chapters stay reachable here. */
  getCurationWorkspace: async function (): Promise<CuratorEvent[]> {
    const [nodes, rows] = await Promise.all([
      GALLERY.getTimelineForCurator(),
      db
        .select({
          ...MEDIA_FIELDS,
          eventId: media_table.eventId,
          sortOrder: media_table.sortOrder,
          visible: media_table.visible,
        })
        .from(media_table)
        .where(CURATABLE)
        .orderBy(asc(media_table.sortOrder), asc(media_table.id)),
    ]);

    const media = rows.map((row) => ({
      ...toItem(row),
      eventId: row.eventId === null ? null : Number(row.eventId),
      sortOrder: row.sortOrder,
      visible: row.visible,
    }));

    const events: CuratorEvent[] = nodes
      .filter((node) => node.parentId === null)
      .map((event, eventIndex) => ({
        id: Number(event.id),
        title: event.title,
        visible: event.visible,
        sortOrder: event.sortOrder,
        coverMediaId:
          event.coverMediaId === null ? null : Number(event.coverMediaId),
        chapters: [],
        unassigned: media.filter(
          (item) =>
            item.chapterId === null &&
            (item.eventId === Number(event.id) ||
              (eventIndex === 0 && item.eventId === null)),
        ),
      }));
    const eventById = new Map(events.map((event) => [event.id, event]));

    for (const node of nodes) {
      if (node.parentId === null) continue;
      const event = eventById.get(Number(node.parentId));
      if (!event) continue;
      event.chapters.push({
        id: Number(node.id),
        eventId: Number(node.parentId),
        title: node.title,
        visible: node.visible,
        sortOrder: node.sortOrder,
        coverMediaId:
          node.coverMediaId === null ? null : Number(node.coverMediaId),
        media: media.filter((item) => item.chapterId === Number(node.id)),
      });
    }

    return events;
  },

  /** Videos still missing a Poster, which the admin capture page works through. */
  getVideosWithoutPosters: async function (): Promise<DB_MediaType[]> {
    return db
      .select()
      .from(media_table)
      .where(
        and(
          sql`${media_table.type} LIKE 'video/%'`,
          isNull(media_table.posterUrl),
        ),
      )
      .orderBy(asc(media_table.id));
  },
};
