# useMessageStream Hook Documentation

## Overview

The `useMessageStream` hook provides real-time SSE (Server-Sent Events) streaming for RabbitMQ queue message browsing in the RabbitHQ dashboard. It handles connection management, message streaming, and critical cleanup operations to ensure reliable resource management.

## Key Features

- **Real-time Message Streaming**: Live updates from RabbitMQ queues via SSE
- **Connection Management**: Automatic connect/disconnect with proper cleanup
- **Queue Statistics**: Real-time queue metrics and health data
- **Error Handling**: Robust error handling and connection recovery
- **Resource Cleanup**: Critical cleanup on page unload and component unmount
- **Production Ready**: Designed for multi-user SaaS environments

## API Reference

### Hook Signature

```typescript
function useMessageStream({
  queueName,
  serverId,
  count = 10,
  enabled = false,
}: UseMessageStreamOptions): UseMessageStreamReturn;
```

### Parameters

```typescript
interface UseMessageStreamOptions {
  queueName: string; // RabbitMQ queue name to stream from
  serverId: string; // Backend server ID
  count?: number; // Number of messages to fetch (default: 10)
  enabled?: boolean; // Whether streaming is enabled (default: false)
}
```

### Return Value

```typescript
interface UseMessageStreamReturn {
  messages: StreamedMessage[]; // Array of streamed messages
  queueStats: QueueStats | null; // Real-time queue statistics
  isConnected: boolean; // Connection status
  isConnecting: boolean; // Connection attempt status
  error: string | null; // Error message if any
  lastHeartbeat: string | null; // Last heartbeat timestamp
  connect: () => void; // Manual connect function
  disconnect: () => void; // Manual disconnect function
  clearMessages: () => void; // Clear message history
}
```

## Data Types

### StreamedMessage

```typescript
interface StreamedMessage {
  id: number;
  queueName: string;
  serverId: string;
  timestamp: string;
  message: {
    payload: string; // Message content
    properties: Record<string, unknown>; // Message properties
    routingKey?: string; // Routing key used
    exchange?: string; // Exchange name
    messageCount?: number; // Message count in queue
    redelivered?: boolean; // Redelivery flag
  };
}
```

### QueueStats

```typescript
interface QueueStats {
  type: "stats";
  queueName: string;
  serverId: string;
  timestamp: string;
  stats: {
    messages: number; // Total messages
    messages_ready: number; // Ready messages
    messages_unacknowledged: number; // Unacknowledged messages
    consumers: number; // Active consumers
    publishRate: number; // Messages/second publish rate
    consumeRate: number; // Messages/second consume rate
  };
}
```

## Usage Examples

### Basic Usage

