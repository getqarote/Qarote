import { z } from "zod";

/**
 * Validates a RabbitMQ permission regex. Empty strings deny all
 * access (which is valid but unusual); we accept any non-null string
 * and let RabbitMQ itself validate the regex shape.
 */
const permissionRegex = z.string().default(".*");

export const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  tags: z.string().optional().default(""),
  vhost: z.string().default("/"),
  configure: permissionRegex,
  write: permissionRegex,
  read: permissionRegex,
});

export type CreateUserForm = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  password: z.string().optional(),
  tags: z.string().optional().default(""),
  passwordAction: z.enum(["keep", "set", "remove"]).default("keep"),
});

export type EditUserForm = z.infer<typeof editUserSchema>;
