# Release Management

## Versioning

Qarote follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

- **MAJOR**: Breaking changes (API changes, database schema changes requiring manual migration)
- **MINOR**: New features, backward-compatible
- **PATCH**: Bug fixes, minor improvements

The single source of truth for the current version is the `VERSION` file at the repository root.

## Creating a New Release

### 1. Bump the version

Edit the `VERSION` file at the repo root:

```bash
echo "1.1.0" > VERSION
```

### 2. Update the changelog

Move the `[Unreleased]` section in `CHANGELOG.md` under the new version heading with today's date:

```markdown
## [1.1.0] - 2026-02-10
```

### 3. Commit the version bump

```bash
git add VERSION CHANGELOG.md
git commit -m "release: v1.1.0"
```

### 4. Tag the commit

```bash
git tag v1.1.0
```

### 5. Push the commit and tag

```bash
git push origin main
git push origin v1.1.0
```

### 6. Create a GitHub Release

```bash
gh release create v1.1.0 --title "v1.1.0" --notes "Release notes here"
```

Or create the release through the GitHub web UI at https://github.com/getqarote/Qarote/releases/new.

## Release Checklist

Before creating a release:

- [ ] All tests pass (`pnpm test`)
- [ ] Code builds successfully (`pnpm build`)
- [ ] `VERSION` file is updated
- [ ] `CHANGELOG.md` is updated (move `[Unreleased]` to new version heading)
- [ ] Database migrations are included (if schema changed)
- [ ] Documentation is updated for new features
- [ ] Commit is tagged with `v{VERSION}` format
- [ ] GitHub release is published

## How Update Notifications Work

The **update monitor worker** runs in cloud mode (Dokku) and notifies self-hosted Enterprise license holders when a new version is available:

1. The worker checks every 24 hours
2. It reads the current deployed version from the `VERSION` file
3. It fetches the latest tag from the GitHub API (`https://api.github.com/repos/getqarote/Qarote/tags`)
4. If a newer version exists, it queries all active license holders from the database
5. It sends an update notification email to each license holder's email address
6. Each new version triggers only one round of notifications

The worker is scaled via `DOKKU_SCALE` (`update_worker=1`) and defined in the `Procfile`.

Tag naming convention matters: tags **must** follow the `v{MAJOR}.{MINOR}.{PATCH}` format (e.g., `v1.2.3`) for the update checker to parse them correctly.
