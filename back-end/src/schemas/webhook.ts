import { z } from "zod";

/**
 * Validate that the URL is not a Slack webhook URL
 * Slack webhooks should be configured through the Slack integration, not general webhooks
 */
const webhookUrlSchema = z
  .string()
  .url("Invalid webhook URL")
  .refine(
    (url) => {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname !== "hooks.slack.com";
      } catch {
        return false;
      }
    },
    {
      message:
        "Slack webhook URLs should be added in the Slack Notifications section, not here.",
    }
  );

/**
 * Schema for creating a webhook
 */
export const CreateWebhookSchema = z.object({
  url: webhookUrlSchema,
  enabled: z.boolean().optional().default(true),
  secret: z.string().optional().nullable(),
});

/**
 * Schema for updating a webhook
 */
export const UpdateWebhookSchema = z.object({
  url: webhookUrlSchema.optional(),
  enabled: z.boolean().optional(),
  secret: z.string().optional().nullable(),
});

/**
 * Schema for webhook response
 */
export const WebhookResponseSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  url: z.string(),
  enabled: z.boolean(),
  secret: z.string().nullable(),
  version: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateWebhook = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhook = z.infer<typeof UpdateWebhookSchema>;
export type WebhookResponse = z.infer<typeof WebhookResponseSchema>;
