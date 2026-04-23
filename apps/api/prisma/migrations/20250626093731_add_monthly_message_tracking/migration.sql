-- CreateTable
CREATE TABLE "monthly_message_counts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_message_counts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthly_message_count_workspace_idx" ON "monthly_message_counts"("workspaceId");

-- CreateIndex
CREATE INDEX "monthly_message_count_date_idx" ON "monthly_message_counts"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_message_counts_workspaceId_year_month_key" ON "monthly_message_counts"("workspaceId", "year", "month");

-- AddForeignKey
ALTER TABLE "monthly_message_counts" ADD CONSTRAINT "monthly_message_counts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
