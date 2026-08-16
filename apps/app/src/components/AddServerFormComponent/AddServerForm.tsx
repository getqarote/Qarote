import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { readGateError } from "@/lib/feature-gate/readGateError";
import { severityRank } from "@/lib/findingSeverity";
import { recordLastRemovedServer } from "@/lib/lastRemovedServer";
import { logger } from "@/lib/logger";
import { qToast } from "@/lib/qToast";
import {
  applyParsedUrlToForm,
  type ParsedRabbitMQUrl,
  parseRabbitMQUrl,
} from "@/lib/rabbitmqUrlParser";
import { trpc } from "@/lib/trpc/client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ScanRunningChecklist } from "@/components/scan/ScanRunningChecklist";
import { ServerTracingSection } from "@/components/server/ServerTracingSection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  IconArrowRight,
  IconCheck,
  IconChevronLeft,
  IconClose,
  IconExchange,
  IconQueue,
  IconRefresh,
  IconServer,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { useServerContext } from "@/contexts/ServerContext";

import { useTriggerScan } from "@/hooks/queries/useScan";
import {
  useCreateServer,
  useDeleteServer,
  useTestConnection,
  useUpdateServer,
} from "@/hooks/queries/useServer";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import {
  type AddServerFormData,
  addServerSchema,
  editServerSchema,
} from "@/schemas";

import { ConfirmConnectionCard } from "./ConfirmConnectionCard";
import { ConnectionStatusDisplay } from "./ConnectionStatusDisplay";
import { PlanVersionSupport } from "./PlanVersionSupport";
import { type DiffKey, RedetectDiff } from "./RedetectDiff";
import { ServerDetails } from "./ServerDetails";
import { ServerUrlInput } from "./ServerUrlInput";
import { TestConnectionButton } from "./TestConnectionButton";
import { TunnelHelper } from "./TunnelHelper";
import type { AddServerFormProps, ConnectionStatus } from "./types";

type Step = 1 | 2;

// Minimum time the scanning screen stays up (≈ the 5-step checklist duration)
// so a fast real scan doesn't flash past before the user can read it.
const SCAN_MIN_MS = 1500;

// Add-mode phase machine: the two-step form, then the point-in-time scan, then
// the connected reveal. Edit mode never leaves "form".
type Phase = "form" | "scanning" | "done";

// Compact, honest summary of the point-in-time scan rendered in the "done"
// phase. Counts are only ever set from real queries; a field left `undefined`
// means "not available yet" and the UI omits it rather than inventing a value.
interface ScanSummary {
  queueCount?: number;
  exchangeCount?: number;
  findingCount?: number;
  /** Top finding resource names (real), for the one-line summary. */
  topFindings: string[];
}

