"use server";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  createUser,
  fetchUser,
  fetchWhitelistedUser,
} from "~/server/actions/actions";
import type { DB_UserType } from "~/server/db/schema";

export const authUser = async (): Promise<DB_UserType | null> => {
  const sessionPromise = auth();
  const clerkUserPromise = currentUser();
  let managedUser: DB_UserType;

  const [session, clerkUser] = await Promise.all([
    sessionPromise,
    clerkUserPromise,
  ]);

  if (session.userId || clerkUser?.emailAddresses.length) {
    // means that the user has used clerk to either register or log in
    // check that the user's email exists in the db;
    const email = clerkUser?.emailAddresses[0]!.emailAddress;
    if (!email) {
      return null;
    }
    const whitelistedUserPromise = fetchWhitelistedUser(email);
    const userPromise = fetchUser(email);
    // If the user does not exist in the db, then first check that the user whitelist table if they're require
    const [user, whitelistedUser] = await Promise.all([
      userPromise,
      whitelistedUserPromise,
    ]);
    if (user && !(user instanceof Error)) {
      // user exists on our db
      managedUser = user;
      return managedUser;
    }

    if (!user && whitelistedUser && !(whitelistedUser instanceof Error)) {
      // create the profile for the user
      const userPayload = {
        email: email,
        role: whitelistedUser.role,
      };
      const userCreation = await createUser(userPayload);

      if (!(userCreation instanceof Error) && userCreation) {
        managedUser = userCreation[0]!;
        return managedUser;
      }
      return null;
    }
  }
  return null;
};
