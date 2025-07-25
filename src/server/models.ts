import { z } from "zod";

export const inviteUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(256, "Name is too long"),
  familyName: z.string().max(256, "Family name is too long").optional(),
  inviteFamily: z.boolean(),
});

export type Invite = {
  name: string;
  familyName?: string;
  inviteFamily: boolean;
};
