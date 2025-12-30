# RabbitMQ Version Compatibility Guide

This document tracks known differences in RabbitMQ Management API responses across versions 3.0-4.2.

## Version Support Matrix

| Version   | Status    | Notes                                                  |
| --------- | --------- | ------------------------------------------------------ |
| 3.0-3.7   | Legacy    | Basic support, some fields may be missing              |
| 3.8-3.11  | Supported | Operator policies and queue totals introduced          |
| 3.12-3.13 | LTS       | Release series support status, consumer metrics        |
| 4.0+      | Current   | Classic queue mirroring removed, Khepri metadata store |

## Field Availability by Version

### Overview Endpoint (`/overview`)

| Field                           | 3.0-3.7 | 3.8-3.11 | 3.12+ | 4.0-4.1 | 4.2+ | Notes                              |
| ------------------------------- | ------- | -------- | ----- | ------- | ---- | ---------------------------------- |
| `release_series_support_status` | ❌      | ❌       | ✅    | ✅      | ❌   | Introduced in 3.12, removed in 4.2 |
| `is_op_policy_updating_enabled` | ❌      | ✅       | ✅    | ✅      | ✅   | Introduced in 3.8                  |
| `enable_queue_totals`           | ❌      | ✅       | ✅    | ✅      | ✅   | Introduced in 3.8                  |
| `cluster_tags`                  | ❌      | ❌       | ❌    | ✅      | ✅   | Introduced in 4.0                  |
| `node_tags`                     | ❌      | ❌       | ❌    | ✅      | ✅   | Introduced in 4.0                  |
| `default_queue_type`            | ❌      | ❌       | ❌    | ✅      | ✅   | Introduced in 4.0                  |

### Queue Endpoint (`/queues/{vhost}`)

| Field                        | 3.0-3.7 | 3.8-3.11 | 3.12 | 3.13+ | 4.0-4.1 | 4.2+ | Notes                              |
| ---------------------------- | ------- | -------- | ---- | ----- | ------- | ---- | ---------------------------------- |
| `slave_nodes`                | ✅      | ✅       | ✅   | ✅    | ❌      | ❌   | Removed in 4.0 (classic mirroring) |
| `synchronised_slave_nodes`   | ✅      | ✅       | ✅   | ✅    | ❌      | ❌   | Removed in 4.0 (classic mirroring) |
| `recoverable_slaves`         | ✅      | ✅       | ✅   | ✅    | ❌      | ❌   | Removed in 4.0 (classic mirroring) |
| `consumer_capacity`          | ❌      | ❌       | ✅   | ✅    | ✅      | ✅   | Introduced in 3.12                 |
| `consumer_utilisation`       | ❌      | ❌       | ✅   | ✅    | ✅      | ✅   | Introduced in 3.12                 |
| `single_active_consumer_tag` | ❌      | ✅       | ✅   | ✅    | ✅      | ✅   | Introduced in 3.8                  |
| `storage_version`            | ❌      | ❌       | ❌   | ✅    | ✅      | ✅   | Introduced in 3.13 (CQv2 support)  |
| `internal`                   | ❌      | ❌       | ❌   | ❌    | ❌      | ✅   | Introduced in 4.2                  |
| `internal_owner`             | ❌      | ❌       | ❌   | ❌    | ❌      | ✅   | Introduced in 4.2                  |

## Breaking Changes

### RabbitMQ 4.2

**Release Series Support Status Removed**

- Field `release_series_support_status` is no longer present in overview endpoint
- This field is marked as optional in our types with `@deprecated` tag
- All 4.2+ releases are considered current/supported

**Internal Queues**

- New fields `internal` and `internal_owner` in queue responses
- Indicates queues that are internal (not accessible via AMQP)
- Used for system-level queues managed by RabbitMQ

### RabbitMQ 4.0

**Classic Queue Mirroring Removed**

- Fields `slave_nodes`, `synchronised_slave_nodes`, and `recoverable_slaves` are no longer present
- These fields are marked as optional in our types with `@deprecated` tags
- Use quorum queues or stream queues for high availability instead

**Khepri Metadata Store**

- New metadata store backend, may affect internal API responses
- No direct impact on Management API fields we use

### RabbitMQ 3.13

**Classic Queues Version 2 (CQv2)**

- New queue version available via `x-queue-version=2` policy
- New field `storage_version` in queue responses (1 for classic, 2 for CQv2)
- May affect queue performance metrics
- No breaking changes to Management API structure

### RabbitMQ 3.12

**Release Series Support Status**

- New field `release_series_support_status` in overview
- Indicates LTS vs regular release support

**Consumer Metrics**

- New fields `consumer_capacity` and `consumer_utilisation` in queue responses
- Provide better visibility into consumer performance

### RabbitMQ 3.8

