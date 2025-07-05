# Plan Services Architecture (Consolidated)

## Overview

The plan services have been consolidated into two focused files to eliminate duplication and provide a clean, maintainable architecture. This document outlines the streamlined structure and how to use the services.

## Service Structure

```
services/
├── plan-features.service.ts          # Single source of truth for all plan data
└── plan.service.ts              # Business logic, validation, and helper functions
```

## Service Responsibilities

### 📊 **plan-data.service.ts** (Data Layer)

- **Purpose**: Single source of truth for all plan-related data
- **Responsibilities**:
  - Complete plan features definition (`PLAN_FEATURES`)
  - Plan limits, pricing, display info, and capabilities
  - Type definitions (`PlanFeatures` interface)
  - Data access function (`getPlanFeatures()`)

```typescript
import {
  getPlanFeatures,
  PLAN_FEATURES,
  type PlanFeatures,
} from "@/services/plan-data.service";

const features = getPlanFeatures(WorkspacePlan.STARTUP);
console.log(features.displayName); // "Startup"
console.log(features.monthlyPrice); // 9900
console.log(features.canAddQueue); // true
```

### ⚙️ **plan.service.ts** (Business Logic)

- **Purpose**: Business logic, validation, and helper functions
- **Responsibilities**:
  - Validation functions that throw errors
  - Error classes (`PlanValidationError`, `PlanLimitExceededError`)
  - Helper functions for UI and business logic
  - Formatting and text generation
  - Backward compatibility exports

```typescript
import {
  validateQueueCreation,
  canUserAddQueue,
  getPlanDisplayName,
  getMonthlyPrice,
} from "@/services/plan.service";

// Validation with error throwing
try {
  validateQueueCreation(plan, currentCount);
} catch (error) {
  if (error instanceof PlanLimitExceededError) {
    // Handle limit exceeded
  }
}

// Simple permission checks
const canAdd = canUserAddQueue(plan);
const displayName = getPlanDisplayName(plan);
const price = getMonthlyPrice(plan);
```

## Benefits of Consolidation

### ✅ **Eliminated Duplication**

- **Before**: 5 files with overlapping data and functions
- **After**: 2 focused files with clear separation
- **No More**: Duplicate pricing data, limit text functions, access controls

### ✅ **Single Source of Truth**

- All plan data consolidated in `plan-data.service.ts`
- No more inconsistencies between different data sources
- Easier to maintain and update plan features

### ✅ **Clear Separation**

- **Data Layer**: Pure data definitions and types
- **Business Logic**: Validation, formatting, and helpers
- **No Overlap**: Each file has distinct responsibilities

### ✅ **Maintained Compatibility**

- All existing imports continue to work
- No breaking changes for consumers
- Gradual migration path available

## Usage Examples

### **Backend Controller Usage**

```typescript
import {
  validateQueueCreation,
  canUserAddQueueWithCount,
  getPlanFeatures,
} from "@/services/plan.service";

// Validation with error throwing
try {
  validateQueueCreation(workspace.plan, currentQueueCount);
  // Proceed with queue creation
} catch (error) {
  if (error instanceof PlanLimitExceededError) {
    return c.json({ error: error.message }, 403);
  }
  throw error;
}

// Get complete plan info
const features = getPlanFeatures(workspace.plan);
console.log(`Plan: ${features.displayName}, Max Queues: ${features.maxQueues}`);
```

### **Frontend Component Usage**

```typescript
import {
  getPlanDisplayName,
  getPlanColor,
  getMonthlyPrice,
  canUserAddQueue,
  getPlanFeatures
} from '@/services/plan.service';

function PlanCard({ plan }: { plan: WorkspacePlan }) {
  const features = getPlanFeatures(plan);

  return (
    <div className={features.color}>
      <h3>{features.displayName}</h3>
      <p>{getMonthlyPrice(plan)}/month</p>
      <ul>
        {features.featureDescriptions.map(desc => (
          <li key={desc}>{desc}</li>
        ))}
      </ul>
      {canUserAddQueue(plan) && (
        <button>Add Queue</button>
      )}
    </div>
  );
}
```

### **Billing Logic Usage**

```typescript
import { getPlanFeatures, getYearlySavings } from '@/services/plan.service';

function BillingCalculator({ plan, billingInterval }: Props) {
  const features = getPlanFeatures(plan);
  const savings = getYearlySavings(plan);

  const price = billingInterval === 'monthly'
    ? features.monthlyPrice
    : features.yearlyPrice;

  return (
    <div>
      <p>Price: ${(price / 100).toFixed(0)}/{billingInterval}</p>
      {billingInterval === 'yearly' && savings && (
        <p>Save {savings} annually!</p>
      )}
    </div>
  );
}
```

## Import Patterns

### ✅ **Recommended Imports**

```typescript
// For complete plan data
import { getPlanFeatures } from "@/services/plan.service";

// For specific functionality
import {
  validateQueueCreation,
  canUserAddQueue,
  getPlanDisplayName,
  getMonthlyPrice,
} from "@/services/plan.service";

// For types
import type { PlanFeatures } from "@/services/plan-data.service";
```

