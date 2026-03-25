import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { WebhookTabProps } from "./types";

export function WebhookTab({
  webhookUrl,
  setWebhookUrl,
  webhookSecret,
  setWebhookSecret,
  webhookEnabled,
  showSecret,
  setShowSecret,
  onToggleWebhook,
  onSaveWebhook,
  onDeleteWebhook,
  onShowExample,
  hasExistingWebhook,
  isSaving,
  isDeleting,
  t,
}: WebhookTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">{t("modal.webhookNotifications")}</Label>
          <p className="text-sm text-muted-foreground mt-1">
            {t("modal.webhookDescription")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onShowExample}
        >
          {t("modal.viewExamplePayload")}
        </Button>
      </div>

      <div className="p-4 border rounded-lg space-y-3">
        <div className="space-y-2">
          <Label htmlFor="webhook-url">
            {t("modal.webhookUrl")}
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://your-endpoint.com/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="webhook-secret">
            {t("modal.webhookSecretOptional")}
          </Label>
          <div className="relative">
            <Input
              id="webhook-secret"
              type={showSecret ? "text" : "password"}
              placeholder={t("modal.webhookSecretPlaceholder")}
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              disabled={isSaving}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowSecret(!showSecret)}
              disabled={isSaving}
            >
              {showSecret ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("modal.webhookSecretHelp")}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="webhook-enabled"
              checked={webhookEnabled}
              onCheckedChange={onToggleWebhook}
              disabled={isSaving}
              className="data-[state=checked]:bg-gradient-button"
            />
            <Label htmlFor="webhook-enabled">{t("modal.enabled")}</Label>
          </div>
          <div className="flex gap-2">
            {hasExistingWebhook && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDeleteWebhook}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={onSaveWebhook}
              disabled={isSaving || !webhookUrl.trim()}
              className="bg-gradient-button hover:bg-gradient-button-hover text-white hover:text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {hasExistingWebhook
                    ? t("modal.updating")
                    : t("modal.creating")}
                </>
              ) : hasExistingWebhook ? (
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
