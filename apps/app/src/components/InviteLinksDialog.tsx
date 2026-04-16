import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AlertTriangle, Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { isLocalhostUrl } from "@/lib/url-utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { usePublicConfig } from "@/hooks/queries/usePublicConfig";
import { type InviteLink } from "@/hooks/ui/useWorkspaceInvites";

interface InviteLinksDialogProps {
  inviteLinks: InviteLink[];
  onClose: () => void;
}

export function InviteLinksDialog({
  inviteLinks,
  onClose,
}: InviteLinksDialogProps) {
  const { t } = useTranslation("workspace");
  const { data: publicConfig } = usePublicConfig();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editableUrls, setEditableUrls] = useState<string[]>([]);

  const showLocalhostWarning =
    publicConfig?.frontendUrl && isLocalhostUrl(publicConfig.frontendUrl);

  useEffect(() => {
    setEditableUrls(inviteLinks.map((link) => link.inviteUrl));
  }, [inviteLinks]);

  const handleUrlChange = (index: number, value: string) => {
    setEditableUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleCopy = async (index: number) => {
    const url = editableUrls[index] ?? inviteLinks[index]?.inviteUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error(t("inviteLinks.copyFailed"));
    }
  };

  return (
    <Dialog open={inviteLinks.length > 0} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("inviteLinks.title")}</DialogTitle>
          <DialogDescription>{t("inviteLinks.description")}</DialogDescription>
        </DialogHeader>

        {showLocalhostWarning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("inviteLinks.localhostWarningTitle")}</AlertTitle>
            <AlertDescription>
              {t("inviteLinks.localhostWarningDescription")}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {inviteLinks.map((link, index) => (
            <div key={link.email} className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {link.email}
              </p>
              <div className="flex gap-2">
                <Input
                  value={editableUrls[index] ?? link.inviteUrl}
                  onChange={(e) => handleUrlChange(index, e.target.value)}
                  className="font-mono text-xs"
                  aria-label={`Invite URL for ${link.email}`}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => handleCopy(index)}
                  aria-label={`Copy invite link for ${link.email}`}
                >
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>{t("inviteLinks.done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
