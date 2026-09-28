-- The queue ceiling told customers above 100 queues to contact us, but nothing
-- could then say yes: the limit was a constant. A per-server override makes the
-- exception explicit and visible, and keeps the ingestion bound the sizing
-- figures rely on — the default stays 100, every exception is a decision.
--
-- NULL for every existing row: no exception has been granted yet. SQL is the
-- only writer, so the database is the boundary: a 0 or a negative value would
-- otherwise cut off every broker on the next cycle.
ALTER TABLE "RabbitMQServer" ADD COLUMN "queueLimitOverride" INTEGER;

-- NOT VALID: enforced for every new write, but existing rows are not scanned
-- under the lock — they are all NULL, so there is nothing to validate.
ALTER TABLE "RabbitMQServer"
  ADD CONSTRAINT "RabbitMQServer_queueLimitOverride_check"
  CHECK ("queueLimitOverride" > 0) NOT VALID;
