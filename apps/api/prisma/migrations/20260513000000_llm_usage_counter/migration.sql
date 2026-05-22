-- CreateTable
CREATE TABLE "llm_usage_counters" (
    "workspace_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "call_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llm_usage_counters_pkey" PRIMARY KEY ("workspace_id", "period_start")
);

-- AddForeignKey
ALTER TABLE "llm_usage_counters" ADD CONSTRAINT "llm_usage_counters_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
