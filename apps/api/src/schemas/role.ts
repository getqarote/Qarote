/**
 * Input schemas for the custom-role router (RBAC Phase 3 PR-2).
 *
 * The router enforces tenancy by accepting `workspaceId` in every shape
 * (matching the `workspaceProcedure` resolution path). Anti-escalation
 * and plan-gate live in the procedure body / middleware — the schemas
 * here are pure input validation.
 */

import { z } from "zod";

import { ScopeJsonSchema } from "@/auth/scope-canonical";

/** Reserved names that would shadow built-in tiers (case-insensitive). */
const RESERVED_ROLE_NAMES = new Set(["owner", "admin", "member", "readonly"]);

const RoleNameSchema = z
  .string()
  .trim()
  .min(2, { message: "role.nameTooShort" })
  .max(64, { message: "role.nameTooLong" })
  .regex(/^[a-zA-Z0-9 _-]+$/, { message: "role.nameInvalidChars" })
  .refine((name) => !RESERVED_ROLE_NAMES.has(name.toLowerCase()), {
    message: "role.nameReserved",
  });

const RoleDescriptionSchema = z
  .string()
  .trim()
  .max(280, { message: "role.descriptionTooLong" })
  .nullable()
  .optional();

/**
 * One `(permissionKey, scope)` pair on a role. Multiple entries with
 * the same `permissionKey` and different `scope` are allowed — OR'd
 * at evaluation time per the scope evaluator's row semantics.
 *
 * `scope: null` = unscoped grant (admits any resource).
 */
const RolePermissionEntrySchema = z
  .object({
    permissionKey: z.string().min(1).max(128),
    scope: ScopeJsonSchema.nullable(),
  })
  .strict();

// ─── list ───────────────────────────────────────────────────────────
export const ListRolesInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    cursor: z.string().uuid().nullable().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();

// ─── get ────────────────────────────────────────────────────────────
export const GetRoleInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    roleId: z.string().uuid(),
  })
  .strict();

// ─── create ─────────────────────────────────────────────────────────
export const CreateRoleInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    name: RoleNameSchema,
    description: RoleDescriptionSchema,
    permissions: z
      .array(RolePermissionEntrySchema)
      .min(1, { message: "role.permissionsEmpty" })
      .max(500, { message: "role.permissionsTooMany" }),
  })
  .strict();

// ─── update (rename / redescribe only) ──────────────────────────────
export const UpdateRoleInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    roleId: z.string().uuid(),
    expectedUpdatedAt: z.coerce.date(),
    name: RoleNameSchema.optional(),
    description: RoleDescriptionSchema,
  })
  .strict()
  .refine(
    (v) => v.name !== undefined || v.description !== undefined,
    "role.updateRequiresAtLeastOneField"
  );

// ─── setPermissions ─────────────────────────────────────────────────
export const SetPermissionsInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    roleId: z.string().uuid(),
    expectedUpdatedAt: z.coerce.date(),
    permissions: z
      .array(RolePermissionEntrySchema)
      .min(1, { message: "role.permissionsEmpty" })
      .max(500, { message: "role.permissionsTooMany" }),
  })
  .strict();

// ─── delete ─────────────────────────────────────────────────────────
export const DeleteRoleInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    roleId: z.string().uuid(),
    expectedUpdatedAt: z.coerce.date(),
  })
  .strict();

// ─── assignRole (bulk) ──────────────────────────────────────────────
export const AssignRoleInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    memberIds: z
      .array(z.string().uuid())
      .min(1, { message: "role.memberIdsEmpty" })
      .max(100, { message: "role.memberIdsTooMany" }),
    targetRoleId: z.string().uuid(),
  })
  .strict();

// ─── builtins (system role rows) ────────────────────────────────────
export const ListBuiltinRolesInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
  })
  .strict();

// ─── permission catalog list ────────────────────────────────────────
export const ListPermissionsInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
  })
  .strict();
