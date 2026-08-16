import { useTranslation } from "react-i18next";

import { formatRelativeAgo } from "@/lib/formatRelativeAgo";

interface ExplanationProvenanceProps {
  /** LLM provider id, e.g. "anthropic", "openai", "ollama". */
  provider: string;
  /** Resolved model id, e.g. "claude-sonnet-4-5". */
  model: string;
  /** Prompt template version that produced this explanation. */
  promptVersion: string;
  /** ISO-8601 timestamp the explanation was generated. */
  createdAt: string;
}

/**
 * Provenance footer for an LLM explanation — answers "where did this come
 * from?" with the generating model, prompt version, and freshness.
 *
 * One source of truth shared by the standalone explanation page
 * (`Explanation.tsx`) and the in-panel Explain output on `DiagnosisCard`,
 * so both surfaces show identical provenance instead of drifting. The card
 * was previously missing this line entirely.
 */
export function ExplanationProvenance({
  provider,
  model,
  promptVersion,
  createdAt,
}: ExplanationProvenanceProps) {
  const { t } = useTranslation("diagnosis");

  return (
    <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
      <p>{formatRelativeAgo(createdAt, t("justNow"))}</p>
      <p>
        {t("provenance.generatedBy")} {provider} · {model} ·{" "}
        {t("provenance.promptVersion", { version: promptVersion })}
      </p>
    </div>
  );
}
