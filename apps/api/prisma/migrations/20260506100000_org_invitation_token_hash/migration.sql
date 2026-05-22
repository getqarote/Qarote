-- Replace OrganizationInvitation.token (raw) with tokenHash (SHA-256 hex),
-- mirroring the workspace Invitation hardening in 20260505100000.
-- The raw token is now only sent in the email link and never persisted.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "OrganizationInvitation" ADD COLUMN "tokenHash" TEXT;

UPDATE "OrganizationInvitation"
SET "tokenHash" = encode(digest("token", 'sha256'), 'hex')
WHERE "tokenHash" IS NULL;

ALTER TABLE "OrganizationInvitation" ALTER COLUMN "tokenHash" SET NOT NULL;
DROP INDEX IF EXISTS "OrganizationInvitation_token_key";
ALTER TABLE "OrganizationInvitation" DROP COLUMN "token";
CREATE UNIQUE INDEX "OrganizationInvitation_tokenHash_key" ON "OrganizationInvitation"("tokenHash");
