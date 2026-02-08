/**
 * Vitest Setup File
 *
 * This file runs before any tests and sets up the test environment.
 * It configures environment variables required for config validation
 * that happens at module load time.
 *
 * This approach is better than setting env vars in CI workflows because:
 * 1. Centralizes test configuration in one place
 * 2. Works locally and in CI without duplication
 * 3. Makes test requirements explicit
 * 4. Allows tests to mock dependencies without config validation failures
 */

// Set required environment variables before any imports
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test_db";
process.env.PORT = "4000";
process.env.HOST = "localhost";
process.env.LOG_LEVEL = "info";
process.env.JWT_SECRET = "test-jwt-secret-for-tests-only";
process.env.ENCRYPTION_KEY = "test-encryption-key-for-tests-only-32-chars";
process.env.CORS_ORIGIN = "*";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.PORTAL_FRONTEND_URL = "http://localhost:3001";
process.env.FROM_EMAIL = "noreply@test.com";
process.env.EMAIL_PROVIDER = "smtp";
process.env.STRIPE_SECRET_KEY = "sk_test_mock";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock";
process.env.STRIPE_DEVELOPER_MONTHLY_PRICE_ID = "price_test_mock";
process.env.STRIPE_DEVELOPER_YEARLY_PRICE_ID = "price_test_mock";
process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID = "price_test_mock";
process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID = "price_test_mock";
process.env.GOOGLE_CLIENT_ID = "mock-google-client-id";
process.env.NOTION_API_KEY = "mock-notion-api-key";
process.env.NOTION_DATABASE_ID = "mock-notion-db-id";
// Mock private key for testing license file generation in webhook tests
// This is required for tests that exercise license renewal flows
// Using multiline template literal to ensure proper newline handling
process.env.LICENSE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
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
AuibG7+e31D18zmuINShSr8fq+h9uA==
-----END PRIVATE KEY-----`;

// Export empty object to satisfy TypeScript module requirements
export {};
