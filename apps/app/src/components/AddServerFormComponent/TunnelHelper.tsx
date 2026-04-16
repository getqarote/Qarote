import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";

import { AlertCircle, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { AddServerFormData } from "@/schemas";

interface TunnelHelperProps {
  form: UseFormReturn<AddServerFormData>;
}

export const TunnelHelper = ({ form }: TunnelHelperProps) => {
  const { t } = useTranslation("dashboard");
  const host = form.watch("host");
  const [isOpen, setIsOpen] = useState(false);

  const normalized = host?.toLowerCase().trim() ?? "";

  const isLocalhost =
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.startsWith("127.0.0.1:") ||
    normalized.startsWith("localhost:");

  const isTunnelUrl =
    normalized.includes("ngrok") ||
    normalized.includes("localtunnel") ||
    normalized.includes("loca.lt");

  if (!isLocalhost && !isTunnelUrl) {
    return null;
  }

  if (isTunnelUrl) {
    return (
      <Alert className="border-success/30 bg-success-muted">
        <Info className="h-4 w-4 text-success" />
        <AlertTitle className="text-success">
          {t("tunnelDetectedTitle")}
        </AlertTitle>
        <AlertDescription className="text-success">
          {t("tunnelDetectedDescription")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-info/30 bg-info-muted">
      <AlertCircle className="h-4 w-4 text-info" />
      <AlertTitle className="text-info">{t("tunnelLocalhostTitle")}</AlertTitle>
      <AlertDescription className="space-y-2 text-info">
        <p>{t("tunnelLocalhostDescription")}</p>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="link" className="h-auto p-0 text-info underline">
              {isOpen
                ? t("tunnelHideInstructions")
                : t("tunnelShowInstructions")}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            <div className="rounded-md bg-card border border-border p-3">
              <h4 className="mb-2 font-semibold text-foreground">
                {t("tunnelOption1")}
              </h4>
              <div className="space-y-2 text-sm">
                <code className="inline-block rounded bg-muted px-2 py-1 font-mono">
                  ngrok http 15672
                </code>
                <p className="text-xs text-muted-foreground">
                  <Trans
                    i18nKey="tunnelOption1Help"
                    t={t}
                    components={[
                      <a
                        key="0"
                        href="https://ngrok.com/download"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-info underline"
                      >
                        ngrok.com
                      </a>,
                    ]}
                  />
                </p>
              </div>
            </div>

            <div className="rounded-md bg-card border border-border p-3">
              <h4 className="mb-2 font-semibold text-foreground">
                {t("tunnelOption2")}
              </h4>
              <div className="space-y-2 text-sm">
                <code className="inline-block rounded bg-muted px-2 py-1 font-mono">
                  npx localtunnel --port 15672
                </code>
                <p className="text-xs text-muted-foreground">
                  {t("tunnelOption2Help")}
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </AlertDescription>
    </Alert>
  );
};
