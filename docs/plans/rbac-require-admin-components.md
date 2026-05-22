# RBAC — `<RequireWorkspaceAdmin>` & `<RequireOrgAdmin>` guard components

**Status:** Plan v3 (post-review by Frontend Developer, UX Researcher, UI Designer, Whimsy Injector)
**Owner:** frontend
**Tracks:** `rbac.md` §1 point 5 ("Frontend ad hoc checks") cleanup
**Branch base:** `main` (post-`refactor/drop-legacy-user-role` merge, at `d24a5aaf`)

---

## 1. Why this exists

`rbac.md §1` lists "Frontend ad hoc checks" as one of the four structural
problems the redesign targets: every page rolls its own admin gate, half
read the wrong authority (global `User.role` instead of workspace role),
and none distinguish *loading* from *denied*.

The post-Phase-3 code base still has the loading-vs-denied half of that
bug. `useIsWorkspaceAdmin()` and `useCurrentOrganization()` return three
states (`null|undefined` while loading, `true`, `false`), but every
full-page-guard call site collapses them with `!isAdmin` — producing the
"redirect-while-loading" / "access-denied flash" pattern on hard refresh.

Two RBAC scopes are conflated by the same antipattern:

- **Workspace scope** (`useIsWorkspaceAdmin`) — gates page-level views
  whose authority is workspace membership. Used wrong on 4 pages.
- **Org scope** (`useCurrentOrganization().role`) — gates instance/org
  config (SMTP relay, license activation). Tri-state was correctly
  threaded inline on 2 sites in commits `4333f934` / `28538f5b`, but the
  pattern is now duplicated rather than reusable.

This plan introduces two sibling guard components that codify the
loading/allowed/denied contract per scope, a parallel hook for the org
scope, and a shared `<EmptyState>` primitive that finally gives every
guard state in the app a consistent visual treatment.

## 2. Non-goals

- **Not** introducing route-level guards in `App.tsx`. Guards stay
  co-located in page components.
- **Not** unifying workspace and org authority into a single component.
  Distinct scopes by design (`rbac.md §1`, §2.3).
- **Not** migrating conditional-UI sites (button enable/disable). Those
  use `=== true` and have no flicker bug. Out of scope until Phase 2
  `usePermission(key)` migration.
- **Not** touching backend authorization.
- **Not** handling transient role-query `isError` states. Documented as
  known failure mode in §5.3.
- **Not** adding "still loading…" escalation. UX fast-follow.
- **Not** retiring `FullPageAlert` in this PR. The 2 remaining callers
  (`selectServer`, `notFound`) get their own `<NotFoundCard>` /
  `<NoServerSelectedCard>` wrappers in a fast-follow PR built on the
  same `<EmptyState>` primitive introduced here.

## 3. Inventory — actual call sites today

Verified against `main` at `d24a5aaf` (rebased 2026-05-12).

### 3.1 Workspace-admin full-page guards — the bug

| File | Current shape | Status |
|---|---|---|
| `apps/app/src/pages/VHostsPage.tsx:124` | `isAdmin === null → skeleton`, `!isAdmin → FullPageAlert` | already fixed inline in this branch — folded into the component migration |
| `apps/app/src/pages/UserDetailsPage.tsx:193` | same | same |
| `apps/app/src/pages/UsersPage.tsx:155` | `if (!isAdmin) → FullPageAlert` | **still buggy** |
| `apps/app/src/pages/VHostDetailsPage.tsx:259` | `if (!isAdmin) → FullPageAlert` | **still buggy** |

All four migrate to `<RequireWorkspaceAdmin>`. The two already-fixed
sites drop their inline tri-state branches so the logic lives in one
place.

### 3.2 Org-admin full-page guards — the bug, current workaround is inline tri-state

