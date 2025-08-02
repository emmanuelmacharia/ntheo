import { z } from "zod";

export const inviteUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(256, "Name is too long"),
    familyName: z.string().max(256, "Family name is too long").optional(),
    inviteFamily: z.boolean(),
  })
  .strict();

export type Invite = {
  name: string;
  familyName?: string;
  inviteFamily: boolean;
};

export const inviteRsvpSchema = z
  .object({
    rsvp: z.boolean(),
    accepted: z.boolean(),
    requiresTransport: z.boolean(),
    numberOfGuests: z.number().min(1).max(2),
  })
  .strict();

export const userSchema = z
  .object({
    email: z.string().email("invalid email"),
    role: z.enum(["ADMIN", "CURATOR"], {
      errorMap: () => ({ message: "Role must be either ADMIN or CURATOR" }),
    }),
  })
  .strict();

export const mediSchema = z
  .object({
    url: z.string(),
    type: z.string(),
    size: z.number().positive(),
    tag: z.string(),
    featured: z.boolean().default(false),
  })
  .strict();
