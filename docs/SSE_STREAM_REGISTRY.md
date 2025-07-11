# SSE Stream Registry Architecture

## Overview

The SSE (Server-Sent Events) Stream Registry provides robust, production-ready tracking and management of active SSE streams for RabbitMQ queue message browsing in the RabbitHQ SaaS dashboard. This system ensures reliable stream management across multiple server instances using PostgreSQL as the persistent registry.

## Key Features

- **Cross-Server Visibility**: Track streams across multiple backend instances
- **Persistent Registry**: PostgreSQL-based storage for reliability and persistence
- **Automatic Cleanup**: Handles stale stream detection and cleanup
- **Admin Monitoring**: Complete visibility into active streams
- **Graceful Shutdown**: Proper cleanup when streams are terminated
- **Health Monitoring**: Stream statistics and health metrics

## Architecture Components

### 1. Database Schema

The system uses a PostgreSQL table to track active streams:

```sql
model ActiveStream {
  id                String       @id @default(cuid())
  userId            String
  workspaceId       String
  serverId          String
  queueName         String
  status            StreamStatus @default(ACTIVE)
  startedAt         DateTime     @default(now())
  lastHeartbeat     DateTime     @default(now())
  endedAt           DateTime?
  serverInstance    String       // Identifies which backend instance owns the stream
  metadata          Json?        // Additional stream metadata
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  @@map("active_streams")
}

enum StreamStatus {
  ACTIVE
  STOPPED
  STALE
}
```

### 2. DatabaseStreamRegistry Class

Located in `back-end/src/core/DatabaseStreamRegistry.ts`, this class provides:

#### Core Methods

- `registerStream()`: Register a new SSE stream
- `stopStream()`: Stop a specific stream
- `stopAllUserStreams()`: Stop all streams for a user
- `cleanupStaleStreams()`: Remove streams that haven't sent heartbeats
- `getActiveStreams()`: Get all active streams
- `getHealthStats()`: Get registry health statistics

#### Key Features

- **Local Cleanup Functions**: Each stream has a cleanup function stored in memory
- **Heartbeat System**: Regular heartbeat updates to detect stale streams
- **Background Cleanup**: Automatic cleanup of stale streams every 5 minutes
- **Cross-Instance Coordination**: Database-based coordination between server instances

## How It Works

### Stream Registration Flow

1. **Client Request**: Frontend requests SSE stream for queue browsing
2. **Authentication**: Backend verifies user permissions
3. **Stream Creation**: SSE connection is established
4. **Registry Entry**: Stream is registered in the database with status `ACTIVE`
5. **Local Tracking**: Cleanup function is stored in local memory
6. **Heartbeat Loop**: Regular heartbeat updates maintain stream health

```typescript
// Example registration
const streamId = await streamRegistry.registerStream({
  userId: user.id,
  workspaceId: user.workspaceId,
  serverId,
  queueName,
  cleanupFn: () => {
    // Local cleanup logic
    isActive = false;
    if (intervalId) clearInterval(intervalId);
  },
});
```

### Stream Cleanup Flow

1. **Trigger**: Stream cleanup can be triggered by:
   - Client disconnect
   - Explicit stop request
   - Stale stream detection
   - Server shutdown

2. **Local Cleanup**: Execute the cleanup function to stop local resources
3. **Database Update**: Mark stream as `STOPPED` in the database
4. **Resource Release**: Free up memory and close connections

### Stale Stream Detection

- **Heartbeat Interval**: Every 30 seconds during active streaming
- **Stale Threshold**: Streams without heartbeat for 5 minutes are considered stale
- **Cleanup Process**: Background job removes stale streams every 5 minutes

## API Endpoints

### Stream Management

```typescript
// Start browsing (creates SSE stream)
GET /servers/:serverId/queues/:queueName/messages/browse

// Stop specific stream
POST /servers/:serverId/queues/:queueName/messages/browse/stop
```

### Admin Endpoints

```typescript
// Get all active streams
GET /admin/streams

// Stop all streams for a user
POST /admin/streams/users/:userId/stop

// Get registry health statistics
GET /admin/streams/health
```

## Configuration

### Environment Variables

```bash
# Stream cleanup intervals (optional)
STREAM_HEARTBEAT_INTERVAL=30000    # 30 seconds
STREAM_STALE_THRESHOLD=300000      # 5 minutes
STREAM_CLEANUP_INTERVAL=300000     # 5 minutes
STREAM_MAX_DURATION=1800000        # 30 minutes
```

### Default Settings

- **Heartbeat Interval**: 30 seconds
- **Stale Threshold**: 5 minutes (no heartbeat)
- **Cleanup Interval**: 5 minutes (background cleanup)
- **Max Stream Duration**: 30 minutes (auto-disconnect)

