/**
 * Copy-once reveal for a freshly-minted agent API key.
 *
 * The secret is returned by the mint mutation EXACTLY ONCE — the table
 * only stores a hash. If the user closes this dialog without copying, the
 * key is operationally useless and they must mint a new one. To make that
 * cost visible without making it un-recoverable by accident, the dialog:
 *
 * - blocks close-on-overlay and close-on-Esc (PRD §7 P3),
 * - clears the secret from parent state on close so it can't leak into
 *   later renders or React DevTools (the parent passes `onClose` and we
 *   call it from the only "Done" button below the confirm checkbox),
 * - emits NO telemetry on the secret value (the toast on copy is fired
 *   from the local clipboard handler, never propagated upstream).
 *
 * Ships pre-substituted post-mint snippets for the launch MCP clients
 * (Claude Desktop, Claude Code, Cursor, Cline) so the user can paste
 * straight into their agent config.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  /** Plaintext secret returned by the mint mutation. `null` hides the dialog. */
  secret: string | null;
  keyName: string;
  /** Called when the user confirms they have copied the secret. Parent is
   * responsible for clearing the secret from its own state inside this
   * handler — the dialog does not keep a copy beyond unmount. */
  onClose: () => void;
}

// Three of the four supported clients (Claude Desktop, Cursor, Cline)
// take the standard MCP `mcpServers` JSON. One shared generator drives
// all three blocks; they differ only in WHERE the user drops the file
// (captured in the per-snippet title). DRY-3 applies, KISS over
// speculative abstraction — if a JSON client diverges on shape we
// fork a per-client variant at that point.
//
// Claude Code is the odd one out: it's CLI-driven (`claude mcp add ...`),
// not a JSON paste. Separate generator below.
const mcpSnippet = (key: string) =>
  JSON.stringify(
    {
      mcpServers: {
        qarote: {
          url: "https://app.qarote.io/api/mcp",
          headers: { "x-api-key": key },
        },
      },
    },
    null,
    2
  );

// `claude mcp add` — keeps default scope (`local`, current project, not
// committed) so the user's individual key never ends up in the team's
// `.mcp.json`. Documented in Claude Code's MCP guide.
const claudeCodeSnippet = (key: string) =>
  `claude mcp add --transport http --header "x-api-key: ${key}" qarote https://app.qarote.io/api/mcp`;

export const AgentKeyRevealDialog = ({
  open,
  secret,
  keyName,
  onClose,
}: Props) => {
  const { t } = useTranslation("settings");
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("agentAccess.reveal.copied", { what: label }));
    } catch {
      toast.error(t("agentAccess.reveal.copyFailed"));
    }
  };

  const handleClose = () => {
    setConfirmed(false);
    onClose();
  };

  // Render nothing once the secret is cleared so React unmounts the field
  // (defense-in-depth against a stale value rendering after close).
  if (!secret) return null;

  return (
    <Dialog
      open={open}
      // No-op: close happens only via the Done button below, after the
      // user ticks the "I copied it" confirm. Discards any close fired by
      // overlay click / Esc / the default close X.
      onOpenChange={() => {}}
    >
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        // Hide the default Radix close X — the only safe exit is the
        // confirm-gated Done button (PRD §7 P3).
        className="max-w-2xl [&>button.absolute]:hidden"
      >
        <DialogHeader>
          <DialogTitle>{t("agentAccess.reveal.title")}</DialogTitle>
          <DialogDescription>
            {t("agentAccess.reveal.description", { name: keyName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide">
              {t("agentAccess.reveal.secretLabel")}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 rounded border bg-muted px-3 py-2 font-mono text-sm break-all">
                {secret}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t("agentAccess.reveal.copySecret")}
                onClick={() =>
                  handleCopy(secret, t("agentAccess.reveal.secretLabel"))
                }
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Opened by default — the snippets are the primary action
              the user came here for; collapsing them buries the value. */}
          <details open className="rounded border bg-muted/30 p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              {t("agentAccess.reveal.snippetsTitle")}
            </summary>
            <div className="mt-3 space-y-3">
              {(["claudeDesktop", "cursor", "cline"] as const).map((client) => (
                <SnippetBlock
                  key={client}
                  title={t(`agentAccess.reveal.snippets.${client}`)}
                  value={mcpSnippet(secret)}
                  copyLabel={t("agentAccess.reveal.snippets.copy")}
                  onCopy={() =>
                    handleCopy(
                      mcpSnippet(secret),
                      t(`agentAccess.reveal.snippets.${client}`)
                    )
                  }
                />
              ))}
              {/* Claude Code is a shell command, not a JSON paste — kept
                  separate from the JSON-client map above. */}
              <SnippetBlock
                title={t("agentAccess.reveal.snippets.claudeCode")}
                value={claudeCodeSnippet(secret)}
                copyLabel={t("agentAccess.reveal.snippets.copy")}
                onCopy={() =>
                  handleCopy(
                    claudeCodeSnippet(secret),
                    t("agentAccess.reveal.snippets.claudeCode")
                  )
                }
              />
            </div>
          </details>

          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              id="agent-reveal-confirm"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
            />
            <span className="text-sm leading-snug">
              {t("agentAccess.reveal.confirm")}
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleClose}
            disabled={!confirmed}
            data-testid="agent-reveal-done"
          >
            <Check className="h-4 w-4 mr-1" />
            {t("agentAccess.reveal.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface SnippetProps {
  title: string;
  value: string;
  copyLabel: string;
  onCopy: () => void;
}

const SnippetBlock = ({ title, value, copyLabel, onCopy }: SnippetProps) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
        <Copy className="h-3 w-3 mr-1" />
        {copyLabel}
      </Button>
    </div>
    <pre className="rounded border bg-background p-2 text-xs overflow-x-auto">
      <code>{value}</code>
    </pre>
  </div>
);
