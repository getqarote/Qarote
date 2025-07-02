# RabbitMQ Controllers

This directory contains the modular RabbitMQ controllers that were split from the original monolithic `rabbitmq.controller.ts` file. The controllers are organized by domain and responsibility for better maintainability and code organization.

## Controller Structure

### 📁 `shared.ts`

Common utilities and helper functions used across all RabbitMQ controllers:

- `getDecryptedCredentials()` - Decrypts server credentials for RabbitMQ client
- `verifyServerAccess()` - Verifies server belongs to user's workspace
- `createRabbitMQClient()` - Creates RabbitMQ client with error handling
- `createErrorResponse()` - Standard error response formatter
- `WarningInfo` type definition

### 📁 `overview.controller.ts`

Server overview and basic information:

- `GET /servers/:id/overview` - Get server overview with plan validation warnings

### 📁 `queues.controller.ts`

Queue management operations:

- `GET /servers/:id/queues` - List all queues with metrics storage
- `GET /servers/:id/queues/:queueName` - Get specific queue details
- `GET /servers/:id/queues/:queueName/consumers` - Get queue consumers
- `POST /servers/:serverId/queues` - Create new queue (with plan validation)
- `DELETE /servers/:serverId/queues/:queueName/messages` - Purge queue messages

### 📁 `messages.controller.ts`

Message handling and streaming:

- `POST /servers/:serverId/queues/:queueName/messages` - Send message to queue
- `GET /servers/:serverId/queues/:queueName/messages/browse` - Browse messages with SSE streaming
- `POST /servers/:serverId/queues/:queueName/messages/browse/stop` - Stop SSE stream

### 📁 `metrics.controller.ts`

Performance metrics and monitoring:

- `GET /servers/:id/metrics` - Get server metrics
- `GET /servers/:id/metrics/timeseries` - Get timeseries metrics with historical data

### 📁 `infrastructure.controller.ts`

RabbitMQ infrastructure components:

- `GET /servers/:id/nodes` - Get all cluster nodes
- `GET /servers/:id/exchanges` - Get all exchanges
- `GET /servers/:id/connections` - Get all connections
- `GET /servers/:id/channels` - Get all channels

### 📁 `memory.controller.ts`

Advanced memory monitoring (plan-gated features):

- `GET /servers/:id/nodes/:nodeName/memory` - Detailed memory metrics with optimization suggestions

### 📁 `admin.controller.ts`

Administrative endpoints for stream management:

- `GET /admin/streams` - Monitor active SSE streams
- `POST /streams/stop-all` - Stop all user streams
- `GET /streams/health` - Stream registry health check

### 📁 `index.ts`

Main controller aggregator that combines all sub-controllers into a single mountable controller.

## Key Features

### ✅ Shared Utilities

- Consistent error handling across all controllers
- Type-safe server access verification
- Centralized RabbitMQ client creation
- Proper Prisma type integration

### ✅ Plan Validation

- Plan-based feature gating preserved
- Memory metrics tiered by subscription level
- Queue creation limits enforced
- Message sending quotas maintained

### ✅ SSE Stream Management

- Database-backed stream registry
- Proper cleanup and resource management
- Stream health monitoring
- Admin oversight capabilities

### ✅ Error Handling

- Consistent error responses
- Proper HTTP status codes
- Detailed logging for debugging
- Graceful fallbacks

## Benefits of Modular Structure

1. **Maintainability**: Easier to find and modify specific functionality
2. **Testing**: Smaller, focused units for unit testing
3. **Code Reuse**: Shared utilities eliminate duplication
4. **Scalability**: New features can be added as separate controllers
5. **Team Development**: Multiple developers can work on different domains
6. **Documentation**: Each controller has a clear, single responsibility

## Migration Notes

The new modular structure maintains 100% API compatibility with the original monolithic controller. All existing endpoints and behaviors are preserved. The main changes are internal code organization and improved maintainability.

### Before (Monolithic)

```typescript
// ~1700 lines in a single file
import rabbitmqController from "./controllers/rabbitmq.controller";
```

### After (Modular)

```typescript
// Split into 7 focused controllers + shared utilities
import rabbitmqController from "./controllers/rabbitmq";
```

## Development Guidelines

When adding new RabbitMQ-related endpoints:

1. **Identify the domain** (queues, messages, metrics, etc.)
2. **Add to the appropriate controller** or create a new one if needed
3. **Use shared utilities** for common operations
4. **Follow existing patterns** for error handling and authentication
5. **Update this README** if adding new controllers

## File Organization

```
controllers/rabbitmq/
├── shared.ts                     # Common utilities
├── overview.controller.ts        # Server overview
├── queues.controller.ts          # Queue management
├── messages.controller.ts        # Message operations & SSE
├── metrics.controller.ts         # Performance monitoring
├── infrastructure.controller.ts  # Nodes, exchanges, connections
├── memory.controller.ts          # Advanced memory monitoring
├── admin.controller.ts           # Stream administration
├── index.ts                      # Controller aggregator
└── README.md                     # This file
```
