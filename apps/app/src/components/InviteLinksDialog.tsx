import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, Copy, Link } from "lucide-react";
import { toast } from "sonner";

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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (url: string, index: number) => {
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
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            {t("inviteLinks.title")}
          </DialogTitle>
          <DialogDescription>{t("inviteLinks.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {inviteLinks.map((link, index) => (
            <div key={link.email} className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {link.email}
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={link.inviteUrl}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => handleCopy(link.inviteUrl, index)}
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