### ⚠️ **Direct Data Import (when needed)**

```typescript
// Only if you need the raw data constant
import { PLAN_FEATURES } from "@/services/plan-data.service";

// But prefer the function approach
import { getPlanFeatures } from "@/services/plan.service";
```

## Migration from Old Structure

### **Old Multi-File Structure**

```typescript
// OLD - Multiple imports from different files
import { canUserAddQueue } from "@/services/plan/plan-access.service";
import { getPlanDisplayName } from "@/services/plan/plan-display.service";
import { getMonthlyPrice } from "@/services/plan/plan-pricing.service";
import { PLAN_LIMITS } from "@/services/plan.service";
```

### **New Consolidated Structure**

```typescript
// NEW - Single import for all functionality
import {
  canUserAddQueue,
  getPlanDisplayName,
  getMonthlyPrice,
  getPlanFeatures, // Replaces PLAN_LIMITS
} from "@/services/plan.service";
```

## Architecture Benefits

### 🎯 **Simplified Mental Model**

- **Data**: One place for all plan information
- **Logic**: One place for all plan operations
- **Clear**: Easy to understand and navigate

### 🚀 **Performance Benefits**

- **Reduced Bundle Size**: No duplicate code
- **Better Tree Shaking**: Unused functions can be eliminated
- **Faster Builds**: Fewer files to process

### 🛠️ **Maintainability**

- **Single Data Source**: Update plan features in one place
- **Clear Ownership**: Each file has distinct responsibilities
- **Easier Testing**: Focused test files for data vs. logic

### 📈 **Scalability**

- **Easy Extension**: Add new plan features in data layer
- **Clean APIs**: Well-defined interfaces between layers
- **Future-Proof**: Architecture supports growth and changes

## Type Safety

The consolidated structure maintains full type safety:

```typescript
// PlanFeatures interface covers all plan aspects
interface PlanFeatures {
  // Limits and permissions
  canAddQueue: boolean;
  maxQueues: number;

  // Pricing
  monthlyPrice: number;
  yearlyPrice: number;

  // Display
  displayName: string;
  color: string;

  // And 20+ other properties...
}

// Type-safe access to all features
const features: PlanFeatures = getPlanFeatures(plan);
```

## Summary

The consolidated plan services architecture provides:

- ✅ **Zero Duplication**: Single source of truth for all plan data
- ✅ **Clear Separation**: Data layer separate from business logic
- ✅ **Full Compatibility**: All existing code continues to work
- ✅ **Better Performance**: Reduced bundle size and complexity
- ✅ **Easier Maintenance**: One place to update plan features
- ✅ **Type Safety**: Comprehensive TypeScript coverage

This streamlined approach eliminates the confusion and maintenance overhead of the previous multi-file structure while preserving all functionality.

## Service Responsibilities

### 📋 **plan-validation.service.ts** (Core)

- **Purpose**: Business rule validation and error handling
- **Responsibilities**:
  - Plan limits and constraints (`PLAN_LIMITS`)
  - Validation functions that throw errors
  - Error classes and types
  - Core business logic enforcement

```typescript
import { validateQueueCreation, PLAN_LIMITS } from "@/services/plan.service";

// Throws PlanLimitExceededError if validation fails
validateQueueCreation(plan, currentQueueCount, workspaceId);
```

### 🎨 **plan-display.service.ts** (UI/UX)

- **Purpose**: UI presentation and display logic
- **Responsibilities**:
  - Plan display information (`PLAN_DISPLAY_INFO`)
  - UI text and formatting functions
  - Color schemes and styling
  - Feature descriptions for marketing

```typescript
import {
  getPlanDisplayName,
  getPlanColor,
  getPlanFeatureDescriptions,
} from "@/services/plan/plan-display.service";

const displayName = getPlanDisplayName(WorkspacePlan.STARTUP); // "Startup"
const color = getPlanColor(WorkspacePlan.STARTUP); // "text-white bg-green-600"
```

### 💰 **plan-pricing.service.ts** (Billing)

- **Purpose**: Pricing calculations and billing logic
- **Responsibilities**:
  - Pricing constants and calculations
  - Price formatting functions
  - Discount and savings calculations
  - Billing interval handling

```typescript
import {
  getMonthlyPrice,
  getYearlySavings,
  calculateTotalPrice,
} from "@/services/plan/plan-pricing.service";

const monthlyPrice = getMonthlyPrice(WorkspacePlan.DEVELOPER); // "$49"
const savings = getYearlySavings(WorkspacePlan.DEVELOPER); // "$120"
const total = calculateTotalPrice(plan, "yearly", 5); // With 5 additional users
```

### 🔒 **plan-access.service.ts** (Permissions)

- **Purpose**: Feature access control and permission checks
- **Responsibilities**:
  - Boolean permission checks
  - Count-based validations
  - Feature availability helpers
  - Limit text generation for UI

