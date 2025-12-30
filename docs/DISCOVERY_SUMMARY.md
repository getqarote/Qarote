# RabbitMQ Field Discovery Summary

This document summarizes the field discovery results across all tested RabbitMQ versions.

> **Note:** All servers have been seeded with test messages to ensure accurate field detection. Queues contain messages, which helps identify fields that only appear when queues are populated.

## Tested Versions

- **3.12.14** - Port 15676
- **3.13.7** - Port 15677
- **4.0.9** - Port 15678
- **4.1.4** - Port 15679
- **4.2.1** - Port 15680

## New Fields Discovered

### Overview Endpoint (`/overview`)

| Field                           | Versions | Status              | Notes                          |
| ------------------------------- | -------- | ------------------- | ------------------------------ |
| `cluster_tags`                  | 4.0+     | ✅ Added            | Cluster-level tags             |
| `node_tags`                     | 4.0+     | ✅ Added            | Node-level tags                |
| `default_queue_type`            | 4.0+     | ✅ Added            | Default queue type for cluster |
| `release_series_support_status` | 3.12+    | ✅ Already optional | Support status                 |
| `is_op_policy_updating_enabled` | 3.8+     | ✅ Already optional | Operator policy updates        |
| `enable_queue_totals`           | 3.8+     | ✅ Already optional | Queue totals enabled           |

### Queue Endpoint (`/queues/{vhost}`)

| Field                        | Versions | Status              | Notes                                       |
| ---------------------------- | -------- | ------------------- | ------------------------------------------- |
| `storage_version`            | 3.13+    | ✅ Added            | Storage version (1 for classic, 2 for CQv2) |
| `consumer_capacity`          | 3.12+    | ✅ Already optional | Consumer capacity metric                    |
| `consumer_utilisation`       | 3.12+    | ✅ Already optional | Consumer utilisation metric                 |
| `single_active_consumer_tag` | 3.8+     | ✅ Already optional | Single active consumer                      |
| `slave_nodes`                | 3.0-3.13 | ✅ Already optional | Removed in 4.0                              |
| `synchronised_slave_nodes`   | 3.0-3.13 | ✅ Already optional | Removed in 4.0                              |
| `recoverable_slaves`         | 3.0-3.13 | ✅ Already optional | Removed in 4.0                              |
| `exclusive_consumer_tag`     | All      | ✅ Already in type  | Exclusive consumer tag                      |
| `internal`                   | 4.2+     | ✅ Added            | Indicates if queue is internal              |
| `internal_owner`             | 4.2+     | ✅ Added            | Owner of the internal queue                 |

### Exchange Endpoint (`/exchanges/{vhost}`)

| Field                       | Versions | Status   | Notes                                            |
| --------------------------- | -------- | -------- | ------------------------------------------------ |
| `policy`                    | All      | ✅ Added | Policy applied to the exchange                   |
| `user_who_performed_action` | All      | ✅ Added | User who performed the last action (audit field) |

### VHost Endpoint (`/vhosts`)

