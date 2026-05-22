-- Clear any user-supplied model values on MANAGED workspaces.
-- The service layer now always uses the platform default for MANAGED,
-- so stored values are dead weight and confuse the settings UI.
UPDATE "WorkspaceLlmConfig" SET "model" = NULL
WHERE "provider" = 'MANAGED'
  AND "model" IS NOT NULL;
