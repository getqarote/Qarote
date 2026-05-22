/**
 * Stable identity for a diagnosis finding, used as React key and DOM id.
 *
 * Prefers the persisted `IncidentDiagnosisRecord.id` (UUID) when available.
 * Falls back to a fully-qualified composite of the natural key when the finding
 * has not yet been persisted (dryRun, or persistence best-effort failure — see
 * `apps/api/src/ee/services/incident/incident.interfaces.ts`). Keeping the
 * fallback in one place prevents the three call sites (DiagnosisCard,
 * HomeActiveConcerns, Diagnosis page) from drifting.
 *
 * Note: when `id` becomes available between renders (first cycle → after
 * persist), the key flips and React will remount the consumer. This is the
 * known cost of `id` being optional on the wire; tightening the contract would
 * require persistence to be guaranteed (it currently is not — see the
 * try/catch in `incident-diagnosis.service.ts`).
 */
interface FindingKeyInput {
  id?: string;
  rule: string;
  scope: string;
  queueName: string;
  vhost: string;
  detectedAt: string;
}

export function findingKey(d: FindingKeyInput): string {
  return (
    d.id ?? `${d.scope}-${d.vhost}-${d.rule}-${d.queueName}-${d.detectedAt}`
  );
}
