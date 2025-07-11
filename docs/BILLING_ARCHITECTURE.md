# Billing Architecture Documentation

## Overview

The RabbitHQ billing system is designed to handle subscription management, payment processing, and billing analytics through a robust integration with Stripe. This document outlines the architecture, data models, API endpoints, and key concepts.

## Table of Contents

- [Core Concepts](#core-concepts)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
- [Stripe Integration](#stripe-integration)
- [Webhook Handling](#webhook-handling)
- [Security & Compliance](#security--compliance)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)

## Core Concepts

### Subscription vs Payment Separation

The billing system uses two distinct data models:

- **Subscription**: Represents the ongoing billing relationship (current state)
- **Payment**: Records individual transaction history (immutable log)

This separation provides:

- Clean data modeling with single responsibility
- Efficient queries for current state vs historical data
- Scalable payment history without affecting subscription performance
- Complete audit trail for financial compliance

### Billing Lifecycle

```
1. User Signup → Free Plan
2. Plan Upgrade → Stripe Checkout → Subscription Created
3. Recurring Billing → Payment Records Created
4. Plan Changes → Subscription Updated
5. Cancellation → Subscription Marked for Cancellation
6. Period End → Downgrade to Free Plan
```

## Data Models

### Subscription Table

Tracks the current subscription state for each workspace.

```prisma
model Subscription {
  id                    String   @id @default(cuid())
  workspaceId          String   @unique
  stripeSubscriptionId String?  @unique
  stripeCustomerId     String?
  status               String   // ACTIVE, CANCELED, PAST_DUE, etc.
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean  @default(false)
  canceledAt           DateTime?
  cancelationReason    String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  workspace            Workspace @relation(fields: [workspaceId], references: [id])
}
```

**Key Fields:**

- `stripeSubscriptionId`: Links to Stripe subscription
- `status`: Current subscription state
- `cancelAtPeriodEnd`: Whether cancellation is scheduled
- `cancelationReason`: Audit trail for cancellations

### Payment Table

Records individual payment transactions and attempts.

```prisma
model Payment {
  id                String   @id @default(cuid())
  workspaceId      String
  stripeInvoiceId  String?  @unique
  amount           Float
  currency         String   @default("usd")
  status           String   // SUCCEEDED, FAILED, PENDING
  paymentDate      DateTime?
  failureReason    String?
  receiptUrl       String?
  createdAt        DateTime @default(now())

  workspace        Workspace @relation(fields: [workspaceId], references: [id])
}
```

**Key Fields:**

- `stripeInvoiceId`: Links to Stripe invoice
- `amount`: Payment amount in cents
- `status`: Payment outcome
- `failureReason`: Error details for failed payments

## API Endpoints

### Billing Overview

```
GET /api/payments/billing/overview
```

Returns comprehensive billing information including:

- Current subscription status
- Upcoming invoice details
- Payment method information
- Usage statistics
- Recent payment history

**Response:**

```json
{
  "workspace": {
    "id": "workspace_123",
    "name": "My Company",
    "plan": "STARTUP"
  },
  "subscription": {
    "status": "ACTIVE",
    "currentPeriodEnd": "2025-08-01T00:00:00Z",
    "cancelAtPeriodEnd": false
  },
  "stripeSubscription": {
    /* Stripe subscription object */
  },
  "upcomingInvoice": {
    /* Next invoice details */
  },
  "paymentMethod": {
    /* Payment method details */
  },
  "currentUsage": {
    "servers": 3,
    "users": 5,
    "queues": 12,
    "messagesThisMonth": 1250
  },
  "recentPayments": [
    /* Last 5 payments */
  ]
}
```

### Subscription Details

```
GET /api/payments/billing/subscription
```

Returns current subscription information.

### Payment History

```
GET /api/payments/billing/payments?limit=20&offset=0
```

Returns paginated payment history with metadata.

### Cancel Subscription

```
POST /api/payments/billing/cancel
```

**Request Body:**

```json
{
  "cancelImmediately": false,
  "reason": "too_expensive",
  "feedback": "Optional user feedback"
}
```

**Response:**

```json
{
  "success": true,
  "subscription": {
    "status": "active",
    "cancelAtPeriodEnd": true,
    "currentPeriodEnd": "2025-08-01T00:00:00Z"
  },
  "message": "Subscription will be canceled at the end of your current billing period."
}
```

### Update Payment Method

```
POST /api/payments/billing/payment-method
```

Updates the default payment method for the subscription.

### Billing Portal Access

```
POST /api/payments/billing/portal
```

Returns Stripe Customer Portal URL for self-service billing management.

## Stripe Integration

### StripeService

Centralized service for all Stripe API interactions:

```typescript
class StripeService {
  // Subscription management
  static async getSubscription(id: string, expand?: string[]);
  static async cancelSubscriptionAdvanced(id: string, options: CancelOptions);
  static async updateSubscriptionPaymentMethod(
    subscriptionId: string,
    paymentMethodId: string
  );

  // Invoice handling
  static async getUpcomingInvoice(subscriptionId: string);

  // Customer portal
  static async createPortalSession(customerId: string, returnUrl: string);

  // Payment methods
  static async getPaymentMethod(paymentMethodId: string);

  // Utility methods
  static extractCustomerId(session: Session): string;
  static extractSubscriptionId(session: Session): string;
}
```

### Key Features

- **Error Handling**: Comprehensive error catching and logging
- **Type Safety**: Full TypeScript integration
- **Logging**: Structured logging for all operations
- **Retry Logic**: Built-in retry for transient failures

## Webhook Handling

### Supported Events

The system handles the following Stripe webhook events:

- `checkout.session.completed` - New subscription creation
- `customer.subscription.updated` - Subscription changes
- `customer.subscription.deleted` - Subscription cancellation
- `invoice.payment_succeeded` - Successful payment
- `invoice.payment_failed` - Failed payment
- `invoice.upcoming` - Upcoming payment notification

### Webhook Handlers

```typescript
// webhook-handlers.ts
export async function handleCheckoutSessionCompleted(session: Session);
export async function handleSubscriptionChange(subscription: Subscription);
export async function handleSubscriptionDeleted(subscription: Subscription);
export async function handlePaymentSucceeded(invoice: Invoice);
export async function handlePaymentFailed(invoice: Invoice);
```

### Data Synchronization

Webhooks ensure data consistency between Stripe and the application:

1. **Subscription Events** → Update `Subscription` table
2. **Payment Events** → Create `Payment` records
3. **Customer Events** → Update customer information

## Security & Compliance

### Authentication

- All billing endpoints require user authentication
- Workspace-level data isolation
- Role-based access control

### Data Protection

- Sensitive payment data stored only in Stripe
- PCI compliance through Stripe's infrastructure
- Minimal PII storage in application database

### Webhook Security

- Stripe webhook signature verification
- Idempotency handling for duplicate events
- Secure endpoint configuration

## Error Handling

### API Errors

```typescript
// Standard error response format
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { /* Additional context */ }
}
```

### Common Error Scenarios

1. **No Active Subscription**: 404 when accessing billing features
2. **Stripe API Failures**: 500 with retry mechanisms
3. **Invalid Payment Method**: 400 with validation details
4. **Webhook Processing**: Logged warnings, no user impact

### Logging

Structured logging using the logger service:

```typescript
logger.info(
  { workspaceId, action: "subscription_cancel" },
  "Subscription canceled"
);
logger.error({ error, context }, "Billing operation failed");
logger.warn({ subscriptionId }, "Stripe sync failed");
```

## Usage Examples

### Frontend Integration

```typescript
// Cancel subscription
const response = await apiClient.cancelSubscription({
  cancelImmediately: false,
  reason: "too_expensive",
  feedback: "Looking for a cheaper alternative",
});

// Get billing overview
const billing = await apiClient.getBillingOverview();
console.log(billing.currentUsage.servers); // Current server count
```

### Backend Webhook Processing

```typescript
// Process Stripe webhook
app.post("/webhook/stripe", async (c) => {
  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  switch (event.type) {
    case "customer.subscription.updated":
      await handleSubscriptionChange(event.data.object);
      break;
    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event.data.object);
      break;
  }
});
```

## Best Practices

### Data Consistency

- Always update local data when Stripe data changes
- Use webhooks as the source of truth for billing events
- Implement idempotency for webhook processing

### Performance

- Cache frequently accessed billing data
- Use database indexes on foreign keys
- Paginate payment history queries

### Monitoring

- Monitor webhook delivery success rates
- Track payment failure patterns
- Alert on subscription churn events

### Testing

- Use Stripe test mode for development
- Mock webhook events for unit tests
- Validate error handling scenarios

## Future Enhancements

### Planned Features

- Multi-currency support
- Usage-based billing
- Custom billing cycles
- Proration handling
- Advanced analytics dashboard

### Scalability Considerations

- Implement caching layer for billing data
- Consider read replicas for analytics queries
- Archive old payment records
- Optimize webhook processing performance

---

## Related Documentation

- [Stripe Integration Guide](./STRIPE_INTEGRATION.md)
- [API Reference](./API_REFERENCE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Error Handling Guide](./ERROR_HANDLING.md)

## Support

For billing-related issues:

1. Check Stripe dashboard for payment details
2. Review application logs for error context
3. Verify webhook delivery in Stripe
4. Contact development team with workspace ID and timestamps