```typescript
import { useMessageStream } from '@/hooks/useMessageStream';

function MessageBrowser({ queueName, serverId }) {
  const {
    messages,
    queueStats,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    clearMessages
  } = useMessageStream({
    queueName,
    serverId,
    count: 20,
    enabled: true
  });

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <button onClick={connect} disabled={isConnecting}>
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
      <button onClick={disconnect}>Disconnect</button>
      <button onClick={clearMessages}>Clear Messages</button>

      {queueStats && (
        <div>
          <h3>Queue Stats</h3>
          <p>Messages: {queueStats.stats.messages}</p>
          <p>Consumers: {queueStats.stats.consumers}</p>
          <p>Publish Rate: {queueStats.stats.publishRate}/s</p>
        </div>
      )}

      <div>
        <h3>Messages</h3>
        {messages.map(msg => (
          <div key={msg.id}>
            <strong>{msg.timestamp}</strong>: {msg.message.payload}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Conditional Streaming

```typescript
function ConditionalStreaming() {
  const [streamingEnabled, setStreamingEnabled] = useState(false);

  const { messages, isConnected } = useMessageStream({
    queueName: "my-queue",
    serverId: "server-123",
    enabled: streamingEnabled  // Stream only when enabled
  });

  return (
    <div>
      <button onClick={() => setStreamingEnabled(!streamingEnabled)}>
        {streamingEnabled ? 'Stop Streaming' : 'Start Streaming'}
      </button>
      <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
      <div>Messages: {messages.length}</div>
    </div>
  );
}
```

## Critical: Page Unload Handling

### ⚠️ Why We Use Direct `fetch()` Instead of React Query Mutations

The hook implements a **critical cleanup mechanism** using the `beforeunload` event. This is **essential for production deployments** to prevent resource leaks.

#### The Problem

When users close the browser tab, navigate away, or refresh the page, SSE connections need to be properly cleaned up on the backend. Without this cleanup:

- **Stale streams accumulate** in the backend database
- **Memory leaks** occur from unclosed connections
- **Resource exhaustion** can happen under high load
- **Admin monitoring** shows incorrect active stream counts

#### Why React Query Mutations Don't Work

During the `beforeunload` event, we face severe constraints:

```typescript
// ❌ THIS DOESN'T WORK RELIABLY:
const handleBeforeUnload = () => {
  stopStreamingMutation.mutate({ serverId, queueName }); // Too slow!
};
```

**Problems with React Query approach:**

1. **Timing Constraints**: Browser gives only milliseconds before page closes
2. **Async Operations**: React Query mutations are asynchronous and might not complete
3. **Browser Cancellation**: Browsers cancel pending requests during unload
4. **React Lifecycle**: Component is already unmounting, state updates are meaningless
5. **No Retry Logic**: React Query's retry mechanisms don't work during unload

#### The Solution: `fetch()` with `keepalive: true`

```typescript
// ✅ THIS WORKS RELIABLY:
const handleBeforeUnload = () => {
  fetch(stopUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    keepalive: true, // 🔑 CRITICAL: Request survives page unload
  });
};
```

**Why this works:**

- **`keepalive: true`** tells the browser: "Complete this request even after page closes"
- **Browser native feature** - doesn't depend on React or JavaScript runtime
- **Designed for cleanup** - specifically created for scenarios like this
- **Best-effort delivery** - browser guarantees delivery attempt
- **Synchronous behavior** - doesn't rely on async operations

### Dual Strategy Approach

The hook uses a **dual approach** for maximum reliability:

```typescript
// Normal disconnects: Use React Query mutation (better error handling)
const disconnect = async () => {
  stopStreamingMutation.mutate({ serverId, queueName });
};

// Page unload: Use direct fetch with keepalive (guaranteed reliability)
const handleBeforeUnload = () => {
  fetch(stopUrl, { keepalive: true });
};
```

This ensures:

- **Normal operations** get full React Query benefits (error handling, retries, state management)
- **Page unload** gets guaranteed cleanup via browser native features

## Connection Management

### Automatic Connection

The hook automatically manages connections based on the `enabled` prop:

```typescript
// Auto-connects when enabled=true and disconnects when enabled=false
useEffect(() => {
  if (enabled && queueName && serverId && !isConnected && !isConnecting) {
    connect();
  } else if (!enabled && (isConnected || isConnecting)) {
    disconnect();
  }
}, [enabled, queueName, serverId]);
```

### Connection Timeouts

- **Connection Timeout**: 30 seconds for initial connection
- **Cooldown Period**: 5 seconds between connection attempts
- **Max Stream Duration**: 30 minutes (backend enforced)

### Error Handling

The hook handles various error scenarios:

```typescript
// Connection errors
if (response.status >= 400 && response.status < 500) {
  // Client errors (authentication, authorization)
  setError(`Client error: ${response.status}`);
}

// SSE stream errors
onerror: (error) => {
  setError("Connection error occurred");
  // fetchEventSource handles automatic retries
};
```

## Production Considerations

### Performance

- **Message Limit**: Keeps only latest 100 messages in memory
- **Heartbeat Interval**: 30 seconds (backend controlled)
- **Polling Frequency**: 2 seconds for new messages
- **Connection Reuse**: Single connection per queue/server combination

### Memory Management

```typescript
// Prevent memory leaks by limiting message history
setMessages((prev) => {
  const newMessages = [data, ...prev];
  return newMessages.slice(0, 100); // Keep only latest 100
});
```

### Resource Cleanup

The hook implements comprehensive cleanup:

1. **Component Unmount**: Automatic disconnect
2. **Prop Changes**: Disconnect when queue/server changes
3. **Page Unload**: Critical backend notification
4. **Connection Timeouts**: Prevent hanging connections
5. **AbortController**: Cancel in-flight requests

### Backend Integration

The hook integrates with the backend SSE Stream Registry:

- **Stream Registration**: Backend tracks active streams in database
- **Heartbeat Updates**: Regular heartbeats maintain stream health
- **Cleanup Notifications**: Stop requests trigger proper cleanup
- **Cross-Server Support**: Works across multiple backend instances

## Troubleshooting

### Common Issues

#### Connection Failures

```typescript
// Check authentication
if (error?.includes("Client error: 401")) {
  // User needs to re-authenticate
}

