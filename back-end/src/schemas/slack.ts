import { z } from "zod";

/**
 * Validate Slack webhook URL format
 * Slack webhook URLs follow the pattern: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
 */
const slackWebhookUrlSchema = z
  .string()
  .url("Invalid webhook URL")
  .refine(
    (url) => {
      try {
        const urlObj = new URL(url);
        return (
          urlObj.hostname === "hooks.slack.com" &&
          urlObj.pathname.startsWith("/services/") &&
          urlObj.pathname.split("/").length >= 4 // /services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
        );
      } catch {
        return false;
      }
    },
    {
      message:
        "Invalid Slack webhook URL. Must be in the format: https://hooks.slack.com/services/",
    }
  );

/**
 * Schema for creating a Slack configuration
 */
export const CreateSlackConfigSchema = z.object({
  webhookUrl: slackWebhookUrlSchema,
  customValue: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
});

/**
 * Schema for updating a Slack configuration
 */
export const UpdateSlackConfigSchema = z.object({
  webhookUrl: slackWebhookUrlSchema.optional(),
  customValue: z.string().optional().nullable(),
  enabled: z.boolean().optional(),
});

export type CreateSlackConfig = z.infer<typeof CreateSlackConfigSchema>;
export type UpdateSlackConfig = z.infer<typeof UpdateSlackConfigSchema>;
