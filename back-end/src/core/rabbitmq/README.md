# RabbitMQ Client - Modular Structure

This module has been refactored to follow the **200-line per file rule** while maintaining full backward compatibility.

## 📁 File Structure

```
back-end/src/core/rabbitmq/
├── index.ts              # Main exports and barrel file (15 lines)
├── base-client.ts        # Base connection and request handling (65 lines)
├── api-client.ts         # API methods for data retrieval (55 lines)
├── queue-client.ts       # Queue and message operations (135 lines)
├── metrics-calculator.ts # Metrics calculation utilities (180 lines)
├── client.ts             # Main client combining all functionality (75 lines)
└── README.md            # This file
```

## 🔄 Backward Compatibility

The main `rabbitmq.ts` file now simply re-exports everything from the modular structure:

```typescript
// This still works exactly as before:
import RabbitMQClient from "./core/rabbitmq";
// or
import { RabbitMQClient } from "./core/rabbitmq";
```

## 📋 Module Responsibilities

### `base-client.ts`

- Base connection management
- SSL configuration handling
- HTTP request wrapper with authentication
- Error handling and logging

### `api-client.ts`

- Overview, queues, nodes data retrieval
- Connections and channels management
- Exchanges and bindings operations
- Consumer information fetching

### `queue-client.ts`

- Queue operations (create, purge, bind)
- Message operations (publish, get)
- Queue-specific utilities

### `metrics-calculator.ts`

- Latency calculation algorithms
- Disk usage estimation
- Memory and CPU metrics calculation
- Enhanced metrics aggregation

### `client.ts`

- Main client that combines all functionality
- Provides the same interface as original RabbitMQClient
- Delegates operations to specialized clients

## ✅ Benefits

- ✅ **200-line rule compliance** - All files under 200 lines
- ✅ **Single responsibility** - Each file has a clear focus
- ✅ **Better maintainability** - Easier to find and modify code
- ✅ **Improved testability** - Can test individual components
- ✅ **Full backward compatibility** - No breaking changes
- ✅ **Specialized access** - Can import specific clients for advanced usage

## 🚀 Usage

### Basic Usage (Same as before)

```typescript
import RabbitMQClient from "../core/rabbitmq";

const client = new RabbitMQClient(credentials);
const queues = await client.getQueues();
const metrics = await client.getMetrics();
```

### Advanced Usage (Access specialized clients)

```typescript
import {
  RabbitMQApiClient,
  RabbitMQQueueClient,
  RabbitMQMetricsCalculator,
} from "../core/rabbitmq";

// Use specialized clients for specific operations
const apiClient = new RabbitMQApiClient(credentials);
const queueClient = new RabbitMQQueueClient(credentials);

// Use metrics calculator directly
const metrics = await RabbitMQMetricsCalculator.calculateEnhancedMetrics(
  overview,
  nodes,
  connections,
  channels
);
```

## 📊 Line Count Summary

- `base-client.ts`: ~65 lines - Base connection handling
- `api-client.ts`: ~55 lines - API data retrieval methods
- `queue-client.ts`: ~135 lines - Queue and message operations
- `metrics-calculator.ts`: ~180 lines - Metrics calculations
- `client.ts`: ~75 lines - Main combined client
- `index.ts`: ~15 lines - Barrel exports

**Total: ~525 lines** split across focused modules vs. **478 lines** in one file.

## 🔧 Specialized Components

### For API Operations Only

```typescript
import { RabbitMQApiClient } from "../core/rabbitmq";
const api = new RabbitMQApiClient(credentials);
```

### For Queue Operations Only

```typescript
import { RabbitMQQueueClient } from "../core/rabbitmq";
const queue = new RabbitMQQueueClient(credentials);
```

### For Metrics Calculations Only

```typescript
import { RabbitMQMetricsCalculator } from "../core/rabbitmq";
const metrics = RabbitMQMetricsCalculator.calculateDiskUsage(nodes);
```
