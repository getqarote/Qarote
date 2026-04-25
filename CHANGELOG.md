# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [2.0.0] - 2026-04-24

### Added

- New alert types: Memory Alarm, Disk Alarm, Dead Letter Queue messages, and No Consumers
- One-command update script (`./scripts/update.sh`) for self-hosted deployments
- Email notifications to Enterprise license holders when a new version is available (cloud-side)
- Release notifier worker for periodic version checks (cloud mode)
- Improved onboarding flow with success screen and sign-out step
- Blog section on landing page featuring RabbitMQ guides
- Status page link in README and website footer
- AI-powered code review workflow for pull requests

### Changed

- Consolidated toast notification system to Sonner
- Enforced CE/EE boundary on root router and workflows
- Updated PostgreSQL minimum requirement to v17

### Fixed

- Onboarding success screen and no-server empty state rendering
- Missing i18n keys (fr/es/zh) for new boolean alert types
- Accidental DROP INDEX in broker alarm migration
- English-only blog posts now filtered correctly on landing and compare pages
- Getting-started docs rendered directly at `/docs/` to avoid redirect loops

## [1.0.0] - 2026-02-06

### Added

- Initial release
- Real-time RabbitMQ monitoring dashboard
- Queue, exchange, virtual host, and connection management
- Message browsing and publishing
- Multi-server support
- Community and Enterprise deployment modes
- Docker Compose self-hosted deployment
- Email system with SMTP support
- License management for Enterprise edition
- Alert monitoring with email and Slack notifications
