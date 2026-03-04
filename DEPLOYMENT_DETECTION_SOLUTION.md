# Solution : Adaptive Update Instructions

## Problem

Current update notification emails always show Docker Compose instructions (`./scripts/update.sh`), but Qarote supports 3 different deployment methods with completely different update procedures.

## Solution Design

### 1. Deployment Method Detection

Add deployment method detection during startup and store in database:

```typescript
// apps/api/src/services/deployment/deployment-detector.ts
export type DeploymentMethod = 'docker_compose' | 'dokku' | 'binary';

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
    
    // Binary: Default fallback (includes manual/source)
    return 'binary';
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
  updateInstructions?: {
    title: string;
    command: string;
    description: string;
  };
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

# Download and extract the latest version (auto-detects platform)
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/x64/' | sed 's/aarch64/arm64/')"
curl -L "https://github.com/getqarote/Qarote/releases/latest/download/qarote-${PLATFORM}.tar.gz" | tar xz --strip-components=1

# Restart (migrations run automatically)
./qarote`
      };
  }
};
```

### 4. Update Release Notifier Service

```typescript
// apps/api/src/cron/release-notifier.cron.ts
// In checkForUpdates method:
const deploymentInfo = await DeploymentService.getUpdateInstructions();

const result = await EmailService.sendUpdateAvailableEmail({
  to: email,
  currentVersion,
  latestVersion,
  latestTagName,
  updateInstructions: deploymentInfo.instructions,
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
- Default to `binary` if detection fails (current behavior)
- Gradually improve detection accuracy with user feedback
