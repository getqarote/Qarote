-- The analyser computes a vhost for queue alerts and the dedup fingerprint
-- encodes it, but Alert had no column to hold it, so the UI's
-- `alert.vhost || "/"` rendered "/" for every alert.
--
-- Left NULL for existing rows: they never captured one, and backfilling "/"
-- would restate the same falsehood.
ALTER TABLE "Alert" ADD COLUMN "vhost" TEXT;
