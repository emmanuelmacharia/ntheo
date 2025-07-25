"use server";
import { MUTATIONS, QUERIES } from "../db/queries";
import type { DB_InviteType } from "../db/schema";
import { inviteUserSchema } from "../models";
import { cookies } from "next/headers";

const forceRefesh = async () => {
  const c = await cookies();
  c.set("force-refresh", JSON.stringify(Math.random()));
};

export const createGuestInvite = async (inviteData: {
  name: string;
  familyName?: string;
  inviteFamily: boolean;
}) => {
  console.log("Creating guest invite with data:", inviteData);

  const parsedData = inviteUserSchema.safeParse(inviteData);

  if (!parsedData.success) {
    console.error("Validation failed:", parsedData.error);
    return new Error("Invalid invite data");
  }

  try {
    const result = await MUTATIONS.createGuestInvite(parsedData.data);
    if (result instanceof Error) {
      console.error("Error creating guest invite:", result);
      return result;
    }
    await forceRefesh();
    return result;
  } catch (error) {
    console.error("Error creating guest invite:", error);
  }
};

export const fetchAllInvites = async (): Promise<DB_InviteType[] | []> => {
  const result = await QUERIES.getAllInvites();
  // do error handling here instead of the component
  if (result instanceof Error) {
    return [];
  }
  if (!result) {
    return [];
  }
  return result;
};

export const deleteInvite = async (id: number) => {
  const result = await MUTATIONS.deleteInvite(id);
  if (result instanceof Error) {
    return result;
  }
  await forceRefesh();
  return result;
};
