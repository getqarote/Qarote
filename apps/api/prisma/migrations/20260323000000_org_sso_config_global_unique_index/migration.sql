-- Enforce at most one instance-wide (organizationId IS NULL) SSO config.
-- The existing @@unique([organizationId]) handles non-NULL values but
-- PostgreSQL treats NULLs as distinct in unique indexes, so a partial
-- index is required to prevent duplicate global configs.
CREATE UNIQUE INDEX IF NOT EXISTS "org_sso_config_global_idx"
  ON "OrgSsoConfig" ((1))
  WHERE "organizationId" IS NULL;
