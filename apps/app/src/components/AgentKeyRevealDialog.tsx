/**
 * Copy-once reveal for a freshly-minted agent API key.
 *
 * The secret is returned by the mint mutation EXACTLY ONCE — the table only
 * stores a hash. If the user closes without copying, the key is useless and
 * they must mint a new one. To make that cost visible without making it
 * un-recoverable by accident, the dialog blocks close-on-overlay / close-on-Esc
 * and the Done button is gated behind an "I've copied the secret" checkbox.
 *
 * Per-client config is a tab strip: one ready-to-paste snippet per MCP client.
 * The clients are NOT schema-compatible, so each emits its own shape + target
 * file. The GitHub Copilot snippet uses a `${input:qarote-key}` placeholder —
 * the secret is NEVER written into it (Copilot's documented secret-prompt
 * pattern, so a committed `.vscode/mcp.json` stays safe).
 */

import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Check, Copy, KeyRound, Lock } from "lucide-react";
import { toast } from "sonner";

import { getMcpEndpoint } from "@/lib/mcp";
import { qToast } from "@/lib/qToast";

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
  /** Called when the user confirms they have copied the secret. Parent clears
   * the secret from its own state inside this handler. */
  onClose: () => void;
}

const ENDPOINT = getMcpEndpoint();

// Brand names are literal (not translated). Claude Code defaults first — it's
// the most common Qarote agent client.
const CLIENTS = [
  "Claude Code",
  "Claude Desktop",
  "Cursor",
  "Cline",
  "GitHub Copilot",
  "Codex",
  "Windsurf",
  "opencode",
] as const;
type Client = (typeof CLIENTS)[number];

// Each client gets the exact text to paste/run plus the file it goes in. The
// shapes differ because the clients aren't schema-compatible.
function snippetFor(
  client: Client,
  secret: string
): { file: string; code: string } {
  if (client === "Claude Code") {
    // `--scope user` is deliberate: the CLI defaults to `local`, which writes
    // the server into whatever directory you happen to be standing in. Users
    // run this from a random repo, then find the server missing everywhere
    // else. Every other client here already writes to a user-level file
    // (~/.cursor/mcp.json, ~/.codex/config.toml, …) — this makes Claude Code
    // match rather than being the one that silently installs per-project.
    return {
      file: "terminal",
      code: `claude mcp add qarote \\
  --scope user \\
  --transport http ${ENDPOINT} \\
  --header "x-api-key: ${secret}"`,
    };
  }
  if (client === "GitHub Copilot") {
    // Secret intentionally NOT substituted — Copilot prompts for it at runtime.
    return {
      file: ".vscode/mcp.json",
      code: `{
  "servers": {
    "qarote": {
      "type": "http",
      "url": "${ENDPOINT}",
      "headers": { "x-api-key": "\${input:qarote-key}" }
    }
  },
  "inputs": [
    { "id": "qarote-key", "type": "promptString", "password": true }
  ]
}`,
    };
  }
  if (client === "Codex") {
    return {
      file: "~/.codex/config.toml",
      code: `[mcp_servers.qarote]
url = "${ENDPOINT}"
http_headers = { "x-api-key" = "${secret}" }`,
    };
  }
  if (client === "Windsurf") {
    return {
      file: "~/.codeium/windsurf/mcp_config.json",
      code: `{
  "mcpServers": {
    "qarote": {
      "serverUrl": "${ENDPOINT}",
      "headers": { "x-api-key": "${secret}" }
    }
  }
}`,
    };
  }
  if (client === "opencode") {
    return {
      file: "opencode.json",
      code: `{
  "mcp": {
    "qarote": {
      "type": "remote",
      "url": "${ENDPOINT}",
      "headers": { "x-api-key": "${secret}" }
    }
  }
}`,
    };
  }
  // Claude Desktop / Cursor / Cline share the standard mcpServers JSON shape.
  const file =
    client === "Cursor"
      ? "~/.cursor/mcp.json"
      : client === "Cline"
        ? "cline_mcp_settings.json"
        : "claude_desktop_config.json";
  return {
    file,
    code: `{
  "mcpServers": {
    "qarote": {
      "type": "http",
      "url": "${ENDPOINT}",
      "headers": { "x-api-key": "${secret}" }
    }
  }
}`,
  };
}

