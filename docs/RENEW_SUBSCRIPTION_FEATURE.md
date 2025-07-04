# Renew Subscription Feature Usage

## Overview

The `SubscriptionManagement` component now includes a "Renew Subscription" button that appears when users have canceled their subscription. This makes it easy for them to restart their subscription, which will trigger the welcome back email feature.

## Component Props

### New Props Added

```typescript
interface SubscriptionManagementProps {
  // ... existing props
  onRenewSubscription?: () => void; // Handler for renewing subscription
  subscriptionCanceled?: boolean; // True if user had a subscription but canceled it
  lastPlan?: WorkspacePlan; // The plan they had before canceling
}
```

## Usage Examples

### For Canceled Subscriptions (FREE plan with previous subscription)

```tsx
<SubscriptionManagement
  currentPlan={WorkspacePlan.FREE}
  subscriptionCanceled={true}
  lastPlan={WorkspacePlan.DEVELOPER}
  onRenewSubscription={handleRenewSubscription}
  // ... other props
/>
```

### For Active Subscriptions Scheduled for Cancellation

```tsx
<SubscriptionManagement
  currentPlan={WorkspacePlan.DEVELOPER}
  cancelAtPeriodEnd={true}
  periodEnd="2024-08-15T00:00:00.000Z"
  onRenewSubscription={handleReactivateSubscription}
  // ... other props
/>
```

## UI States

### 1. Canceled Subscription (FREE plan with history)

- Shows a blue information card in the content area
- Displays "Ready to come back?" message
- Shows "Renew {LastPlan} Plan" button in both header and content
- Use: When user is on FREE plan but previously had a paid subscription

### 2. Active Subscription Scheduled for Cancellation

- Shows amber warning card in the content area
- Displays cancellation date and reactivation option
- Shows "Reactivate Plan" button alongside cancellation notice
- Use: When user has an active subscription that's set to cancel at period end

### 3. Regular Active Subscription

- Shows normal "Cancel Subscription" button
- No special renewal messaging
- Use: When user has an active subscription not scheduled for cancellation

## Implementation Guide

### Backend Integration

1. **Determine if subscription was canceled**: Check if user is on FREE plan but has subscription history
2. **Get last plan**: Retrieve the most recent paid plan from subscription history
3. **Handle renewal**: When `onRenewSubscription` is called, redirect to checkout or billing portal

### Example Handler

```typescript
const handleRenewSubscription = async () => {
  try {
    // Option 1: Redirect to checkout for the same plan
    const checkoutUrl = await createCheckoutSession({
      plan: lastPlan,
      billingInterval: "monthly", // or get from previous subscription
    });
    window.location.href = checkoutUrl;

    // Option 2: Redirect to billing portal
    const portalUrl = await createBillingPortalSession();
    window.location.href = portalUrl;
  } catch (error) {
    console.error("Failed to renew subscription:", error);
  }
};
```

## Welcome Back Email Integration

When a user renews their subscription through this feature:

1. The backend webhook will detect it as a renewal after cancellation
2. The `isRenewalAfterCancel` flag will be set in the database
3. A welcome back email will be automatically sent
4. The user experience will be enhanced with personalized messaging

## Styling

- **Renew buttons**: Green color scheme (`bg-green-600 hover:bg-green-700`)
- **Information cards**: Blue for renewal encouragement, amber for pending cancellation
- **Icons**: `RefreshCw` for renewal actions, `Clock` for time-sensitive info
- **Responsive**: Buttons stack appropriately on mobile devices

This feature creates a smooth path for users to return to paid plans while providing clear visual feedback about their subscription status.