| File | Current shape | Status |
|---|---|---|
| `apps/app/src/pages/settings/SMTPSection.tsx:45` | inline `isOrgLoading`/`isAdmin === undefined` tri-state with `<Navigate />` on denial | flicker-free but bespoke; **denial UX changes** (§4.5) |
| `apps/app/src/pages/settings/LicenseSection.tsx:29` | same | same |

Both migrate to `<RequireOrgAdmin>`. **The redirect-on-denial is
removed** — see §4.5 for the standardized denied UX.

### 3.3 Verified out-of-scope — conditional UI (`=== true`, no flicker)

Confirmed by inspection: each uses `useIsWorkspaceAdmin() === true` (or
the equivalent org pattern) to gate buttons/sidebar items. No full-page
redirect or alert. Listed so reviewers don't expect them in the diff:

- `apps/app/src/components/AppSidebar.tsx:325`
- `apps/app/src/components/settings/SettingsSidebar.tsx:172`
- `apps/app/src/components/profile/PlansSummaryTab.tsx:96`
- `apps/app/src/pages/Index.tsx:43`
- `apps/app/src/pages/Policies.tsx:28`
- `apps/app/src/pages/Exchanges.tsx:32`
- `apps/app/src/pages/Alerts.tsx:45`
- `apps/app/src/pages/Queues.tsx:30`
- `apps/app/src/pages/QueueDetail.tsx:68`
- `apps/app/src/pages/Nodes.tsx:37` (org-role, conditional)
- `apps/app/src/pages/settings/WorkspaceSection.tsx:51`
- `apps/app/src/pages/settings/OrganizationSection.tsx:49`
- `apps/app/src/pages/settings/SSOSection.tsx:24`

Migrate to `usePermission(key)` when Phase 2 lands.

### 3.4 `FullPageAlert` non-admin call sites (out of scope for this PR)

`apps/app/src/components/PageShell.tsx` exports `FullPageAlert`. Beyond
the 4 admin denials migrating away in this PR, two semantic states
remain:

- `selectServer` — `VHostDetailsPage.tsx:270`, `UserDetailsPage.tsx:215`
- `notFound` — `VHostDetailsPage.tsx:299`, `UserDetailsPage.tsx:245`

Both deserve the same empty-state treatment as the denied case. Tracked
as fast-follow: introduce `<NotFoundCard>` and `<NoServerSelectedCard>`
(the latter partially exists in `PageShell.tsx`) as wrappers around the
`<EmptyState>` primitive shipped here, then delete `FullPageAlert`.

## 4. Design

### 4.1 New primitive — `<EmptyState>`

Lives in `apps/app/src/components/ui/empty-state.tsx` (kebab-case
matching `password-input.tsx`, `feature-badge.tsx`). shadcn-style
primitive — no business logic, no i18n, four content slots.

```tsx
interface EmptyStateProps {
  icon: LucideIcon;                  // 64px muted
  title: string;                     // h2, text-2xl font-semibold
  description?: string;              // text-muted-foreground, max-w-md
  action?: React.ReactNode;          // typically a <Button>; caller-built so onClick/asChild work
  className?: string;                // escape hatch for layout edge cases
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("mx-auto max-w-lg", className)}>
      <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
        <Icon className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-2xl font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
        {action && <div className="pt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}
```

Why a primitive, not a per-state component:

- The three current guard states (denied, not-found, no-server-selected)
  and any future ones (rate-limited, plan-downgraded, license-expired)
  share *structure*. Variation is purely content. Textbook case for a
  primitive with content slots.
- Visual consistency enforced by the primitive, not by reviewer
  discipline. One place to fix spacing/typography.
- Matches recognized patterns: Primer `<Blankslate>`, Geist
  `<EmptyState>`, shadcn recipes.

### 4.2 Named wrapper — `<PermissionDeniedCard>`

`apps/app/src/components/rbac/PermissionDeniedCard.tsx`. Thin semantic
wrapper that configures `<EmptyState>` for the denied case. Owns the
icon choice (`ShieldOff`) and the CTA-destination convention.

