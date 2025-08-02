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

// Media table
export const media_table = createTable("media", {
  id: bigint("id", { mode: "number", unsigned: true })
    .primaryKey()
    .autoincrement(),
  url: text("url").notNull(),
  type: text("type").notNull(), // e.g., 'image', 'video'
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  size: bigint("size", { mode: "number" }).notNull(), // Size in bytes
  featured: boolean("featured").default(false).notNull(), // to show up on the homescreen
  tag: text("tag").default("UNTAGGED").notNull(), // for discoverability - we'll use this field for the image name; (if we do decide to use masonry, and figure out a way to pass the dimensions; we'll construct a string that shows these parameters)
});

export type DB_UserType = typeof user_table.$inferSelect;
export type DB_InviteType = typeof invites_table.$inferSelect;
// export type DB_GuestType = typeof guests_table.$inferSelect;
export type DB_MediaType = typeof media_table.$inferSelect;
export type DB_UserWhitelistType = typeof user_whitelist_table.$inferSelect;
