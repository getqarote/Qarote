-- Opt-in public sharing for LLM explanations: an opaque revocable token with a
-- 90-day expiry, plus a best-effort structured snapshot of the incident
-- evidence captured at explain-time so the public RCA page renders without
-- re-querying private workspace data.
ALTER TABLE "llm_explanations"
  ADD COLUMN "share_token" TEXT,
  ADD COLUMN "share_expires_at" TIMESTAMP(3),
  ADD COLUMN "public_snapshot" JSONB;

CREATE UNIQUE INDEX "llm_explanations_share_token_key" ON "llm_explanations"("share_token");
