#!/usr/bin/env tsx

// Simple test script to verify Pino-Sentry integration
import { initSentry } from "../src/core/sentry";
import { logger } from "../src/core/logger";

// Mock config for testing
process.env.SENTRY_DSN = "https://example@sentry.io/project";
process.env.SENTRY_ENVIRONMENT = "test";

console.log("🧪 Testing Pino-Sentry integration...");

// Initialize Sentry
initSentry();

console.log("✅ Sentry initialized");

// Test different log levels
logger.info("This is an info message - should not go to Sentry by default");
logger.warn("This is a warning message - should go to Sentry");
logger.error("This is an error message - should go to Sentry");

// Test with error object
const testError = new Error("Test error for Sentry");
logger.error({ err: testError }, "Error with exception object");

// Test with structured data
logger.warn(
  {
    userId: "123",
    operation: "test",
    duration: 500,
  },
  "Operation completed with warning"
);

// Test fatal level
logger.fatal("Critical system error - should definitely go to Sentry");

console.log("✅ All test logs sent");
console.log("📝 Check your Sentry dashboard for the warn/error/fatal logs");
console.log("ℹ️  Info logs should only appear in console (not Sentry)");
