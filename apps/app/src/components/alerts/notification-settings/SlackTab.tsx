import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { SlackTabProps } from "./types";

export function SlackTab({
  slackWebhookUrl,
  setSlackWebhookUrl,
  slackEnabled,
  onToggleSlack,
  onSaveSlack,
  onDeleteSlack,
  hasExistingSlack,
  isSaving,
  isDeleting,
  t,
}: SlackTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base">{t("modal.slackNotifications")}</Label>
        <p className="text-sm text-muted-foreground mt-1">
          {t("modal.slackDescription")}
        </p>
      </div>

      <div className="space-y-4 p-4 border rounded-lg">
        <div className="space-y-2">
          <Label htmlFor="slack-webhook-url">
            {t("modal.slackWebhookUrl")}
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            id="slack-webhook-url"
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            value={slackWebhookUrl}
            onChange={(e) => setSlackWebhookUrl(e.target.value)}
            disabled={isSaving}
          />
          <p className="text-xs text-muted-foreground">
            {t("modal.slackWebhookHelp")}{" "}
            <a
              href="https://api.slack.com/messaging/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              {t("modal.slackWebhookLink")}
            </a>
            .
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="slack-enabled"
              checked={slackEnabled}
              onCheckedChange={onToggleSlack}
              disabled={isSaving}
              className="data-[state=checked]:bg-primary"
            />
            <Label htmlFor="slack-enabled">{t("modal.enabled")}</Label>
          </div>
          <div className="flex gap-2">
            {hasExistingSlack && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDeleteSlack}
                disabled={isDeleting}
                aria-label="Delete Slack integration"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
            <Button
              type="button"
              onClick={onSaveSlack}
              disabled={isSaving || !slackWebhookUrl.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {hasExistingSlack ? t("modal.updating") : t("modal.creating")}
                </>
              ) : hasExistingSlack ? (
                t("modal.update")
              ) : (
                t("modal.save")
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
