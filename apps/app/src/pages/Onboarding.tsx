import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePostHog } from "@posthog/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { readGateError } from "@/lib/feature-gate/readGateError";
import { severityRank } from "@/lib/findingSeverity";
import { trpc } from "@/lib/trpc/client";
import { displayName } from "@/lib/userDisplay";

import { ConnectionStatusDisplay } from "@/components/AddServerFormComponent/ConnectionStatusDisplay";
import { ServerDetails } from "@/components/AddServerFormComponent/ServerDetails";
import { ServerUrlInput } from "@/components/AddServerFormComponent/ServerUrlInput";
import type { ConnectionStatus } from "@/components/AddServerFormComponent/types";
import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";
import { ScanRunningChecklist } from "@/components/scan/ScanRunningChecklist";
import { ServerTracingSection } from "@/components/server/ServerTracingSection";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  IconExchange,
  IconLogout,
  IconQueue,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { TagsInput } from "@/components/ui/tags-input";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useUpdateOrganization } from "@/hooks/queries/useOrganization";
import { useUpdateProfile } from "@/hooks/queries/useProfile";
import { useTriggerScan } from "@/hooks/queries/useScan";
import { useCreateServer } from "@/hooks/queries/useServer";
import {
  useCreateWorkspace,
  useSwitchWorkspace,
  useUserWorkspaces,
} from "@/hooks/queries/useWorkspaceApi";

import {
  type AddServerFormData,
  addServerSchema,
  type OnboardingFormData,
  onboardingSchema,
} from "@/schemas";

// Minimum time the scanning screen stays up so a fast real scan doesn't flash
// past before the user can read the checklist (mirrors AddServerForm).
const SCAN_MIN_MS = 1500;

// Wall-clock read, kept module-level so the impure call isn't lexically inside
// the component (the purity lint flags `Date.now()` in render scope).
const now = (): number => Date.now();

// Anti-flash: hold the scanning screen for at least SCAN_MIN_MS measured from
// `startedAt`, so a fast real scan doesn't blink past the user.
const holdScanFloor = (startedAt: number): Promise<void> => {
  const elapsed = now() - startedAt;
  if (elapsed >= SCAN_MIN_MS) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, SCAN_MIN_MS - elapsed));
};

// Wizard stages. Step 2 ("Scan") has two phases: the running checklist, then
// the result reveal.
type ScanPhase = "scanning" | "result";

// Honest summary of the point-in-time scan. A field left `undefined` means
// "not available" — the UI omits it rather than inventing a value.
interface ScanSummary {
  queueCount?: number;
  exchangeCount?: number;
  findingCount?: number;
  /** Top finding resource names (real), for the findings list. */
  topFindings: string[];
}

/**
 * Post-signup onboarding wizard. The user is already authenticated (better-auth
 * created the account); this 3-step flow runs before they have a workspace.
 *
 *   0. **Account** — name the org (first-onboarding only) + workspace + tags,
 *      and optionally invite teammates. Runs the create-workspace flow.
 *   1. **Connect** — URL-first first-broker connection. createServer tests the
 *      connection server-side; success advances to the scan.
 *   2. **Scan** — point-in-time scan with a progressive checklist, then a
 *      result reveal (counts + config findings) before entering the cockpit.
 *
 * Two render modes via `isFirstOnboarding`:
 *   - **First onboarding**: org name + invitee manager in step 0.
 *   - **Returning user** (rebuild): just workspace name + tags in step 0.
 * Both go through all 3 steps.
 */
