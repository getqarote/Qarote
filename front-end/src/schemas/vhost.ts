import { z } from "zod";

export const createVHostSchema = z.object({
  name: z.string().min(1, "VHost name is required"),
  description: z.string().optional(),
  tracing: z.boolean().default(false),
});

export type CreateVHostForm = z.infer<typeof createVHostSchema>;

export const editVHostSchema = z.object({
  description: z.string().optional(),
  tracing: z.boolean().default(false),
});

export type EditVHostForm = z.infer<typeof editVHostSchema>;

export const limitSchema = z.object({
  limitType: z.enum(["max-connections", "max-queues", "max-channels"]),
  value: z.number().min(1, "Value must be greater than 0"),
});

export type LimitForm = z.infer<typeof limitSchema>;

export const permissionSchema = z.object({
  username: z.string().min(1, "Username is required"),
  configure: z.string().default(".*"),
  write: z.string().default(".*"),
  read: z.string().default(".*"),
});

export type PermissionForm = z.infer<typeof permissionSchema>;

export const editLimitValueSchema = z.object({
  value: z.number().min(1),
});

export type EditLimitValueForm = z.infer<typeof editLimitValueSchema>;
