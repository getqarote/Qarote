import { z } from "zod";

// Schema for user registration
export const RegisterUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms of service to register",
  }),
  sourceApp: z.enum(["app", "portal"]).optional().default("app"),
});

// Schema for user login
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Schema for password reset request
export const PasswordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
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

// Schema for Google OAuth request
export const GoogleAuthSchema = z.object({
  credential: z.string(),
});

// Schema for Google OAuth invitation acceptance
export const GoogleInvitationAcceptSchema = z.object({
  credential: z.string(),
});

// Schema for email verification token
export const VerifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

// Schema for resend verification
// For authenticated users: only type is needed
// For unauthenticated users: email is required to identify the user
export const ResendVerificationSchema = z.object({
  type: z.enum(["SIGNUP", "EMAIL_CHANGE"]).optional().default("SIGNUP"),
  email: z.string().email("Invalid email address").optional(),
  sourceApp: z.enum(["app", "portal"]).optional().default("app"),
});

// Schema for invitation token
export const InvitationTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

// Schema for accepting invitation with registration
export const AcceptInvitationWithRegistrationTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

// Schema for accepting invitation with Google
export const AcceptInvitationWithGoogleSchema = z.object({
  token: z.string().min(1, "Token is required"),
  credential: z.string().min(1, "Google credential is required"),
});