```tsx
interface Props {
  /** i18n namespace + key prefix for title/description (e.g. "users", "settings:smtp"). */
  scope: string;
  /** Where the CTA sends the user. Workspace pages → "/", settings → "/settings/profile". */
  returnTo: string;
  /** Override the CTA label namespace if needed. Defaults to common. */
  ctaLabel?: string;
}

export function PermissionDeniedCard({
  scope,
  returnTo,
  ctaLabel,
}: Props) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={ShieldOff}
      title={t(`${scope}.accessDeniedTitle`)}
      description={t(`${scope}.accessDenied`)}
      action={
        <Button asChild>
          <Link to={returnTo}>{t(ctaLabel ?? "common:backToDashboard")}</Link>
        </Button>
      }
    />
  );
}
```

**Decisions:**

- `Button` default variant, not `destructive`. Red implies error or
  danger; role demotion is neither. The empty-state Card with a muted
  icon reads "this isn't for you" without alarm — correct tone.
- Icon: `ShieldOff` from lucide. `Lock` evaluated and rejected — locks
  imply "key required", which suggests there's a way in. `ShieldOff`
  reads "protection withdrawn from you" which is more accurate.
- `scope` prop drives i18n lookups instead of taking `title` /
  `description` strings directly. Keeps copy decisions in the locale
  files, not the call sites.

### 4.3 New hook — `useIsOrgAdmin`

Append to `apps/app/src/hooks/queries/useOrganization.ts`.

```ts
/**
 * Returns `true` if the current user is OWNER or ADMIN of their
 * organization, `null` while loading, `false` otherwise (including
 * unauthenticated, no org, or unknown role).
 *
 * Mirrors the tri-state convention of `useIsWorkspaceAdmin`. Note the
 * `enabled` asymmetry: `useCurrentOrganization` is gated by
 * `isAuthenticated` only (no resource id), so the unauthenticated +
 * still-mounting window resolves to `false` here, whereas the
 * workspace hook additionally waits on a `workspaceId`. Safe for the
 * routes we guard (all auth-gated), but worth knowing.
 *
 * Use for ORG-scope UI gates (license, SMTP relay, billing). For
 * workspace scope prefer `useIsWorkspaceAdmin`.
 */
export function useIsOrgAdmin(): boolean | null {
  const { data, isLoading } = useCurrentOrganization();
  if (isLoading) return null;
  if (!data?.role) return false;
  return data.role === "OWNER" || data.role === "ADMIN";
}
```

### 4.4 Guard components — committed API

Co-located in `apps/app/src/components/rbac/`. Same prop shape for both
components; only the consulted hook differs.

```text
apps/app/src/components/rbac/
  RequireWorkspaceAdmin.tsx
  RequireOrgAdmin.tsx
  PermissionDeniedCard.tsx
  index.ts                 // barrel
```

```ts
interface Props {
  children: React.ReactNode;
  /**
   * Required. Shown while the role query is in flight
   * (`isAdmin === null`). Pass the page-specific LoadingSkeleton so
   * the loading→loaded transition is visually continuous. No default
   * is provided — the 6 call sites in this PR all have a page-specific
   * skeleton, and a generic default would silently mis-render on a 7th
   * page added later.
   */
  loadingFallback: React.ReactNode;
  /**
   * Shown when the role query resolves to a non-admin
   * (`isAdmin === false`). All 6 call sites in this PR pass a
   * `<PermissionDeniedCard>` so demoted users see why they're blocked
   * (see §4.5). Defaults to `null` for forward-compat (a Phase 2
   * `<RequirePermission>` may want a different denied surface).
   */
  deniedFallback?: React.ReactNode;
  /**
   * If set, denial triggers `<Navigate to={redirectTo} replace />`
   * INSTEAD OF rendering `deniedFallback`. Kept in the API for
   * future use cases — NO call site in this PR uses it. The product
   * standard for permission denial is "stay on the URL, explain why"
   * (§4.5).
   */
  redirectTo?: string;
}
```

