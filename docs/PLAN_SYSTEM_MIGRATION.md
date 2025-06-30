# Plan System Migration Guide

## Overview

The plan logic has been consolidated to the backend to provide a single source of truth for all plan features, limits, and usage data. This guide explains how to use the new backend-driven plan system.

## New Architecture

### Backend

- **Unified Plan Service** (`/back-end/src/services/unified-plan.service.ts`): Single source of truth for all plan logic
- **Plan Controller** (`/back-end/src/controllers/plan.controller.ts`): API endpoints for plan data
- **API Endpoints**:
  - `GET /api/plans` - All available plans
  - `GET /api/plans/current` - Current user's plan with usage and features
  - `GET /api/plans/:plan` - Specific plan details

### Frontend

- **WorkspaceContext** (`/front-end/src/contexts/WorkspaceContext.tsx`): Provides plan data and convenience getters
- **Plan Hooks** (`/front-end/src/hooks/usePlan.ts`): Custom hooks for plan data access
- **Plan API Client** (`/front-end/src/lib/api/planClient.ts`): API client for plan endpoints
- **Plan Utils** (`/front-end/src/lib/plans/planUtils.ts`): Minimal types and fallback functions (deprecated)

## Migration Guide

### Before (Old Way)

```tsx
import {
  canUserAddServerWithCount,
  WorkspacePlan,
} from "@/lib/plans/planUtils";
import { useWorkspace } from "@/contexts/WorkspaceContext";

function MyComponent() {
  const { workspacePlan } = useWorkspace();
  const serverCount = 5; // from some state

  const canAddServer = canUserAddServerWithCount(workspacePlan, serverCount);

  return <Button disabled={!canAddServer}>Add Server</Button>;
}
```

### After (New Way)

```tsx
import { useWorkspace } from "@/contexts/WorkspaceContext";
// or
import { usePlanPermissions } from "@/hooks/usePlan";

function MyComponent() {
  // Option 1: Use WorkspaceContext (recommended for simple cases)
  const { canAddServer } = useWorkspace();

  // Option 2: Use plan hooks (for more complex plan logic)
  // const { canAddServer } = usePlanPermissions();

  return <Button disabled={!canAddServer}>Add Server</Button>;
}
```

## Available Hooks and Data

### useWorkspace()

Provides basic plan permissions and data:

```tsx
const {
  workspace,
  planData,
  workspacePlan,
  canAddServer,
  canAddQueue,
  canSendMessages,
  canExportData,
  canAccessRouting,
  approachingLimits,
  isLoading,
  isPlanLoading,
  error,
  planError,
  refetch,
  refetchPlan,
} = useWorkspace();
```

### usePlanData()

Provides detailed plan information:

```tsx
const {
  planData,
  planFeatures,
  usage,
  warnings,
  approachingLimits,
  workspace,
  isLoading,
  error,
  refetch,
} = usePlanData();
```

### usePlanPermissions()

Provides all permission flags:

```tsx
const {
  canAddServer,
  canAddQueue,
  canSendMessages,
  canExportData,
  canAccessRouting,
  hasAdvancedMetrics,
  hasAdvancedAlerts,
  hasPrioritySupport,
} = usePlanPermissions();
```

### useUsageStats()

Provides current usage statistics:

```tsx
const {
  users: { current, limit, percentage, canAdd },
  servers: { current, limit, percentage, canAdd },
  queues: { current, limit, percentage, canAdd },
  messages: { current, limit, percentage, canSend },
} = useUsageStats();
```

### useMemoryPermissions()

Provides memory feature permissions:

```tsx
const {
  canViewBasicMemoryMetrics,
  canViewAdvancedMemoryMetrics,
  canViewExpertMemoryMetrics,
  canViewMemoryTrends,
  canViewMemoryOptimization,
} = useMemoryPermissions();
```

## Backend Plan Data Structure

### Current Plan Response

```typescript
interface CurrentPlanResponse {
  workspace: {
    id: string;
    name: string;
    plan: WorkspacePlan;
  };
  planFeatures: PlanFeatures;
  usage: PlanUsage;
  warnings: PlanWarnings;
  approachingLimits: boolean;
}
```

### Usage Information

```typescript
interface PlanUsage {
  users: {
    current: number;
    limit?: number;
    percentage: number;
    canAdd: boolean;
  };
  servers: {
    current: number;
    limit?: number;
    percentage: number;
    canAdd: boolean;
  };
  queues: {
    current: number;
    limit?: number;
    percentage: number;
    canAdd: boolean;
  };
  messages: {
    current: number;
    limit?: number;
    percentage: number;
    canSend: boolean;
  };
}
```

## Best Practices

1. **Use WorkspaceContext for simple permission checks**: Most components only need basic permission flags
2. **Use plan hooks for complex plan logic**: Use `usePlanData()` when you need detailed usage statistics
3. **Avoid frontend plan utilities**: The functions in `planUtils.ts` are deprecated - use the backend API instead
4. **Handle loading states**: Plan data is fetched asynchronously, always check loading states
5. **Refresh plan data after actions**: Call `refetchPlan()` after actions that might affect usage (like adding servers)

## Migration Checklist

- [ ] Replace `canUserAddServerWithCount()` with `useWorkspace().canAddServer`
- [ ] Replace `canUserAddQueueWithCount()` with `useWorkspace().canAddQueue`
- [ ] Replace `canUserSendMessagesWithCount()` with `useWorkspace().canSendMessages`
- [ ] Replace `canUserExportData()` with `useWorkspace().canExportData`
- [ ] Replace `canUserAccessRouting()` with `useWorkspace().canAccessRouting`
- [ ] Update components to use plan hooks instead of prop drilling
- [ ] Remove hardcoded plan limits and get them from backend API
- [ ] Test all plan-related functionality with different plan types
- [ ] Update tests to mock the new plan API endpoints

## Breaking Changes

1. **AddServerButton props**: No longer accepts `workspacePlan`, `serverCount`, `workspaceLoading` - gets data from context
2. **Plan utility functions**: All functions in `planUtils.ts` are deprecated
3. **Plan data structure**: Plan features now include display information, pricing, and descriptions
4. **Usage calculations**: Usage limits and percentages are now calculated on the backend

## Testing

To test the new plan system:

1. Start the backend server
2. Check that `/api/plans/current` returns valid data
3. Verify that plan permissions are correctly applied in the UI
4. Test with different plan types (FREE, DEVELOPER, STARTUP, BUSINESS)
5. Verify that usage limits are enforced
6. Check that warning states work when approaching limits
