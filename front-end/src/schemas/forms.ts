import { z } from "zod";

// Sign up form schema
export const signUpSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    workspaceName: z.string().min(1, "Workspace name is required"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;

// Sign in form schema
export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignInFormData = z.infer<typeof signInSchema>;

// Accept invitation form schema
export const acceptInvitationSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;

// Feedback form schema
export const feedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE", "IMPROVEMENT", "GENERAL"], {
    required_error: "Please select a feedback type",
  }),
  category: z.enum(
    [
      "UI_UX",
      "PERFORMANCE",
      "SECURITY",
      "FUNCTIONALITY",
      "DOCUMENTATION",
      "OTHER",
    ],
    {
      required_error: "Please select a category",
    }
  ),
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be less than 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
});

export type FeedbackFormData = z.infer<typeof feedbackSchema>;

// Add server form schema
export const addServerSchema = z.object({
  name: z.string().min(1, "Server name is required"),
  host: z.string().min(1, "Host is required"),
  port: z
    .number()
    .min(1, "Port must be a positive number")
    .max(65535, "Port must be less than 65536"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  vhost: z.string().default("/"),
  sslConfig: z.object({
    enabled: z.boolean().default(false),
    verifyPeer: z.boolean().default(true),
    caCertPath: z.string().default(""),
    clientCertPath: z.string().default(""),
    clientKeyPath: z.string().default(""),
  }),
});

export type AddServerFormData = z.infer<typeof addServerSchema>;

// Add queue form schema
export const addQueueSchema = z.object({
  name: z.string().min(1, "Queue name is required"),
  durable: z.boolean().default(true),
  autoDelete: z.boolean().default(false),
  exclusive: z.boolean().default(false),
  maxLength: z.string().optional(),
  messageTtl: z.string().optional(),
  bindToExchange: z.string().optional(),
  routingKey: z.string().optional(),
});

export type AddQueueFormData = z.infer<typeof addQueueSchema>;

// Send message form schema
export const sendMessageSchema = z.object({
  exchange: z.string().default(""),
  routingKey: z.string().default(""),
  payload: z.string().min(1, "Message payload is required"),
  deliveryMode: z.string().default("2"),
  priority: z.string().optional(),
  expiration: z.string().optional(),
  contentType: z.string().default("application/json"),
  contentEncoding: z.string().default("none"),
  correlationId: z.string().optional(),
  replyTo: z.string().optional(),
  messageId: z.string().optional(),
  appId: z.string().optional(),
  messageType: z.string().optional(),
  headers: z.string().optional(),
});

export type SendMessageFormData = z.infer<typeof sendMessageSchema>;
