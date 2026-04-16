import { z } from "zod";

/**
 * RabbitMQ tag enum. These are the five valid broker-level role tags.
 * See https://www.rabbitmq.com/docs/access-control#user-tags.
 */
export const USER_TAGS = [
  "administrator",
  "policymaker",
  "monitoring",
  "management",
  "impersonator",
] as const;
export type UserTag = (typeof USER_TAGS)[number];

/**
 * RabbitMQ's broker itself enforces regex validity — we still
 * catch syntactically invalid patterns client-side so the user
 * gets inline feedback instead of a round-trip error.
 * Empty string = deny-all (valid but unusual); ".*" = full access.
 */
const permissionRegex = z
  .string()
  .refine((v) => {
    try {
      new RegExp(v);
      return true;
    } catch {
      return false;
    }
  }, "Invalid regular expression")
  .default(".*");

/**
 * Username rule: RabbitMQ allows most characters, but lowercase
 * letters, digits, underscore, hyphen, and dot cover the safe set
 * that won't need escaping in the management UI or CLI.
 */
const usernameSchema = z
  .string()
  .min(1, "Username is required")
  .max(128, "Username must be 128 characters or fewer")
  .refine((v) => v.trim().length > 0, "Username cannot be blank")
  .refine(
    (v) => /^[a-zA-Z0-9_.-]+$/.test(v),
    "Use letters, numbers, underscores, hyphens, or dots"
  );

export const createUserSchema = z.object({
  username: usernameSchema,
  password: z.string().max(4096).optional(),
  tags: z.array(z.enum(USER_TAGS)).default([]),
  vhost: z.string().default("/"),
  configure: permissionRegex,
  write: permissionRegex,
  read: permissionRegex,
});

export type CreateUserForm = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  password: z.string().optional(),
  tags: z.array(z.enum(USER_TAGS)).default([]),
  passwordAction: z.enum(["keep", "set", "remove"]).default("keep"),
});

export type EditUserForm = z.infer<typeof editUserSchema>;
