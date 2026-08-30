// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration
import { sql } from "drizzle-orm";
import {
  bigint,
  text,
  timestamp,
  singlestoreTableCreator,
  boolean,
  int,
  index,
  double,
  varchar,
} from "drizzle-orm/singlestore-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = singlestoreTableCreator((name) => `ntheo_${name}`);

// creates a user table
export const user_table = createTable(
  "user",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    role: text("role").default("USER").notNull(), // Default role is 'user'
    isActive: boolean("is_active").default(true).notNull(), // Default is active
    lastLogin: timestamp("last_login", { mode: "date" }), //when they last logged in
  },
  (table) => ({
    emailUnique: index("email_idx").on(table.id, table.email), // Unique index on email
  }),
);

export const user_whitelist_table = createTable(
  "user_whitelist_table",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    email: text("email").notNull(),
    role: text("role").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    emailUnique: index("whitelist_email_idx").on(table.email),
  }),
);

// Creates a table for managing invites
export const invites_table = createTable("invite", {
  id: bigint("id", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  name: text("name").notNull(),
  familyName: text("family_name"),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  inviteExpiration: timestamp("invite_expiration", { mode: "date" })
    .default(sql`'2025-08-02 23:59:59'`) // .default(sql`DATE_ADD(NOW(), INTERVAL 30 DAY)`)
    .notNull(), // Invite expiration date, default is August 2nd from creation
  rsvp: boolean("rsvp").default(false).notNull(), // RSVP status; false means not responded
  accepted: boolean("accepted").default(false).notNull(), // Accepted status; false means not coming, true means coming
  numberOfGuests: int("number_of_guests").default(0).notNull(), // Number of guests invited, default is 0
  requiresTransport: boolean("requires_transport").default(false).notNull(), // Whether transport is required, default is false
  inviteFamily: boolean("invite_family").default(false).notNull(), // Whether the invite is for the family, default is false
});

// create a guest when the invite is accepted
// and the number of guests is greater than 0
// export const guests_table = createTable(
//   "guest",
//   {
//     id: bigint("id", { mode: "number", unsigned: true })
//       .primaryKey()
//       .autoincrement(),
//     inviteId: bigint("invite_id", { mode: "number", unsigned: true }).notNull(),
//     name: text("name").notNull(),
//     familyName: text("family_name"),
//     createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
//     updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
//   },
//   (table) => ({
//     inviteIdIdx: index("guest_invite_id_idx").on(table.inviteId),
//   }),
// );

/**
 * Events and Chapters share one physical table.
 *
 * This database is capped at 10 tables and is shared with an unrelated
 * `mosaic_*` project, so there was no room for a second one. See docs/adr/0005.
 *
 * A row with `parentId === null` is an Event, an occasion whose media belongs
 * together, e.g. "The Wedding Weekend". A row with a `parentId` is a Chapter, a
 * named ordered stretch of that Event, e.g. "The Ceremony". Chapters are
 * proposed from 40-minute gaps in capture time, then renamed by hand.
 *
 * Use the `isEvent` / `isChapter` helpers below rather than testing `parentId`
 * inline, so the distinction stays legible at call sites.
 */
export const timeline_table = createTable(
  "event",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    parentId: bigint("parent_id", { mode: "number", unsigned: true }), // null = Event, set = Chapter
    title: text("title").notNull(),
    slug: varchar("slug", { length: 128 }).notNull(),
    // Bounds come from capture time, and event days run 04:00 to 04:00 so a
    // reception past midnight stays in the evening it belongs to.
    startsAt: timestamp("starts_at", { mode: "date" }),
    endsAt: timestamp("ends_at", { mode: "date" }),
    sortOrder: int("sort_order").default(0).notNull(),
    coverMediaId: bigint("cover_media_id", { mode: "number", unsigned: true }),
    visible: boolean("visible").default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    parentIdx: index("timeline_parent_idx").on(table.parentId, table.sortOrder),
    slugIdx: index("timeline_slug_idx").on(table.slug),
  }),
);

// Media table
export const media_table = createTable(
  "media",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    url: text("url").notNull(),
    type: text("type").notNull(), // e.g., 'image', 'video'
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    size: bigint("size", { mode: "number" }).notNull(), // Size in bytes
    featured: boolean("featured").default(false).notNull(), // an editorial judgement made by a person; beats anything chosen automatically
    tag: text("tag").default("UNTAGGED").notNull(), // free-text label kept from the original upload flow

    // --- shape, so the layout can reserve space before anything downloads ---
    // Written with EXIF orientation ALREADY APPLIED. Orientations 5-8 swap these
    // two, so raw header values are wrong for most phone portraits.
    width: int("width"),
    height: int("height"),
    lqip: text("lqip"), // base64 blur placeholder, ~600 bytes, from the embedded EXIF thumbnail

    // --- time: the ordering spine (ADR-0001) ---
    // Null means Undated Item. We never fall back to created_at, which is upload
    // time and lands up to three weeks away from the moment shown.
    capturedAt: timestamp("captured_at", { mode: "date" }),
    captureSource: text("capture_source").default("none").notNull(), // exif | mp4 | filename | none

    // --- playback and rendering ---
    displayUrl: text("display_url"), // Display Copy for raw/HEIC; null means `url` renders fine
    posterUrl: text("poster_url"),
    durationSeconds: int("duration_seconds"),
    streamable: boolean("streamable").default(true).notNull(), // false when moov sits at the end of the file
    originalFilename: text("original_filename"), // from Content-Disposition; last-resort date source

    // --- captured but deliberately never rendered on a public page ---
    gpsLat: double("gps_lat"),
    gpsLng: double("gps_lng"),

    // --- curation ---
    eventId: bigint("event_id", { mode: "number", unsigned: true }),
    chapterId: bigint("chapter_id", { mode: "number", unsigned: true }),
    sortOrder: int("sort_order").default(0).notNull(),
    visible: boolean("visible").default(true).notNull(), // hiding is how we remove things; we do not delete guests' uploads

    metadataStatus: text("metadata_status").default("pending").notNull(), // pending | ok | failed
  },
  (table) => ({
    timelineIdx: index("media_timeline_idx").on(table.capturedAt, table.id),
    chapterIdx: index("media_chapter_idx").on(table.chapterId, table.sortOrder),
    statusIdx: index("media_status_idx").on(table.metadataStatus),
  }),
);

export type DB_UserType = typeof user_table.$inferSelect;
export type DB_InviteType = typeof invites_table.$inferSelect;
// export type DB_GuestType = typeof guests_table.$inferSelect;
export type DB_MediaType = typeof media_table.$inferSelect;
export type DB_UserWhitelistType = typeof user_whitelist_table.$inferSelect;
/** A row of {@link timeline_table}: an Event when `parentId` is null, else a Chapter. */
export type DB_TimelineNodeType = typeof timeline_table.$inferSelect;

/** An Event: an occasion whose media belongs together. */
export type DB_EventType = DB_TimelineNodeType & { parentId: null };

/** A Chapter: a named, ordered stretch of one Event. */
export type DB_ChapterType = DB_TimelineNodeType & { parentId: number };

export const isEvent = (node: DB_TimelineNodeType): node is DB_EventType =>
  node.parentId === null;

export const isChapter = (node: DB_TimelineNodeType): node is DB_ChapterType =>
  node.parentId !== null;
