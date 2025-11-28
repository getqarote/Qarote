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

import type { AddServerFormData } from "@/schemas/forms";

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
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-300">
          Tunnel Detected
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-400">
          Your tunnel URL has been detected. HTTPS will be automatically
          enabled. Make sure your tunnel is running and accessible.
        </AlertDescription>
      </Alert>
    );
  }

  // User is entering localhost - show instructions
  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
      <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-800 dark:text-blue-300">
        Monitoring localhost RabbitMQ?
      </AlertTitle>
      <AlertDescription className="space-y-2 text-blue-700 dark:text-blue-400">
        <p>
          To monitor a RabbitMQ server running on localhost (development only),
          you need to expose it using a tunnel service.
        </p>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="link"
              className="h-auto p-0 text-blue-700 underline dark:text-blue-400"
            >
              {isOpen ? "Hide" : "Show"} setup instructions
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            <div className="rounded-md bg-white p-3 dark:bg-gray-900">
              <h4 className="mb-2 font-semibold">Option 1: localtunnel</h4>
              <div className="space-y-2 font-mono text-sm">
                <div>
                  <code className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">
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

            <div className="rounded-md bg-white p-3 dark:bg-gray-900">
              <h4 className="mb-2 font-semibold">Option 2: ngrok</h4>
              <div className="space-y-2 font-mono text-sm">
                <div>
                  <code className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">
                    ngrok http 15672
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Install ngrok first:{" "}
                  <a
                    href="https://ngrok.com/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline dark:text-blue-400"
                  >
                    ngrok.com/download
                  </a>
                  . Use the HTTPS URL in the Host field. The{" "}
                  <code>--basic-auth</code> flag adds security.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </AlertDescription>
    </Alert>
  );
};
