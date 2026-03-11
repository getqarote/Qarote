# Qarote - Project Documentation Index

**Generated:** 2026-01-30  
**Last Updated:** 2026-01-30  
**Repository Type:** Monorepo with 4 parts

## Project Overview

- **Name:** Qarote
- **Description:** Modern RabbitMQ monitoring and management platform
- **License:** MIT
- **Repository:** https://github.com/LaGriffe/rabbit-dash-board

### Quick Reference

| Part | Type | Tech Stack | Root Path |
|------|------|------------|-----------|
| **API** | Backend | Hono.js 4, tRPC 11, Prisma 6, PostgreSQL | `apps/api/` |
| **App** | Frontend | React 18, Vite 7, Tailwind 3, shadcn/ui | `apps/app/` |
| **Web** | Frontend | React 18, Vite 7, Tailwind 3 | `apps/web/` |
| **Portal** | Frontend | React 18, Vite 7, tRPC Client | `apps/portal/` |

**Primary Language:** TypeScript 5.9  
**Package Manager:** pnpm 9.0  
**Build System:** Turborepo 2.7  
**Architecture:** Service-oriented backend with component-based frontends

---

## Generated Documentation

### Project-Level Documentation

- **[Project Overview](./project-overview.md)** - Executive summary, purpose, and business model
- **[Source Tree Analysis](./source-tree-analysis.md)** - Complete annotated directory structure
- **[Integration Architecture](./integration-architecture.md)** - How parts communicate
- **[Development Guide](./development-guide.md)** - Setup, workflow, and conventions
- **[Deployment Guide](./deployment-guide.md)** - Deployment strategies and CI/CD

---

### Part 1: API Backend Documentation

- **[Architecture - API](./architecture-api.md)** - Technical architecture and design
- **[API Contracts](./api-contracts-api.md)** - tRPC endpoints and integration points
- **[Data Models](./data-models-api.md)** - PostgreSQL schema (21 models)
- **[Alerts Notification Workflow](./alerts-notification-workflow.md)** - Alert monitoring, tracking, deduplication, and multi-channel notifications

**Key Information:**
- **Framework:** Hono.js with tRPC for type-safe APIs
- **Database:** PostgreSQL via Prisma ORM
- **Entry Points:** `src/index.ts` (main), `src/workers/alert-monitor.ts` (worker)
- **Routers:** 10 main routers with 40+ sub-routers
- **Services:** alerts, email, license, stripe, slack, webhook

---

### Part 2: App Dashboard Documentation

- **[Architecture - App](./architecture-app.md)** - Frontend architecture and patterns
- **[Component Inventory](./component-inventory-app.md)** - 50+ components and pages
- **[State Management](./state-management-app.md)** - React contexts and React Query

**Key Information:**
- **Type:** React SPA with real-time monitoring
- **Entry Point:** `src/main.tsx`
- **Pages:** 25 route components
- **Contexts:** 6 React contexts (Auth, User, Workspace, Server, VHost, Theme)
- **State:** TanStack Query for server state with polling

---

### Part 3: Landing Page Documentation

- **[Architecture - Web](./architecture-web.md)** - Marketing site architecture
- **[Component Inventory](./component-inventory-web.md)** - Marketing components and pages

**Key Information:**
- **Type:** Performance-optimized marketing SPA
- **Entry Point:** `src/main.tsx`
- **Pages:** 4 (Index eager, others lazy loaded)
- **Performance:** Code splitting, deferred scripts, WebP images
- **SEO:** React Helmet, sitemap, robots.txt

---

### Part 4: Customer Portal Documentation

- **[Architecture - Portal](./architecture-portal.md)** - Portal architecture
- **[Component Inventory](./component-inventory-portal.md)** - Authentication and license UI

**Key Information:**
- **Type:** License management SPA
- **Entry Point:** `src/main.tsx`
- **Pages:** 6 (Login, Sign Up, Licenses, Purchase, Downloads, Settings)
- **Focus:** Authentication with password requirements, Google OAuth
- **State:** Minimal (AuthContext + React Query)

---

## Existing Documentation

### Root Documentation
- [README.md](../README.md) - Project README (if exists)
- [SECURITY.md](../SECURITY.md) - Security policy
- [LICENSE](../LICENSE) - MIT License

### Docs Folder (Existing)
- [README.md](./README.md) - Documentation navigation
- [COMMUNITY_EDITION.md](./COMMUNITY_EDITION.md) - Community Edition guide
- [ENTERPRISE_EDITION.md](./ENTERPRISE_EDITION.md) - Enterprise Edition guide
- [FEATURE_COMPARISON.md](./FEATURE_COMPARISON.md) - Feature comparison matrix
- [SELF_HOSTED_DEPLOYMENT.md](./SELF_HOSTED_DEPLOYMENT.md) - Self-hosting guide
- [ACT_TESTING.md](./ACT_TESTING.md) - GitHub Actions local testing

