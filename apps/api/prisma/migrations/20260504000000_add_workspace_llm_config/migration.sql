-- LLM explain integration: per-workspace LLM provider configuration.
--
-- WorkspaceLlmConfig stores the provider choice (Ollama / Anthropic /
-- OpenAI / Managed) and the encrypted API key for BYOK providers.
-- The key is encrypted with AES-256-GCM in a dedicated LlmEncryptionService
-- (NOT the existing EncryptionService which uses AES-256-CBC).
--
-- encryptionKeyVersion tracks which ENCRYPTION_KEY_vN env var was used
-- so the key can be re-encrypted on rotation without losing access.

CREATE TYPE "LlmProvider" AS ENUM ('OLLAMA', 'ANTHROPIC', 'OPENAI', 'MANAGED');

CREATE TABLE "WorkspaceLlmConfig" (
    "workspaceId"          TEXT        NOT NULL,
    "provider"             "LlmProvider" NOT NULL,
    "ollamaEndpoint"       TEXT,
    "ollamaModel"          TEXT,
    "endpointOverride"     TEXT,
    "apiKeyEnc"            TEXT,
    "encryptionKeyVersion" INTEGER     NOT NULL DEFAULT 1,
    "model"                TEXT,
    "enabled"              BOOLEAN     NOT NULL DEFAULT false,
    "updatedAt"            TIMESTAMP(3) NOT NULL,
    "updatedById"          TEXT,

    CONSTRAINT "WorkspaceLlmConfig_pkey" PRIMARY KEY ("workspaceId")
);

ALTER TABLE "WorkspaceLlmConfig"
    ADD CONSTRAINT "WorkspaceLlmConfig_workspaceId_fkey"
    FOREIGN KEY ("workspaceId")
    REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceLlmConfig"
    ADD CONSTRAINT "WorkspaceLlmConfig_updatedById_fkey"
    FOREIGN KEY ("updatedById")
    REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
