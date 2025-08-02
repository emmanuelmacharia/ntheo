import { db } from ".";
import { eq, desc } from "drizzle-orm";

import {
  invites_table,
  media_table,
  user_table,
  user_whitelist_table,
  type DB_InviteType,
  type DB_MediaType,
  type DB_UserType,
} from "./schema";
import { inviteUserSchema, mediSchema, type Invite } from "../models";
import type { ClientUploadedFileData } from "uploadthing/types";

export const QUERIES = {
  getAllInvites: async function (): Promise<DB_InviteType[] | [] | Error> {
    try {
      const invites = await db
        .select()
        .from(invites_table)
        .orderBy(desc(invites_table.createdAt));

      return invites;
    } catch (error) {
      console.error("Error fetching guest feedback:", error);
      return new Error("Failed to fetch guest feedback");
    }
  },

  getInvite: async function (
    inviteId: number,
  ): Promise<DB_InviteType | null | Error> {
    try {
      const invite = await db
        .select()
        .from(invites_table)
        .where(eq(invites_table.id, inviteId));
      return invite[0]?.id ? invite[0] : null;
    } catch (error) {
      console.error("Error fetching invite:", error);
      return new Error("Failed to fetch invite");
    }
  },

  getWhitelistedUser: async function (email: string) {
    try {
      const user = await db
        .select()
        .from(user_whitelist_table)
        .where(eq(user_whitelist_table.email, email));
      return user[0]?.email ? user[0] : null;
    } catch (error) {
      console.error("Error fetching whitelisted user", error);
      return new Error("Failed to fetch whitelisted user");
    }
  },

  getUser: async function (email: string) {
    try {
      const user = await db
        .select()
        .from(user_table)
        .where(eq(user_table.email, email));
      return user[0]?.email ? user[0] : null;
    } catch (error) {
      console.error("Error fetching user", error);
      return new Error("Failed to fetch  user");
    }
  },

  getAllMedia: async function (): Promise<DB_MediaType[] | [] | Error> {
    try {
      const media = await db
        .select()
        .from(media_table)
        .orderBy(desc(media_table.createdAt));
      return media;
    } catch (error) {
      console.error("Error fetching media", error);
      return new Error("Failed to getch uploaded media");
    }
  },

  getFeaturedMedia: async function (): Promise<DB_MediaType[] | [] | Error> {
    try {
      const media = await db
        .select()
        .from(media_table)
        .where(eq(media_table.featured, true))
        .orderBy(desc(media_table.createdAt));
      return media;
    } catch (error) {
      console.error("Error fetching media", error);
      return new Error("Failed to getch uploaded media");
    }
  },
};

export const MUTATIONS = {
  createGuestInvite: async function (input: Invite) {
    const parsedData = inviteUserSchema.safeParse(input);
    if (!parsedData.success) {
      return new Error("Invalid invite data");
    }
    try {
      const result = await db
        .insert(invites_table)
        .values({
          name: parsedData.data.name,
          familyName: parsedData.data.familyName,
          inviteFamily: parsedData.data.inviteFamily,
        })
        .$returningId();
      const createdInvite = result[0]!.id;
      return createdInvite;
    } catch (error) {
      console.error("Error creating guest invite:", error);
      return new Error("Failed to create guest invite");
    }
  },

  deleteInvite: async function (input: number): Promise<string | Error> {
    // first find whether the record exists
    const invite = await QUERIES.getInvite(input);
    if (invite instanceof Error) {
      return new Error("Error occurred");
    }
    if (!invite) {
      return new Error("Invite does not exist");
    }
    try {
      await db.delete(invites_table).where(eq(invites_table.id, input));
      return `Deleted invite with ID: ${input}`;
    } catch (error) {
      console.error(error);
      return new Error(`Failed to delete invite`);
    }
  },

  updateRSVP: async function (
    input: {
      rsvp: boolean;
      accepted: boolean;
      numberOfGuests: number;
      requiresTransport: boolean;
    },
    id: number,
  ): Promise<string | Error> {
    try {
      await db
        .update(invites_table)
        .set({
          rsvp: input.rsvp,
          accepted: input.accepted,
          numberOfGuests: input.numberOfGuests,
          requiresTransport: input.requiresTransport,
        })
        .where(eq(invites_table.id, id));
      return `rsvp updated successfully`;
    } catch (error) {
      console.error(error);
      return new Error(`Failed to update rsvp details`);
    }
  },

  createUser: async function (input: {
    email: string;
    role: string;
  }): Promise<DB_UserType[] | Error> {
    try {
      const result = await db
        .insert(user_table)
        .values({
          email: input.email,
          role: input.role,
        })
        .$returningId();
      const createdUser = await db
        .select()
        .from(user_table)
        .where(eq(user_table.id, result[0]!.id));
      return createdUser;
    } catch (error) {
      console.error("Error creating user:", error);
      return new Error("Failed to create user");
    }
  },

  createMedia: async (input: {
    url: string;
    type: string;
    size: number;
    tag: string;
    featured: boolean;
  }): Promise<string | Error> => {
    try {
      const validatedInput = mediSchema.safeParse(input);

      if (validatedInput.error) {
        return new Error("Invalid input");
      }

      const result = await db
        .insert(media_table)
        .values({
          url: validatedInput.data.url,
          type: validatedInput.data.type,
          size: validatedInput.data.size,
          featured: validatedInput.data.featured,
          tag: validatedInput.data.tag,
        })
        .$returningId();

      if (result) {
        return `${input.tag} successfully stored`;
      }
      return new Error(`Something went wrong`);
    } catch (error) {
      console.error("Error creating file", error);
      return new Error(`${input.tag} failed to persist`);
    }
  },
};
