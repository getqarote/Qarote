import z from "zod/v4";

export const CreateVHostSchema = z.object({
  name: z.string().min(1, "VHost name is required"),
  description: z.string().optional(),
  tracing: z.boolean().default(false),
});

export const UpdateVHostSchema = z.object({
  description: z.string().optional(),
  tracing: z.boolean().optional(),
});

export const SetPermissionSchema = z.object({
  username: z.string().min(1, "Username is required"),
  configure: z.string().default(".*"),
  write: z.string().default(".*"),
  read: z.string().default(".*"),
});

export const SetLimitSchema = z.object({
  value: z.number().min(0, "Limit value must be non-negative"),
  limitType: z.enum(["max-connections", "max-queues", "max-channels"]),
});
