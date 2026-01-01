# Security Policy

## Supported Versions

We actively support security updates for the following versions of Qarote:

| Version | Supported          | Notes                                    |
| ------- | ------------------ | ---------------------------------------- |
| Latest  | :white_check_mark: | Current stable release                   |
| 1.x.x   | :white_check_mark: | Active development and security updates  |
| < 1.0.0 | :x:                | Pre-release versions, not supported      |

**Note**: We recommend always using the latest stable release to ensure you have the most recent security patches.

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability in Qarote, please report it responsibly.

### How to Report

**For Community Edition (Open Source):**
- **Email**: [security@qarote.io](mailto:security@qarote.io)
- **GitHub Security Advisory**: Use [GitHub's private vulnerability reporting](https://github.com/briceth/Qarote/security/advisories/new) (preferred)

**For Enterprise Edition:**
- **Email**: [security@qarote.io](mailto:security@qarote.io)
- **Support Portal**: [portal.qarote.io](https://portal.qarote.io) (for Enterprise customers)

### What to Include

When reporting a vulnerability, please include:

1. **Description**: A clear description of the vulnerability
2. **Impact**: Potential impact and severity assessment
3. **Steps to Reproduce**: Detailed steps to reproduce the issue
4. **Affected Versions**: Which versions of Qarote are affected
5. **Suggested Fix** (optional): If you have ideas for how to fix the issue

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution**: Depends on severity:
  - **Critical**: Immediate attention, patch within 24-48 hours
  - **High**: Patch within 1 week
  - **Medium**: Patch within 2-4 weeks
  - **Low**: Patch in next scheduled release

### What to Expect

1. **Acknowledgment**: You will receive an acknowledgment of your report within 48 hours
2. **Assessment**: We will assess the vulnerability and determine its severity
3. **Updates**: We will keep you informed of our progress
4. **Fix**: Once fixed, we will:
   - Release a security patch
   - Credit you in the security advisory (if you wish)
   - Update the changelog with security notes

### Disclosure Policy

- **Do not** disclose the vulnerability publicly until we have released a fix
- We will coordinate with you on the disclosure timeline
- We aim to publish security advisories within 30 days of the fix being released

### Scope

**In Scope:**
- Security vulnerabilities in Qarote codebase
- Authentication and authorization issues
- Data exposure or leakage
- Injection vulnerabilities (SQL, XSS, etc.)
- Remote code execution
- Privilege escalation

**Out of Scope:**
- Denial of Service (DoS) attacks
- Social engineering attacks
- Physical security issues
- Issues in third-party dependencies (please report to the maintainer)
- Issues requiring physical access to the server
- Issues in self-hosted deployments due to misconfiguration

### Security Best Practices

For self-hosted deployments, we recommend:

1. **Keep Qarote Updated**: Always use the latest stable release
2. **Secure Your Environment**: Use strong passwords, enable HTTPS, restrict network access
3. **Regular Updates**: Update both Qarote and its dependencies regularly
4. **Monitor Logs**: Review application logs for suspicious activity
5. **Backup Data**: Regularly backup your database and configuration
6. **Network Security**: Use firewalls and restrict access to necessary ports only

### Security Updates

Security updates are released as:
- **Patch Releases**: For critical and high-severity issues (e.g., 1.2.3 → 1.2.4)
- **Minor Releases**: For medium-severity issues (e.g., 1.2.0 → 1.3.0)
- **Security Advisories**: Published on GitHub and via email notifications

### Enterprise Edition

Enterprise Edition customers receive:
- Priority security support
- Extended support for previous versions
- Private security notifications
- Custom security patches when needed

Contact [support@qarote.io](mailto:support@qarote.io) for Enterprise security support.

### Recognition

We appreciate responsible disclosure and will:
- Credit security researchers in our security advisories (with permission)
- Acknowledge contributions in our release notes
- Consider special recognition for significant security contributions

### Questions?

If you have questions about this security policy or need clarification, please contact [security@qarote.io](mailto:security@qarote.io).

---

**Thank you for helping keep Qarote secure!**

