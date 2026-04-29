import { z } from "zod";

import i18n from "@/i18n";

// ── Attribution / referral ───────────────────────────────────────────────────

export const REFERRAL_SOURCES = [
  "google",
  "llm",
  "twitter",
  "linkedin",
  "github",
  "reddit",
  "colleague",
  "newsletter",
  "podcast",
  "other",
] as const;

export type ReferralSource = (typeof REFERRAL_SOURCES)[number];

// ── Password ─────────────────────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, () => i18n.t("validation:passwordMinLength"))
  .regex(/[a-z]/, () => i18n.t("validation:passwordLowercase"))
  .regex(/[A-Z]/, () => i18n.t("validation:passwordUppercase"))
  .regex(/[0-9]/, () => i18n.t("validation:passwordNumber"))
  .regex(/[^a-zA-Z0-9]/, () => i18n.t("validation:passwordSpecial"));

// ── Sign up ───────────────────────────────────────────────────────────────────

export const signUpSchema = z
  .object({
    firstName: z.string().min(1, () => i18n.t("validation:firstNameRequired")),
    lastName: z.string().min(1, () => i18n.t("validation:lastNameRequired")),
    email: z.string().email(() => i18n.t("validation:invalidEmail")),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: i18n.t("validation:acceptTermsRequired"),
    }),
    referralSource: z.enum(REFERRAL_SOURCES).optional(),
    discoveryQuery: z.string().max(500).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: i18n.t("validation:passwordsDoNotMatch"),
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;

// ── Sign in ───────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: z.string().email(() => i18n.t("validation:invalidEmail")),
  password: z.string().min(1, () => i18n.t("validation:passwordRequired")),
});

export type SignInFormData = z.infer<typeof signInSchema>;

// ── Accept invitation ─────────────────────────────────────────────────────────

export const acceptInvitationSchema = z
  .object({
    firstName: z.string().min(1, () => i18n.t("validation:firstNameRequired")),
    lastName: z.string().min(1, () => i18n.t("validation:lastNameRequired")),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: i18n.t("validation:passwordsDoNotMatch"),
    path: ["confirmPassword"],
  });

export type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;
