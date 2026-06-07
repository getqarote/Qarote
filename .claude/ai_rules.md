# AI Rules — Qarote

Code conventions and engineering practices for every PR. Imported by the
root `CLAUDE.md`, so this content is always in context. Edit here, not there.

## Code Conventions

- **Commits**: Conventional Commits enforced by commitlint + Husky. Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`, `test`, `build`, `ci`, `revert`. Lowercase subject, no period, max 100 chars.
- **Formatting**: Prettier — double quotes, semicolons, 2-space indent, trailing commas (ES5), LF line endings.
- **Linting**: ESLint flat config per app. No `console.log` in production. `simple-import-sort` with strict group ordering. No `any`.
- **Styling**: Tailwind CSS 4 utility classes. Radix UI primitives wrapped as shadcn components. Avoid inline `style={{}}` — prefer Tailwind classes, including arbitrary values like `shadow-[0_0_0_24px_hsl(var(--background))]`. Inline style is acceptable only for values that genuinely cannot be expressed in Tailwind (runtime-computed transforms, dynamic chart dimensions, etc.).
- **Database**: Prisma schema at `apps/api/prisma/schema.prisma`. Generated client at `apps/api/src/generated/prisma`.

## Engineering Practices (non-negotiable)

These apply to every PR; consider them part of the definition of done.

### Scope discipline

- **No over-engineering, no over-optimization.** Implement what the plan says, nothing more.
- **Respect the agreed plan.** If a deviation feels necessary, surface it before writing code.
- **No legacy code management.** If something needs migration, migrate it all in the same PR — never leave the codebase half-converted.
- **Every function you create must be used.** Dead code is a liability; if you wrote it speculatively, delete it before opening the PR.

### Tooling

- **Prefer open-source libraries over custom code,** unless you can justify why the dep is the wrong fit (size, license, security, scope mismatch).
- **Never read `process.env` directly.** Always go through the `@/config` object (or the equivalent typed config surface). New env vars get added to the config schema first, then consumed.

### Review workflow

- **First pass: agent review per PR scope.** Backend changes → Backend Architect / Code Reviewer. Frontend changes → UX Architect, plus the `/critique` and `/delight` skills when relevant. Always review *before* requesting human review.
- **New frontend surfaces use the `/impeccable` craft pass** on first touch.
- **Existing frontend updates use `/critique` and `/delight`** to keep UX/UI improving rather than drifting.

### Testing

- **Add unit tests for new logic** with clear pass/fail boundaries (truth-table coverage where the logic gates on multiple booleans).
- **Add E2E tests for user-visible flows** (Playwright in `apps/e2e`) when the change crosses page or session boundaries.
- **Tests pin invariants, not implementation details.** Strict shape matches are correct when the shape itself is the invariant (e.g. system-created sentinel rows); loose matches elsewhere.

### Design principles (apply continuously, in roughly this order)

- **SOLID** — single responsibility, open/closed, Liskov, interface segregation, dependency inversion.
- **DRY** — but only after duplication is *actually* repeated 3+ times with the same meaning. Two similar lines is not a duplication problem.
- **KISS** — pick the simplest design that solves the problem. If the explanation is longer than the code, the code is probably too clever.
- **YAGNI** — don't build for hypothetical future requirements. The fifth test case can wait for the fifth bug.
- **SoC (Separation of Concerns)** — gate logic, command execution, observability, and audit live in distinct, named locations.
- **GRASP** — assign responsibilities to the object that has the data and the authority. Information Expert > Controller > Creator.
- **Law of Demeter** — talk to direct collaborators, not collaborators' collaborators. Avoid `a.b.c.d` chains across module boundaries.
- **Fail Fast** — short-circuit invalid states at the boundary. Don't propagate `undefined` deep into a happy path.
- **CQS (Command/Query Separation)** — queries return values without side-effects; commands mutate state and return minimal acknowledgment.
- **Composition over inheritance** — prefer assembling small typed pieces over extending a base class.
