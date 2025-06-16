# Temporary Cache System

This document describes the PostgreSQL-based temporary cache system implemented for privacy-first data storage.

## Overview

The `TemporaryStorage` class provides a PostgreSQL-backed caching system with automatic TTL (Time To Live) management. This system is used to store temporary data when users haven't consented to permanent data storage.

## Features

- **PostgreSQL-backed storage**: More reliable than in-memory caching
- **Automatic TTL**: Data expires automatically based on configurable time limits
- **Type-safe operations**: Uses Prisma client for database operations
- **Automatic cleanup**: Periodic removal of expired entries
- **Admin monitoring**: Built-in statistics and manual cleanup endpoints

## Database Schema

The cache uses a dedicated `temp_cache` table:

```sql
CREATE TABLE "temp_cache" (
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "temp_cache_pkey" PRIMARY KEY ("key")
);
```

## API Reference

### Basic Operations

```typescript
// Store data with TTL
await TemporaryStorage.set("user_123_queues", queueData, 30); // 30 minutes

// Retrieve data
const data = await TemporaryStorage.get("user_123_queues");

// Delete specific entry
await TemporaryStorage.delete("user_123_queues");

// Clear all cache
await TemporaryStorage.clear();
```

### User-Specific Operations

```typescript
// Store user-specific data with auto-generated keys
await TemporaryStorage.setUserData("123", "queues", data, "server_1", 30);

// Retrieve user-specific data
const userQueues = await TemporaryStorage.getUserData(
  "123",
  "queues",
  "server_1"
);
```

### Administrative Operations

```typescript
// Get cache statistics
const stats = await TemporaryStorage.getStats();
// Returns: { totalKeys, memoryUsage, oldestEntry }

// Manual cleanup of expired entries
const result = await TemporaryStorage.cleanup();
// Returns: { deletedCount }

// Extend TTL for existing key
const extended = await TemporaryStorage.extend("user_123_queues", 30);
// Returns: boolean (success/failure)
```

### Automatic Cleanup

The system includes automatic cleanup mechanisms:

1. **Periodic cleanup**: Runs every hour (configurable)
2. **Probabilistic cleanup**: Random cleanup during set operations (1% chance)
3. **Manual cleanup**: Admin endpoint for immediate cleanup

## HTTP Endpoints

### Cache Statistics (Admin Only)

```
GET /api/rabbitmq/cache/stats
```

Response:

```json
{
  "cache": {
    "totalKeys": 25,
    "memoryUsage": "1.2MB",
    "oldestEntry": "2025-06-15T10:30:00.000Z"
  },
  "timestamp": "2025-06-15T14:30:00.000Z"
}
```

### Manual Cleanup (Admin Only)

```
POST /api/rabbitmq/cache/cleanup
```

Response:

```json
{
  "message": "Cache cleanup completed",
  "deletedCount": 12,
  "timestamp": "2025-06-15T14:30:00.000Z"
}
```

## Configuration

### Startup Configuration

The cache system is automatically initialized when the server starts:

```typescript
// In src/index.ts
const cleanupInterval = TemporaryStorage.startPeriodicCleanup(60); // Every 60 minutes
```

### Environment Variables

No additional environment variables are required. The cache uses the same database connection as the main application.

## Migration

The cache table is created through Prisma migrations:

```bash
# Apply the migration
npx prisma migrate dev --name add_temp_cache

# Generate the Prisma client
npx prisma generate
```

## Performance Considerations

- **Indexes**: The table includes indexes on `expires_at` and `created_at` for efficient queries
- **JSONB storage**: Uses PostgreSQL's JSONB for efficient JSON storage and querying
- **Automatic cleanup**: Prevents unbounded growth through automatic expiration
- **Connection pooling**: Uses the same connection pool as the main application

## Security

- **Admin-only endpoints**: Cache management endpoints require admin privileges
- **TTL enforcement**: All data has mandatory expiration times
- **No sensitive data persistence**: Designed for temporary, non-sensitive data storage

## Monitoring

Monitor cache performance through:

1. **Cache statistics endpoint**: Get real-time cache metrics
2. **Database monitoring**: Standard PostgreSQL monitoring tools
3. **Application logs**: Cleanup operations are logged

## Best Practices

1. **Use appropriate TTL values**: Match TTL to data sensitivity and usage patterns
2. **Monitor cache size**: Use the stats endpoint to monitor growth
3. **Regular cleanup**: The automatic cleanup should handle most cases, but manual cleanup can be useful during high-load periods
4. **Key naming conventions**: Use consistent, descriptive key patterns for easier management
