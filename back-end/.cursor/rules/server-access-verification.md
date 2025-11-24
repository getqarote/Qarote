# Server Access Verification

## Rule: All Server-Specific Endpoints Must Use `verifyServerAccess`

### When to Use

**MUST use `verifyServerAccess` for ALL endpoints that:**

- Operate on a specific RabbitMQ server
- Have `/servers/:id/` or `/servers/:serverId/` in the route path
- Access server-specific resources (queues, exchanges, connections, nodes, etc.)

### When NOT to Use

**DO NOT use `verifyServerAccess` for:**

- Workspace-level endpoints (e.g., `/workspaces/:workspaceId/thresholds`, `/workspaces/:workspaceId/alert-settings`)
- Endpoints that don't operate on a specific server
- Endpoints that only access workspace-level resources

### Required Pattern

Every server-specific endpoint MUST follow this pattern:

```typescript
import { verifyServerAccess } from "./shared";

// In the endpoint handler:
const serverId = c.req.param("id"); // or "serverId" depending on route
const workspaceId = c.req.param("workspaceId");
const user = c.get("user");

// 1. First verify workspace access
if (user.workspaceId !== workspaceId) {
  return c.json({ error: "Access denied to this workspace" }, 403);
}

try {
  // 2. Then verify server access
  const server = await verifyServerAccess(serverId, workspaceId);

  if (!server) {
    return c.json({ error: "Server not found or access denied" }, 404);
  }

  // 3. Proceed with endpoint logic
  // ...
} catch (error: any) {
  logger.error("Error in endpoint:", error);
  return createErrorResponse(c, error, 500, "Failed to process request");
}
```

### Example

```typescript
/**
 * Get alerts for a specific server
 * GET /workspaces/:workspaceId/servers/:id/alerts
 */
alertsController.get(
  "/servers/:id/alerts",
  zValidator("param", ServerParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const workspaceId = c.req.param("workspaceId");
    const user = c.get("user");

    // Verify user has access to this workspace
    if (user.workspaceId !== workspaceId) {
      return c.json({ error: "Access denied to this workspace" }, 403);
    }

    try {
      // Verify server access
      const server = await verifyServerAccess(id, workspaceId);

      if (!server) {
        return c.json({ error: "Server not found or access denied" }, 404);
      }

      // Endpoint logic here...
    } catch (error: any) {
      logger.error("Error getting alerts:", error);
      return createErrorResponse(c, error, 500, "Failed to get alerts");
    }
  }
);
```

### Why This Matters

- **Security**: Ensures users can only access servers that belong to their workspace
- **Data Integrity**: Prevents unauthorized access to server resources
- **Consistency**: Maintains uniform access control patterns across all controllers
- **Error Handling**: Provides clear error messages when access is denied

### Import Location

```typescript
// For rabbitmq controllers:
import { verifyServerAccess } from "./shared";

// The function is defined in:
// back-end/src/controllers/rabbitmq/shared.ts
```

### Function Signature

```typescript
export async function verifyServerAccess(
  serverId: string,
  workspaceId: string,
  includeWorkspace = false
): Promise<any>;
```

Returns:

- `null` if server doesn't exist or doesn't belong to the workspace
- Server object if access is valid