## Production Considerations

### Performance

- **Database Impact**: Minimal - only metadata storage, no message content
- **Memory Usage**: Local cleanup functions stored per active stream
- **Background Jobs**: Single cleanup job per server instance
- **Heartbeat Load**: Lightweight database updates every 30 seconds per stream

### Scalability

- **Multi-Server Support**: Full support for multiple backend instances
- **Database Scaling**: Uses standard PostgreSQL with simple queries
- **Stream Limits**: No hard limits, but consider connection pool sizes
- **Resource Cleanup**: Automatic cleanup prevents resource leaks

### Monitoring

Monitor these metrics for production health:

```sql
-- Active stream count
SELECT COUNT(*) FROM active_streams WHERE status = 'ACTIVE';

-- Stale stream count
SELECT COUNT(*) FROM active_streams
WHERE status = 'ACTIVE' AND last_heartbeat < NOW() - INTERVAL '5 minutes';

-- Average stream duration
SELECT AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_duration_seconds
FROM active_streams WHERE ended_at IS NOT NULL;

-- Streams by server instance
SELECT server_instance, COUNT(*)
FROM active_streams
WHERE status = 'ACTIVE'
GROUP BY server_instance;
```

## Troubleshooting

### Common Issues

1. **Stale Streams Accumulating**
   - Check if cleanup job is running
   - Verify heartbeat updates are working
   - Check database connectivity

2. **Memory Leaks**
   - Ensure cleanup functions are being called
   - Monitor local cleanup function storage
   - Check for unhandled client disconnects

3. **Cross-Server Issues**
   - Verify all instances use the same database
   - Check server instance identification
   - Monitor database connection health

### Debug Queries

```sql
-- Find streams without recent heartbeats
SELECT * FROM active_streams
WHERE status = 'ACTIVE'
AND last_heartbeat < NOW() - INTERVAL '5 minutes';

-- Find long-running streams
SELECT *, EXTRACT(EPOCH FROM (NOW() - started_at)) as duration_seconds
FROM active_streams
WHERE status = 'ACTIVE'
ORDER BY started_at ASC;

-- Stream activity by user
SELECT user_id, workspace_id, COUNT(*) as active_streams
FROM active_streams
WHERE status = 'ACTIVE'
GROUP BY user_id, workspace_id;
```

## Implementation Details

### Why PostgreSQL Over Redis or Memory?

1. **Persistence**: Survives server restarts
2. **Consistency**: ACID compliance for reliable state
3. **Simplicity**: No additional infrastructure dependencies
4. **Existing Integration**: Already using Prisma/PostgreSQL
5. **Cross-Server Coordination**: Natural multi-instance support

### Why Local Cleanup Functions?

Each SSE stream has unique local resources that need cleanup:

- Interval timers for polling
- Stream write handles
- Connection state variables
- Timeout handles

These cannot be serialized to the database and must be managed locally on each server instance.

### Security Considerations

- **User Isolation**: Streams are isolated by workspace and user
- **Permission Checks**: Server ownership verified before stream creation
- **Resource Limits**: Maximum duration prevents indefinite connections
- **Admin Access**: Admin endpoints require super admin privileges

## Migration and Deployment

### Database Migration

The required database schema is created via Prisma migration:

```bash
npx prisma migrate dev --name add_stream_registry
```

### Deployment Steps

1. Apply database migration
2. Deploy updated backend code
3. Monitor stream registry health
4. Verify cleanup jobs are running

### Zero-Downtime Deployment

The system supports zero-downtime deployment:

1. New instances register with different `serverInstance` IDs
2. Old streams continue on existing instances
3. New streams use new instances
4. Old instances gracefully shut down after streams end

## Future Enhancements

### Potential Improvements

1. **Real-time Cleanup**: PostgreSQL LISTEN/NOTIFY for instant cross-server cleanup
2. **Stream Metrics**: Detailed performance and usage analytics
3. **Rate Limiting**: Per-user stream limits and throttling
4. **Stream Persistence**: Resume streams after server restart
5. **Advanced Monitoring**: Prometheus metrics and alerting

### Event-Driven Cleanup (Optional)

For instant cross-server cleanup, PostgreSQL LISTEN/NOTIFY could be implemented:

```sql
-- Listen for stream stop events
LISTEN stream_stop_events;

-- Notify other instances when stopping a stream
NOTIFY stream_stop_events, '{"streamId": "abc123", "action": "stop"}';
```

This would allow immediate cleanup across all server instances without waiting for the next heartbeat cycle.
