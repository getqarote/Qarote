import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import {
  applyParsedUrlToForm,
  parseRabbitMQUrl,
} from "@/lib/rabbitmqUrlParser";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { AddServerFormData } from "@/schemas";

interface ServerUrlInputProps {
  form: UseFormReturn<AddServerFormData>;
  onParseSuccess?: () => void;
}

export const ServerUrlInput = ({
  form,
  onParseSuccess,
}: ServerUrlInputProps) => {
  const { t } = useTranslation("dashboard");
  const [url, setUrl] = useState("");
  const [parseStatus, setParseStatus] = useState<
    "idle" | "parsing" | "success" | "error"
  >("idle");

  const isParsing = parseStatus === "parsing";

  // Debounce URL parsing
  useEffect(() => {
    if (!url.trim()) {
      setParseStatus("idle");
      return;
    }

    const timeoutId = setTimeout(() => {
      setParseStatus("parsing");
      const parsed = parseRabbitMQUrl(url);

      if (parsed) {
        applyParsedUrlToForm(parsed, form);
        setParseStatus("success");
        onParseSuccess?.();
      } else {
        setParseStatus("error");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [url, form, onParseSuccess]);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setParseStatus("idle");
  };

  const handleClearUrl = () => {
    setUrl("");
    setParseStatus("idle");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="server-url" className="title-section block text-xl">
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
      {parseStatus === "idle" && (
        <p className="text-sm text-muted-foreground">{t("serverUrlHelp")}</p>
      )}
      {parseStatus === "success" && (
        <p className="text-sm text-success">{t("urlParsedSuccess")}</p>
      )}
      {parseStatus === "error" && (
        <p className="text-sm text-destructive">{t("urlParseError")}</p>
      )}
    </div>
  );
};