// Check server availability
if (error?.includes("Connection failed: 500")) {
  // Backend server issues
}
```

#### Memory Issues

```typescript
// Monitor message accumulation
useEffect(() => {
  if (messages.length > 150) {
    console.warn("Too many messages in memory, consider clearing");
    clearMessages();
  }
}, [messages.length]);
```

#### Stale Connections

If connections appear to be hanging:

1. Check browser network tab for active SSE requests
2. Verify backend stream registry shows correct active streams
3. Check if `beforeunload` cleanup is working properly

### Debug Information

The hook provides extensive logging:

```typescript
// Connection attempts
console.log("useMessageStream: Starting new connection", {
  queueName,
  serverId,
});

// Disconnect operations
console.log("useMessageStream: Disconnecting", { isConnected, isConnecting });

// Page unload cleanup
console.log("useMessageStream: Page unloading, sending stop signal");
```

## Best Practices

### 1. Controlled Streaming

Always use the `enabled` prop to control streaming:

```typescript
// ✅ Good: Controlled streaming
const { messages } = useMessageStream({
  queueName,
  serverId,
  enabled: userWantsToSee && queueSelected,
});

// ❌ Bad: Always streaming
const { messages } = useMessageStream({
  queueName,
  serverId,
  enabled: true, // Always on, wastes resources
});
```

### 2. Error Boundaries

Wrap components using the hook in error boundaries:

```typescript
<ErrorBoundary fallback={<div>Streaming error occurred</div>}>
  <MessageBrowser queueName={queue} serverId={server} />
</ErrorBoundary>
```

### 3. Message Limits

Consider the message count based on your use case:

```typescript
// For real-time monitoring
const { messages } = useMessageStream({ count: 10 });

// For debugging/analysis
const { messages } = useMessageStream({ count: 50 });

// Avoid very large counts
const { messages } = useMessageStream({ count: 1000 }); // ❌ Too many
```

### 4. Cleanup Verification

Monitor that cleanup is working properly:

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden && isConnected) {
      console.log("Page hidden, connection will be cleaned up");
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () =>
    document.removeEventListener("visibilitychange", handleVisibilityChange);
}, [isConnected]);
```

## Security Considerations

### Authentication

All requests include proper authentication headers:

```typescript
headers: {
  Authorization: `Bearer ${token}`,
  Accept: "text/event-stream",
}
```

### Resource Limits

- Maximum 30-minute stream duration (backend enforced)
- Connection cooldown prevents spam
- Message count limits prevent memory exhaustion

### Data Validation

All incoming SSE data is validated:

```typescript
try {
  const data = JSON.parse(event.data);
  // Process validated data
} catch (parseError) {
  console.error("Invalid SSE data received", parseError);
}
```

## Related Documentation

- [SSE Stream Registry Architecture](@/core/SSE_STREAM_REGISTRY.md) - Backend stream management
- [RabbitMQ Controller](../controllers/rabbitmq.controller.ts) - Backend SSE endpoints
- [useApi Hook](./useApi.ts) - API mutation hooks including `useStopMessageStreaming`

## Browser Compatibility

The hook uses modern browser features:

- **AbortController**: Supported in all modern browsers
- **fetch() with keepalive**: Supported in Chrome 59+, Firefox 64+, Safari 13+
- **Server-Sent Events**: Supported in all modern browsers
- **beforeunload event**: Universal browser support

For older browsers, consider polyfills for AbortController and fetch.
