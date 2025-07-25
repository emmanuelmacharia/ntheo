import { db } from ".";
import { eq, desc } from "drizzle-orm";

import { invites_table, type DB_InviteType } from "./schema";
import { inviteUserSchema, type Invite } from "../models";

export const QUERIES = {
  getAllInvites: async function (): Promise<DB_InviteType[] | null | Error> {
    try {
      const invites = await db
        .select()
        .from(invites_table)
        .orderBy(desc(invites_table.createdAt));

      return invites.length > 0 ? invites : null;
    } catch (error) {
      console.error("Error fetching guest feedback:", error);
      return new Error("Failed to fetch guest feedback");
    }
  },

  getInvite: async function (
    inviteId: number,
  ): Promise<DB_InviteType | null | Error> {
    try {
      const [invite] = await db
        .select()
        .from(invites_table)
        .where(eq(invites_table.id, inviteId))
        .execute();
      return invite?.id ? invite : null;
    } catch (error) {
      console.error("Error fetching invite:", error);
      return new Error("Failed to fetch invite");
    }
  },
};

export const MUTATIONS = {
  createGuestInvite: async function (input: Invite) {
    console.log("Creating guest invite with input:", input);
    const parsedData = inviteUserSchema.safeParse(input);
    if (!parsedData.success) {
      console.error("Validation failed:", parsedData.error);
      return new Error("Invalid invite data");
    }
    try {
      console.log("Parsed invite data:", parsedData.data);
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

  deleteInvite: async function (input: number) {
    // first find whether the record exists
    const invite = await QUERIES.getInvite(input);
    if (invite instanceof Error) {
      return Error("Error occurred");
    }
    if (!invite) {
      return Error("Invite does not exist");
    }
    try {
      await db.delete(invites_table).where(eq(invites_table.id, input));
      return `Deleted invite with ID: ${input}`;
    } catch (error) {
      console.error(error);
      return Error(`Failed to delete invite`);
    }
  },
};
