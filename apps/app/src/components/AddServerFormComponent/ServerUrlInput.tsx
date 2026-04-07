import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import {
  applyParsedUrlToForm,
  parseRabbitMQUrl,
} from "@/lib/rabbitmqUrlParser";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { AddServerFormData } from "@/schemas";

interface ServerUrlInputProps {
  form: UseFormReturn<AddServerFormData>;
  mode?: "add" | "edit";
}

export const ServerUrlInput = ({ form, mode = "add" }: ServerUrlInputProps) => {
  const [url, setUrl] = useState("");
  const [parseStatus, setParseStatus] = useState<{
    status: "idle" | "success" | "error";
    message?: string;
  }>({ status: "idle" });
  const [isParsing, setIsParsing] = useState(false);

  // Debounce URL parsing
  useEffect(() => {
    if (!url.trim()) {
      setParseStatus({ status: "idle" });
      return;
    }

    setIsParsing(true);
    const timeoutId = setTimeout(() => {
      const parsed = parseRabbitMQUrl(url);

      if (parsed) {
        try {
          applyParsedUrlToForm(parsed, form);
          setParseStatus({
            status: "success",
            message: "URL parsed successfully! Fields have been auto-filled.",
          });
        } catch (error) {
          setParseStatus({
            status: "error",
            message: "Failed to apply parsed URL to form.",
          });
        }
      } else {
        setParseStatus({
          status: "error",
          message: "Invalid URL format. Please check and try again.",
        });
      }
      setIsParsing(false);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [url, form]);

  // Only show in "add" mode
  if (mode === "edit") {
    return null;
  }

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setParseStatus({ status: "idle" });
  };

  const handleClearUrl = () => {
    setUrl("");
    setParseStatus({ status: "idle" });
    // Don't clear form fields - user may have edited them
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="server-url" className="text-base font-medium">
          Server URL (Optional)
        </Label>
        <div className="relative">
          <Input
            id="server-url"
            type="url"
            placeholder="https://rabbitmq.example.com or amqps://user:pass@host:5671/vhost"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="pr-10"
          />
          {isParsing && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isParsing && parseStatus.status === "success" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
          )}
          {!isParsing && parseStatus.status === "error" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
          )}
          {url && !isParsing && (
            <button
              type="button"
              onClick={handleClearUrl}
              className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Clear URL"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Paste your full RabbitMQ server URL (HTTP(S) management URL or AMQP(S)
          connection string) to auto-populate all fields below. Or skip this and
          fill the fields manually.
        </p>
      </div>

      {parseStatus.status === "success" && parseStatus.message && (
        <Alert className="border-success/30 bg-success-muted">
          <CheckCircle2 className="h-4 w-4 text-success dark:text-success" />
          <AlertDescription className="text-success dark:text-success">
            {parseStatus.message}
          </AlertDescription>
        </Alert>
      )}

      {parseStatus.status === "error" && parseStatus.message && (
        <Alert
          variant="destructive"
          className="border-destructive/30 bg-destructive/10"
        >
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            {parseStatus.message} You can still fill the fields manually below.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
