import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import {
  applyParsedUrlToForm,
  type ParsedRabbitMQUrl,
  parseRabbitMQUrl,
} from "@/lib/rabbitmqUrlParser";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { AddServerFormData } from "@/schemas";

import { ProvenanceChip } from "./ProvenanceChip";

interface ServerUrlInputProps {
  form: UseFormReturn<AddServerFormData>;
  onParseSuccess?: () => void;
  /** Lifts the parsed result (or null on failure) to the parent so the
   *  confirmation card can render the same provenance later. */
  onParsed?: (parsed: ParsedRabbitMQUrl | null) => void;
  /** Lifts the raw URL string to the parent so "Detect" can gate on
   *  emptiness and re-parse without owning the input state. */
  onUrlChange?: (url: string) => void;
  /** Reveals the manual connection fields — used by the fallback CTA. */
  onManualEntry?: () => void;
}

export const ServerUrlInput = ({
  form,
  onParseSuccess,
  onParsed,
  onUrlChange,
  onManualEntry,
}: ServerUrlInputProps) => {
  const { t } = useTranslation("dashboard");
  const [url, setUrl] = useState("");
  const [parseStatus, setParseStatus] = useState<
    "idle" | "parsing" | "success" | "error"
  >("idle");
  const [hasCredentials, setHasCredentials] = useState(false);
  const [parsed, setParsed] = useState<ParsedRabbitMQUrl | null>(null);

  const isParsing = parseStatus === "parsing";

  // Debounce URL parsing
  useEffect(() => {
    if (!url.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParseStatus("idle");
      return;
    }

    const timeoutId = setTimeout(() => {
      setParseStatus("parsing");
      const parsed = parseRabbitMQUrl(url);

      if (parsed) {
        applyParsedUrlToForm(parsed, form);
        setParsed(parsed);
        setHasCredentials(!!form.getValues("password"));
        setParseStatus("success");
        onParsed?.(parsed);
        onParseSuccess?.();
      } else {
        setParsed(null);
        setParseStatus("error");
        onParsed?.(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [url, form, onParseSuccess, onParsed]);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setParseStatus("idle");
    onUrlChange?.(value);
  };

  const handleClearUrl = () => {
    setUrl("");
    setParseStatus("idle");
    setHasCredentials(false);
    setParsed(null);
    onParsed?.(null);
    onUrlChange?.("");
  };

  return (
    <div className="space-y-2">
      <Label
        htmlFor="server-url"
        className="text-sm font-medium text-foreground"
      >
        {t("serverUrlLabel")}
      </Label>
      <div className="relative">
        <Input
          id="server-url"
          type="url"
          placeholder={t("serverUrlPlaceholder")}
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="h-12 text-base pr-24 font-mono"
          autoFocus
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {url && !isParsing && (
            <button
              type="button"
              onClick={handleClearUrl}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("clearUrl")}
            </button>
          )}
          {isParsing && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {parseStatus === "success" && (
            <CheckCircle2 className="h-4 w-4 text-success" />
          )}
          {parseStatus === "error" && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>
      {/* Accepts: example connection strings — mirrors the paste affordance so
          users know the URL field takes management URLs, bare hosts, or AMQP. */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>{t("serverUrlAccepts")}</span>
        <code className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
          https://host:15672
        </code>
        <code className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
          host.example.com
        </code>
        <code className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
          amqps://user:pass@host:5671/vhost
        </code>
      </div>

      <div role="status" aria-live="polite">
        {parseStatus === "idle" && (
          <p className="text-sm text-muted-foreground">{t("serverUrlHelp")}</p>
        )}
        {parseStatus === "success" && (
          <p
            className={`text-sm ${hasCredentials ? "text-success" : "text-muted-foreground"}`}
          >
            {hasCredentials ? t("urlParsedSuccess") : t("urlParsedNoCreds")}
          </p>
        )}
        {parseStatus === "error" && (
          <p className="text-sm text-destructive">{t("urlParseError")}</p>
        )}
      </div>

      {/* Manual-entry fallback — when the URL can't be parsed, the input is a
          dead end on its own. Surface a clear way to fill the fields by hand. */}
      {parseStatus === "error" && onManualEntry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onManualEntry}
          className="w-full sm:w-auto"
        >
          {t("manualSetupShow")}
        </Button>
      )}

      {/* Provenance chips — show which connection fields we read straight from
          the URL vs inferred/defaulted, so a guessed value is visibly a guess. */}
      {parseStatus === "success" && parsed && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <ProvenanceChip
            label={t("prov.host")}
            value={parsed.host}
            prov={parsed.provenance.host}
            provLabel={t(`prov.${parsed.provenance.host}`)}
          />
          <ProvenanceChip
            label={t("prov.tls")}
            value={parsed.useHttps ? t("prov.tlsOn") : t("prov.tlsOff")}
            prov={parsed.provenance.useHttps}
            provLabel={t(`prov.${parsed.provenance.useHttps}`)}
          />
          <ProvenanceChip
            label={t("prov.mgmtPort")}
            value={String(parsed.port)}
            prov={parsed.provenance.port}
            provLabel={t(`prov.${parsed.provenance.port}`)}
          />
          <ProvenanceChip
            label={t("prov.amqpPort")}
            value={String(parsed.amqpPort)}
            prov={parsed.provenance.amqpPort}
            provLabel={t(`prov.${parsed.provenance.amqpPort}`)}
          />
          {parsed.username && parsed.provenance.username && (
            <ProvenanceChip
              label={t("prov.username")}
              value={parsed.username}
              prov={parsed.provenance.username}
              provLabel={t(`prov.${parsed.provenance.username}`)}
            />
          )}
          {parsed.vhost && parsed.provenance.vhost && (
            <ProvenanceChip
              label={t("prov.vhost")}
              value={parsed.vhost}
              prov={parsed.provenance.vhost}
              provLabel={t(`prov.${parsed.provenance.vhost}`)}
            />
          )}
        </div>
      )}
    </div>
  );
};
