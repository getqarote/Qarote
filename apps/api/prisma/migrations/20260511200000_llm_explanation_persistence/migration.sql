-- CreateTable
CREATE TABLE "llm_explanations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "incident_finding_id" TEXT,
    "config_finding_id" TEXT,
    "trace_event_id" TEXT,
    "prompt_version" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_by" TEXT,
    "superseded_at" TIMESTAMP(3),

    CONSTRAINT "llm_explanations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "llm_explanations_workspace_id_created_at_idx" ON "llm_explanations"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "llm_explanations_incident_finding_id_idx" ON "llm_explanations"("incident_finding_id");

-- CreateIndex
CREATE INDEX "llm_explanations_config_finding_id_idx" ON "llm_explanations"("config_finding_id");

-- CreateIndex
CREATE INDEX "llm_explanations_trace_event_id_idx" ON "llm_explanations"("trace_event_id");

-- AddForeignKey
ALTER TABLE "llm_explanations" ADD CONSTRAINT "llm_explanations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_explanations" ADD CONSTRAINT "llm_explanations_incident_finding_id_fkey" FOREIGN KEY ("incident_finding_id") REFERENCES "incident_diagnosis_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_explanations" ADD CONSTRAINT "llm_explanations_config_finding_id_fkey" FOREIGN KEY ("config_finding_id") REFERENCES "ConfigFinding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_explanations" ADD CONSTRAINT "llm_explanations_trace_event_id_fkey" FOREIGN KEY ("trace_event_id") REFERENCES "MessageTraceEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_explanations" ADD CONSTRAINT "llm_explanations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK: exactly one of the three subject FKs must be non-null
ALTER TABLE "llm_explanations"
  ADD CONSTRAINT "llm_explanations_exactly_one_subject" CHECK (
    (incident_finding_id IS NOT NULL)::int +
    (config_finding_id IS NOT NULL)::int +
    (trace_event_id IS NOT NULL)::int = 1
  );

-- Partial unique indexes: one live explanation per (subject, prompt_version, provider, model)
-- Provider is included so different providers using the same model label
-- (e.g. Azure-OpenAI and OpenAI both reporting "gpt-4") cannot collide.
-- Using inference form (not ON CONSTRAINT) because partial indexes are not constraints.
CREATE UNIQUE INDEX "llm_explanations_live_incident"
  ON "llm_explanations" ("incident_finding_id", "prompt_version", "provider", "model")
  WHERE superseded_at IS NULL AND incident_finding_id IS NOT NULL;

CREATE UNIQUE INDEX "llm_explanations_live_config"
  ON "llm_explanations" ("config_finding_id", "prompt_version", "provider", "model")
  WHERE superseded_at IS NULL AND config_finding_id IS NOT NULL;

CREATE UNIQUE INDEX "llm_explanations_live_trace"
  ON "llm_explanations" ("trace_event_id", "prompt_version", "provider", "model")
  WHERE superseded_at IS NULL AND trace_event_id IS NOT NULL;
