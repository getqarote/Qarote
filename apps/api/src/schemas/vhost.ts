import { z } from "zod";

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

// Schema for username parameter
export const UsernameParamSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

// Schema for limit type enum
export const VHostLimitTypeSchema = z.enum([
  "max-connections",
  "max-queues",
  "max-channels",
]);

// Schema for limit value
export const VHostLimitValueSchema = z
  .number()
  .min(0, "Limit value must be non-negative");
