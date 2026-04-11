import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AlertCircle, CheckCircle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useSmtpTestConnection } from "@/hooks/queries/useSelfhostedSmtp";

/**
 * Test-connection card. Lets the admin send a real email to a
 * recipient address they control so they can verify the whole
 * pipeline (credentials, DNS, spam filters) end-to-end. Owns the
 * test mutation directly — the success/error state only matters
 * inside this card, so there's no reason to lift it to the parent.
 *
 * Shows inline success/error feedback BELOW the form in addition
 * to the toast, because the admin is often debugging and wants
 * the result to persist on screen while they adjust fields.
 */
export function SMTPTestCard() {
  const { t } = useTranslation("smtp");
  const [testEmail, setTestEmail] = useState("");

  const testMutation = useSmtpTestConnection({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(t("testSuccess"));
      } else {
        toast.error(data.error || t("testError"));
      }
    },
    onError: (error) => {
      toast.error(error.message || t("testError"));
    },
  });

  const handleTest = () => {
    if (!testEmail) {
      toast.error(t("recipientRequired"));
      return;
    }
    testMutation.mutate({ recipientEmail: testEmail });
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h2 className="title-section">{t("test")}</h2>
        <p className="text-sm text-muted-foreground">{t("testDescription")}</p>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <Label htmlFor="test-recipient-email" className="sr-only">
            {t("recipientEmail")}
          </Label>
          <Input
            id="test-recipient-email"
            type="email"
            placeholder={t("recipientEmailPlaceholder")}
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            autoComplete="email"
          />
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testMutation.isPending || !testEmail}
          >
            {testMutation.isPending ? (
              <Loader2
                className="h-4 w-4 animate-spin mr-2"
                aria-hidden="true"
              />
            ) : (
              <Send className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            {t("sendTestEmail")}
          </Button>
        </div>

        {testMutation.data && (
          <div className="pt-2">
            {testMutation.data.success ? (
              <div className="flex items-center gap-2 text-success text-sm">
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                <span>{t("testSuccess")}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <span>{testMutation.data.error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
