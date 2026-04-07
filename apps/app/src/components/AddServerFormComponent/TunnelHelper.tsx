import { useState } from "react";
import { UseFormReturn } from "react-hook-form";

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
  const host = form.watch("host");
  const [isOpen, setIsOpen] = useState(false);

  // Detect if user is entering localhost
  const isLocalhost =
    host &&
    (host.toLowerCase().trim() === "localhost" ||
      host.toLowerCase().trim() === "127.0.0.1" ||
      host.toLowerCase().trim().startsWith("127.0.0.1:") ||
      host.toLowerCase().trim().startsWith("localhost:"));

  // Detect if user is entering a tunnel URL
  const isTunnelUrl =
    host &&
    (host.includes("ngrok") ||
      host.includes("localtunnel") ||
      host.includes("loca.lt"));

  if (!isLocalhost && !isTunnelUrl) {
    return null;
  }

  if (isTunnelUrl) {
    // User is using a tunnel - show success message
    return (
      <Alert className="border-success/30 bg-success-muted">
        <Info className="h-4 w-4 text-success dark:text-success" />
        <AlertTitle className="text-success">Tunnel Detected</AlertTitle>
        <AlertDescription className="text-success dark:text-success">
          Your tunnel URL has been detected. HTTPS will be automatically
          enabled. Make sure your tunnel is running and accessible.
        </AlertDescription>
      </Alert>
    );
  }

  // User is entering localhost - show instructions
  return (
    <Alert className="border-info/30 bg-info-muted">
      <AlertCircle className="h-4 w-4 text-info dark:text-info" />
      <AlertTitle className="text-info">
        Monitoring localhost RabbitMQ?
      </AlertTitle>
      <AlertDescription className="space-y-2 text-info dark:text-info">
        <p>
          To monitor a RabbitMQ server running on localhost (development only),
          you need to expose it using a tunnel service.
        </p>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="link"
              className="h-auto p-0 text-info underline dark:text-info"
            >
              {isOpen ? "Hide" : "Show"} setup instructions
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            <div className="rounded-md bg-white p-3">
              <h4 className="mb-2 font-semibold">Option 1: ngrok</h4>
              <div className="space-y-2 font-mono text-sm">
                <div>
                  <code className="rounded bg-muted px-2 py-1">
                    ngrok http 15672
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Install ngrok first:{" "}
                  <a
                    href="https://ngrok.com/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-info underline dark:text-info"
                  >
                    ngrok.com/download
                  </a>
                  . Use the HTTPS URL in the Host field. The{" "}
                  <code>--basic-auth</code> flag adds security.
                </p>
              </div>
            </div>

            <div className="rounded-md bg-white p-3">
              <h4 className="mb-2 font-semibold">Option 2: localtunnel</h4>
              <div className="space-y-2 font-mono text-sm">
                <div>
                  <code className="rounded bg-muted px-2 py-1">
                    npx localtunnel --port 15672
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy the HTTPS URL provided (e.g.,{" "}
                  <code>https://abc123.loca.lt</code>) and paste it in the Host
                  field above. Port will default to 443.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </AlertDescription>
    </Alert>
  );
};
