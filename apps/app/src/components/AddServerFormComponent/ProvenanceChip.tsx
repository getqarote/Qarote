import type { Provenance } from "@/lib/rabbitmqUrlParser";

/**
 * Visual weight per provenance: a value read verbatim from the URL reads
 * confident (success), an inferred one neutral, a guessed default cautious
 * (warning). Tokens only — carrot/paper/night theme, no raw colours.
 */
const PROV_STYLES: Record<Provenance, string> = {
  detected: "border-success/40 text-success",
  inferred: "border-border text-muted-foreground",
  defaulted: "border-warning/50 text-warning",
};

interface ProvenanceChipProps {
  /** Field label, e.g. "Host" or "Management port". */
  label: string;
  /** The parsed value to display. */
  value: string;
  /** Where the value came from. */
  prov: Provenance;
  /** Localised provenance word, e.g. "detected" — also used as tooltip. */
  provLabel: string;
}

/**
 * Compact chip that surfaces a parsed connection field together with its
 * provenance, so a guessed value is visibly a guess. Shared by the URL-parse
 * preview and the confirmation card.
 */
export const ProvenanceChip = ({
  label,
  value,
  prov,
  provLabel,
}: ProvenanceChipProps) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${PROV_STYLES[prov]}`}
    title={provLabel}
  >
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono">{value}</span>
    <span className="opacity-70">· {provLabel}</span>
  </span>
);
