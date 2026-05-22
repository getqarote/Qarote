-- Filtered partial unique indexes for AlertRule config rules.
-- Prisma schema syntax does not support WHERE clauses on indexes,
-- so these are applied via raw migration.
--
-- Guarantees: one CONFIG rule per configRuleKey per server (or per workspace
-- for workspace-scoped rules where serverId IS NULL), without affecting METRIC
-- rules or rules with a NULL configRuleKey.

CREATE UNIQUE INDEX "AlertRule_workspace_config_rule_unique"
  ON "AlertRule"("workspaceId", "configRuleKey")
  WHERE evaluator = 'CONFIG' AND "serverId" IS NULL;

CREATE UNIQUE INDEX "AlertRule_server_config_rule_unique"
  ON "AlertRule"("serverId", "configRuleKey")
  WHERE evaluator = 'CONFIG' AND "serverId" IS NOT NULL;