export const AddServerForm = ({
  onServerAdded,
  onServerUpdated,
  onServerRemoved,
  trigger,
  server,
  mode = "add",
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}: AddServerFormProps) => {
  const formId = useId();
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const { selectedServerId, setSelectedServerId, serverCount } =
    useServerContext();
  const { refetchPlan } = useUser();
  const { workspace } = useWorkspace();
  const createServerMutation = useCreateServer();
  const updateServerMutation = useUpdateServer();
  const deleteServerMutation = useDeleteServer();
  const testConnectionMutation = useTestConnection();
  const triggerScanMutation = useTriggerScan();
  const utils = trpc.useUtils();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  // Edit-drawer "Re-detect from URL" panel — pure client-side re-parse. On a
  // successful parse we show a DIFF (current → detected, cherry-pickable) and
  // apply ONLY the fields the user keeps — never a silent wholesale overwrite.
  const [redetectOpen, setRedetectOpen] = useState(false);
  const [redetectUrl, setRedetectUrl] = useState("");
  const [redetectError, setRedetectError] = useState(false);
  // Holds the parsed URL once "Detect" succeeds, switching the panel to the
  // diff-review view. Null = still on the URL-input view.
  const [redetectParsed, setRedetectParsed] =
    useState<ParsedRabbitMQUrl | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: "idle",
  });
  const [step, setStep] = useState<Step>(1);
  // Overrides the form view once "Connect & scan" fires: the FlowLoader during
  // the scan, then the connected reveal.
  const [phase, setPhase] = useState<Phase>("form");
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null);
  // Id of the freshly created server (add mode). Drives the post-connect
  // Message tracing section in the "done" reveal — it needs a persisted,
  // connected server to enumerate vhosts.
  const [createdServerId, setCreatedServerId] = useState<string | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [parsedUrl, setParsedUrl] = useState<ParsedRabbitMQUrl | null>(null);
  // Reveal toggle for the step-2 password field. Management URLs rarely carry
  // credentials, so the confirm step must collect username/password before
  // "Connect & scan" — otherwise the connection fails with empty creds.
  const [showStep2Password, setShowStep2Password] = useState(false);
  // Raw URL string lifted from ServerUrlInput so "Detect →" can gate on
  // emptiness and re-parse client-side without owning the input state.
  const [urlDraft, setUrlDraft] = useState("");
  // Controls the "Remove server" confirm dialog in the edit drawer.
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledOnOpenChange || setInternalIsOpen;

  const form = useForm<AddServerFormData>({
    // Edit mode treats an empty password as "keep current", so it must not
    // fail validation; add mode keeps the required-password schema.
    resolver: zodResolver(mode === "edit" ? editServerSchema : addServerSchema),
    defaultValues: {
      name: server?.name || "",
      host: server?.host || "",
      port: server?.port || 15672,
      amqpPort: server?.amqpPort || 5672,
      username: server?.username || "guest",
      password: "",
      vhost: server?.vhost || "/",
      useHttps: server?.useHttps || false,
      environment: server?.environment ?? null,
    },
  });

  useEffect(() => {
    if (mode === "edit" && server) {
      form.reset({
        name: server.name,
        host: server.host,
        port: server.port,
        amqpPort: server.amqpPort,
        username: server.username,
        password: "",
        vhost: server.vhost,
        useHttps: server.useHttps || false,
        environment: server.environment ?? null,
      });
      setConnectionStatus({ status: "idle" });
      setStep(1);
    }
  }, [server, mode, form]);

  const testConnection = async () => {
    // In step 1 add mode, name isn't filled yet — skip its validation.
    const fieldsToValidate: (keyof AddServerFormData)[] =
      mode === "add" && step === 1
        ? ["host", "port", "amqpPort", "username", "password", "useHttps"]
        : [
            "name",
            "host",
            "port",
            "amqpPort",
            "username",
            "password",
            "useHttps",
          ];

    const isValid = await form.trigger(fieldsToValidate);
    if (!isValid) {
      // Toggle false→true so forceExpanded re-fires even if already true.
      setDetailsExpanded(false);
      setTimeout(() => setDetailsExpanded(true), 0);
      return;
    }

    const formData = form.getValues();
    setIsTestingConnection(true);
    setConnectionStatus({ status: "idle" });

    try {
      if (!workspace?.id) {
        throw new Error(t("workspaceIdRequired"));
      }
      const result = await testConnectionMutation.mutateAsync({
        workspaceId: workspace.id,
        host: formData.host,
        port: formData.port,
        amqpPort: formData.amqpPort,
        username: formData.username,
        password: formData.password,
        vhost: formData.vhost,
        useHttps: formData.useHttps,
      });

      if (result.success) {
        setConnectionStatus({
          status: "success",
          message: t("connectionSuccessful"),
          details: {
            version: result.version,
            cluster_name: result.cluster_name,
          },
        });

        if (mode === "add") {
          // Advance to step 2. Prefill server name from cluster name / host.
          const currentName = form.getValues("name");
          if (!currentName) {
            form.setValue("name", result.cluster_name || formData.host);
          }
          setStep(2);
        }
      } else {
        setConnectionStatus({
          status: "error",
          message: result.message || t("connectionFailed"),
        });
      }
    } catch (error) {
      setConnectionStatus({
        status: "error",
        message:
          error instanceof Error ? error.message : t("connectionTestFailed"),
        gate: readGateError(error) ?? undefined,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const onSubmit = async (data: AddServerFormData) => {
    setIsLoading(true);

    try {
      if (!workspace?.id) {
        throw new Error(t("workspaceIdRequired"));
      }
      if (mode === "edit" && server) {
        await updateServerMutation.mutateAsync({
          workspaceId: workspace.id,
          id: server.id,
          name: data.name,
          host: data.host,
          port: data.port,
          amqpPort: data.amqpPort,
          username: data.username,
          // Leave-blank = keep the current password. Only send a new password
          // when the user actually typed one, so an empty field never clears
          // the stored credential.
          ...(data.password ? { password: data.password } : {}),
          vhost: data.vhost,
          useHttps: data.useHttps,
          environment: data.environment,
        });

        setIsOpen(false);
        onServerUpdated?.();
      } else {
        // Enter the scanning phase so the checklist is visible while the real
        // create + point-in-time scan run. Done before the awaits so it shows
        // for the whole round-trip, not just after it resolves.
        setPhase("scanning");
        const scanStartedAt = Date.now();

        const result = await createServerMutation.mutateAsync({
          workspaceId: workspace.id,
          name: data.name,
          host: data.host,
          port: data.port,
          amqpPort: data.amqpPort,
          username: data.username,
          password: data.password,
          vhost: data.vhost,
          useHttps: data.useHttps,
          environment: data.environment,
        });

        setSelectedServerId(result.server.id);
        setCreatedServerId(result.server.id);
        await refetchPlan();
        onServerAdded?.();

        // Every server gets the compact in-modal reveal (matches the
        // prototype's inline done): run the scan, gather real counts/findings,
        // then show the "done" phase. The full-page /scan reveal remains
        // reachable via Explain deep-links.
        const summary = await runScanAndReveal(workspace.id, result.server.id);
        setScanSummary(summary);

        // Anti-flash: if the real scan resolves faster than the checklist runs,
        // hold the scanning screen so it doesn't blink past the user.
        const elapsed = Date.now() - scanStartedAt;
        if (elapsed < SCAN_MIN_MS) {
          await new Promise((resolve) =>
            setTimeout(resolve, SCAN_MIN_MS - elapsed)
          );
        }
        setPhase("done");
        return;
      }

      setIsOpen(false);
      resetForm();
    } catch (error) {
      // A failed create/scan drops back to the form so the error is editable.
      setPhase("form");
      setConnectionStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : mode === "edit"
              ? t("failedToUpdateServer")
              : t("failedToCreateServer"),
        gate: readGateError(error) ?? undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    form.reset();
    setConnectionStatus({ status: "idle" });
    setStep(1);
    setPhase("form");
    setScanSummary(null);
    setCreatedServerId(null);
    setDetailsExpanded(false);
    setParsedUrl(null);
    setUrlDraft("");
    setRedetectParsed(null);
  };

  // Runs the real point-in-time config scan for a freshly created server and
  // gathers an honest summary for the "done" reveal. The scan is free on every
  // plan and already enumerates the broker, so it ALSO returns the queue/
  // exchange totals — no separate (EE-gated) getTopology call. Each field is
  // left undefined if the scan fails so the UI omits it rather than inventing.
  const runScanAndReveal = async (
    workspaceId: string,
    serverId: string
  ): Promise<ScanSummary> => {
    const summary: ScanSummary = { topFindings: [] };

    try {
      const scan = await triggerScanMutation.mutateAsync({
        serverId,
        workspaceId,
      });
      summary.queueCount = scan.queueCount;
      summary.exchangeCount = scan.exchangeCount;

      const result = await utils.rabbitmq.scan.getFindings.fetch({
        serverId,
        workspaceId,
        resolved: false,
        limit: 50,
      });
      summary.findingCount = result.findings.length;
      // getFindings orders by detectedAt, so re-sort to surface the 3 MOST
      // SEVERE for the truncated preview (the rest collapse into "+N more").
      summary.topFindings = [...result.findings]
        .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
        .slice(0, 3)
        .map((f) => f.resourceName);
    } catch {
      // Scan failed — leave fields undefined so the UI shows the "scan
      // running" pill instead of fabricated numbers.
    }

    return summary;
  };

  // "Done" footer — the server is already active (set on create); just close
  // and route to the cockpit.
  const goToCockpit = () => {
    setIsOpen(false);
    navigate("/", { replace: true });
    resetForm();
  };

  // The findings pill deep-links straight to the config-scan view (/scan) —
  // the strongest hook on the done screen is "N config findings", so let the
  // operator jump to them instead of only landing on the cockpit.
  const goToFindings = () => {
    setIsOpen(false);
    navigate("/scan");
    resetForm();
  };

  const handleUpgrade = () => {
    navigate("/settings/billing");
  };

  // Reveal the manual connection fields. Toggle false→true so a
  // `forceExpanded`-driven section re-fires even if it was already open.
  const expandDetails = () => {
    setDetailsExpanded(false);
    setTimeout(() => setDetailsExpanded(true), 0);
  };

  // URL-first path. "Detect →" is parse-only — no backend round-trip. Reuses
  // the same parse + apply path as the URL input. On a usable parse we apply
  // the fields and advance to the confirm step; the real server-side validation
  // happens later on "Connect & scan". On an empty/unparseable URL we fall back
  // gracefully to the manual ServerDetails form and surface the parse-error note.
  const handleDetect = () => {
    const parsed = parseRabbitMQUrl(urlDraft);
    if (parsed?.host) {
      applyParsedUrlToForm(parsed, form);
      setParsedUrl(parsed);
      setConnectionStatus({ status: "idle" });
      if (!form.getValues("name")) {
        form.setValue("name", parsed.suggestedName || parsed.host);
      }
      setStep(2);
      return;
    }
    // Unparseable — reveal the manual fields. The parse-error note is already
    // surfaced by ServerUrlInput's own status line for a non-empty bad URL.
    expandDetails();
  };

  // Re-detect step 1 — parse the pasted URL. On success we DON'T apply yet:
  // we surface a diff (current vs detected) so the user cherry-picks. On a
  // parse failure we fall back to manual editing (reveal the fields + the
  // ServerUrlInput-style parse-error note shown in the panel).
  const handleRedetect = () => {
    const parsed = parseRabbitMQUrl(redetectUrl);
    if (!parsed) {
      setRedetectError(true);
      return;
    }
    setRedetectParsed(parsed);
    setRedetectError(false);
  };

  // Re-detect step 2 — apply ONLY the cherry-picked fields to the form. A
  // parsed password (when present) is always applied but never shown in
  // plaintext. The user still Saves to persist; this is a form-only mutation.
  const applyRedetectDiff = (pickedKeys: DiffKey[]) => {
    if (!redetectParsed) return;
    const picked = new Set(pickedKeys);
    if (picked.has("host")) form.setValue("host", redetectParsed.host);
    if (picked.has("port")) form.setValue("port", redetectParsed.port);
    if (picked.has("amqpPort"))
      form.setValue("amqpPort", redetectParsed.amqpPort);
    if (picked.has("useHttps"))
      form.setValue("useHttps", redetectParsed.useHttps);
    if (picked.has("username") && redetectParsed.username)
      form.setValue("username", redetectParsed.username);
    if (picked.has("vhost") && redetectParsed.vhost)
      form.setValue("vhost", redetectParsed.vhost);
    // A rotated password from the URL is applied verbatim (masked in the UI).
    if (redetectParsed.password)
      form.setValue("password", redetectParsed.password);
    // Carry provenance so the manual fields can keep showing "from URL" chips
    // if the form later re-renders the ConfirmConnectionCard path.
    setParsedUrl(redetectParsed);
    setConnectionStatus({ status: "idle" });
    closeRedetect();
  };

  const closeRedetect = () => {
    setRedetectOpen(false);
    setRedetectUrl("");
    setRedetectError(false);
    setRedetectParsed(null);
  };

  const handleRemoveServer = async () => {
    if (!server) return;
    try {
      await deleteServerMutation.mutateAsync({
        id: server.id,
        workspaceId: workspace?.id ?? "",
      });
      await refetchPlan();
      if (selectedServerId === server.id) {
        setSelectedServerId(null);
      }
      // When the last broker is removed, hand the name to the first-run cockpit
      // so it can acknowledge the removal instead of greeting a fresh workspace.
      if (serverCount <= 1) {
        recordLastRemovedServer(server.name);
      }
      qToast({
        severity: "success",
        title: t("serverRemovedSuccess", { name: server.name }),
      });
      setRemoveConfirmOpen(false);
      setIsOpen(false);
      onServerRemoved?.();
    } catch (error) {
      toast.error(t("serverRemovedError"));
      logger.error("Remove server error:", error);
    }
  };

  const isEdit = mode === "edit";
  const showStepIndicator = !isEdit;

  // ---- Edit mode: right-side drawer ("Manage server") -------------------
  if (isEdit) {
    return (
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            resetForm();
            closeRedetect();
          }
        }}
      >
        {controlledIsOpen === undefined && trigger && (
          <SheetTrigger asChild>{trigger}</SheetTrigger>
        )}
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4 text-left">
            <SheetTitle className="flex items-center gap-2">
              <IconServer className="h-[18px] w-auto shrink-0 text-muted-foreground" />
              {t("manageServer")}
            </SheetTitle>
            <SheetDescription>
              {t("editServerFormDescription")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <Form {...form}>
              <form
                id={formId}
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Re-detect from URL — client-side re-parse of a pasted URL,
                    re-applying detected fields to the form (no backend). */}
                {!redetectOpen ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRedetectOpen(true)}
                    className="gap-2"
                  >
                    <IconRefresh className="h-3.5 w-auto shrink-0" />
                    {t("redetectFromUrl")}
                  </Button>
                ) : redetectParsed ? (
                  // Parse succeeded → review the diff and cherry-pick fields.
                  <RedetectDiff
                    current={{
                      host: form.getValues("host"),
                      port: form.getValues("port"),
                      amqpPort: form.getValues("amqpPort"),
                      useHttps: form.getValues("useHttps"),
                      username: form.getValues("username"),
                      vhost: form.getValues("vhost"),
                    }}
                    parsed={redetectParsed}
                    hasParsedPassword={!!redetectParsed.password}
                    onApply={applyRedetectDiff}
                    onCancel={closeRedetect}
                  />
                ) : (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {t("redetectPanelTitle")}
                      </p>
                      <button
                        type="button"
                        onClick={closeRedetect}
                        aria-label={t("close")}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <IconClose className="h-4 w-auto shrink-0" />
                      </button>
                    </div>
                    <Input
                      value={redetectUrl}
                      onChange={(e) => {
                        setRedetectUrl(e.target.value);
                        setRedetectError(false);
                      }}
                      placeholder={t("serverUrlPlaceholder")}
                      className="font-mono"
                      autoFocus
                    />
                    {redetectError && (
                      <p className="text-sm text-destructive">
                        {t("urlParseError")}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <p className="flex-1 text-xs text-muted-foreground">
                        {t("redetectPanelHint")}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="btn-primary"
                        onClick={handleRedetect}
                        disabled={!redetectUrl.trim()}
                      >
                        {t("detect")}
                        <IconArrowRight className="ml-2 h-4 w-auto shrink-0" />
                      </Button>
                    </div>
                  </div>
                )}

                <ServerDetails
                  form={form}
                  alwaysExpanded
                  passwordPlaceholder={t("leaveBlankKeepCurrent")}
                />
                <ConnectionStatusDisplay connectionStatus={connectionStatus} />

                <div>
                  <TestConnectionButton
                    onTestConnection={testConnection}
                    isTestingConnection={isTestingConnection}
                    isLoading={isLoading}
                  />
                </div>

                {server?.id && (
                  <ServerTracingSection
                    serverId={server.id}
                    payloadCaptureEnabled={server.payloadCaptureEnabled}
                  />
                )}

                {/* Danger zone — Remove server. */}
                <div className="space-y-2 rounded-lg border border-destructive/30 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {t("removeServerTitle")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("removeServerDescription")}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveConfirmOpen(true)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    {t("removeServerTitle")}
                  </Button>
                  <ConfirmDialog
                    open={removeConfirmOpen}
                    onOpenChange={setRemoveConfirmOpen}
                    tone="danger"
                    title={t("removeServerConfirmTitle", {
                      name: server?.name ?? "",
                    })}
                    body={t("removeServerConfirmDescription")}
                    confirmLabel={t("removeServerTitle")}
                    pendingLabel={t("removeServerTitle")}
                    cancelLabel={t("cancel")}
                    isPending={deleteServerMutation.isPending}
                    onConfirm={handleRemoveServer}
                  />
                </div>
              </form>
            </Form>
          </div>

          <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={isLoading || isTestingConnection}
              className="btn-primary"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("saveChanges")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  // ---- Add mode: multi-step dialog --------------------------------------
  // Name shown in the scanning/done copy: the user-chosen name, else the host.
  const activeName =
    form.getValues("name") || form.getValues("host") || t("serverFallbackName");
  const hasFindings = (scanSummary?.findingCount ?? 0) > 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          resetForm();
        }
      }}
    >
      {controlledIsOpen === undefined && (
        <DialogTrigger asChild>
          {trigger || <Button className="btn-primary">{t("addServer")}</Button>}
        </DialogTrigger>
      )}
      <DialogContent
        className="sm:max-w-xl lg:max-w-2xl max-h-[90vh] flex flex-col bg-card"
        // Adding a server is a multi-step flow with form state the user can
        // lose. Block accidental dismissal via outside-click or Esc — closing
        // must be intentional (the top-right X or "Retour"/Cancel buttons).
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <IconServer className="h-[18px] w-auto shrink-0 text-muted-foreground" />
            {t("addServer")}
          </DialogTitle>
          <DialogDescription>
            {phase !== "form"
              ? t("addServerScanDescription")
              : showStepIndicator
                ? t("stepIndicator", { current: step, total: 2 })
                : t("editServerFormDescription")}
          </DialogDescription>
        </DialogHeader>

        {phase === "scanning" && (
          <ScanRunningChecklist serverName={activeName} />
        )}

        {phase === "done" && scanSummary && (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success-muted p-4">
                <IconCheck className="mt-0.5 h-5 w-auto shrink-0 text-success" />
                <p className="text-sm text-foreground">
                  {t("connectedActive", { name: activeName })}
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {scanSummary.queueCount !== undefined && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 px-2.5 py-1 text-xs text-success">
                    <IconQueue size={13} />
                    {t("queuesPill", { count: scanSummary.queueCount })}
                  </span>
                )}
                {scanSummary.exchangeCount !== undefined && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 px-2.5 py-1 text-xs text-success">
                    <IconExchange size={13} />
                    {t("exchangesPill", { count: scanSummary.exchangeCount })}
                  </span>
                )}
                {scanSummary.findingCount === undefined ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                    {t("findingsScanRunning")}
                  </span>
                ) : (
                  scanSummary.findingCount > 0 && (
                    <button
                      type="button"
                      onClick={goToFindings}
                      aria-label={t("viewFindings")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-warning/50 px-2.5 py-1 text-xs text-warning transition-colors hover:bg-warning/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <AlertTriangle
                        className="h-3 w-3 shrink-0"
                        aria-hidden="true"
                      />
                      {t("findingsPill", { count: scanSummary.findingCount })}
                      <ChevronRight
                        className="h-3 w-auto shrink-0 opacity-70"
                        aria-hidden="true"
                      />
                    </button>
                  )
                )}
              </div>

              {/* Flagged resources are RabbitMQ identifiers — render them in
                  font-mono with the carrot-ink accent, like everywhere else.
                  Show the 3 most severe, then "+N more" for the rest. */}
              {hasFindings && scanSummary.topFindings.length > 0 && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t("findingsFlaggedPrefix")}{" "}
                  {scanSummary.topFindings.map((resource, i) => (
                    <span key={resource}>
                      {i > 0 && ", "}
                      <code className="font-mono text-accent-foreground">
                        {resource}
                      </code>
                    </span>
                  ))}
                  {scanSummary.findingCount !== undefined &&
                    scanSummary.findingCount >
                      scanSummary.topFindings.length && (
                      <>
                        {" "}
                        {t("findingsMore", {
                          count:
                            scanSummary.findingCount -
                            scanSummary.topFindings.length,
                        })}
                      </>
                    )}
                </p>
              )}
              {scanSummary.findingCount === 0 && (
                <p className="flex items-center gap-2 text-sm leading-relaxed text-success">
                  <IconCheck
                    className="h-4 w-auto shrink-0"
                    aria-hidden="true"
                  />
                  {t("findingsClean")}
                </p>
              )}
            </div>

            {/* Now that the server exists + is connected, offer per-vhost
                Message tracing — the firehose that powers richer diagnosis. */}
            {createdServerId && (
              <div className="mt-6 border-t border-border pt-6">
                <ServerTracingSection serverId={createdServerId} />
              </div>
            )}
          </div>
        )}

        <div
          className={`flex-1 overflow-y-auto px-6 pb-6 ${phase === "form" ? "" : "hidden"}`}
        >
          <Form {...form}>
            <form
              id={formId}
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {!isEdit && step === 1 && (
                <>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t("addServerLead")}{" "}
                    <button
                      type="button"
                      onClick={expandDetails}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {t("manualSetupShow")}
                    </button>
                    .
                  </p>
                  <ServerUrlInput
                    form={form}
                    onParsed={setParsedUrl}
                    onUrlChange={setUrlDraft}
                    onManualEntry={expandDetails}
                  />
                  <TunnelHelper form={form} />
                  <ServerDetails
                    form={form}
                    hideNameField
                    hideVhostField
                    forceExpanded={detailsExpanded}
                    hideToggle
                  />
                  <ConnectionStatusDisplay
                    connectionStatus={connectionStatus}
                  />
                  <PlanVersionSupport />
                </>
              )}

              {!isEdit && step === 2 && (
                <div className="space-y-6">
                  <ConfirmConnectionCard
                    version={connectionStatus.details?.version}
                    clusterName={connectionStatus.details?.cluster_name}
                    values={{
                      host: form.watch("host"),
                      port: form.watch("port"),
                      amqpPort: form.watch("amqpPort"),
                      useHttps: form.watch("useHttps"),
                      username: form.watch("username"),
                      password: form.watch("password"),
                      vhost: form.watch("vhost"),
                    }}
                    provenance={parsedUrl?.provenance}
                    onUpgrade={handleUpgrade}
                  />

                  {/* Credentials — Management URLs usually omit user:pass, so we
                      collect them here (pre-filled when the URL did carry them)
                      before "Connect & scan". */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      {t("authentication")}
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("usernameLabel")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("usernamePlaceholder")}
                                autoComplete="username"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("passwordLabel")}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showStep2Password ? "text" : "password"}
                                  autoComplete="off"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() =>
                                    setShowStep2Password(!showStep2Password)
                                  }
                                  aria-label={
                                    showStep2Password
                                      ? t("hidePassword")
                                      : t("showPassword")
                                  }
                                >
                                  {showStep2Password ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-medium text-foreground">
                      {t("nameYourServer")}
                    </p>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("serverName")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("serverNamePlaceholder")}
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("serverNameHint")}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Surface a failed "Connect & scan": the catch resets phase
                      to "form" while keeping step 2, so without this the loader
                      just vanishes and the user lands back here with no reason. */}
                  <ConnectionStatusDisplay
                    connectionStatus={connectionStatus}
                  />
                </div>
              )}
            </form>
          </Form>
        </div>

        {phase === "done" && (
          <DialogFooter className="flex shrink-0 gap-2 border-t border-border pt-6">
            <span className="flex-1" />
            <Button type="button" onClick={goToCockpit} className="btn-primary">
              {t("goToCockpit")}
              <IconArrowRight className="ml-2 h-4 w-auto shrink-0" />
            </Button>
          </DialogFooter>
        )}

        {phase === "form" && (
          <DialogFooter className="flex gap-2 shrink-0 pt-6 border-t border-border">
            {step === 2 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={isLoading}
                className="mr-auto"
              >
                <IconChevronLeft className="h-4 w-auto shrink-0 mr-2" />
                {t("back")}
              </Button>
            )}

            {step === 1 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={expandDetails}
                  disabled={isLoading || isTestingConnection}
                  className="mr-auto"
                >
                  {t("enterManually")}
                </Button>
                {/* Manual path keeps "Test connection" — but only once the user
                  opened the details form. It is a secondary action; "Detect →"
                  is the URL-first way forward. */}
                {detailsExpanded && (
                  <TestConnectionButton
                    onTestConnection={testConnection}
                    isTestingConnection={isTestingConnection}
                    isLoading={isLoading}
                    variant="secondary"
                  />
                )}
                <Button
                  type="button"
                  onClick={handleDetect}
                  disabled={
                    !urlDraft.trim() || isLoading || isTestingConnection
                  }
                  className="btn-primary"
                >
                  {t("detect")}
                  <IconArrowRight className="ml-2 h-4 w-auto shrink-0" />
                </Button>
              </>
            )}

            {step === 2 && (
              <Button
                type="submit"
                form={formId}
                disabled={isLoading || isTestingConnection}
                className="btn-primary"
              >
                {t("connectAndScan")}
                <IconArrowRight className="ml-2 h-4 w-auto shrink-0" />
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
