import { z } from "zod";

export const OrganizationIdParamSchema = z.object({
  organizationId: z.string(),
});

export const UpdateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must be less than 100 characters")
    .optional(),
  contactEmail: z.string().email("Invalid email address").optional().nullable(),
  logoUrl: z.string().url("Invalid URL").optional().nullable(),
});

export const InviteOrgMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MEMBER"]),
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
