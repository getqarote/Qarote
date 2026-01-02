# Qarote Documentation Hub

Welcome to the Qarote documentation! This hub provides comprehensive guides for deploying, using, and contributing to Qarote.

## 📚 Table of Contents

### Getting Started

- **[Community Edition](COMMUNITY_EDITION.md)** - Open-source edition guide
  - Free, MIT-licensed edition
  - Core RabbitMQ monitoring features
  - Self-hosting with Dokku or Docker Compose

- **[Enterprise Edition](ENTERPRISE_EDITION.md)** - Licensed edition guide
  - Commercial license with premium features
  - Workspace management, alerting, integrations
  - License activation and offline validation

- **[Feature Comparison](FEATURE_COMPARISON.md)** - Detailed feature comparison
  - Side-by-side comparison of Community vs Enterprise
  - Feature availability matrix
  - Upgrade path information

### Deployment Guides

- **[Self-Hosted Deployment](SELF_HOSTED_DEPLOYMENT.md)** - Complete deployment guide
  - Supports both Community and Enterprise editions
  - Docker Compose setup
  - Environment configuration
  - License setup (Enterprise)

- **[Standalone Deployment](STANDALONE_DEPLOYMENT.md)** - Legacy deployment guide
  - Legacy standalone deployment instructions
  - ⚠️ **Note**: See [SELF_HOSTED_DEPLOYMENT.md](SELF_HOSTED_DEPLOYMENT.md) for updated information

### Development & Testing

- **[Testing GitHub Actions Locally](ACT_TESTING.md)** - Local testing guide
  - Using `act` to test GitHub Actions workflows
  - Setting up local environment
  - Debugging workflows

## 🚀 Quick Start

### For Users

1. **Choose your edition:**
   - **Community Edition**: Free, open-source - [Get Started](COMMUNITY_EDITION.md)
   - **Enterprise Edition**: Licensed with premium features - [Get Started](ENTERPRISE_EDITION.md)

2. **Deploy:**
   - **Recommended (Community)**: [Dokku Deployment](COMMUNITY_EDITION.md#recommended-dokku-deployment)
   - **Alternative**: [Docker Compose](SELF_HOSTED_DEPLOYMENT.md)

3. **Configure:**
   - Set `DEPLOYMENT_MODE=community` or `DEPLOYMENT_MODE=enterprise`
   - Configure environment variables (see deployment guide)
   - For Enterprise: Set up license file

### For Contributors

1. **Read the [Contributing Guide](../CONTRIBUTING.md)** in the root directory
2. **Set up development environment:**
   ```bash
   pnpm install
   docker-compose up -d
   pnpm run dev
   ```
3. **Follow code formatting guidelines** (see CONTRIBUTING.md)

## 📖 Documentation Structure

```
docs/
├── README.md (this file)              # Documentation hub
├── COMMUNITY_EDITION.md                 # Community Edition guide
├── ENTERPRISE_EDITION.md                # Enterprise Edition guide
├── FEATURE_COMPARISON.md                # Feature comparison
├── SELF_HOSTED_DEPLOYMENT.md            # Main deployment guide
├── STANDALONE_DEPLOYMENT.md             # Legacy deployment guide
└── ACT_TESTING.md                       # Testing GitHub Actions
```

## 🎯 Common Tasks

### Deploying Community Edition

1. Read [COMMUNITY_EDITION.md](COMMUNITY_EDITION.md)
2. Choose deployment method (Dokku recommended)
3. Follow setup instructions
4. Configure environment variables

### Deploying Enterprise Edition

1. Read [ENTERPRISE_EDITION.md](ENTERPRISE_EDITION.md)
2. Purchase license from Customer Portal
3. Download license file
4. Follow [SELF_HOSTED_DEPLOYMENT.md](SELF_HOSTED_DEPLOYMENT.md)
5. Configure license in environment

### Comparing Editions

- See [FEATURE_COMPARISON.md](FEATURE_COMPARISON.md) for detailed comparison
- Community Edition: Core monitoring features
- Enterprise Edition: Advanced features (workspaces, alerting, integrations)

### Testing Workflows Locally

- See [ACT_TESTING.md](ACT_TESTING.md) for using `act` to test GitHub Actions
- Useful for debugging CI/CD workflows before pushing

## 🔗 External Resources

- **Main Repository**: [GitHub Repository](https://github.com/your-org/qarote)
- **Issues**: [GitHub Issues](https://github.com/your-org/qarote/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/qarote/discussions)
- **Security**: See [SECURITY.md](../SECURITY.md) in root directory
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md) in root directory

## 📝 Documentation Updates

This documentation is maintained alongside the codebase. If you find errors or have suggestions:

1. **For Community Edition**: Open a [GitHub Issue](https://github.com/your-org/qarote/issues/new?template=bug.yml) or submit a PR
2. **For Enterprise Edition**: Contact [support@qarote.io](mailto:support@qarote.io)

## 🆘 Need Help?

- **Community Support**: [GitHub Discussions](https://github.com/your-org/qarote/discussions)
- **Enterprise Support**: [support@qarote.io](mailto:support@qarote.io)
- **Security Issues**: [security@qarote.io](mailto:security@qarote.io) (see [SECURITY.md](../SECURITY.md))
- **Bug Reports**: [GitHub Issues](https://github.com/your-org/qarote/issues/new?template=bug.yml)

---

**Last Updated**: January 2025

For the latest information, always refer to the main [README.md](../README.md) in the repository root.
