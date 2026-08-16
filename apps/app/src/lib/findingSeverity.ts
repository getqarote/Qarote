// Severity ordering for config-scan findings. The getFindings query sorts by
// detectedAt (not severity), so callers that show a truncated "most severe N"
// preview re-sort the page with this rank. Unknown values sort last.
const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 4,
  ERROR: 3,
  WARNING: 2,
  INFO: 1,
};

export const severityRank = (severity: string): number =>
  SEVERITY_RANK[severity] ?? 0;
