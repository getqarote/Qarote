# RBAC PR-4.1 — Team-page role assignment + bulk toolbar

Follow-on to #97 (Phase 3 PR-4). Tracks the scope agreed on after multi-agent
review (UX / Frontend / Backend / Security). See GitHub issue
[#99](https://github.com/getqarote/Qarote-EE/issues/99) for the original list.

## Scope

### Backend

1. **`workspace.role.builtins`** — new procedure returning the 4 system role
   rows (`id`, `builtinKey`, `name`) so the frontend can address them by UUID
   via `assignRole`. Gated by `role:read`.
2. **`memberId` on `user.getWorkspaceUsers`** — surface `WorkspaceMember.id`
   in the response so the frontend can pass it directly to `assignRole.memberIds`
   without a second resolution step.
3. **Propagate `PRIVILEGE_ESCALATION` and `STALE_UPDATE` cause codes** — add
   to `PROPAGATED_CAUSE_CODES` in `trpc.ts` so `err.data.cause` is actually
   populated; today the error formatter strips them and `RoleEditor`'s
   inline-row handler is dead code.
4. **Lock actor's custom role row in `assignRole`** — close the TOCTOU gap
   surfaced by the security review: when the actor holds a custom role, take
   a `FOR UPDATE` lock on their own `Role` row in addition to the target's.

### Frontend

5. **`WorkspaceMember` type** — `User` has no `role` field after the UserRole
   cleanup; the current `workspaceUser.role as WorkspaceRole` cast silently
   succeeds for `"CUSTOM"` and breaks rank comparisons. Introduce a real type
   with `role: WorkspaceRole | "CUSTOM"` and `memberId: string`.
6. **Single mutation path** — always call `workspace.role.assignRole`, never
   `user.updateMemberRole`. The latter is broken for custom-role actors and
   uses a different anti-escalation function. Remove the call site.
7. **Bulk toolbar above the table** — checkbox per row, header "select all"
   (page-scoped), inline toolbar (not floating) above the table when 1+ rows
   selected: `"X selected · [Role Select] · [Apply] · [Deselect all]"`.
8. **SelectGroup for built-ins / custom** — visually separated groups in the
   role dropdown to avoid hierarchy confusion when both lists coexist.
9. **Last-OWNER blocking dialog** — confirmation dialog (not inline warning)
   when the bulk operation would remove the last OWNER. Backend enforces
   this unconditionally; the dialog is UX defense-in-depth.
10. **Inline change on a selected row clears its selection** — explicit rule
    to avoid surprising "applied twice" behavior when the user changes one
    row inline then hits Apply on the bulk toolbar.
11. **Scope-denied toast via DOM event** — `forbiddenLink` mirrors
    `unauthorizedLink`: on `FORBIDDEN` mutations with cause code
    `WORKSPACE_PERMISSION`, dispatch `trpc:forbidden` and consume in a React
    listener that owns `t()`. Mutations only — no ghost toasts on background
    queries.

### i18n

12. **Bulk + scope-denied keys in en/fr/es/zh** — new `profile.json` keys:
    `team.bulkSelected_one/other`, `team.bulkApply`, `team.bulkDeselectAll`,
    `team.bulkLastOwnerTitle`, `team.bulkLastOwnerBody`,
    `team.toast.bulkRoleUpdated`, `team.toast.bulkRoleUpdateFailed`,
    `team.toast.scopeDenied`.

## Non-goals

- Cross-page bulk selection (select all matching across all pages). Current
  page only. If product needs this later, it's a new endpoint + a two-state
  selection model — out of scope here.
- Audit link from `RoleEditor` to the audit log. Audit log UI isn't ready;
  defer to its own PR.
- Plan-feature gating UI for custom roles — the backend already plan-gates
  custom-role assignment; we only show custom roles if the backend returns
  any (`workspace.role.list` returns empty for non-Enterprise).

## Test plan

- **Backend unit**: `workspace.role.builtins` returns exactly 4 rows; actor
  custom-role lock prevents concurrent `setPermissions` + `assignRole` from
  granting unauthorized permissions.
- **Frontend unit**: `useAssignRole` invalidates the right caches; the
  Select correctly routes built-in vs custom UUIDs.
- **E2E (Playwright)**: bulk-select 3 members → assign MEMBER → 3 rows
  reflect the new role on next render; bulk-demote OWNER (last-OWNER) shows
  the dialog and blocks.

## References

- Issue #99 — original PR-4.1 scope.
- `docs/plans/rbac.md` §9.4 — members & roles page UX.
- Reviews captured in the session that produced this plan: UX (floating bar
  pattern, last-OWNER asymmetry), Frontend (User[] type leak, builtin UUID
  gap, ID mismatch), Backend (one-endpoint design, missing builtins), Security
  (actor custom role lock, cause-code whitelist bug).
