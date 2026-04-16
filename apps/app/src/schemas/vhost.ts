import { z } from "zod";

/**
 * RabbitMQ virtual host naming rules:
 * - Non-empty, trimmed.
 * - `/` alone is the default vhost and is always reserved.
 * - Names with leading/trailing whitespace or embedded whitespace-only are rejected.
 * - We cap at 255 to match the server-side limit exposed by the management API.
 *
 * We deliberately do NOT restrict the character set — RabbitMQ accepts almost
 * anything in a vhost name (including unicode), and users picking unusual names
 * usually know what they're doing. We just block the obviously-broken cases.
 */
const RESERVED_DEFAULT = (v: string) => v.trim() !== "/";

export const VHOST_QUEUE_TYPES = ["classic", "quorum", "stream"] as const;
export type VHostQueueType = (typeof VHOST_QUEUE_TYPES)[number];

export const createVHostSchema = z.object({
  name: z
    .string()
    .min(1, "Virtual host name is required")
    .max(255, "Virtual host name must be 255 characters or fewer")
    .refine((v) => v.trim().length > 0, "Virtual host name cannot be blank")
    .refine(
      RESERVED_DEFAULT,
      'The name "/" is reserved for the default virtual host',
    ),
  description: z.string().max(1024).optional(),
  defaultQueueType: z.enum(VHOST_QUEUE_TYPES).optional(),
  tracing: z.boolean().default(false),
});

export type CreateVHostForm = z.infer<typeof createVHostSchema>;

export const editVHostSchema = z.object({
  description: z.string().max(1024).optional(),
  defaultQueueType: z.enum(VHOST_QUEUE_TYPES).optional(),
  tracing: z.boolean().default(false),
});

export type EditVHostForm = z.infer<typeof editVHostSchema>;
