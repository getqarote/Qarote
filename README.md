<div align="center">

# 🥕 Qarote

**A modern, user-friendly dashboard for monitoring and managing RabbitMQ servers**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0-orange.svg)](https://pnpm.io/)

[Features](#-features) • [Editions](#-editions) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## ✨ Features

- 🎯 **Real-time Monitoring** - Live visibility into queues, exchanges, connections, and system health
- 📊 **Beautiful Dashboard** - Modern, intuitive interface built with React and TypeScript
- 🔔 **Alerting System** - Get notified about queue depths, message rates, and system issues (Enterprise)
- 👥 **Workspace Management** - Multi-user workspaces with role-based access control (Enterprise)
- 🔌 **Integrations** - Slack, webhooks, and custom integrations (Enterprise)
- 📤 **Data Export** - Export queue metrics and analytics (Enterprise)
- 🚀 **Self-Hosted** - Deploy on your own infrastructure with Docker Compose or Dokku
- 🔒 **Enterprise Security** - Offline license validation for air-gapped deployments

## 🎭 Editions

Qarote is available in two editions to suit different needs:

### 🆓 Community Edition (Open Source)

<div align="center">

**Free • MIT License • Open Source**

</div>

- ✅ Core RabbitMQ monitoring (queues, exchanges, vhosts, users)
- ✅ Real-time metrics and charts
- ✅ Server management
- ✅ User-friendly dashboard
- ✅ Self-hosted deployment
- ✅ Active community support

📖 **[View Community Edition Guide](docs/COMMUNITY_EDITION.md)**

### 💼 Enterprise Edition (Licensed)

<div align="center">

**Commercial License • Premium Features • Priority Support**

</div>

- ✅ All Community Edition features
- ✅ **Workspace Management** - Multi-user workspaces with teams
- ✅ **Advanced Alerting** - Custom alert rules with Slack/webhook notifications
- ✅ **Data Export** - CSV/JSON export of metrics and analytics
- ✅ **Priority Support** - Direct support channel
- ✅ **Offline Validation** - Air-gapped deployment support
- ✅ **License Management** - Cryptographically signed licenses

📖 **[View Enterprise Edition Guide](docs/ENTERPRISE_EDITION.md)** • **[Compare Features](docs/FEATURE_COMPARISON.md)**

<div align="center">

**[🎟️ Get Enterprise License](https://portal.qarote.io)** - Purchase and manage your licenses

</div>

## 🚀 Quick Start

### Self-Hosted Deployment

#### 🎯 Community Edition - Recommended: Dokku

**We recommend using Dokku for the simplest deployment experience:**

```bash
# 1. Install Dokku on your server
# 2. Create app and database
ssh dokku@your-server apps:create qarote
dokku postgres:create qarote-db && dokku postgres:link qarote-db qarote

# 3. Set environment variables
dokku config:set qarote DEPLOYMENT_MODE=community JWT_SECRET=... ENCRYPTION_KEY=...

# 4. Deploy
git remote add dokku dokku@your-server:qarote
git push dokku main
```

📖 **[Complete Dokku Guide](docs/COMMUNITY_EDITION.md#recommended-dokku-deployment)**

#### 🐳 Alternative: Docker Compose

Both Community and Enterprise editions can be deployed with Docker Compose:

```bash
# 1. Copy environment file
cp .env.selfhosted.example .env

# 2. Edit .env and set DEPLOYMENT_MODE
#    - Community: DEPLOYMENT_MODE=community
#    - Enterprise: DEPLOYMENT_MODE=enterprise (also configure license)

# 3. Start services
docker compose -f docker-compose.selfhosted.yml up -d
```

📖 **[Complete Deployment Guide](docs/SELF_HOSTED_DEPLOYMENT.md)**

### 🛠️ Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/getqarote/Qarote.git
   cd qarote
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Start local services (PostgreSQL, RabbitMQ):**

   ```bash
   docker compose up -d
   ```

4. **Run database migrations:**

   ```bash
   cd apps/api
   pnpm run db:migrate:dev
   ```

5. **Start development servers:**

   ```bash
   # From project root
   pnpm run dev

   # Or start individual services:
   pnpm run dev:api    # Backend API (port 3000)
   pnpm run dev:app    # Frontend app (port 8080)
   ```

📖 **[Contributing Guide](CONTRIBUTING.md)** • **[Development Documentation](docs/README.md)**

## 📚 Documentation

<div align="center">

**[📖 Documentation Hub](docs/README.md)** - Your one-stop shop for all Qarote documentation

</div>

### 📋 Quick Links

- **[Community Edition Guide](docs/COMMUNITY_EDITION.md)** - Setup and usage for open-source edition
- **[Enterprise Edition Guide](docs/ENTERPRISE_EDITION.md)** - Setup and licensing for enterprise edition
- **[Feature Comparison](docs/FEATURE_COMPARISON.md)** - Detailed feature matrix
- **[Self-Hosted Deployment](docs/SELF_HOSTED_DEPLOYMENT.md)** - Complete deployment guide
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to Qarote
- **[Security Policy](SECURITY.md)** - Security reporting and policy

## 🏗️ Architecture

Qarote is built as a modern monorepo with the following structure:

```
qarote/
├── 🎨 apps/
│   ├── api/          # Backend API (Hono.js, tRPC, Prisma)
│   ├── app/          # Main frontend application (React, Vite)
│   ├── web/          # Landing page
│   └── portal/       # Customer portal
├── 📖 docs/          # Documentation
├── 🐳 docker/        # Docker configurations
└── 🔧 scripts/       # Utility scripts
```

### 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Hono.js, tRPC, Prisma
- **Database**: PostgreSQL
- **Message Queue**: RabbitMQ
- **Package Manager**: pnpm
- **Monorepo**: Turborepo

## 🐳 Docker Development

This repository includes Docker Compose configuration for a complete development environment.

### 🚀 Quick Start

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### 📊 Services

| Service                | Port  | Access                                    |
| ---------------------- | ----- | ----------------------------------------- |
| 🐘 PostgreSQL          | 5432  | `postgres:password@localhost:5432/qarote` |
| 🐰 RabbitMQ            | 5672  | `amqp://admin:admin123@localhost:5672`    |
| 🌐 RabbitMQ Management | 15672 | http://localhost:15672                    |

### 📝 Pre-configured Data

The development environment includes:

- 👥 **Users**: admin, guest, producer, consumer
- 📁 **Virtual Hosts**: `/`, `/production`, `/staging`
- 📨 **Exchanges**: notifications, events, analytics, alerts
- 📬 **Queues**: Email, SMS, user events, order processing, analytics

📖 **[Full Development Setup Guide](CONTRIBUTING.md#development-setup)**

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

1. 🍴 **Fork the repository**
2. 🌿 **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. ✏️ **Make your changes** and test locally
4. ✅ **Run linting and tests** (`pnpm run lint && pnpm run test`)
5. 💾 **Commit your changes** (follow [Conventional Commits](https://www.conventionalcommits.org/))
6. 📤 **Push to your branch** (`git push origin feature/amazing-feature`)
7. 🔄 **Open a Pull Request**

📖 **[Complete Contributing Guide](CONTRIBUTING.md)**

### 🎯 Contribution Areas

- 🐛 Bug fixes
- ✨ New features (Community Edition)
- 📝 Documentation improvements
- 🧪 Test coverage
- 🎨 UI/UX enhancements
- 🌐 Translations

## 🔒 Security

**Please do not create public issues for security vulnerabilities.**

Instead, email **security@qarote.io** with:

- A detailed description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact
- Suggested fix (if you have one)

📖 **[Security Policy](SECURITY.md)**

## 📞 Support

### 💬 Community Support

- **[GitHub Discussions](https://github.com/getqarote/Qarote/discussions)** - Ask questions and share ideas
- **[GitHub Issues](https://github.com/getqarote/Qarote/issues)** - Report bugs and request features

### 💼 Enterprise Support

- **Email**: [support@qarote.io](mailto:support@qarote.io)
- **Customer Portal**: [portal.qarote.io](https://portal.qarote.io)

## 📄 License

- **Community Edition**: [MIT License](LICENSE) - Free and open source
- **Enterprise Edition**: Commercial License - See [Enterprise Edition Guide](docs/ENTERPRISE_EDITION.md)

## 🌟 Star History

<div align="center">

If you find Qarote useful, please consider giving it a ⭐ on GitHub!

</div>

---

<div align="center">

**Made with ❤️ by [La Griffe](https://github.com/LaGriffe)**

[Website](https://qarote.io) • [Documentation](docs/README.md) • [Contributing](CONTRIBUTING.md) • [Security](SECURITY.md)

</div>
