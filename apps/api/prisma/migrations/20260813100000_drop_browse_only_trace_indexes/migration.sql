-- Drop the three trace indexes that existed only for the deprecated /messages
-- browse, removed in the same change.
--
-- They match the browse's optional filter combinations, each paired with the
-- keyset cursor:
--   no filter        → (serverId, cursorId)
--   direction filter → (serverId, direction, cursorId)
--   routingKey filter→ (serverId, vhost, routingKey, cursorId)
--
-- NOT dropped, despite also being cursor-based:
--   (serverId, vhost, queueName, direction, cursorId)
-- firehose-evidence.service.ts documents it as required — "the inner subquery is
-- ORDER BY cursorId DESC LIMIT 200. This needs the index …". That is the AI
-- Explain evidence path, and it stays.
--
-- The five timestamp indexes also stay: the evidence reader's queries are all
-- `WHERE timestamp >= NOW() - INTERVAL` / `ORDER BY timestamp DESC`.
--
-- Correction worth recording: the earlier catalogue claimed "4 of 13 indexes
-- serve only the browse". It was wrong — one of the four is load-bearing for the
-- LLM path. Verified per index rather than by the presence of a cursorId column.
DROP INDEX IF EXISTS "MessageTraceEvent_serverId_cursorId_idx";
DROP INDEX IF EXISTS "MessageTraceEvent_serverId_direction_cursorId_idx";
DROP INDEX IF EXISTS "MessageTraceEvent_serverId_vhost_routingKey_cursorId_idx";