**Precedence:** if both `redirectTo` and `deniedFallback` are set, the
redirect wins. Documented in JSDoc; unit-tested in §4.7.

**Component body** owns the a11y attributes — callers don't think about
them:

```tsx
if (isAdmin === null) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      {loadingFallback}
      <span className="sr-only">{t("common:loadingPermissions")}</span>
    </div>
  );
}
if (!isAdmin) {
  return redirectTo
    ? <Navigate to={redirectTo} replace />
    : <>{deniedFallback}</>;
}
return <>{children}</>;
```

**Decisions worth defending:**

- `loadingFallback` is **required** (TS non-optional). Removes the
  footgun of a default skeleton that doesn't match the page footprint
  and creates a fresh flicker.
- Props stay structurally typed (not a discriminated union over
  `redirectTo | deniedFallback`). The runtime precedence rule is easier
  to read at call sites than a tagged union.
- No baked-in `isSelfHostedMode()` check. SMTP/License keep their sync
  self-hosted guard *before* mounting `<RequireOrgAdmin>`. Single
  responsibility.
- No `usePermission(key)` here. When Phase 2 lands, add a sibling
  `<RequirePermission perm="...">`. Today's `OWNER|ADMIN` bundle maps
  cleanly to the four built-in roles.

### 4.5 Denied UX — standardized empty-state with CTA

**Decision:** all 6 call sites pass `deniedFallback={<PermissionDeniedCard … />}`;
none use `redirectTo`. Rationale (UX review): an admin demoted while
deep-linking `/settings/smtp` from a runbook deserves to know *why* they
landed somewhere unexpected. Silent redirect strips that context.

This **changes** the current SMTP/License behaviour (today they
`<Navigate to="/settings/profile" replace />`). Worth calling out in
the PR description — it walks back a deliberate choice from commit
`4333f934`. The new behaviour is more explicit: stay on the URL,
explain the loss of access, offer a CTA out.

**CTA destination & label convention:**

- Workspace pages (VHosts, Users, UserDetails, VHostDetails) →
  `returnTo="/"`, label `common:backToDashboard` ("Back to dashboard").
- Settings pages (SMTP, License) → `returnTo="/settings/profile"`,
  label `common:backToSettings` ("Back to your settings"). The
  destination is a settings page, not a dashboard — using the workspace
  label here is mildly dishonest. Two labels × four locales = eight
  string additions; cheap.

**CTA copy tone (per Whimsy review):** dry, developer-peer voice. Not
neutral-bureaucratic, not cute. The CTA is a forward-motion exit, not
an error apology.

Per-namespace i18n keys to add (en/fr/es/zh):

| Key | Location | English copy |
|---|---|---|
| `users.accessDeniedTitle` | `users.json` | "Admin access required" |
| `users.accessDenied` | exists, reword | "Managing users in this workspace is reserved for admins. You'll need an admin to grant you access." |
| `vhosts.accessDeniedTitle` | `vhosts.json` | "Admin access required" |
| `vhosts.accessDenied` | exists, reword | "Managing virtual hosts is reserved for admins. You'll need an admin to grant you access." |
| `settings.smtpAccessDeniedTitle` | `settings.json` | "Organization admin required" |
| `settings.smtpAccessDenied` | `settings.json` | "SMTP relay configuration is reserved for organization admins." |
| `settings.licenseAccessDeniedTitle` | `settings.json` | "Organization admin required" |
| `settings.licenseAccessDenied` | `settings.json` | "License management is reserved for organization admins." |
| `common:backToDashboard` | `common.json` | "Back to dashboard" (workspace pages) |
| `common:backToSettings` | `common.json` | "Back to your settings" (settings pages) |
| `common:loadingPermissions` | `common.json` | "Checking permissions…" (sr-only) |

