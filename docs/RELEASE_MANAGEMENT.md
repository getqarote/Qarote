# Release Management

## Versioning

Qarote follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

- **MAJOR**: Breaking changes (API changes, database schema changes requiring manual migration)
- **MINOR**: New features, backward-compatible
- **PATCH**: Bug fixes, minor improvements

The single source of truth for the current version is the `VERSION` file at the repository root.

## Creating a New Release

Releases are automated with [release-it](https://github.com/release-it/release-it). A single command handles version bumping, changelog generation, committing, tagging, and pushing.

### Quick Release

```bash
# Auto-detect version bump from conventional commits (feat: → minor, fix: → patch)
pnpm release

# Or specify the bump explicitly
pnpm release minor
pnpm release major
pnpm release patch

# Preview what would happen without making changes
pnpm release:dry
```

This will:

1. Bump the `VERSION` file
2. Generate changelog entries from conventional commits into `CHANGELOG.md`
3. Commit with message `release: v{VERSION}`
4. Tag with `v{VERSION}`
5. Push commit and tag to origin (triggers binary build + GitHub Release via CI)

### Pre-release (Beta)

```bash
pnpm release --preRelease=beta
```

This creates tags like `v1.2.0-beta.1`.

### Release Checklist

Before running `pnpm release`:

- [ ] All tests pass (`pnpm test`)
- [ ] Code builds successfully (`pnpm build`)
- [ ] Database migrations are included (if schema changed)
- [ ] Documentation is updated for new features

### Manual Release (alternative)

If you need to release manually without release-it:

1. Edit `VERSION` file: `echo "1.1.0" > VERSION`
2. Update `CHANGELOG.md` (move `[Unreleased]` to new version heading with date)
3. `git add VERSION CHANGELOG.md && git commit -m "release: v1.1.0"`
4. `git tag v1.1.0`
5. `git push origin main && git push origin v1.1.0`

## How Release Notifications Work

The **release notifier worker** runs in cloud mode (Dokku) and notifies self-hosted Enterprise license holders when a new version is available:

1. The worker checks every 24 hours
2. It reads the current deployed version from the `VERSION` file
3. It fetches the latest tag from the GitHub API (`https://api.github.com/repos/getqarote/Qarote/tags`)
4. If a newer version exists, it queries all active license holders from the database
5. It sends an update notification email to each license holder's email address
6. Each new version triggers only one round of notifications

The worker is scaled via `DOKKU_SCALE` (`release_notifier=1`) and defined in the `Procfile`.

Tag naming convention matters: tags **must** follow the `v{MAJOR}.{MINOR}.{PATCH}` format (e.g., `v1.2.3`) for the release notifier to parse them correctly.
