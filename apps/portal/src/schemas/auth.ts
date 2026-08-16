import { z } from "zod";

// Password validation schema
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character"
  );

// Lightweight sign-up: email + password only. First/last name are optional at
// the backend (derived from OAuth or left blank), and confirm-password is
// dropped in favour of the inline strength meter — mirrors the app's sign-up.
export const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: passwordSchema,
});

export type SignUpFormData = z.infer<typeof signUpSchema>;

// Sign in form schema
export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignInFormData = z.infer<typeof signInSchema>;
