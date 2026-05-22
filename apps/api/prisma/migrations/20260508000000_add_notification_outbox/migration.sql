-- Outbox for transactional notifications across multiple channels (email,
-- Slack, user webhooks).
--
-- Closes the dual-write hazard where a successful third-party send followed
-- by a failed DB update caused retries to deliver duplicates. Handlers
-- write the outbox row inside the same transaction as the surrounding
-- business state; a drain worker delivers asynchronously per channel.
-- The unique idempotencyKey turns retries into enqueue-time no-ops.
CREATE TABLE "NotificationOutbox" (
    "id"             TEXT         NOT NULL,
    "channel"        TEXT         NOT NULL,
    "template"       TEXT         NOT NULL,
    "target"         TEXT         NOT NULL,
    "payload"        JSONB        NOT NULL,
    "idempotencyKey" TEXT         NOT NULL,
    "status"         TEXT         NOT NULL DEFAULT 'PENDING',
    "attempts"       INTEGER      NOT NULL DEFAULT 0,
    "lastError"      TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt"         TIMESTAMP(3),
    "nextAttemptAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationOutbox_idempotencyKey_key"
    ON "NotificationOutbox"("idempotencyKey");

CREATE INDEX "notification_outbox_drain_idx"
    ON "NotificationOutbox"("status", "nextAttemptAt");

CREATE INDEX "notification_outbox_channel_idx"
    ON "NotificationOutbox"("channel", "status");
