import { z } from "zod/v4";
import { UserRole } from "@prisma/client";

// Schema for user registration
export const RegisterUserSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  acceptTerms: z.boolean().optional().default(false),
});

// Schema for user login
export const LoginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Schema for password reset request
export const PasswordResetRequestSchema = z.object({
  email: z.email("Invalid email address"),
});

// Schema for password reset
export const PasswordResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Schema for password change
export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

// Schema for email change request
export const EmailChangeRequestSchema = z.object({
  newEmail: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required for email change"),
});

// Schema for account invitation
export const InviteUserSchema = z.object({
  email: z.email("Invalid email address"),
  role: z.enum(UserRole).default(UserRole.USER),
  workspaceId: z.uuid("Invalid workspace ID"),
});

// Schema for accepting an invitation
export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
});

// Schema for accepting invitation with registration (required fields)
export const AcceptInvitationWithRegistrationSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

// Types derived from schemas
export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type PasswordResetRequestInput = z.infer<
  typeof PasswordResetRequestSchema
>;
export type PasswordResetInput = z.infer<typeof PasswordResetSchema>;
export type PasswordChangeInput = z.infer<typeof PasswordChangeSchema>;
export type EmailChangeRequestInput = z.infer<typeof EmailChangeRequestSchema>;
export type InviteUserInput = z.infer<typeof InviteUserSchema>;
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;
export type AcceptInvitationWithRegistrationInput = z.infer<
  typeof AcceptInvitationWithRegistrationSchema
>;