export const AgentKeyRevealDialog = ({
  open,
  secret,
  keyName,
  onClose,
}: Props) => {
  const { t } = useTranslation("settings");
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const [client, setClient] = useState<Client>("Claude Code");

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("agentAccess.reveal.copied", { what: label }));
    } catch {
      toast.error(t("agentAccess.reveal.copyFailed"));
    }
  };

  // The secret copy is the high-stakes action — give it a brief, focused
  // confirmation via qToast (2s) rather than the default 4.2s.
  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret ?? "");
      qToast({
        severity: "success",
        title: t("agentAccess.reveal.copied", {
          what: t("agentAccess.reveal.secretLabel"),
        }),
        duration: 2000,
      });
    } catch {
      toast.error(t("agentAccess.reveal.copyFailed"));
    }
  };

  const handleClose = () => {
    setConfirmed(false);
    // Fire the "Key created · View keys" confirmation here — once the user has
    // copied the secret and dismissed this dialog — not at mint time.
    qToast({
      severity: "success",
      title: t("agentAccess.mint.toast.successTitle"),
      msg: t("agentAccess.mint.toast.successMsg"),
      action: {
        label: t("agentAccess.mint.toast.viewKeys"),
        onClick: () => navigate("/settings/agent-access"),
      },
    });
    onClose();
  };

  // Render nothing once the secret is cleared so React unmounts the field.
  if (!secret) return null;

  const snippet = snippetFor(client, secret);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        // Hide the default Radix close X — the only safe exit is the
        // confirm-gated Done button.
        className="max-w-2xl [&>button.absolute]:hidden"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-[18px] w-auto shrink-0 text-foreground" />
            {t("agentAccess.reveal.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("agentAccess.reveal.warning").replace(/<\/?b>/g, "")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {/* Strong "shown once" warning. */}
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-muted px-3 py-2.5 text-sm text-foreground">
            <Lock
              className="mt-0.5 h-4 w-4 shrink-0 text-warning"
              aria-hidden="true"
            />
            <span>
              <Trans
                t={t}
                i18nKey="agentAccess.reveal.warning"
                components={{ b: <strong className="font-semibold" /> }}
              />
            </span>
          </div>

          {/* Secret */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {keyName}
            </Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded border border-primary/30 bg-accent px-3 py-2 font-mono text-sm text-accent-foreground">
                {secret}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t("agentAccess.reveal.copySecret")}
                onClick={handleCopySecret}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Per-client config tabs */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("agentAccess.reveal.pasteLabel")}
            </Label>
            <div className="flex flex-wrap gap-1" role="tablist">
              {CLIENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={client === c}
                  onClick={() => setClient(c)}
                  className={`whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[11.5px] transition-colors ${
                    client === c
                      ? "border-primary bg-accent text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Always-dark terminal surface (see .code-surface in index.css) —
                a snippet reads as a terminal regardless of the UI theme. */}
            <div className="code-surface min-w-0 overflow-hidden rounded-lg border">
              <div className="code-surface__head flex items-center justify-between gap-2 border-b px-3 py-1.5">
                <span className="font-mono text-xs">{snippet.file}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="code-surface__copy"
                  onClick={() => handleCopy(snippet.code, client)}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  {t("agentAccess.reveal.snippets.copy")}
                </Button>
              </div>
              <pre className="whitespace-pre-wrap break-words p-3 text-xs">
                <code className="font-mono">{snippet.code}</code>
              </pre>
            </div>

            {client === "GitHub Copilot" && (
              <p className="text-xs text-muted-foreground">
                {t("agentAccess.reveal.snippets.copilotHint")}
              </p>
            )}
          </div>

          {/* Copy-confirm gate */}
          <label className="flex cursor-pointer items-start gap-2">
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
            <Check className="mr-1 h-4 w-4" />
            {t("agentAccess.reveal.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
