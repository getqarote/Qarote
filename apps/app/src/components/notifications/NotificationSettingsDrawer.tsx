import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Bell,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Hash,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

import {
  useAlertNotificationSettings,
  useCreateSlackConfig,
  useCreateWebhook,
  useSlackConfigs,
  useTestChannel,
  useUpdateAlertNotificationSettings,
  useUpdateSlackConfig,
  useUpdateWebhook,
  useWebhooks,
} from "@/hooks/queries/useAlerts";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
type ChannelId = "email" | "slack" | "webhook";

interface NotificationSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Example alert webhook payload shown in the Webhook config (mono, copyable). */
const EXAMPLE_PAYLOAD = `{
  "event": "alert.notification",
  "version": "v1",
  "timestamp": "2026-06-14T15:06:00.000Z",
  "alert": {
    "id": "a1b2c3",
    "severity": "CRITICAL",
    "title": "Consumers dropped, depth climbing",
    "resource": "orders.incoming",
    "server": "AWS RabbitMQ",
    "vhost": "/",
    "status": "ACTIVE"
  }
}`;

export function NotificationSettingsDrawer({
  isOpen,
  onClose,
}: NotificationSettingsDrawerProps) {
  const { t } = useTranslation("alerts");
  const { hasFeature } = useFeatureFlags();

  const { data: settingsData } = useAlertNotificationSettings(isOpen);
  const { data: webhooks = [] } = useWebhooks(isOpen);
  const { data: slackConfigs = [] } = useSlackConfigs(isOpen);

  const updateSettings = useUpdateAlertNotificationSettings();
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const createSlack = useCreateSlackConfig();
  const updateSlack = useUpdateSlackConfig();

  // ── Local form state, hydrated from the server on open ──────────────────
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [severities, setSeverities] = useState<string[]>([...SEVERITIES]);

  const [slackUrl, setSlackUrl] = useState("");
  const [slackEnabled, setSlackEnabled] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showPayload, setShowPayload] = useState(false);

  const [open, setOpen] = useState<ChannelId | null>(null);

  const slackId = slackConfigs[0]?.id;
  const webhookId = webhooks[0]?.id;
  const slackConfigured = !!slackId;
  const webhookConfigured = !!webhookId;
  const emailConfigured = !!contactEmail.trim();

  const slackAllowed = hasFeature("slack_integration");
  const webhookAllowed = hasFeature("webhook_integration");

  // Hydrate the local form state from the server once the queries land. These
  // are sync-from-props effects, not derived state — the disable matches the
  // repo convention (see ServerContext / Alerts deep-link latch).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const s = settingsData?.settings;
    if (s) {
      setEmailEnabled(s.emailNotificationsEnabled);
      setContactEmail(s.contactEmail ?? "");
      setSeverities(
        s.notificationSeverities?.length
          ? s.notificationSeverities
          : [...SEVERITIES]
      );
    }
  }, [settingsData]);

  useEffect(() => {
    const w = webhooks[0];
    setWebhookUrl(w?.url ?? "");
    setWebhookSecret(w?.secret ?? "");
    setWebhookEnabled(w?.enabled ?? false);
  }, [webhooks]);

  useEffect(() => {
    const c = slackConfigs[0];
    setSlackUrl(c?.webhookUrl ?? "");
    setSlackEnabled(c?.enabled ?? false);
  }, [slackConfigs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Toggling a channel ──────────────────────────────────────────────────
  // A channel can't be enabled until it's configured — flipping an unconfigured
  // channel on opens its Configure form instead.
  const toggleChannel = (id: ChannelId, configured: boolean, next: boolean) => {
    if (next && !configured) {
      setOpen(id);
      return;
    }
    if (id === "email") setEmailEnabled(next);
    if (id === "slack") setSlackEnabled(next);
    if (id === "webhook") setWebhookEnabled(next);
  };

  const toggleSeverity = (sev: string) =>
    setSeverities((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev]
    );

  // ── Per-form saves (optimistic + toast) ─────────────────────────────────
  const saveEmail = () => {
    updateSettings.mutate(
      {
        emailNotificationsEnabled: emailEnabled,
        contactEmail: contactEmail.trim(),
        notificationSeverities: severities,
      },
      {
        onSuccess: () =>
          toast.success(
            t("notifSettings.channelUpdated", {
              channel: t("notifSettings.email"),
            })
          ),
        onError: () => toast.error(t("notifSettings.saveError")),
      }
    );
  };

  const saveSlack = () => {
    const onSuccess = () => {
      setSlackEnabled(true);
      toast.success(
        t("notifSettings.channelUpdated", { channel: t("notifSettings.slack") })
      );
    };
    const onError = () => toast.error(t("notifSettings.saveError"));
    if (slackId) {
      updateSlack.mutate(
        { id: slackId, webhookUrl: slackUrl.trim(), enabled: true },
        { onSuccess, onError }
      );
    } else {
      createSlack.mutate(
        { webhookUrl: slackUrl.trim(), enabled: true },
        { onSuccess, onError }
      );
    }
  };

  const saveWebhook = () => {
    const onSuccess = () => {
      setWebhookEnabled(true);
      toast.success(
        t("notifSettings.channelUpdated", {
          channel: t("notifSettings.webhooks"),
        })
      );
    };
    const onError = () => toast.error(t("notifSettings.saveError"));
    const secret = webhookSecret.trim() || undefined;
    if (webhookId) {
      updateWebhook.mutate(
        { id: webhookId, url: webhookUrl.trim(), secret, enabled: true },
        { onSuccess, onError }
      );
    } else {
      createWebhook.mutate(
        { url: webhookUrl.trim(), secret, enabled: true },
        { onSuccess, onError }
      );
    }
  };

  // ── Global save (severity routing + channel on/off) ─────────────────────
  const saveAll = () => {
    updateSettings.mutate(
      {
        emailNotificationsEnabled: emailEnabled,
        contactEmail: contactEmail.trim() || undefined,
        notificationSeverities: severities,
      },
      {
        onSuccess: () => toast.success(t("notifSettings.saved")),
        onError: () => toast.error(t("notifSettings.saveError")),
      }
    );
    if (slackId && slackConfigs[0]?.enabled !== slackEnabled) {
      updateSlack.mutate({ id: slackId, enabled: slackEnabled });
    }
    if (webhookId && webhooks[0]?.enabled !== webhookEnabled) {
      updateWebhook.mutate({ id: webhookId, enabled: webhookEnabled });
    }
  };

  const matrix = useMemo(
    () => ({
      email: { configured: emailConfigured, enabled: emailEnabled },
      slack: { configured: slackConfigured, enabled: slackEnabled },
      webhook: { configured: webhookConfigured, enabled: webhookEnabled },
    }),
    [
      emailConfigured,
      emailEnabled,
      slackConfigured,
      slackEnabled,
      webhookConfigured,
      webhookEnabled,
    ]
  );

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]"
        onEscapeKeyDown={(e) => {
          // Esc collapses an open Configure form first, then closes the drawer.
          if (open) {
            e.preventDefault();
            setOpen(null);
          }
        }}
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 font-heading text-base">
            <Bell className="h-4 w-4" />
            {t("notifSettings.title")}
          </SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* Channels */}
          <section className="space-y-1">
            <h3 className="font-heading text-sm font-semibold text-foreground">
              {t("notifSettings.channels")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("notifSettings.channelsDesc")}
            </p>
            <div className="mt-3 divide-y divide-border">
              <ChannelRow
                channelId="email"
                icon={<Bell className="h-4 w-4" />}
                name={t("notifSettings.email")}
                dest={
                  emailConfigured
                    ? contactEmail
                    : t("notifSettings.notConfigured")
                }
                configured={emailConfigured}
                enabled={emailEnabled}
                isOpen={open === "email"}
                onConfigure={() => setOpen(open === "email" ? null : "email")}
                onToggle={(v) => toggleChannel("email", emailConfigured, v)}
              >
                <EmailConfig
                  enabled={emailEnabled}
                  setEnabled={setEmailEnabled}
                  email={contactEmail}
                  setEmail={setContactEmail}
                  saved={settingsData?.settings?.contactEmail ?? ""}
                  pending={updateSettings.isPending}
                  onSave={saveEmail}
                />
              </ChannelRow>

              <ChannelRow
                channelId="slack"
                icon={<Hash className="h-4 w-4" />}
                name={t("notifSettings.slack")}
                dest={
                  slackConfigured
                    ? t("notifSettings.configured")
                    : t("notifSettings.notConfigured")
                }
                configured={slackConfigured}
                enabled={slackEnabled}
                locked={!slackAllowed}
                isOpen={open === "slack"}
                onConfigure={() => setOpen(open === "slack" ? null : "slack")}
                onToggle={(v) => toggleChannel("slack", slackConfigured, v)}
              >
                <SlackConfig
                  url={slackUrl}
                  setUrl={setSlackUrl}
                  enabled={slackEnabled}
                  setEnabled={setSlackEnabled}
                  saved={slackConfigs[0]?.webhookUrl ?? ""}
                  pending={createSlack.isPending || updateSlack.isPending}
                  onSave={saveSlack}
                />
              </ChannelRow>

              <ChannelRow
                channelId="webhook"
                icon={<ExternalLink className="h-4 w-4" />}
                name={t("notifSettings.webhooks")}
                dest={
                  webhookConfigured
                    ? webhookUrl
                    : t("notifSettings.notConfigured")
                }
                configured={webhookConfigured}
                enabled={webhookEnabled}
                locked={!webhookAllowed}
                isOpen={open === "webhook"}
                onConfigure={() =>
                  setOpen(open === "webhook" ? null : "webhook")
                }
                onToggle={(v) => toggleChannel("webhook", webhookConfigured, v)}
              >
                <WebhookConfig
                  url={webhookUrl}
                  setUrl={setWebhookUrl}
                  secret={webhookSecret}
                  setSecret={setWebhookSecret}
                  showSecret={showSecret}
                  setShowSecret={setShowSecret}
                  showPayload={showPayload}
                  setShowPayload={setShowPayload}
                  enabled={webhookEnabled}
                  setEnabled={setWebhookEnabled}
                  saved={webhooks[0]?.url ?? ""}
                  pending={createWebhook.isPending || updateWebhook.isPending}
                  onSave={saveWebhook}
                />
              </ChannelRow>
            </div>
          </section>

          {/* Severity routing */}
          <section className="space-y-1">
            <h3 className="font-heading text-sm font-semibold text-foreground">
              {t("notifSettings.severityRouting")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("notifSettings.severityRoutingDesc")}
            </p>
            <div className="mt-3 space-y-1.5">
              {SEVERITIES.map((sev) => (
                <div key={sev} className="flex items-center gap-3">
                  <span className="flex w-20 items-center gap-2 text-sm capitalize text-foreground">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        sev === "CRITICAL" || sev === "HIGH"
                          ? "bg-destructive"
                          : sev === "MEDIUM"
                            ? "bg-warning"
                            : "bg-info"
                      }`}
                    />
                    {t(`summary.severity.${sev.toLowerCase()}`)}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <SevChip
                      label={t("notifSettings.email")}
                      on={matrix.email.enabled && severities.includes(sev)}
                      disabled={!matrix.email.enabled}
                      onClick={() => toggleSeverity(sev)}
                    />
                    <SevChip
                      label={t("notifSettings.slack")}
                      on={matrix.slack.configured && matrix.slack.enabled}
                      disabled
                      title={t("notifSettings.allSeveritiesNote")}
                    />
                    <SevChip
                      label={t("notifSettings.webhook")}
                      on={matrix.webhook.configured && matrix.webhook.enabled}
                      disabled
                      title={t("notifSettings.allSeveritiesNote")}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("notifSettings.allSeveritiesNote")}
            </p>
          </section>
        </div>

        {/* Save changes */}
        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-5 py-3">
          <Button onClick={saveAll} disabled={updateSettings.isPending}>
            {updateSettings.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {t("notifSettings.saveChanges")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Channel row + accordion ───────────────────────────────────────────────

interface ChannelRowProps {
  channelId: ChannelId;
  icon: React.ReactNode;
  name: string;
  dest: string;
  configured: boolean;
  enabled: boolean;
  locked?: boolean;
  isOpen: boolean;
  onConfigure: () => void;
  onToggle: (next: boolean) => void;
  children: React.ReactNode;
}

function ChannelRow({
  channelId,
  icon,
  name,
  dest,
  configured,
  enabled,
  locked,
  isOpen,
  onConfigure,
  onToggle,
  children,
}: ChannelRowProps) {
  const { t } = useTranslation("alerts");
  const test = useTestChannel();
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "error";
    msg?: string;
  } | null>(null);

  // Auto-clear the inline test result so the row doesn't keep a stale verdict.
  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(id);
  }, [feedback]);

  const runTest = () => {
    setFeedback(null);
    test.mutate(
      { channel: channelId },
      {
        onSuccess: (r) =>
          setFeedback(
            r.success ? { kind: "ok" } : { kind: "error", msg: r.error }
          ),
        onError: () => setFeedback({ kind: "error" }),
      }
    );
  };

  // Test is only meaningful for a configured + enabled channel.
  const canTest = !locked && configured && enabled;

  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-accent text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {name}
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Lock className="h-2.5 w-2.5" />
                {t("notifSettings.developerPlus")}
              </span>
            )}
          </div>
          <div className="truncate font-mono text-xs text-muted-foreground">
            {locked ? t("notifSettings.upgradeHint") : dest}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {locked ? (
            <Button variant="ghost" size="sm" asChild>
              <a href="/settings/subscription">{t("notifSettings.upgrade")}</a>
            </Button>
          ) : (
            <>
              {feedback && (
                <span
                  aria-live="polite"
                  className={`flex items-center gap-1 text-xs ${
                    feedback.kind === "ok" ? "text-success" : "text-destructive"
                  }`}
                >
                  {feedback.kind === "ok" ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      {t("notifSettings.testOk")}
                    </>
                  ) : (
                    <>
                      <X className="h-3.5 w-3.5" />
                      {t("notifSettings.testFailed")}
                    </>
                  )}
                </span>
              )}
              {canTest && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={runTest}
                  disabled={test.isPending}
                >
                  {test.isPending
                    ? t("notifSettings.testSending")
                    : t("notifSettings.test")}
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="h-8 gap-1"
                onClick={onConfigure}
                aria-expanded={isOpen}
              >
                {t("notifSettings.configure")}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
              <Switch
                checked={enabled}
                onCheckedChange={onToggle}
                aria-label={t("notifSettings.enableChannel", { channel: name })}
                className="h-4 w-7"
              />
            </>
          )}
        </div>
      </div>

      {/* Accordion: inline config panel */}
      <div
        className={`grid transition-all duration-200 motion-reduce:transition-none ${
          isOpen
            ? "mt-3 grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="rounded-lg border border-border bg-secondary p-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Severity chip ─────────────────────────────────────────────────────────

function SevChip({
  label,
  on,
  disabled,
  onClick,
  title,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-pressed={on}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        on
          ? "border-primary/30 bg-accent text-primary"
          : "border-border text-muted-foreground"
      } ${disabled ? "cursor-default opacity-40" : "hover:border-foreground/20"}`}
    >
      {label}
    </button>
  );
}

// ── Config forms ──────────────────────────────────────────────────────────

function FormToggle({
  enabled,
  setEnabled,
  pending,
}: {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  pending: boolean;
}) {
  const { t } = useTranslation("alerts");
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <Switch
        checked={enabled}
        onCheckedChange={setEnabled}
        disabled={pending}
        className="h-4 w-7"
        aria-label={t("modal.enabled")}
      />
      {t("modal.enabled")}
    </label>
  );
}

function EmailConfig({
  enabled,
  setEnabled,
  email,
  setEmail,
  saved,
  pending,
  onSave,
}: {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  email: string;
  setEmail: (v: string) => void;
  saved: string;
  pending: boolean;
  onSave: () => void;
}) {
  const { t } = useTranslation("alerts");
  const dirty = email.trim() !== saved.trim();
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {t("modal.emailNotifications")}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("modal.emailNotificationsDescription")}
          </p>
        </div>
        <FormToggle
          enabled={enabled}
          setEnabled={setEnabled}
          pending={pending}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="nss-email"
            className="text-xs font-medium text-foreground"
          >
            {t("modal.notificationEmailAddress")}
            <span className="ml-0.5 text-destructive">*</span>
          </label>
          <Button
            size="sm"
            className="h-7 px-2.5 text-xs"
            disabled={pending || !email.trim() || !dirty}
            onClick={onSave}
          >
            {t("modal.update")}
          </Button>
        </div>
        <Input
          id="nss-email"
          type="text"
          inputMode="email"
          required
          aria-required="true"
          placeholder="you@example.com, oncall@acme.io"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">{t("modal.emailHelp")}</p>
      </div>
    </div>
  );
}

function SlackConfig({
  url,
  setUrl,
  enabled,
  setEnabled,
  saved,
  pending,
  onSave,
}: {
  url: string;
  setUrl: (v: string) => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  saved: string;
  pending: boolean;
  onSave: () => void;
}) {
  const { t } = useTranslation("alerts");
  const dirty = url.trim() !== saved.trim();
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="nss-slack"
          className="text-xs font-medium text-foreground"
        >
          {t("modal.slackWebhookUrl")}
          <span className="ml-0.5 text-destructive">*</span>
        </label>
        <Input
          id="nss-slack"
          type="url"
          required
          aria-required="true"
          placeholder="https://hooks.slack.com/services/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          {t("modal.slackWebhookHelp")}{" "}
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {t("modal.slackWebhookLink")}
            <span className="sr-only"> {t("notifSettings.opensNewTab")}</span>
          </a>
          .
        </p>
      </div>
      <div className="flex items-center justify-between">
        <FormToggle
          enabled={enabled}
          setEnabled={setEnabled}
          pending={pending}
        />
        <Button
          size="sm"
          className="h-7 px-2.5 text-xs"
          disabled={pending || !url.trim() || !dirty}
          onClick={onSave}
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("modal.save")}
        </Button>
      </div>
    </div>
  );
}

function WebhookConfig({
  url,
  setUrl,
  secret,
  setSecret,
  showSecret,
  setShowSecret,
  showPayload,
  setShowPayload,
  enabled,
  setEnabled,
  saved,
  pending,
  onSave,
}: {
  url: string;
  setUrl: (v: string) => void;
  secret: string;
  setSecret: (v: string) => void;
  showSecret: boolean;
  setShowSecret: (v: boolean) => void;
  showPayload: boolean;
  setShowPayload: (v: boolean) => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  saved: string;
  pending: boolean;
  onSave: () => void;
}) {
  const { t } = useTranslation("alerts");
  const dirty = url.trim() !== saved.trim();
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {t("modal.webhookNotifications")}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("modal.webhookDescription")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          aria-expanded={showPayload}
          onClick={() => setShowPayload(!showPayload)}
        >
          {t("modal.viewExamplePayload")}
        </Button>
      </div>

      {showPayload && (
        <pre className="overflow-x-auto rounded-md border border-border bg-card p-3 font-mono text-[11px] leading-relaxed text-foreground/80">
          {EXAMPLE_PAYLOAD}
        </pre>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="nss-webhook"
          className="text-xs font-medium text-foreground"
        >
          {t("modal.webhookUrl")}
          <span className="ml-0.5 text-destructive">*</span>
        </label>
        <Input
          id="nss-webhook"
          type="url"
          required
          aria-required="true"
          placeholder="https://your-endpoint.com/webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="font-mono text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="nss-webhook-secret"
          className="text-xs font-medium text-foreground"
        >
          {t("modal.webhookSecretOptional")}
        </label>
        <div className="relative">
          <Input
            id="nss-webhook-secret"
            type={showSecret ? "text" : "password"}
            placeholder={t("modal.webhookSecretPlaceholder")}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="pr-10 font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            aria-label={
              showSecret
                ? t("notifSettings.hideSecret")
                : t("notifSettings.showSecret")
            }
            className="absolute right-0 top-0 grid h-full w-10 place-items-center text-muted-foreground hover:text-foreground"
          >
            {showSecret ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("modal.webhookSecretHelp")}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <FormToggle
          enabled={enabled}
          setEnabled={setEnabled}
          pending={pending}
        />
        <Button
          size="sm"
          className="h-7 px-2.5 text-xs"
          disabled={pending || !url.trim() || !dirty}
          onClick={onSave}
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("modal.save")}
        </Button>
      </div>
    </div>
  );
}
