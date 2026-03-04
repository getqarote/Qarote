# Solution : Adaptive Update Instructions

## Problem
Current update notification emails always show Docker Compose instructions (`./scripts/update.sh`), but Qarote supports 4 different deployment methods with completely different update procedures.

## Solution Design

### 1. Deployment Method Detection

Add deployment method detection during startup and store in database:

```typescript
// apps/api/src/services/deployment/deployment-detector.ts
export type DeploymentMethod = 'docker_compose' | 'dokku' | 'binary' | 'manual';

export class DeploymentDetector {
  static detect(): DeploymentMethod {
    // Dokku: Check for DOKKU_* environment variables
    if (process.env.DOKKU_APP_NAME || process.env.DOKKU_ROOT) {
      return 'dokku';
    }
    
    // Docker Compose: Check for Docker-specific environment
    if (process.env.IS_DOCKER || fs.existsSync('/.dockerenv')) {
      return 'docker_compose';
    }
    
    // Binary: Check if running from extracted binary directory
    if (process.execPath.includes('/qarote/bin/') || 
        fs.existsSync('./qarote.config.json')) {
      return 'binary';  
    }
    
    // Manual/Source: Default fallback
    return 'manual';
  }
}
```

### 2. Store Deployment Method in Database

```sql
-- Add to SystemState table
INSERT INTO SystemState (key, value) 
VALUES ('deployment_method', 'docker_compose');
```

### 3. Update Email Template

```tsx
// apps/api/src/services/email/templates/update-available-email.tsx
interface UpdateAvailableEmailProps {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  deploymentMethod: DeploymentMethod; // NEW
}

// Render different instructions based on method
const getUpdateInstructions = (method: DeploymentMethod) => {
  switch (method) {
    case 'dokku':
      return { 
        title: 'How to Update (Dokku)',
        command: 'git push dokku main'
      };
    
    case 'docker_compose':
      return { 
        title: 'How to Update (Docker Compose)',
        command: './scripts/update.sh'
      };
    
    case 'binary':
      return { 
        title: 'How to Update (Binary)',
        command: `# Stop the current instance
kill $(pgrep -f './qarote') 2>/dev/null || true

# Download and extract the latest version  
curl -L https://github.com/getqarote/Qarote/releases/latest/download/qarote-linux-x64.tar.gz | tar xz --strip-components=1

# Restart (migrations run automatically)
./qarote`
      };
    
    case 'manual':
      return { 
        title: 'How to Update (Manual)',
        command: `git pull origin main
npm install
npm run build
pm2 restart qarote  # or your process manager`
      };
  }
};
```

### 4. Update Release Notifier Service

```typescript
// apps/api/src/cron/release-notifier.cron.ts
private async getDeploymentMethod(): Promise<DeploymentMethod> {
  const state = await prisma.systemState.findUnique({
    where: { key: 'deployment_method' }
  });
  
  return (state?.value as DeploymentMethod) || 'docker_compose';
}

// In checkForUpdates method:
const deploymentMethod = await this.getDeploymentMethod();

const result = await EmailService.sendUpdateAvailableEmail({
  to: email,
  currentVersion,
  latestVersion,
  latestTagName,
  deploymentMethod // Pass to email template
});
```

### 5. Different Update Scripts

Create method-specific update scripts:

```bash
# scripts/update-dokku.sh
git push dokku main

# scripts/update-binary.sh
curl -L https://github.com/getqarote/Qarote/releases/latest/download/qarote-linux-x64.tar.gz | tar xz --strip-components=1
./qarote

# scripts/update-manual.sh
git pull origin main
npm install  
npm run build
# User handles service restart
```

## Implementation Priority

1. **Phase 1:** Add deployment detection at startup
2. **Phase 2:** Update email template to show correct instructions  
3. **Phase 3:** Create method-specific update scripts
4. **Phase 4:** Add deployment method indicator in UI

## Benefits

- ✅ **Accurate instructions** for each deployment method
- ✅ **Better user experience** - no confusion about update process
- ✅ **Higher adoption** of updates - easier to apply
- ✅ **Reduced support** - fewer "update didn't work" issues

## Migration Strategy

For existing instances:
- Detect deployment method on next startup
- Default to `docker_compose` if detection fails (current behavior)
- Gradually improve detection accuracy with user feedback