### Application READMEs
- [apps/api/README.md](../apps/api/README.md) - Backend API documentation
- [apps/app/README.md](../apps/app/README.md) - Dashboard documentation
- [apps/web/README.md](../apps/web/README.md) - Landing page documentation
- [apps/portal/README.md](../apps/portal/README.md) - Portal documentation

### Cursor Rules
Located in `.cursor/rules/`:
- `import-ordering.mdc` - Import organization rules
- `react-imports.mdc` - React import best practices
- `tailwind-css.mdc` - Styling conventions
- `react-apps.mdc` - React app rules
- `when-to-create-rules.mdc` - Rule creation guidance

---

## Getting Started

### For New Developers

1. **Start here:** [Project Overview](./project-overview.md)
2. **Setup development:** [Development Guide](./development-guide.md)
3. **Understand architecture:** [Source Tree Analysis](./source-tree-analysis.md)
4. **Learn the API:** [API Contracts](./api-contracts-api.md)
5. **Explore components:** Component inventory docs

### For Feature Development

1. **Understand requirements:** Review feature specifications
2. **Check relevant architecture:** 
   - Backend feature → [Architecture - API](./architecture-api.md)
   - Frontend feature → [Architecture - App](./architecture-app.md)
   - Full-stack → Both + [Integration Architecture](./integration-architecture.md)
3. **Review data models:** [Data Models](./data-models-api.md)
4. **Check API contracts:** [API Contracts](./api-contracts-api.md)
5. **Follow development guide:** [Development Guide](./development-guide.md)

### For AI-Assisted Development

When using AI tools (Cursor, GitHub Copilot, etc.):

1. **Reference this index** as the starting point
2. **Point to specific docs** based on task:
   - API changes → API architecture + API contracts + data models
   - UI changes → App architecture + component inventory + state management
   - Integration changes → Integration architecture
3. **Follow Cursor rules** in `.cursor/rules/`

---

## Documentation Maintenance

### When to Update This Documentation

- **After major features:** Update relevant architecture and component docs
- **After refactoring:** Update architecture if patterns change
- **After dependency updates:** Update tech stack versions
- **Quarterly:** Full documentation review and refresh

### Regenerating Documentation

To regenerate this documentation:

```bash
/bmad-bmm-document-project
```

Select option 1 for full rescan or option 2 for deep-dive into specific areas.

---

## Project Statistics

**Repository:**
- **Total Files:** 562 files across all apps
- **Lines of Code:** ~50,000+ (estimated)
- **Languages:** TypeScript (primary), SQL (migrations), CSS (Tailwind)

**Backend (API):**
- **Source Files:** 126 files (71 *.ts, 46 *.sql)
- **tRPC Routers:** 40 router files
- **Services:** 8 service domains
- **Database Models:** 21 Prisma models

**Frontend (App):**
- **Source Files:** 268 files (183 *.tsx, 66 *.ts)
- **Pages:** 25 route components
- **Components:** 50+ feature components
- **Contexts:** 6 React contexts
- **Custom Hooks:** 20+ hooks

**Frontend (Web):**
- **Source Files:** 105 files (61 *.tsx, 11 *.ts)
- **Pages:** 4 route components
- **Components:** ~55 total (marketing + shadcn/ui)

**Frontend (Portal):**
- **Source Files:** 54 files (22 *.tsx, 11 *.ts)
- **Pages:** 6 route components
- **Components:** Minimal focused set

---

## Quick Links

### Development
- [Development Guide](./development-guide.md#initial-setup) - Setup instructions
- [Development Guide](./development-guide.md#development-workflow) - Workflow
- [Development Guide](./development-guide.md#code-conventions) - Coding standards

### Architecture
- [API Architecture](./architecture-api.md) - Backend design
- [App Architecture](./architecture-app.md) - Dashboard design
- [Web Architecture](./architecture-web.md) - Landing page design
- [Portal Architecture](./architecture-portal.md) - Portal design
- [Integration Architecture](./integration-architecture.md) - Inter-part communication

### API Reference
- [API Contracts](./api-contracts-api.md) - All tRPC endpoints
- [Data Models](./data-models-api.md) - Database schema

### Components
- [App Components](./component-inventory-app.md) - Dashboard components
- [Web Components](./component-inventory-web.md) - Landing components
- [Portal Components](./component-inventory-portal.md) - Portal components

### Deployment
- [Deployment Guide](./deployment-guide.md) - All deployment strategies
- [SELF_HOSTED_DEPLOYMENT.md](./SELF_HOSTED_DEPLOYMENT.md) - Self-hosting
- [apps/web/DEPLOYMENT.md](../apps/web/DEPLOYMENT.md) - Web deployment
- [apps/portal/DEPLOYMENT.md](../apps/portal/DEPLOYMENT.md) - Portal deployment

---

## Documentation Format

All documentation follows these conventions:
- **Markdown format** for readability
- **Code blocks** with syntax highlighting
- **Tables** for structured data
- **Links** to related documents
- **Examples** where helpful
- **Generated date** in each document

---

**For questions or clarifications, refer to the specific documentation files linked above.**
