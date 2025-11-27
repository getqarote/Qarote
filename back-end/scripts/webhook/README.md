# Webhook Testing Script

This script provides comprehensive testing for webhook functionality, including sending webhooks, testing retry logic, HMAC signatures, and payload validation.

## Usage

### Run all tests (default)

```bash
npm run webhook:test
```

### Run specific test

```bash
npm run webhook:test basic      # Test basic webhook without secret
npm run webhook:test secret     # Test webhook with HMAC signature
npm run webhook:test multiple   # Test sending to multiple webhooks
npm run webhook:test retry      # Test retry logic with failing endpoint
npm run webhook:test timeout    # Test timeout handling
npm run webhook:test payload    # Test payload structure validation
```

## Environment Variables

You can customize test URLs and secrets using environment variables:

```bash
# Basic webhook test URL
WEBHOOK_TEST_URL=https://webhook.site/your-unique-url

# Webhook secret for signature testing
WEBHOOK_SECRET=your-secret-key

# Multiple webhook URLs
WEBHOOK_TEST_URL_1=https://webhook.site/url-1
WEBHOOK_TEST_URL_2=https://webhook.site/url-2

# For retry/timeout tests
WEBHOOK_FAIL_URL=https://httpstat.us/500
WEBHOOK_TIMEOUT_URL=https://httpstat.us/200?sleep=15000
```

## Tests

### 1. Basic Webhook

Tests sending a webhook without HMAC signature. Verifies:

- Successful webhook delivery
- Correct payload structure
- HTTP status codes

### 2. Webhook with Secret

Tests sending a webhook with HMAC-SHA256 signature. Verifies:

- Signature header is present
- Signature format (`sha256=<hex-string>`)
- Payload integrity

### 3. Multiple Webhooks

Tests sending to multiple webhooks in parallel. Verifies:

- Parallel execution
- Individual webhook results
- Success/failure tracking

### 4. Retry Logic

Tests retry behavior with failing endpoints (5xx errors). Verifies:

- Exponential backoff
- Maximum retry attempts (3)
- Error handling

### 5. Timeout Handling

Tests timeout behavior with slow endpoints. Verifies:

- 10-second timeout
- Proper error handling
- Request cancellation

### 6. Payload Structure

Validates webhook payload structure. Verifies:

- All required fields present
- Summary matches alert counts
- Correct data types

## Example Output

```
🚀 Starting Webhook Testing Suite

============================================================

🧪 Test 1: Basic webhook without secret

📤 Sending webhook to: https://webhook.site/unique-test-basic
📦 Payload summary: 2 alerts (1 critical, 1 warning)

✅ Webhook sent successfully!
   Status Code: 200
   Retries: 0
```

## Notes

- The script uses mock alert data for testing
- Real webhook endpoints (like webhook.site) are recommended for testing
- Retry and timeout tests may take longer to complete
- All tests are non-destructive and safe to run
