# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.0.0]

Qarote becomes agent-native. Connect any AI agent to your RabbitMQ estate over
the Model Context Protocol, let it read live broker state, and hand it a
diagnosis engine that explains incidents in plain language.

### Added

- **Agent surface over the Model Context Protocol (MCP)** — connect AI agents directly to Qarote
- Live-broker read tools for agents: `list_servers`, `list_queues`, `get_queue`, and more
- `explain_incident` — agent-driven root-cause analysis of RabbitMQ incidents (Enterprise)
- Machine API-key authentication for the agent surface
- Agent Access settings: mint, copy-once, list, and revoke API keys
- Official client support for Claude Desktop, Claude Code, Cline, GitHub Copilot, and Codex
- **Incident Diagnosis Engine** — config-lint rules for durability, queue bounds, file-descriptor limits, and more (Community)
- **AI Explain** — LLM-written root-cause narratives layered on diagnosis findings (Enterprise)
- Firehose Tracing — opt-in message-flow evidence that powers deeper diagnosis
- Alert lifecycle: acknowledge, snooze, and resolve
- Config-finding lifecycle: resolve and dismiss
- Agent-first landing page with a dedicated agent section

### Changed

- Reoriented the product around the agent model: the home screen is now an agent-first cockpit and primary navigation is streamlined
- Adopted the prototype design system as canon across the app, website, and portal (Space Grotesk + IBM Plex, carrot/paper/night palette)
- CE/EE split: incident diagnosis is free in Community; AI Explain and `explain_incident` are Enterprise
- Migrated metric and trace storage to TimescaleDB hypertables (30-day metrics, 7-day traces)
- Renamed Alerts to Notifications and hid the raw message browser behind Firehose Tracing

### Fixed

- Accessibility landmarks and missing select labels across the app
- Responsive layout polish across core screens

## [1.1.0] - 2026-04-24

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
