"use server";
import { MUTATIONS, QUERIES } from "../db/queries";
import type { DB_InviteType } from "../db/schema";
import { inviteRsvpSchema, inviteUserSchema, userSchema } from "../models";
import { cookies } from "next/headers";

const forceRefresh = async () => {
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
    await forceRefresh();
    return result;
  } catch (error) {
    console.error("Error creating guest invite:", error);
    return new Error(
      error instanceof Error ? error.message : "Unknown error occurred",
    );
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
  await forceRefresh();
  return result;
};

export const getInviteById = async (id: number) => {
  const result = await QUERIES.getInvite(id);
  if (result instanceof Error) {
    return new Error("Error retrieving invite");
  }
  if (!result) {
    return new Error("No invite found");
  }
  return result;
};

export const updateRsvpForm = async (
  input: {
    rsvp: boolean;
    accepted: boolean;
    numberOfGuests: number;
    requiresTransport: boolean;
  },
  id: number,
) => {
  const validatedInput = inviteRsvpSchema.safeParse(input);
  if (!validatedInput.success) {
    return new Error(`Invalid data`);
  }
  const result = await MUTATIONS.updateRSVP(validatedInput.data, id);
  if (result instanceof Error) {
    return new Error(result.message);
  }
  await forceRefresh();
  return result;
};

export const fetchWhitelistedUser = async (email: string) => {
  const result = await QUERIES.getWhitelistedUser(email);

  if (result instanceof Error) {
    return new Error(result.message);
  }

  return result;
};

export const fetchUser = async (email: string) => {
  const result = await QUERIES.getUser(email);

  if (result instanceof Error) {
    return new Error(result.message);
  }

  return result;
};

export const createUser = async (user: { email: string; role: string }) => {
  const validatedInput = userSchema.safeParse(user);
  if (!validatedInput.success) {
    return new Error(`Invalid data`);
  }
  const result = await MUTATIONS.createUser(validatedInput.data);

  if (result instanceof Error) {
    return new Error(result.message);
  }

  await forceRefresh();
  return result;
};
