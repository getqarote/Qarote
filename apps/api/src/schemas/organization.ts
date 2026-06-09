import { z } from "zod";

import { WorkspaceRole } from "@/generated/prisma/client";

export const UpdateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must be less than 100 characters")
    .optional(),
  // Lowercase letters, digits, and single hyphens between segments — the
  // slug is a public-ish identifier and must stay URL-safe + unique.
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(48, "Slug must be less than 48 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug may only contain lowercase letters, numbers, and hyphens"
    )
    .optional(),
  contactEmail: z.string().email("Invalid email address").optional().nullable(),
  logoUrl: z.string().url("Invalid URL").optional().nullable(),
});

// OWNER is intentionally excluded — workspace assignments via org invitation
// cannot promote to OWNER (ownership transfer is its own flow).
export const WorkspaceAssignmentSchema = z.object({
  workspaceId: z.string(),
  role: z.enum([
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
    WorkspaceRole.READONLY,
  ]),
});

export const InviteOrgMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MEMBER"]),
  workspaceAssignments: z
    .array(WorkspaceAssignmentSchema)
    .max(50, "Too many workspace assignments")
    .optional()
    .default([])
    .refine(
      (arr) => new Set(arr.map((a) => a.workspaceId)).size === arr.length,
      "Duplicate workspace IDs"
    ),
});

export const UpdateOrgMemberRoleSchema = z.object({
  memberId: z.string(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

export const RemoveOrgMemberSchema = z.object({
  memberId: z.string(),
});

export const AssignToWorkspaceSchema = z.object({
  userId: z.string(),
  workspaceId: z.string(),
  role: z.enum(["ADMIN", "MEMBER", "READONLY"]),
});

export const AcceptOrgInvitationSchema = z.object({
  invitationId: z.string(),
});

export const DeclineOrgInvitationSchema = z.object({
  invitationId: z.string(),
});

export const CancelOrgInvitationSchema = z.object({
  invitationId: z.string(),
});
