import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WebhookExampleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebhookExampleModal({
  open,
  onOpenChange,
}: WebhookExampleModalProps) {
  const { t } = useTranslation("alerts");
  const [version, setVersion] = useState("v1");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("modal.webhookPayloadExample")}</DialogTitle>
          <DialogDescription>
            {t("modal.webhookPayloadExampleDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="webhook-version" className="text-sm font-semibold">
              {t("modal.version")}
            </Label>
            <Select value={version} onValueChange={setVersion}>
              <SelectTrigger id="webhook-version" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v1">v1</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {t("modal.onlyV1Available")}
            </span>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              {t("modal.httpHeaders")}
            </Label>
            <div className="p-4 bg-muted rounded-lg">
              <pre className="text-xs overflow-x-auto">
                {`Content-Type: application/json
User-Agent: Qarote-Webhook/1.0
X-Qarote-Event: alert.notification
X-Qarote-Version: ${version}
X-Qarote-Timestamp: 2024-01-15T10:30:00.000Z
X-Qarote-Signature: sha256=abc123... (if secret is configured)`}
              </pre>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              {t("modal.jsonPayload")}
            </Label>
            <div className="p-4 bg-muted rounded-lg">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(
                  {
                    version,
                    event: "alert.notification",
                    timestamp: "2024-01-15T10:30:00.000Z",
                    workspace: {
                      id: "workspace-123",
                      name: "My Workspace",
                    },
                    server: {
                      id: "server-456",
                      name: "Production RabbitMQ",
                    },
                    alerts: [
                      {
                        id: "alert-789",
                        serverId: "server-456",
                        serverName: "Production RabbitMQ",
                        severity: "CRITICAL",
                        category: "memory",
                        title: "High Memory Usage",
                        description:
                          "Memory usage has exceeded the threshold of 80%",
                        details: {
                          current: "85%",
                          threshold: 80,
                          recommended:
                            "Consider adding more memory or reducing queue sizes",
                          affected: ["node1", "node2"],
                        },
                        timestamp: "2024-01-15T10:30:00.000Z",
                        resolved: false,
                        source: {
                          type: "node",
                          name: "rabbit@node1",
                        },
                      },
                      {
                        id: "alert-790",
                        serverId: "server-456",
                        serverName: "Production RabbitMQ",
                        severity: "HIGH",
                        category: "disk",
                        title: "Disk Space Warning",
                        description:
                          "Disk usage is approaching the threshold of 90%",
                        details: {
                          current: "87%",
                          threshold: 90,
                          recommended:
                            "Consider cleaning up old logs or increasing disk space",
                        },
                        timestamp: "2024-01-15T10:25:00.000Z",
                        resolved: false,
                        source: {
                          type: "node",
                          name: "rabbit@node1",
                        },
                      },
                    ],
                    summary: {
                      total: 2,
                      critical: 1,
                      high: 1,
                      medium: 0,
                      low: 0,
                      info: 0,
                    },
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>

          <div className="p-4 bg-info-muted rounded-lg">
            <p className="text-sm text-info">
              <strong>{t("modal.webhookSignatureNoteLabel")}</strong>{" "}
              {t("modal.webhookSignatureNoteText")}{" "}
              <code className="text-xs bg-info-muted px-1 py-0.5 rounded">
                X-Qarote-Signature
              </code>{" "}
              {t("modal.webhookSignatureNoteSuffix")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("modal.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
