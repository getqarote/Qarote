import { z } from "zod";

// Add server form schema
export const addServerSchema = z.object({
  name: z.string().min(1, "Server name is required"),
  host: z.string().min(1, "Host is required"),
  port: z
    .number()
    .min(1, "Port must be a positive number")
    .max(65535, "Port must be less than 65536"),
  amqpPort: z
    .number()
    .min(1, "AMQP Port must be a positive number")
    .max(65535, "AMQP Port must be less than 65536"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  vhost: z.string().default("/"),
  useHttps: z.boolean(),
});

export type AddServerFormData = z.infer<typeof addServerSchema>;

// URL validation schema for RabbitMQ server URLs
// Ensures protocol is at the start and URL is parseable
export const urlValidationSchema = z
  .string()
  .min(1)
  .refine(
    (url) => {
      const trimmed = url.trim();
      const protocolSeparatorIndex = trimmed.indexOf("://");

      // If protocol separator exists, validate it's at the start with a valid protocol
      if (protocolSeparatorIndex !== -1) {
        // Check if URL starts with http://, https://, amqp://, or amqps://
        const protocolMatch = trimmed.match(/^(https?|amqps?):\/\//i);
        if (!protocolMatch) {
          // Protocol separator exists but not at the start with valid protocol
          return false;
        }
        // Protocol is valid and at the start
        return true;
      }

      // No protocol separator - this is OK, will be added later
      return true;
    },
    {
      message: "Invalid URL format",
    }
  )
  .refine(
    (url) => {
      // Try to parse as URL to ensure it's valid
      try {
        const trimmed = url.trim();
        let urlToParse = trimmed;

        // Add protocol if missing for validation
        if (!urlToParse.match(/^(https?|amqps?):\/\//i)) {
          if (urlToParse.includes(".") && !urlToParse.includes("://")) {
            urlToParse = `https://${urlToParse}`;
          } else {
            urlToParse = `http://${urlToParse}`;
          }
        }

        new URL(urlToParse);
        return true;
      } catch {
        return false;
      }
    },
    {
      message: "Invalid URL format",
    }
  );
