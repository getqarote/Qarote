-- Per-recipient dedup for the release-notifier cron's "new Qarote
-- release available" emails.
--
-- Prior to this table the cron used a single SystemState row as the
-- gate, which only updated AFTER the recipient loop completed. A
-- mid-loop crash (or two replicas during a rolling deploy) re-sent the
-- email to recipients who already received it. The unique
-- (releaseVersion, recipient) constraint makes the row insertion the
-- gate — create() before send, P2002 means "already notified, skip".
CREATE TABLE "ReleaseNotificationSent" (
    "id"             TEXT         NOT NULL,
    "releaseVersion" TEXT         NOT NULL,
    "recipient"      TEXT         NOT NULL,
    "sentAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseNotificationSent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReleaseNotificationSent_releaseVersion_recipient_key"
    ON "ReleaseNotificationSent"("releaseVersion", "recipient");

CREATE INDEX "ReleaseNotificationSent_releaseVersion_idx"
    ON "ReleaseNotificationSent"("releaseVersion");

-- Backfill: any license holder that already received the release email
-- under the prior SystemState gate must be marked as already-notified
-- so the new per-recipient dedup doesn't re-spam them on the next
-- cron tick.
--
-- The pre-fix gate held the *version* but no per-recipient list, so we
-- approximate: every currently-active license customerEmail is marked
-- as already-notified for the SystemState-stored version. Trade-off:
-- a license activated between the SystemState stamp and this migration
-- will be marked as notified despite never receiving the email. That's
-- the conservative choice (no double-notification) — they can be
-- notified on the *next* release.
--
-- Done in a single migration transaction (Prisma wraps each migration
-- file in a tx by default) so backfill commits atomically with the
-- DELETE that retires the SystemState row.
INSERT INTO "ReleaseNotificationSent" ("id", "releaseVersion", "recipient", "sentAt")
SELECT
    gen_random_uuid()::TEXT,
    s.value,
    l."customerEmail",
    s."updatedAt"
FROM "SystemState" s
CROSS JOIN (
    SELECT DISTINCT "customerEmail"
    FROM "License"
    WHERE "isActive" = TRUE
) l
WHERE s.key = 'last_notified_version'
  AND s.value IS NOT NULL
  AND s.value <> ''
ON CONFLICT ("releaseVersion", "recipient") DO NOTHING;

-- Drop the now-orphaned SystemState row that the previous version-level
-- gate relied on. Per-recipient dedup makes the global stamp redundant
-- and harmful: it locked out customers who acquired a license after the
-- cron stamped, since they would never receive the release email.
DELETE FROM "SystemState" WHERE key = 'last_notified_version';