| Field                     | Versions | Status   | Notes                                                             |
| ------------------------- | -------- | -------- | ----------------------------------------------------------------- |
| `protected_from_deletion` | 4.0+     | ✅ Added | Whether the vhost is protected from deletion                      |
| `message_stats`           | All      | ✅ Added | Message statistics (optional, only present when there's activity) |

### User Endpoint (`/users`)

| Field    | Versions | Status   | Notes                                                           |
| -------- | -------- | -------- | --------------------------------------------------------------- |
| `limits` | All      | ✅ Added | User limits (optional, only present when limits are configured) |

## Fields That May Be Missing (Conditional Fields)

These fields are in our types but may not appear in responses under certain conditions:

- `garbage_collection` - Only present after garbage collection has run
- `head_message_timestamp` - Only present for certain queue types or when queue has messages
- `idle_since` - Only present when queue is idle (no recent activity)
- `policy` - Only present when queue has a policy applied
- `operator_policy` - Only present when queue has an operator policy applied
- `exclusive_consumer_tag` - Only present when queue has an exclusive consumer
- `single_active_consumer_tag` - Only present when queue uses single active consumer pattern

> **Note:** All servers have been seeded with test messages. Missing fields are likely conditional and correctly marked as optional in our types.

## Version-Specific Findings

### RabbitMQ 3.12

- ✅ All expected fields present
- ✅ New fields: `release_series_support_status`, `consumer_capacity`, `consumer_utilisation`
- ✅ Classic mirroring fields: `slave_nodes`, `synchronised_slave_nodes`, `recoverable_slaves`

### RabbitMQ 3.13

- ✅ All 3.12 fields present
- ✅ New field: `storage_version` (indicates queue storage version)
- ✅ Classic mirroring fields still present

### RabbitMQ 4.0

- ✅ New overview fields: `cluster_tags`, `node_tags`, `default_queue_type`
- ❌ Classic mirroring fields removed (as expected)
- ✅ New queue field: `storage_version`
- ⚠️ Some queue fields missing (likely due to empty queues)

### RabbitMQ 4.1

- ✅ Same fields as 4.0
- ✅ No breaking changes from 4.0

### RabbitMQ 4.2

- ✅ New queue fields: `internal`, `internal_owner` (for internal queues)
- ⚠️ `release_series_support_status` removed from overview (marked as deprecated)
- ℹ️ Some fields may appear conditionally (e.g., `garbage_collection` only after GC runs, `head_message_timestamp` for certain queue types)

## Actions Taken

1. ✅ Added `cluster_tags`, `node_tags`, `default_queue_type` to `RabbitMQOverview`
2. ✅ Added `storage_version` to `RabbitMQQueue`
3. ✅ Added `internal`, `internal_owner` to `RabbitMQQueue` (4.2+)
4. ✅ Added `policy`, `user_who_performed_action` to `RabbitMQExchange`
5. ✅ Added `protected_from_deletion`, `message_stats` to `RabbitMQVHost` (4.0+)
6. ✅ Added `limits` to `RabbitMQUser`
7. ✅ Marked `release_series_support_status` as deprecated (removed in 4.2)
8. ✅ Updated `ResponseValidator` sample objects to include all optional fields
9. ✅ Implemented validators for all endpoints (Connection, Channel, Exchange, Binding, Consumer, VHost, User)
10. ✅ All fields properly documented with `@since` and `@deprecated` tags

## Next Steps

1. ✅ **Test RabbitMQ 4.2** - Added 4.2 to docker-compose and ran discovery
2. ✅ **Test with populated queues** - Seeded all servers with messages using `seed-all-servers.ts`
3. **Update documentation** - Keep `VERSION_COMPATIBILITY.md` updated with new findings

## Seeding Scripts

To populate all RabbitMQ servers with test messages for better field discovery:

```bash
cd apps/api
npx tsx scripts/rabbitmq/seed-all-servers.ts [messageCount] [--consume] [--parallel]
```

Examples:

- Seed all servers with 100 messages each: `npx tsx scripts/rabbitmq/seed-all-servers.ts 100`
- Seed and consume 30% of messages: `npx tsx scripts/rabbitmq/seed-all-servers.ts 100 --consume`
- Seed all servers in parallel: `npx tsx scripts/rabbitmq/seed-all-servers.ts 100 --parallel`

## Discovery Reports

Full reports are available in `src/core/rabbitmq/discovery/`:

- `rabbitmq-discovery-3.12-*.json` and `.md`
- `rabbitmq-discovery-3.13-*.json` and `.md`
- `rabbitmq-discovery-4.0-*.json` and `.md`
- `rabbitmq-discovery-4.1-*.json` and `.md`
- `rabbitmq-discovery-4.2-*.json` and `.md`

## Running Discovery

To run discovery against a RabbitMQ server:

```bash
cd apps/api
npx tsx scripts/rabbitmq/discover-rabbitmq-fields.ts <host> <port> <username> <password> <vhost> [useHttps]
```

Example:

```bash
npx tsx scripts/rabbitmq/discover-rabbitmq-fields.ts localhost 15676 admin admin123 / false
```