**Translator note** (add as a JSON-adjacent code comment or `_comment`
key in each locale): the workspace `accessDenied` strings include "ask
an admin" forward-pointing copy, while the settings ones don't. This
asymmetry is intentional — workspace gates are commonly hit by team
members who need a path to unblock; org-admin gates are reached by
people who already know who runs the org, where "ask an admin" reads
condescending. Do not "normalize" the two variants.

Exact copy reviewable in the PR; the table is a starting point. Whimsy
review explicitly said: **no personality on the body or title** — only
the CTA label has license to warm up. Title and description stay
factual and respectful.

### 4.6 Call-site migrations — exact shape

**Workspace pages** (`VHostsPage.tsx`, `UsersPage.tsx`,
`UserDetailsPage.tsx`, `VHostDetailsPage.tsx`):

```tsx
return (
  <RequireWorkspaceAdmin
    loadingFallback={<PageShell><LoadingSkeleton /></PageShell>}
    deniedFallback={
      <PageShell>
        <PermissionDeniedCard scope="users" returnTo="/" />
      </PageShell>
    }
  >
    {/* existing body */}
  </RequireWorkspaceAdmin>
);
```

`scope` value per page: `"users"` (Users, UserDetails), `"vhosts"`
(VHosts, VHostDetails).

**Settings pages** (`SMTPSection.tsx`, `LicenseSection.tsx`):

```tsx
if (!isSelfHostedMode()) {
  // Sync check, no role lookup needed — keep redirect for cloud users
  return <Navigate to="/settings/profile" replace />;
}

return (
  <RequireOrgAdmin
    loadingFallback={<SMTPLoadingSkeleton />}
    deniedFallback={
      <PermissionDeniedCard
        scope="settings:smtp"  // → settings.smtpAccessDeniedTitle, etc.
        returnTo="/settings/profile"
      />
    }
  >
    <SMTPSectionBody />
  </RequireOrgAdmin>
);
```

**§4.5 §5.2 resolution:** the `useSelfhostedSmtpSettings({ enabled:
isAdmin === true })` call moves into a new `<SMTPSectionBody>` child
that only mounts when the guard allows through. Inside the child,
`enabled: true` unconditionally — its mere existence proves admin. Same
refactor for `<LicenseSectionBody>`. Deletes the last `useIsOrgAdmin()`
read in the parent.

The sync `isSelfHostedMode()` check stays outside the guard because it
needs to fire even when role data hasn't loaded — cloud users redirect
immediately, not after a role-query roundtrip.

### 4.7 Skeleton consistency — fix mismatches in this PR

Decision (per user): always use the page-specific `LoadingSkeleton`.
Force visual consistency. If a skeleton's dimensions don't match the
loaded content, **fix the skeleton in this PR**, don't fall back to a
spinner.

Required visual QA per migrated page:

- Open in dev server as a real admin under Chrome DevTools "Slow 3G".
- Confirm the skeleton footprint matches the loaded content roughly
  (rows, header heights, sidebar). No vertical jump at hand-off.
- Pages flagged for adjustment if needed:
  - `UsersPage` — verify `components/UserList/LoadingSkeleton.tsx` (if it
    exists) or add one matching the users table.
  - `VHostDetailsPage` — verify the vhost-detail loading skeleton
    matches the resource panel layout.
- `LicenseSection` and `SMTPSection` already have working skeletons
  (`LicenseLoadingSkeleton`, `SMTPLoadingSkeleton`).
- **Settings-pane fit:** `<PermissionDeniedCard>` renders inside the
  settings layout's right pane, next to a tall sidebar. The default
  `mx-auto max-w-lg` Card may look orphaned if the pane has no
  min-height. Confirm visually that the denied state doesn't read as
  "the tab broke" — add `min-h-[60vh]` or a flex-center wrapper around
  the Card in settings pages if needed.

If any page lacks a skeleton entirely (e.g. `UsersPage` may not have
one), the migration adds one — explicitly as part of this PR, not a
follow-up.

### 4.8 Accessibility

