import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { ParsedRabbitMQUrl, Provenance } from "@/lib/rabbitmqUrlParser";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconArrowRight, IconCheck } from "@/components/ui/icons";

/**
 * Re-detect DIFF — the headline of the edit-server flow.
 *
 * Given the current saved connection (`current`) and a freshly parsed URL
 * (`parsed`), render ONLY the fields that actually changed. Each row is a
 * cherry-pick checkbox: the user reviews old → new (with a provenance chip)
 * and applies just the fields they want. We NEVER silently overwrite the saved
 * connection — `onApply` receives the exact set of picked field keys.
 *
 * A parsed password is masked here and applied verbatim to the form; it is
 * never echoed in plaintext.
 */

/** Diffable connection fields, in display order, mapped to their parsed source. */
type DiffKey = "host" | "port" | "amqpPort" | "useHttps" | "username" | "vhost";

interface CurrentConnection {
  host: string;
  port: number;
  amqpPort: number;
  useHttps: boolean;
  username: string;
  vhost: string;
}

interface DiffRow {
  key: DiffKey;
  /** i18n label key under the `prov` namespace, reused from the parse preview. */
  label: string;
  fromDisplay: string;
  toDisplay: string;
  prov?: Provenance;
  /** Render the value cells in mono (hosts/ports/vhost) vs plain (TLS). */
  mono: boolean;
}

const PROV_CLASS: Record<Provenance, string> = {
  detected: "border-success/40 bg-success-muted text-success",
  inferred: "border-info/40 bg-info-muted text-info",
  defaulted: "border-border bg-muted text-muted-foreground",
};

/**
 * Maps the form's current values + a parsed URL into the changed-only diff
 * rows. A row is included only when the detected value differs from current.
 * The password is handled separately (it has no "current" to compare against
 * and is masked), so it is not part of this list.
 */
function buildDiffRows(
  current: CurrentConnection,
  parsed: ParsedRabbitMQUrl,
  labels: Record<DiffKey, string>,
  tlsOn: string,
  tlsOff: string
): DiffRow[] {
  const rows: DiffRow[] = [];

  if (parsed.host && parsed.host !== current.host) {
    rows.push({
      key: "host",
      label: labels.host,
      fromDisplay: current.host || "—",
      toDisplay: parsed.host,
      prov: parsed.provenance.host,
      mono: true,
    });
  }
  if (parsed.port !== current.port) {
    rows.push({
      key: "port",
      label: labels.port,
      fromDisplay: String(current.port),
      toDisplay: String(parsed.port),
      prov: parsed.provenance.port,
      mono: true,
    });
  }
  if (parsed.amqpPort !== current.amqpPort) {
    rows.push({
      key: "amqpPort",
      label: labels.amqpPort,
      fromDisplay: String(current.amqpPort),
      toDisplay: String(parsed.amqpPort),
      prov: parsed.provenance.amqpPort,
      mono: true,
    });
  }
  if (parsed.useHttps !== current.useHttps) {
    rows.push({
      key: "useHttps",
      label: labels.useHttps,
      fromDisplay: current.useHttps ? tlsOn : tlsOff,
      toDisplay: parsed.useHttps ? tlsOn : tlsOff,
      prov: parsed.provenance.useHttps,
      mono: false,
    });
  }
  if (parsed.username && parsed.username !== current.username) {
    rows.push({
      key: "username",
      label: labels.username,
      fromDisplay: current.username || "—",
      toDisplay: parsed.username,
      prov: parsed.provenance.username,
      mono: true,
    });
  }
  if (parsed.vhost && parsed.vhost !== current.vhost) {
    rows.push({
      key: "vhost",
      label: labels.vhost,
      fromDisplay: current.vhost || "/",
      toDisplay: parsed.vhost,
      prov: parsed.provenance.vhost,
      mono: true,
    });
  }

  return rows;
}

interface RedetectDiffProps {
  current: CurrentConnection;
  parsed: ParsedRabbitMQUrl;
  /** True when the parsed URL carried a password — applied (masked) on apply. */
  hasParsedPassword: boolean;
  /** Apply only the picked keys to the form. Password is always applied when
   *  present (it is implicitly part of "this URL"), never shown in plaintext. */
  onApply: (pickedKeys: DiffKey[]) => void;
  onCancel: () => void;
}

export const RedetectDiff = ({
  current,
  parsed,
  hasParsedPassword,
  onApply,
  onCancel,
}: RedetectDiffProps) => {
  const { t } = useTranslation("dashboard");

  const rows = buildDiffRows(
    current,
    parsed,
    {
      host: t("prov.host"),
      port: t("prov.mgmtPort"),
      amqpPort: t("prov.amqpPort"),
      useHttps: t("prov.tls"),
      username: t("prov.username"),
      vhost: t("prov.vhost"),
    },
    t("prov.tlsOn"),
    t("prov.tlsOff")
  );

  const [picked, setPicked] = useState<Set<DiffKey>>(
    () => new Set(rows.map((r) => r.key))
  );

  const toggle = (key: DiffKey) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Nothing differs and no password to rotate → a clean re-detect.
  const nothingChanged = rows.length === 0 && !hasParsedPassword;

  return (
    <div className="space-y-3 rounded-lg border border-success/30 bg-success-muted/40 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <IconCheck className="h-4 w-auto shrink-0 text-success" />
        {t("redetectReviewHeading", { host: parsed.host })}
      </div>

      {nothingChanged ? (
        <p className="text-sm text-muted-foreground">
          {t("redetectNothingChanged")}
        </p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border bg-card">
          {rows.map((row) => {
            const cellClass = row.mono ? "font-mono" : "";
            return (
              <label
                key={row.key}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm"
              >
                <Checkbox
                  checked={picked.has(row.key)}
                  onCheckedChange={() => toggle(row.key)}
                  aria-label={t("redetectApplyField", { field: row.label })}
                />
                <span className="w-28 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </span>
                <code
                  className={`truncate text-muted-foreground line-through ${cellClass}`}
                >
                  {row.fromDisplay}
                </code>
                <IconArrowRight
                  className="h-3.5 w-auto shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <code className={`truncate text-foreground ${cellClass}`}>
                  {row.toDisplay}
                </code>
                {row.prov && (
                  <span
                    className={`ml-auto shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${PROV_CLASS[row.prov]}`}
                  >
                    {t(`prov.${row.prov}`)}
                  </span>
                )}
              </label>
            );
          })}

          {/* A rotated password from the URL — masked, always applied. */}
          {hasParsedPassword && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 text-sm">
              <span className="w-28 shrink-0 pl-[26px] text-xs uppercase tracking-wide text-muted-foreground">
                {t("passwordLabel")}
              </span>
              <code className="font-mono text-foreground">
                {"•".repeat(10)}
              </code>
              <span className="ml-auto shrink-0 rounded border border-success/40 bg-success-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-success">
                {t("redetectPasswordRotated")}
              </span>
            </div>
          )}
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("prov.legend")}
      </p>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="btn-primary"
          disabled={picked.size === 0 && !hasParsedPassword}
          onClick={() => onApply([...picked])}
        >
          {nothingChanged
            ? t("redetectApplyNone")
            : t("applyNChanges", {
                count: picked.size + (hasParsedPassword ? 1 : 0),
              })}
        </Button>
      </div>
    </div>
  );
};

export type { DiffKey };
