# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- One-command update script (`./scripts/update.sh`) for self-hosted deployments
- Email notifications to Enterprise license holders when a new Qarote version is available (cloud-side)
- Update monitor worker for periodic version checks (cloud mode)
- Release management documentation (`docs/RELEASE_MANAGEMENT.md`)

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