- The guard component wraps `loadingFallback` in
  `<div role="status" aria-busy="true" aria-live="polite">` with an
  `sr-only` "Checking permissions…" string. Callers don't add these
  attributes themselves.
- `<EmptyState>` icon has `aria-hidden="true"` — title is the
  accessible name.
- `<PermissionDeniedCard>` uses a real `<h2>` for the title so screen
  readers announce hierarchy on landing.
- No `<Navigate replace />` on denial — denial keeps the URL stable so
  AT users (and sighted users with browser history reflexes) understand
  the state change.

### 4.9 Tests

**Unit (shipped in commit 2 alongside the primitive, commit 3 with the
guards):**

- `EmptyState.test.tsx`:
  - renders title, description, icon (by `aria-hidden`-friendly probe), action when passed.
  - description and action optional — renders without them.
- `PermissionDeniedCard.test.tsx`:
  - i18n lookup uses the `scope` prop.
  - CTA links to `returnTo`.
- `RequireWorkspaceAdmin.test.tsx` / `RequireOrgAdmin.test.tsx`:
  - hook returns `null` → `loadingFallback` rendered, children not
    mounted, wrapper has `role="status"` / `aria-busy="true"` /
    `aria-live="polite"`.
  - hook returns `false` + no `redirectTo` + no `deniedFallback` →
    `null` rendered, children not mounted.
  - hook returns `false` + `deniedFallback` only → fallback rendered, no
    `<Navigate>` emitted.
  - hook returns `false` + `redirectTo` only → `<Navigate>` with
    `replace`.
  - hook returns `false` + **both** `redirectTo` and `deniedFallback` →
    `<Navigate>` wins, fallback NOT rendered.
  - hook returns `true` → children mounted.
  - **Re-render stability:** hook flips `null → true` → children mount
    exactly once (guards against double-mount of side-effectful
    children, e.g. the SMTP settings query in `<SMTPSectionBody>`).
- `useIsOrgAdmin.test.ts`: covers `isLoading → null`,
  `data === undefined → false`, `role === "OWNER" → true`,
  `role === "ADMIN" → true`, `role === "MEMBER" → false`.

**Page-level (shipped with each migration commit):**

For each of the 6 migrated files: the existing access-denied test is
extended to assert that during the loading window the skeleton is
rendered (not the empty-state Card). Re-uses fixtures from PR #97 / #102.

**E2E (shipped in the final commit):**

`apps/e2e/tests/rbac-admin-loading.spec.ts`:

- Hard-reload `/users` as an admin with 2s throttle on
  `workspace.core.getMyRole`. Assert:
  - No `PermissionDeniedCard` heading in DOM before the table renders.
  - Loading wrapper has `role="status"` and `aria-busy="true"`.
- Hard-reload `/settings/smtp` as a non-org-admin. Assert:
  - URL stays on `/settings/smtp` throughout (no redirect).
  - `PermissionDeniedCard` renders with the "Back to dashboard" CTA
    linking to `/settings/profile`.
  - CTA click navigates to `/settings/profile`.

## 5. Risks & open questions

### 5.1 Org-role authority during workspace ownership transfer

`rbac.md §2.2` permits temporarily multiple OWNERs during ownership
transfer. Org-role check is unaffected (org scope, not workspace).
Smoke-test as part of the migration PR.

### 5.2 — resolved (was: SMTP settings query placement)

Resolved in §4.6: extract `<SMTPSectionBody>` / `<LicenseSectionBody>`
children that own the settings query. Parent has zero role reads beyond
what the guard performs.

### 5.3 Transient role-query errors (`isError: true`)

Today a network blip during a role refetch resolves to `isAdmin ===
false` and shows the denied card. **Not fixed in this PR.** Tracked as
fast-follow: hooks should expose `isError`, components should treat
`error` as a fourth state (retain previous state + toast, or escalate
to a retry surface). Documented in the PR description.

### 5.4 Slow network — unbounded skeleton