const Onboarding = () => {
  // Namespace is "onboarding"; the scan result reuses dashboard's count/finding
  // pill keys via the explicit `dashboard:` prefix (all namespaces are
  // preloaded at i18n init, so the prefix resolves without extra wiring).
  const { t } = useTranslation("onboarding");
  const posthog = usePostHog();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setSelectedServerId } = useServerContext();
  const utils = trpc.useUtils();

  const [step, setStep] = useState(0);
  const [scanPhase, setScanPhase] = useState<ScanPhase>("scanning");
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: "idle",
  });
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  // Set once the first broker is created — drives the post-connect Message
  // tracing section on the scan-result screen (needs a persisted serverId).
  const [createdServerId, setCreatedServerId] = useState<string | null>(null);
  const isCreatingRef = useRef(false);

  const { data: workspacesData, isLoading: workspacesLoading } =
    useUserWorkspaces();

  const { data: onboardingInfo, isLoading: orgLoading } =
    trpc.user.getOnboardingInfo.useQuery(undefined, {
      enabled: !!user,
      staleTime: 60000,
    });
  // The account already has a name when first/last is set (collected at
  // sign-up, or filled from OAuth/SSO claims). Only then do we skip the
  // optional onboarding name row — no point re-asking.
  const nameKnown = Boolean(
    (user?.firstName ?? "").trim() || (user?.lastName ?? "").trim()
  );

  // First name token for the default org name. Falls back through the display
  // helper (email local-part) so we never produce "My's Organization" when the
  // account has only an email.
  const ownerFirstName =
    (user?.firstName ?? "").trim() || displayName(user).split(" ")[0] || "My";
  const defaultOrgName =
    onboardingInfo?.organizationName || `${ownerFirstName}'s Organization`;

  const isFirstOnboarding = !onboardingInfo?.onboardingCompleted;

  // Redirect to dashboard if user already has workspaces (skip while we're
  // mid-flow — we navigate ourselves at the end).
  useEffect(() => {
    if (
      !isCreatingRef.current &&
      !workspacesLoading &&
      workspacesData?.workspaces?.length
    ) {
      navigate("/", { replace: true });
    }
  }, [workspacesLoading, workspacesData, navigate]);

  const accountForm = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      orgName: "",
      workspaceName: "",
      tags: [],
    },
  });

  const connectForm = useForm<AddServerFormData>({
    resolver: zodResolver(addServerSchema),
    defaultValues: {
      name: "",
      host: "",
      port: 15672,
      amqpPort: 5672,
      username: "guest",
      password: "",
      vhost: "/",
      useHttps: false,
      environment: null,
    },
  });

  // Prefill org name once the onboarding info loads.
  useEffect(() => {
    if (defaultOrgName && !accountForm.getValues("orgName")) {
      accountForm.setValue("orgName", defaultOrgName);
    }
  }, [defaultOrgName, accountForm]);

  const createWorkspaceMutation = useCreateWorkspace();
  const switchWorkspaceMutation = useSwitchWorkspace();
  const updateProfileMutation = useUpdateProfile();
  const updateOrgMutation = useUpdateOrganization();
  const createServerMutation = useCreateServer();
  const triggerScanMutation = useTriggerScan();

  const isAccountPending =
    createWorkspaceMutation.isPending ||
    switchWorkspaceMutation.isPending ||
    updateOrgMutation.isPending;
  const isConnectPending = createServerMutation.isPending;

  // ── Step 0: Account ── create workspace, switch to it, rename org.
  const onAccountSubmit = async (data: OnboardingFormData) => {
    isCreatingRef.current = true;

    try {
      // Persist the optional name first if the user supplied (or corrected) it.
      // Non-blocking: a failure here must never stop the workspace flow — the
      // name is also editable later in Settings → Profile.
      const trimmedFirst = data.firstName?.trim() ?? "";
      const trimmedLast = data.lastName?.trim() ?? "";
      if (
        (trimmedFirst || trimmedLast) &&
        (trimmedFirst !== (user?.firstName ?? "").trim() ||
          trimmedLast !== (user?.lastName ?? "").trim())
      ) {
        try {
          await updateProfileMutation.mutateAsync({
            firstName: trimmedFirst,
            lastName: trimmedLast,
          });
        } catch {
          // Non-blocking — name can be set later in Settings → Profile.
        }
      }

      const result = await createWorkspaceMutation.mutateAsync({
        name: data.workspaceName.trim(),
        tags:
          data.tags && data.tags.length > 0
            ? data.tags.filter((tag) => tag.trim().length > 0)
            : undefined,
      });
      const newWorkspaceId = result.workspace.id;

      await switchWorkspaceMutation.mutateAsync({
        workspaceId: newWorkspaceId,
      });

      const trimmedOrgName = data.orgName?.trim() ?? "";
      if (trimmedOrgName && trimmedOrgName !== defaultOrgName) {
        try {
          await updateOrgMutation.mutateAsync({ name: trimmedOrgName });
        } catch {
          // Non-blocking — user can rename later in settings.
        }
      }

      try {
        posthog?.capture("onboarding_workspace_created", {
          workspace_name: data.workspaceName.trim(),
          is_first_onboarding: isFirstOnboarding,
        });
      } catch {
        // Non-blocking analytics.
      }

      setWorkspaceId(newWorkspaceId);
      setStep(1);
    } catch (error) {
      isCreatingRef.current = false;
      toast.error(
        t("setupFailed", {
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  };

  // Gather an honest scan summary the same way AddServerForm's runScanAndReveal
  // does: the free config scan returns the queue/exchange totals it already
  // enumerated (no EE-gated getTopology), plus the findings.
  const runScanAndReveal = async (
    wsId: string,
    serverId: string
  ): Promise<ScanSummary> => {
    const summary: ScanSummary = { topFindings: [] };

    try {
      const scan = await triggerScanMutation.mutateAsync({
        serverId,
        workspaceId: wsId,
      });
      summary.queueCount = scan.queueCount;
      summary.exchangeCount = scan.exchangeCount;

      const result = await utils.rabbitmq.scan.getFindings.fetch({
        serverId,
        workspaceId: wsId,
        resolved: false,
        limit: 50,
      });
      summary.findingCount = result.findings.length;
      // getFindings orders by detectedAt; re-sort for the 3 most severe.
      summary.topFindings = [...result.findings]
        .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
        .slice(0, 3)
        .map((f) => f.resourceName);
    } catch {
      // Scan failed — leave fields undefined so the UI omits them.
    }

    return summary;
  };

  // Step 1 hides the server-name field, but addServerSchema requires a
  // non-empty `name`. Default it from the host (set by URL parse or manual
  // entry) just before validation, then hand off to the validated submit so
  // the form passes and the server gets a recognizable label.
  const submitConnect = () => {
    if (!connectForm.getValues("name")?.trim()) {
      const host = connectForm.getValues("host")?.trim();
      if (host) connectForm.setValue("name", host);
    }
    void connectForm.handleSubmit(onConnectSubmit)();
  };

  // ── Step 1: Connect ── create the server (tests connection server-side),
  // select it, then run the point-in-time scan.
  const onConnectSubmit = async (data: AddServerFormData) => {
    if (!workspaceId) return;
    setConnectionStatus({ status: "idle" });

    setStep(2);
    setScanPhase("scanning");
    const scanStartedAt = now();

    try {
      const result = await createServerMutation.mutateAsync({
        workspaceId,
        name: data.name.trim() || data.host,
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

      const summary = await runScanAndReveal(workspaceId, result.server.id);
      setScanSummary(summary);

      try {
        posthog?.capture("onboarding_completed", {
          is_first_onboarding: isFirstOnboarding,
          finding_count: summary.findingCount,
        });
      } catch {
        // Non-blocking analytics.
      }

      await holdScanFloor(scanStartedAt);
      setScanPhase("result");
    } catch (error) {
      // A failed create drops back to step 1 with an editable, actionable error.
      setStep(1);
      setConnectionStatus({
        status: "error",
        message: error instanceof Error ? error.message : t("connectFailed"),
        gate: readGateError(error) ?? undefined,
      });
    }
  };

  // The server is already selected; findings already live in Notifications →
  // Config scan. Just route to the cockpit.
  const goToCockpit = () => navigate("/", { replace: true });

  if (workspacesLoading || orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }

  const hasFindings = (scanSummary?.findingCount ?? 0) > 0;

  return (
    <div className="relative min-h-screen bg-background">
      {/* Header — brand + sign-out. */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 font-heading text-lg text-foreground">
            <img
              src="/images/new_icon.svg"
              alt=""
              aria-hidden="true"
              width={15}
              height={20}
              className="h-5 w-auto shrink-0"
            />
            Qarote
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconLogout className="h-4 w-auto shrink-0" aria-hidden="true" />
            {t("signOut")}
          </button>
        </div>
      </header>

      <main className="flex flex-col items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-[520px] overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <OnboardingStepper current={step} />

          <div className="px-6 py-6">
            {/* ── Step 0: Account ───────────────────────────────────── */}
            {step === 0 && (
              <Form {...accountForm}>
                <form
                  noValidate
                  /* eslint-disable-next-line react-hooks/refs -- form.handleSubmit is a known-safe RHF ref pattern; the lint rule doesn't know it's not accessed during render */
                  onSubmit={accountForm.handleSubmit(onAccountSubmit)}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h2 className="font-heading text-xl text-foreground">
                      {isFirstOnboarding
                        ? t("accountTitle")
                        : t("accountTitleReturning")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("accountSubtitle")}
                    </p>
                  </div>

                  {createWorkspaceMutation.isError && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {createWorkspaceMutation.error?.message ||
                          t("setupFailed", { error: "Unknown error" })}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Optional name capture — shown only when the account has
                      no name yet (email sign-up, or SSO without name claims).
                      Pre-filled when partially known; never required. */}
                  {!nameKnown && (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={accountForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              {t("firstName")}{" "}
                              <span className="font-normal text-muted-foreground">
                                {t("optionalSuffix")}
                              </span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("firstNamePlaceholder")}
                                className="h-11"
                                autoComplete="given-name"
                                disabled={isAccountPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={accountForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              {t("lastName")}{" "}
                              <span className="font-normal text-muted-foreground">
                                {t("optionalSuffix")}
                              </span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("lastNamePlaceholder")}
                                className="h-11"
                                autoComplete="family-name"
                                disabled={isAccountPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {isFirstOnboarding && (
                    <FormField
                      control={accountForm.control}
                      name="orgName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            {t("orgName")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t("orgNamePlaceholder")}
                              className="h-11"
                              disabled={isAccountPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={accountForm.control}
                    name="workspaceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          {t("workspaceName")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("workspaceNamePlaceholder")}
                            className="h-11"
                            disabled={isAccountPending}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          {t("workspaceNameHint")}
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accountForm.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          {t("tagsLabel")}
                        </FormLabel>
                        <FormControl>
                          <TagsInput
                            value={field.value || []}
                            onChange={field.onChange}
                            placeholder={t("tagsPlaceholder")}
                            maxTags={10}
                            maxTagLength={20}
                            disabled={isAccountPending}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          {t("tagsHint")}
                        </p>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="h-11 w-full font-medium"
                    disabled={
                      isAccountPending || !accountForm.formState.isValid
                    }
                  >
                    {isAccountPending ? (
                      <>
                        <Loader2
                          className="mr-2 h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        {t("creating")}
                      </>
                    ) : (
                      <>
                        {t("continue")}
                        <IconArrowRight className="ml-2 h-4 w-auto shrink-0" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            )}

            {/* ── Step 1: Connect ───────────────────────────────────── */}
            {step === 1 && (
              <Form {...connectForm}>
                <form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitConnect();
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h2 className="font-heading text-xl text-foreground">
                      {t("connectTitle")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("connectSubtitle")}
                    </p>
                  </div>

                  <ServerUrlInput form={connectForm} />
                  <ServerDetails
                    form={connectForm}
                    alwaysExpanded
                    hideNameField
                  />
                  <ConnectionStatusDisplay
                    connectionStatus={connectionStatus}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep(0)}
                      disabled={isConnectPending}
                    >
                      <IconChevronLeft className="mr-2 h-4 w-auto shrink-0" />
                      {t("back")}
                    </Button>
                    <Button
                      type="submit"
                      className="ml-auto font-medium"
                      disabled={isConnectPending}
                    >
                      {isConnectPending ? (
                        <Loader2
                          className="mr-2 h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : null}
                      {t("connectAndScan")}
                      <IconArrowRight className="ml-2 h-4 w-auto shrink-0" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* ── Step 2: Scan ──────────────────────────────────────── */}
            {step === 2 && scanPhase === "scanning" && (
              <ScanRunningChecklist title={t("scanningBroker")} />
            )}

            {step === 2 && scanPhase === "result" && scanSummary && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-heading text-xl text-foreground">
                    {t("scanCompleteTitle")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("scanCompleteSubtitle")}
                  </p>
                </div>

                {/* Green recap row — real counts only. */}
                {(scanSummary.queueCount !== undefined ||
                  scanSummary.exchangeCount !== undefined) && (
                  <div className="flex flex-wrap gap-2.5 rounded-lg bg-success-muted px-4 py-3">
                    {scanSummary.queueCount !== undefined && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-success">
                        <IconQueue size={15} />
                        {t("dashboard:queuesPill", {
                          count: scanSummary.queueCount,
                        })}
                      </span>
                    )}
                    {scanSummary.exchangeCount !== undefined && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-success">
                        <IconExchange size={15} />
                        {t("dashboard:exchangesPill", {
                          count: scanSummary.exchangeCount,
                        })}
                      </span>
                    )}
                  </div>
                )}

                {/* Findings: amber list, clean block, or "scan running"
                    fallback when the scan data is unavailable. */}
                {scanSummary.findingCount === undefined ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                    {t("dashboard:findingsScanRunning")}
                  </span>
                ) : hasFindings ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-warning">
                      {t("findingsHeader", { count: scanSummary.findingCount })}
                    </p>
                    {scanSummary.topFindings.length > 0 && (
                      <ul className="space-y-2">
                        {scanSummary.topFindings.map((resource) => (
                          <li
                            key={resource}
                            className="flex items-center gap-2 text-sm text-foreground"
                          >
                            <span
                              aria-hidden="true"
                              className="h-2 w-2 shrink-0 rounded-full bg-warning"
                            />
                            <code className="font-mono text-accent-foreground">
                              {resource}
                            </code>
                          </li>
                        ))}
                        {scanSummary.findingCount !== undefined &&
                          scanSummary.findingCount >
                            scanSummary.topFindings.length && (
                            <li className="pl-4 text-sm text-muted-foreground">
                              {t("dashboard:findingsMore", {
                                count:
                                  scanSummary.findingCount -
                                  scanSummary.topFindings.length,
                              })}
                            </li>
                          )}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm leading-relaxed text-success">
                    <IconCheck
                      className="h-4 w-auto shrink-0"
                      aria-hidden="true"
                    />
                    {t("dashboard:findingsClean")}
                  </p>
                )}

                {/* Now that the broker is connected, offer per-vhost Message
                    tracing — the firehose that powers richer diagnosis. */}
                {createdServerId && (
                  <div className="border-t border-border pt-5">
                    <ServerTracingSection serverId={createdServerId} />
                  </div>
                )}

                <Button
                  type="button"
                  onClick={goToCockpit}
                  className="h-11 w-full font-medium"
                >
                  {t("enterQarote")}
                  <IconArrowRight className="ml-2 h-4 w-auto shrink-0" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 font-mono text-[11.5px] text-muted-foreground">
          {t("footerTagline")}
        </p>
      </main>
    </div>
  );
};

export default Onboarding;
