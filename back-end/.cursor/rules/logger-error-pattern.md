# Logger Error Pattern

## Rule: Logger.error Must Use Object-First Pattern

### Required Pattern

**ALWAYS use this pattern for `logger.error`:**

```typescript
logger.error({ error }, "Error message");
```

### When to Include Additional Context

You can include additional context in the object:

```typescript
logger.error({ error, id, serverId, workspaceId }, "Error message");
```

### Examples

```typescript
// ✅ CORRECT
catch (error: any) {
  logger.error({ error }, "Error getting alerts");
  return createErrorResponse(c, error, 500, "Failed to get alerts");
}

// ✅ CORRECT - With additional context
catch (error) {
  logger.error({ error, id, timeRange }, "Error fetching live rates data for server");
  return createErrorResponse(c, error, 500, "Failed to fetch live rates data");
}

// ❌ WRONG - String first, error second
catch (error: any) {
  logger.error("Error getting alerts:", error);
  return createErrorResponse(c, error, 500, "Failed to get alerts");
}
```

### Why This Pattern

- **Structured Logging**: The object-first pattern allows log aggregation tools to parse and index error details properly
- **Consistency**: Matches the Pino logger's expected format for structured logging
- **Searchability**: Makes it easier to search and filter logs by error properties
- **Context Preservation**: Additional context (like IDs, parameters) can be included in the same object for better debugging

### Import

```typescript
import { logger } from "@/core/logger";
```