If the role query takes >5s, the user stares at a skeleton with no
progress hint. UX fast-follow: skeleton → "Still checking permissions…"
at 2s → retry at 8s. Out of scope; acceptance criteria notes the
failure mode.

### 5.5 `<RequireOrgAdmin>` long-term location

`components/rbac/` (not `components/org/`): when permissions ship,
`<RequirePermission>` joins as a sibling and the directory stays
coherent.

### 5.6 `<EmptyState>` placement in shadcn folder

Goes under `components/ui/` because it's a UI primitive with no business
semantics, matching shadcn convention. The `rbac/` folder gets the
opinionated wrapper (`<PermissionDeniedCard>`) that bundles
icon-choice + scope-driven i18n + CTA convention.

## 6. PR plan

Single PR. Commit order designed for clean bisect (each commit
type-checks, lints, passes tests independently).

**Title:** `refactor(rbac): introduce <RequireWorkspaceAdmin> /
<RequireOrgAdmin> guards with EmptyState primitive`

**Commits:**

1. `feat(ui): add EmptyState primitive` — shared empty-state Card with
   icon/title/description/action slots + unit tests. No callers yet.
2. `feat(rbac): add useIsOrgAdmin hook` — hook + its unit test. Mirrors
   `useIsWorkspaceAdmin`'s tri-state contract.
3. `feat(rbac): introduce RequireWorkspaceAdmin / RequireOrgAdmin
   guards + PermissionDeniedCard` — three components + tests + i18n
   keys (`accessDeniedTitle`, reworded `accessDenied`, `backToDashboard`,
   `loadingPermissions`) in all four locales (en/fr/es/zh).
4. `refactor(rbac): migrate workspace-admin pages to
   RequireWorkspaceAdmin` — VHosts, UserDetails, Users, VHostDetails.
   Adds skeletons to pages that lacked one (§4.7). Updates each page's
   existing tests to assert loading→skeleton.
5. `refactor(rbac): migrate SMTPSection / LicenseSection to
   RequireOrgAdmin` — extracts `<SMTPSectionBody>` /
   `<LicenseSectionBody>`. Inline-empty-state replaces prior redirect
   (§4.5). Updates each page's tests.
6. `test(e2e): rbac admin loading + denied state — no flicker, no
   redirect` — throttled-network spec covering `/users` and
   `/settings/smtp`.

## 7. Acceptance criteria

- No callsite reads `useIsWorkspaceAdmin` / `useCurrentOrganization`
  for a full-page admin gate outside the two guard components.
- Hard reload of `/users`, `/users/:username`, `/vhosts/:server`,
  `/vhosts/:server/:vhost`, `/settings/smtp`, `/settings/license` as
  the appropriate admin under throttled network shows the skeleton or
  the page — never the empty-state Card, never a redirect.
- Non-admin loads of those same routes show a `<PermissionDeniedCard>`
  with a "Back to dashboard" CTA — never a silent redirect.
- Loading wrappers expose `role="status"`, `aria-busy="true"`,
  `aria-live="polite"`; E2E asserts these on the user-facing routes.
- `<EmptyState>` is the single source of truth for full-page empty
  states. `<PermissionDeniedCard>` is the first wrapper built on it;
  `<NotFoundCard>` and `<NoServerSelectedCard>` follow in a fast-follow
  PR that retires `FullPageAlert`.
- Skeleton dimensions match loaded content on all 6 pages — verified
  visually under throttled network, fixed in-PR if any mismatch.
- Type-check, lint, unit tests, and E2E suite green. Pre-existing 7
  ESLint warnings unchanged.
- `rbac.md §1` point 5 ("Frontend ad hoc checks") can be marked
  resolved for full-page admin gates. Conditional-UI sites tracked
  separately for the Phase 2 permissions migration.
- Known failure modes (§5.3 transient error, §5.4 slow network) are
  documented in the PR description with linked follow-up issues.
