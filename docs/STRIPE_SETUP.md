# Stripe Setup Guide for Rabbit Scout

This guide covers how to set up Stripe payments for Rabbit Scout, including automated product/price creation and webhook configuration.

## Overview

Rabbit Scout uses Stripe for subscription billing with three tiers:

- **Developer Plan**: $49/month or $390/year (20% discount)
- **Startup Plan**: $99/month or $792/year (20% discount)
- **Business Plan**: $249/month or $1992/year (20% discount)

## Prerequisites

### 1. Stripe Account

- Create a Stripe account at [stripe.com](https://stripe.com)
- Get your API keys from the Stripe Dashboard
- Use **test mode** for development

### 2. Stripe CLI

Install the Stripe CLI on macOS:

```bash
brew install stripe/stripe-cli/stripe
```

Verify installation:

```bash
stripe --version
```

### 3. Login to Stripe CLI

**For Development (Test Mode):**

```bash
npm run stripe:login
# or manually: stripe login
```

**For Production (Live Mode):**

```bash
npm run stripe:login-live
# or manually: stripe login --live
```

**Check Current Mode:**

```bash
npm run stripe:mode
```

This will open your browser to authenticate with Stripe.

## Quick Setup

The easiest way to set up Stripe is using our automated setup script:

### 1. Create Products and Prices ✅

```bash
cd back-end
npm run setup-stripe create
```

This will:

- ✅ Create 3 products (Developer, Startup, Business)
- ✅ Create monthly and yearly prices for each
- ✅ Update your `.env` file with the price IDs
- ✅ Verify all prices exist in Stripe
- ✅ Provide next steps

**Status**: ✅ **Working** - Script tested and fully functional

### 2. Start Webhook Forwarding (Development)

```bash
npm run setup-stripe webhook
```

This forwards Stripe webhooks to your local server. Keep this terminal open during development.

**Important**: Copy the webhook signing secret from the output and add it to your `.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 3. Verify Setup

```bash
npm run setup-stripe verify
```

This checks that all environment variables are set and prices exist in Stripe.

### 4. Test CLI Commands (Troubleshooting)

```bash
npm run setup-stripe test
```

This tests basic Stripe CLI functionality and helps diagnose any setup issues.

## Available Commands

### Setup Commands

```bash
npm run setup-stripe create    # Create all products and prices
npm run setup-stripe verify    # Verify configuration
npm run setup-stripe test      # Test CLI functionality
npm run setup-stripe mode      # Check current mode (test/live)
npm run setup-stripe list      # List existing products
npm run setup-stripe clean     # Archive test products
npm run setup-stripe webhook   # Start webhook forwarding
```

### Login Commands

```bash
npm run stripe:login           # Login to test mode
npm run stripe:login-live      # Login to live mode (production)
npm run stripe:mode            # Check current mode
```

### Individual Commands

```bash
npm run stripe:create          # Create products and prices
npm run stripe:verify          # Verify setup
npm run stripe:test            # Test CLI
npm run stripe:list            # List products
npm run stripe:clean           # Clean up
npm run stripe:webhook         # Webhook forwarding
```

## Manual Setup

If you prefer manual setup or need to customize the configuration:

### 1. Create Products in Stripe Dashboard

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Create three products:

**Developer Plan**

- Name: "Developer Plan"
- Description: "Perfect for individual developers and small teams"
- Metadata: `plan=developer`, `created_by=rabbit_scout`

**Startup Plan**

- Name: "Startup Plan"
- Description: "Ideal for growing startups and medium teams"
- Metadata: `plan=startup`, `created_by=rabbit_scout`

**Business Plan**

- Name: "Business Plan"
- Description: "Enterprise-grade solution for large organizations"
- Metadata: `plan=business`, `created_by=rabbit_scout`

### 2. Create Prices

For each product, create two prices:

**Monthly Prices:**

- Developer: $49.00 USD, recurring monthly
- Startup: $99.00 USD, recurring monthly
- Business: $249.00 USD, recurring monthly

**Yearly Prices (20% discount):**

- Developer: $390.00 USD, recurring yearly
- Startup: $792.00 USD, recurring yearly
- Business: $1,992.00 USD, recurring yearly

### 3. Update Environment Variables

Add the following to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Price IDs (replace with your actual IDs)
STRIPE_DEVELOPER_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_DEVELOPER_YEARLY_PRICE_ID=price_xxxxx
STRIPE_STARTUP_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_STARTUP_YEARLY_PRICE_ID=price_xxxxx
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_BUSINESS_YEARLY_PRICE_ID=price_xxxxx

# Webhook Secret (for development)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

## Setup Script Commands

The setup script supports several commands:

### Create Everything

```bash
npm run setup-stripe create
```

Creates all products, prices, and updates `.env` file.

### List Existing Products

```bash
npm run setup-stripe list
```

Shows all current products and prices in your Stripe account.

### Clean Up Test Data

```bash
npm run setup-stripe clean
```

Archives test products created by the script (useful for cleanup).

### Verify Configuration

```bash
npm run setup-stripe verify
```

Checks that all required environment variables are set and prices exist.

### Start Webhook Forwarding

```bash
npm run setup-stripe webhook
```

Forwards webhooks to `localhost:3001/api/payments/webhook`.

### Show Help

```bash
npm run setup-stripe help
```

Displays all available commands and usage examples.

## Webhook Configuration

### Development

Use the Stripe CLI for local development:

```bash
stripe listen --forward-to localhost:3001/api/payments/webhook
```

The CLI will output a webhook signing secret - add this to your `.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Production

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Create a new webhook endpoint
3. Set URL to: `https://yourdomain.com/api/payments/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret to your production `.env`

## Testing

### Test the Payment Flow

1. Start your development server
2. Go to the Plans page in the app
3. Try subscribing to a plan
4. Use Stripe's test card numbers:
   - Success: `4242424242424242`
   - Decline: `4000000000000002`

### Verify Webhooks

1. Make a test subscription
2. Check your webhook forwarding terminal for events
3. Verify subscription status updates in your app

## Troubleshooting

### Common Issues

**"Stripe CLI not found"**

```bash
brew install stripe/stripe-cli/stripe
```

**"Not logged into Stripe"**

```bash
stripe login
```

**"Price not found in Stripe"**

- Run `npm run setup-stripe verify` to check configuration
- Run `npm run setup-stripe create` to recreate missing prices

**"Webhook events not received"**

- Ensure webhook forwarding is running: `npm run setup-stripe webhook`
- Check that your server is running on port 3001
- Verify webhook secret is set in `.env`

### Environment Variables Missing

If setup failed or variables are missing:

1. Run `npm run setup-stripe verify` to see what's missing
2. Run `npm run setup-stripe create` to recreate everything
3. Manually check your `.env` file

### Clean Start

To start fresh:

1. `npm run setup-stripe clean` (archives old products)
2. `npm run setup-stripe create` (creates new products)
3. `npm run setup-stripe verify` (confirms setup)

## Production Deployment

### Before Deploying

1. Switch to live mode in Stripe Dashboard
2. Get live API keys (starting with `sk_live_` and `pk_live_`)
3. Run the setup script with live keys
4. Configure production webhook endpoint
5. Update environment variables in your hosting platform

### Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Rotate keys periodically
- Monitor webhook signatures in production

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe CLI Reference](https://stripe.com/docs/cli)
- [Webhook Events Guide](https://stripe.com/docs/webhooks)

For project-specific issues, check the setup script output or run the verify command for detailed diagnostics.
