-- CreateTable
CREATE TABLE "temp_cache" (
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temp_cache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "temp_cache_expires_at_idx" ON "temp_cache"("expires_at");

-- CreateIndex  
CREATE INDEX "temp_cache_created_at_idx" ON "temp_cache"("created_at");
