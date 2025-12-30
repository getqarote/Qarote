# Qarote Feature Comparison

This document provides a detailed comparison of features between Community Edition (open-source) and Enterprise Edition (licensed).

## Quick Comparison

| Feature Category | Community Edition | Enterprise Edition |
|----------------|-------------------|-------------------|
| **License** | MIT (Open Source) | Commercial License |
| **Price** | Free | Paid |
| **RabbitMQ Monitoring** | ✅ | ✅ |
| **Workspace Management** | ❌ | ✅ |
| **Team Collaboration** | ❌ | ✅ |
| **Alerting** | ❌ | ✅ |
| **Integrations** | ❌ | ✅ |
| **Data Export** | ❌ | ✅ |

## Detailed Feature Comparison

### Core Monitoring Features

| Feature | Community | Enterprise | Notes |
|---------|-----------|------------|-------|
| **Server Management** |
| Connect to RabbitMQ servers | ✅ | ✅ | Unlimited servers |
| View server overview | ✅ | ✅ | Real-time statistics |
| Monitor cluster nodes | ✅ | ✅ | Health and status |
| **Queue Management** |
| View queues | ✅ | ✅ | All virtual hosts |
| Monitor queue depth | ✅ | ✅ | Real-time updates |
| View queue messages | ✅ | ✅ | Browse and inspect |
| Publish messages | ✅ | ✅ | Direct publishing |
| Consume messages | ✅ | ✅ | Test consumption |
| **Exchange Management** |
| View exchanges | ✅ | ✅ | All types |
| Inspect bindings | ✅ | ✅ | Queue bindings |
| Monitor statistics | ✅ | ✅ | Message rates |
| **Virtual Host Management** |
| View virtual hosts | ✅ | ✅ | All vhosts |
| Monitor statistics | ✅ | ✅ | Per-vhost metrics |
| View permissions | ✅ | ✅ | User permissions |
| **User Management** |
| View users | ✅ | ✅ | All users |
| Inspect permissions | ✅ | ✅ | Detailed permissions |
| Monitor activity | ✅ | ✅ | User activity |
| **Connections & Channels** |
| View connections | ✅ | ✅ | Active connections |
| Monitor channels | ✅ | ✅ | Channel statistics |
| Track statistics | ✅ | ✅ | Connection metrics |

### Premium Features (Enterprise Only)

| Feature | Community | Enterprise | Description |
|---------|-----------|------------|-------------|
| **Workspace Management** |
| Multiple workspaces | ❌ | ✅ | Organize servers by workspace |
| Workspace switching | ❌ | ✅ | Switch between workspaces |
| Workspace settings | ❌ | ✅ | Configure workspace options |
| **Team Collaboration** |
| Invite team members | ❌ | ✅ | Invite users to workspaces |
| Manage user roles | ❌ | ✅ | Assign roles and permissions |
| Track team activity | ❌ | ✅ | View team activity logs |
| **Alerting System** |
| Real-time alerts | ❌ | ✅ | Monitor RabbitMQ issues |
| Email notifications | ❌ | ✅ | Receive alert emails |
| Alert history | ❌ | ✅ | View past alerts |
| Alert resolution | ❌ | ✅ | Mark alerts as resolved |
| **Advanced Alert Rules** |
| Custom alert rules | ❌ | ✅ | Create custom rules |
| Complex conditions | ❌ | ✅ | Set up complex logic |
| Alert actions | ❌ | ✅ | Configure actions |
| **Slack Integration** |
| Slack notifications | ❌ | ✅ | Send alerts to Slack |
| Multiple workspaces | ❌ | ✅ | Configure multiple Slack workspaces |
| Custom formatting | ❌ | ✅ | Customize alert format |
| **Webhook Integration** |
| Webhook notifications | ❌ | ✅ | Send alerts to webhooks |
| Custom endpoints | ❌ | ✅ | Configure endpoints |
| Custom payloads | ❌ | ✅ | Customize payload format |
| **Data Export** |
| Export workspace data | ❌ | ✅ | Export all data |
| Backup/restore | ❌ | ✅ | Backup capabilities |
| CSV export | ❌ | ✅ | Export to CSV |
| JSON export | ❌ | ✅ | Export to JSON |

## Deployment Modes

### Community Edition

- **Deployment Mode**: `community`
- **License Required**: No
- **Network Access**: Optional (for optional services)
- **Air-Gapped**: Supported

### Enterprise Edition

- **Deployment Mode**: `enterprise`
- **License Required**: Yes (cryptographically signed license file)
- **Network Access**: Optional (license validation is offline)
- **Air-Gapped**: Fully supported

## Use Cases

### Community Edition Use Cases

- Individual developers
- Small teams
- Development and testing
- Basic monitoring needs
- Learning RabbitMQ

### Enterprise Edition Use Cases

- Production deployments
- Team collaboration
- Advanced monitoring
- Integration requirements
- Compliance and auditing needs

## Migration Path

You can start with Community Edition and upgrade to Enterprise Edition at any time:

1. **Start with Community Edition** - Deploy and use core features
2. **Evaluate Premium Features** - UI shows upgrade prompts for premium features
3. **Purchase Enterprise License** - When ready, purchase a license
4. **Upgrade Deployment** - Switch to enterprise mode and add license file
5. **Unlock Premium Features** - All premium features become available

## Feature Roadmap

### Planned Community Features

- Additional monitoring metrics
- Performance improvements
- UI enhancements

### Planned Enterprise Features

- SSO/SAML authentication
- Advanced analytics
- Custom branding
- API rate limits
- Audit logs
- Priority support

## Support

### Community Edition

- GitHub Issues
- GitHub Discussions
- Community documentation

### Enterprise Edition

- Priority email support
- Customer portal access
- Direct support channel
- Regular updates and patches

## License Comparison

### Community Edition (MIT License)

- ✅ Free to use
- ✅ Free to modify
- ✅ Free to distribute
- ✅ Commercial use allowed
- ❌ No premium features
- ❌ No warranty

### Enterprise Edition (Commercial License)

- ✅ All premium features
- ✅ Priority support
- ✅ Regular updates
- ✅ License compliance
- ⚠️ Commercial license terms apply
- ⚠️ License required

## Choosing the Right Edition

### Choose Community Edition if:

- You need basic RabbitMQ monitoring
- You're a developer or small team
- You don't need team collaboration
- You don't need alerting
- You want open-source software

### Choose Enterprise Edition if:

- You need workspace management
- You need team collaboration
- You need alerting and notifications
- You need integrations (Slack, webhooks)
- You need data export
- You're deploying to production
- You need priority support

## Questions?

If you're unsure which edition is right for you, contact us at sales@qarote.io or visit our [Customer Portal](https://portal.qarote.io).