```typescript
import {
  canUserAddQueue,
  canUserAddQueueWithCount,
  getQueueLimitText,
} from "@/services/plan/plan-access.service";

const canAdd = canUserAddQueue(plan); // boolean
const canAddMore = canUserAddQueueWithCount(plan, currentCount); // boolean
const limitText = getQueueLimitText(plan); // "Up to 10 queues"
```

## Import Patterns

### ✅ **Recommended Imports**

```typescript
// For specific functionality, import from specialized services
import { validateQueueCreation } from "@/services/plan.service";
import { getPlanDisplayName } from "@/services/plan/plan-display.service";
import { getMonthlyPrice } from "@/services/plan/plan-pricing.service";
import { canUserAddQueue } from "@/services/plan/plan-access.service";

// For convenience, use barrel export
import {
  validateQueueCreation,
  getPlanDisplayName,
  getMonthlyPrice,
  canUserAddQueue,
} from "@/services/plan";
```

### ⚠️ **Legacy Compatibility**

```typescript
// Still works for backward compatibility
import { getUnifiedPlanFeatures, PLAN_FEATURES } from "@/services/plan.service";

// But prefer the modular approach above
```

## Usage Examples

### **Backend Controller Usage**

```typescript
import {
  validateQueueCreation,
  canUserAddQueueWithCount,
} from "@/services/plan.service";

// Validation with error throwing
try {
  validateQueueCreation(workspace.plan, currentQueueCount, workspace.id);
  // Proceed with queue creation
} catch (error) {
  if (error instanceof PlanLimitExceededError) {
    return c.json({ error: error.message }, 403);
  }
  throw error;
}

// Simple permission check
if (!canUserAddQueueWithCount(workspace.plan, currentQueueCount)) {
  return c.json({ error: "Queue limit exceeded" }, 403);
}
```

### **Frontend Component Usage**

```typescript
import {
  getPlanDisplayName,
  getPlanColor,
  getMonthlyPrice,
  canUserAddQueue
} from '@/services/plan';

function PlanCard({ plan }: { plan: WorkspacePlan }) {
  return (
    <div className={getPlanColor(plan)}>
      <h3>{getPlanDisplayName(plan)}</h3>
      <p>{getMonthlyPrice(plan)}/month</p>
      {canUserAddQueue(plan) && (
        <button>Add Queue</button>
      )}
    </div>
  );
}
```

### **Billing Logic Usage**

```typescript
import {
  calculateTotalPrice,
  getYearlySavings,
  getYearlySavingsPercentage
} from '@/services/plan/plan-pricing.service';

function BillingCalculator({ plan, billingInterval, userCount }: Props) {
  const totalPrice = calculateTotalPrice(plan, billingInterval, userCount - 1);
  const savings = getYearlySavings(plan);
  const savingsPercent = getYearlySavingsPercentage(plan);

  return (
    <div>
      <p>Total: {formatPriceWithCents(totalPrice)}</p>
      {billingInterval === 'yearly' && savings && (
        <p>Save {savings} ({savingsPercent}%) annually!</p>
      )}
    </div>
  );
}
```

## Migration Guide

### **From Old `plan.service.ts`**

```typescript
// OLD - Monolithic approach
import {
  getUnifiedPlanFeatures,
  canUserAddQueue,
  getPlanDisplayName,
} from "@/services/plan.service";

const features = getUnifiedPlanFeatures(plan);
const canAdd = features.canAddQueue;
const name = features.displayName;
```

```typescript
// NEW - Modular approach
import { canUserAddQueue, getPlanDisplayName } from "@/services/plan"; // Barrel export

const canAdd = canUserAddQueue(plan);
const name = getPlanDisplayName(plan);
```

## Benefits

### ✅ **Improved Maintainability**

- **Single Responsibility**: Each service has a clear, focused purpose
- **Smaller Files**: Easier to navigate and understand (~200-300 lines each vs. 800+ lines)
- **Isolated Testing**: Test validation logic separately from display logic

### ✅ **Better Performance**

- **Tree Shaking**: Import only what you need
- **Reduced Bundle Size**: Frontend can exclude backend validation logic
- **Faster Compilation**: TypeScript processes smaller files more efficiently

### ✅ **Enhanced Developer Experience**

- **Clear Intent**: Service names indicate purpose
- **Better IntelliSense**: More targeted autocomplete suggestions
- **Easier Refactoring**: Changes to pricing don't affect validation logic

### ✅ **Scalability**

- **Independent Evolution**: Services can grow and change independently
- **Feature Addition**: Easy to add new specialized services
- **Team Collaboration**: Different developers can work on different aspects

## Backward Compatibility

The main `plan.service.ts` maintains full backward compatibility by re-exporting all functions from the specialized services. Existing code will continue to work without changes, but new code should prefer the modular imports for better maintainability.

## Future Enhancements

This modular structure makes it easy to add:

- **plan-analytics.service.ts** - Usage analytics and reporting
- **plan-migration.service.ts** - Plan upgrade/downgrade logic
- **plan-trial.service.ts** - Trial management and conversion
- **plan-enterprise.service.ts** - Enterprise-specific features
- **plan-localization.service.ts** - Internationalization support