**Operator Policies**

- New field `is_op_policy_updating_enabled` in overview
- Allows runtime policy updates

**Queue Totals**

- New field `enable_queue_totals` in overview
- Controls whether queue totals are calculated

**Single Active Consumer**

- New field `single_active_consumer_tag` in queue responses
- Supports single active consumer pattern

### RabbitMQ 4.0

**New Overview Fields**

- New fields `cluster_tags`, `node_tags`, and `default_queue_type` in overview endpoint
- `cluster_tags`: Cluster-level tags for organization
- `node_tags`: Node-level tags for filtering
- `default_queue_type`: Default queue type for the cluster

**VHost Protection**

- New field `protected_from_deletion` in vhost responses
- Prevents accidental deletion of important vhosts

## Other Endpoints

### Exchange Endpoint (`/exchanges/{vhost}`)

| Field                       | Versions | Notes                                                      |
| --------------------------- | -------- | ---------------------------------------------------------- |
| `policy`                    | All      | Policy applied to the exchange (optional)                  |
| `user_who_performed_action` | All      | User who performed the last action (audit field, optional) |

### VHost Endpoint (`/vhosts`)

| Field                     | Versions | Notes                                                             |
| ------------------------- | -------- | ----------------------------------------------------------------- |
| `protected_from_deletion` | 4.0+     | Whether the vhost is protected from deletion                      |
| `message_stats`           | All      | Message statistics (optional, only present when there's activity) |

### User Endpoint (`/users`)

| Field    | Versions | Notes                                                           |
| -------- | -------- | --------------------------------------------------------------- |
| `limits` | All      | User limits (optional, only present when limits are configured) |

## Conditional Fields

Some fields may not appear in API responses under certain conditions, even if they're available in the version:

**Queue Fields:**

- `garbage_collection` - Only present after garbage collection has run
- `head_message_timestamp` - Only present for certain queue types or when queue has messages
- `idle_since` - Only present when queue is idle (no recent activity)
- `policy` - Only present when queue has a policy applied
- `operator_policy` - Only present when queue has an operator policy applied
- `exclusive_consumer_tag` - Only present when queue has an exclusive consumer
- `single_active_consumer_tag` - Only present when queue uses single active consumer pattern

**Exchange Fields:**

- `policy` - Only present when exchange has a policy applied
- `user_who_performed_action` - Only present when audit logging is enabled
- `message_stats` - Only present when there's message activity

**VHost Fields:**

- `message_stats` - Only present when there's message activity
- `protected_from_deletion` - Only present in 4.0+ versions

**User Fields:**

- `limits` - Only present when user limits are configured

These fields are correctly marked as optional in our types. When testing, ensure queues are populated with messages and have appropriate configurations to detect all available fields.

## Type Definitions

All version-specific fields are marked as optional in our TypeScript types with JSDoc comments indicating:

- `@since` - Version when field was introduced
- `@deprecated` - Version when field was removed (if applicable)

Example:

```typescript
/**
 * @since 3.12.0
 * Indicates the support status of the release series
 */
release_series_support_status?: string;

/**
 * @deprecated Since 4.0.0 - Classic queue mirroring removed
 * Slave nodes for classic queue mirroring (removed in RabbitMQ 4.0)
 */
slave_nodes?: string[];
```

## Handling Version Differences

### In Code

1. **Use Optional Chaining**: Always use optional chaining (`?.`) when accessing version-specific fields
2. **Provide Defaults**: Provide default values for missing fields when needed
3. **Check for Existence**: Check if fields exist before accessing them

### Example

```typescript
const overview = await client.getOverview();

// Safe to access with optional chaining and defaults
const supportStatus = overview.release_series_support_status || "unknown";
const clusterTags = overview.cluster_tags || [];
```

### Discovery Script

Use the discovery script to find field differences:

```bash
tsx scripts/rabbitmq/discover-rabbitmq-fields.ts <host> <port> <username> <password> <vhost> [useHttps]
```

This will generate a report comparing actual API responses against our type definitions.

## Testing Across Versions

When testing, ensure you test against:

- At least one 3.x version (e.g., 3.12 LTS)
- At least one 4.x version (e.g., 4.0 or 4.1)

Run the discovery script against each version to identify any new differences.

## Future Updates

This document should be updated when:

1. New RabbitMQ versions are released
2. Field differences are discovered via the discovery script
3. Breaking changes are documented in RabbitMQ release notes

## References

- [RabbitMQ Release Notes](https://www.rabbitmq.com/changelog.html)
- [RabbitMQ Management API Documentation](https://rawcdn.githack.com/rabbitmq/rabbitmq-management/v3.13.0/priv/www/api/index.html)
- [RabbitMQ 4.0 What's New](https://blog.rabbitmq.com/docs/4.0/whats-new/)
