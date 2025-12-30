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
