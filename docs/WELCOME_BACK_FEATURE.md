# Welcome Back Email Feature

## Overview

The "Welcome Back" feature automatically detects when users renew their subscription after canceling and sends them a personalized welcome back email. This helps re-engage returning customers and acknowledges their decision to give Rabbit Scout another chance.

## How It Works

### 1. Cancellation Tracking

When a subscription is canceled (either immediately or at period end), the system tracks:

- `canceledAt`: The date/time when the subscription was canceled
- `status`: Set to `CANCELED`

### 2. Renewal Detection

When processing Stripe webhook events (`customer.subscription.created` or `customer.subscription.updated`), the system checks:

- Was the previous subscription status `CANCELED`?
- Is the new subscription status `active`?
- Does a `canceledAt` date exist?

If all conditions are true, this is detected as a "renewal after cancellation."

### 3. Welcome Back Email

When a renewal after cancellation is detected:

- Sets `isRenewalAfterCancel: true` on the subscription
- Stores `previousCancelDate` for reference
- Sends a personalized welcome back email
- Logs the event for tracking

## Database Schema

The `Subscription` model includes renewal tracking fields:

```prisma
model Subscription {
  // ... other fields

  // Renewal tracking
  isRenewalAfterCancel  Boolean   @default(false)
  previousCancelDate    DateTime?

  // ... other fields
}
```

## Email Template

The welcome back email includes:

- Personalized greeting acknowledging their return
- Thank you message for giving Rabbit Scout another chance
- Current plan features and benefits
- Information about what's new since they left
- Clear call-to-action to access their dashboard

## Implementation Files

### Core Components

1. **Database Migration**: `20250704144556_add_renewal_tracking_fields`
   - Adds renewal tracking fields to Subscription model

2. **Email Template**: `src/services/email/templates/welcome-back-email.tsx`
   - React-based email template for welcome back messages

3. **Email Service**: `src/services/email/billing-email.service.ts`
   - `sendWelcomeBackEmail()` method for sending welcome back emails

4. **Webhook Handler**: `src/controllers/payment/webhook-handlers.ts`
   - `handleSubscriptionChange()` updated to detect renewals and send emails

### Supporting Files

5. **Email Service Integration**: `src/services/email/email.service.ts`
   - Exports welcome back email functionality

6. **Test Script**: `src/scripts/test-welcome-back-email.ts`
   - Manual testing script for email functionality

## Usage

### Automatic (Recommended)

The feature works automatically when users:

1. Cancel their subscription (via billing portal or admin cancellation)
2. Later create a new subscription or reactivate their account

### Manual Testing

```typescript
import { BillingEmailService } from "@/services/email/billing-email.service";
import { WorkspacePlan } from "@prisma/client";

await BillingEmailService.sendWelcomeBackEmail({
  to: "user@example.com",
  userName: "John Doe",
  workspaceName: "My Workspace",
  plan: WorkspacePlan.DEVELOPER,
  billingInterval: "monthly",
  previousCancelDate: "2024-06-01T00:00:00.000Z",
});
```

## Monitoring

### Logs

The system logs renewal detections:

```
Subscription updated for workspace {id}: DEVELOPER (active) - RENEWAL AFTER CANCELLATION
Welcome back email sent for workspace {id} - user renewed after cancellation
```

### Email Tracking

All welcome back emails are tracked with:

- Email type: `welcome_back`
- Context including workspace and user details
- Message ID for delivery tracking

## Edge Cases Handled

1. **Multiple Cancellations**: Only tracks the most recent cancellation date
2. **Failed Email Delivery**: Logs errors but doesn't block subscription processing
3. **Missing User Data**: Gracefully handles missing admin users or workspace data
4. **Plan Changes**: Only triggers on actual renewals, not plan upgrades/downgrades

## Configuration

The feature uses existing email configuration:

- Resend API for email delivery
- Frontend URL for dashboard links
- Standard email styling and branding

No additional configuration is required - the feature is enabled automatically.

## Future Enhancements

Potential improvements:

- Welcome back survey or feedback collection
- Special offers for returning customers
- Segmented messaging based on cancellation reason
- Analytics on renewal rates and email effectiveness
