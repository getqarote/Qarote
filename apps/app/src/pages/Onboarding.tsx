import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePostHog } from "@posthog/react";
import { ChevronRight, Loader2, Plus, Rocket } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";

import { AuthBackground } from "@/components/auth/AuthBackground";
import {
  type OnboardingInvitee,
  OnboardingInviteeManager,
} from "@/components/onboarding/OnboardingInviteeManager";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PixelBuilding } from "@/components/ui/pixel-building";
import { PixelCheck } from "@/components/ui/pixel-check";
import { PixelLayers } from "@/components/ui/pixel-layers";
import { PixelLogout } from "@/components/ui/pixel-logout";
import { TagsInput } from "@/components/ui/tags-input";

import { useAuth } from "@/contexts/AuthContextDefinition";

import {
  useInviteOrgMember,
  useUpdateOrganization,
} from "@/hooks/queries/useOrganization";
import {
  useCreateWorkspace,
  useSwitchWorkspace,
  useUserWorkspaces,
} from "@/hooks/queries/useWorkspaceApi";

import { type OnboardingFormData, onboardingSchema } from "@/schemas";

/**
 * First-run onboarding page. Reached after sign-up before the user
 * has any workspace, or after a user deletes all their workspaces
 * and needs to recreate one.
 *
 * Two render modes, controlled by `isFirstOnboarding`:
 *   - **First onboarding**: welcome copy, org name field, workspace
 *     fields, tags, invitee manager
 *   - **Returning user** (rebuild): just workspace fields + tags,
 *     no welcome copy or invite section
 *
 * On submit the flow is:
 *   1. Create the workspace (server auto-creates the org if missing)
 *   2. Switch to the new workspace so subsequent calls can resolve it
 *   3. Rename the org if the user changed it from the default
 *   4. Fire-and-forget any pending invitations
 *   5. Show a success screen with next-step prompts, then redirect to "/"
 */
const Onboarding = () => {
  const { t } = useTranslation("onboarding");
  const posthog = usePostHog();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);
  const isCreatingRef = useRef(false);

  const [invitees, setInvitees] = useState<OnboardingInvitee[]>([]);

  const { data: workspacesData, isLoading: workspacesLoading } =
    useUserWorkspaces();

  const { data: onboardingInfo, isLoading: orgLoading } =
    trpc.user.getOnboardingInfo.useQuery(undefined, {
      enabled: !!user,
      staleTime: 60000,
    });
  const defaultOrgName =
    onboardingInfo?.organizationName ||
    `${user?.firstName || "My"}'s Organization`;

  const isFirstOnboarding = !onboardingInfo?.onboardingCompleted;

  // Redirect to dashboard if user already has workspaces (skip during
  // creation — we're about to navigate ourselves)
  useEffect(() => {
    if (
      !isCreatingRef.current &&
      !workspacesLoading &&
      workspacesData?.workspaces?.length
    ) {
      navigate("/", { replace: true });
    }
  }, [workspacesLoading, workspacesData, navigate]);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    defaultValues: {
      orgName: "",
      workspaceName: "",
      tags: [],
    },
  });

  // Prefill org name once the onboarding info loads
  useEffect(() => {
    if (defaultOrgName && !form.getValues("orgName")) {
      form.setValue("orgName", defaultOrgName);
    }
  }, [defaultOrgName, form]);

  const createWorkspaceMutation = useCreateWorkspace();
  const switchWorkspaceMutation = useSwitchWorkspace();
  const updateOrgMutation = useUpdateOrganization();
  const inviteOrgMemberMutation = useInviteOrgMember();

  const isPending =
    createWorkspaceMutation.isPending ||
    switchWorkspaceMutation.isPending ||
    updateOrgMutation.isPending ||
    inviteOrgMemberMutation.isPending;

  const onSubmit = async (data: OnboardingFormData) => {
    isCreatingRef.current = true;

    try {
      // 1. Create workspace (server auto-creates org if needed)
      const result = await createWorkspaceMutation.mutateAsync({
        name: data.workspaceName.trim(),
        tags:
          data.tags && data.tags.length > 0
            ? data.tags.filter((tag) => tag.trim().length > 0)
            : undefined,
      });
      const newWorkspaceId = result.workspace.id;

      // 2. Switch to the new workspace so resolveOrg() works for
      //    subsequent calls
      await switchWorkspaceMutation.mutateAsync({
        workspaceId: newWorkspaceId,
      });

      // 3. Rename org if user changed it from the default
      const trimmedOrgName = data.orgName?.trim() ?? "";
      if (trimmedOrgName && trimmedOrgName !== defaultOrgName) {
        try {
          await updateOrgMutation.mutateAsync({ name: trimmedOrgName });
        } catch {
          // Non-blocking — user can rename later in settings
        }
      }

      // 4. Send invitations (non-blocking — we still navigate even if
      //    some invites fail, they can be retried later)
      if (invitees.length > 0 && newWorkspaceId) {
        await Promise.allSettled(
          invitees.map((invitee) =>
            inviteOrgMemberMutation.mutateAsync({
              email: invitee.email,
              role: invitee.role,
              workspaceAssignments: [
                { workspaceId: newWorkspaceId, role: "MEMBER" },
              ],
            })
          )
        );
      }

      try {
        posthog?.capture("onboarding_completed", {
          workspace_name: data.workspaceName.trim(),
          invitees_count: invitees.length,
          is_first_onboarding: isFirstOnboarding,
        });
      } catch {
        // non-blocking analytics
      }
      setIsSuccess(true);
    } catch (error) {
      isCreatingRef.current = false;
      toast.error(
        t("setupFailed", {
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  };

  if (workspacesLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="relative min-h-screen bg-background">
        <AuthBackground />
        <header className="relative z-10 bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <div className="flex items-center gap-3">
                <img
                  src="/images/new_icon.svg"
                  alt="Qarote"
                  className="w-8 h-8"
                />
                <span className="text-xl font-semibold text-foreground">
                  Qarote
                </span>
              </div>
            </div>
          </div>
        </header>
        <main className="relative max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8">
            <div
              className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10"
              aria-hidden="true"
            >
              <PixelCheck className="h-6 w-auto shrink-0 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                {t("successTitle")}
              </h1>
              <p className="text-lg text-muted-foreground">
                {t("successDescription")}
              </p>
            </div>
            <ol className="text-left space-y-2">
              {(
                [
                  { label: t("successStep1"), href: "/?addServer=true" },
                  { label: t("successStep2"), href: "/settings/members" },
                ] as const
              ).map(({ label, href }, i) => (
                <li key={i}>
                  <a
                    href={href}
                    className="flex items-center gap-3 text-sm rounded-md px-3 py-2 hover:bg-muted transition-colors group"
                  >
                    <span className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1">{label}</span>
                    <ChevronRight
                      className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ol>
            <Button
              className="w-full h-11 font-medium"
              onClick={() => globalThis.location.assign("/")}
            >
              {t("successCta")}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <AuthBackground />
      {/* Header */}
      <header className="relative z-10 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                src="/images/new_icon.svg"
                alt="Qarote"
                className="w-8 h-8"
              />
              <span className="text-xl font-semibold text-foreground">
                Qarote
              </span>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <PixelLogout className="h-4 w-auto shrink-0" aria-hidden="true" />
              {t("signOut")}
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {isFirstOnboarding && (
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-4">
                {t("title")}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("description")}
              </p>
            </div>
          )}

          <div className="max-w-lg mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div
                  className="mx-auto flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 mb-4"
                  aria-hidden="true"
                >
                  {isFirstOnboarding ? (
                    <PixelBuilding className="h-5 w-auto shrink-0 text-primary" />
                  ) : (
                    <PixelLayers className="h-5 w-auto shrink-0 text-primary" />
                  )}
                </div>
                {!isFirstOnboarding && (
                  <CardTitle className="text-xl">
                    {t("cardTitleReturning")}
                  </CardTitle>
                )}
                {!isFirstOnboarding && (
                  <p className="text-sm text-muted-foreground">
                    {t("cardDescriptionReturning")}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    /* eslint-disable-next-line react-hooks/refs -- form.handleSubmit is a known-safe RHF ref pattern; the lint rule doesn't know it's not accessed during render */
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    {createWorkspaceMutation.isError && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {createWorkspaceMutation.error?.message ||
                            t("setupFailed", { error: "Unknown error" })}
                        </AlertDescription>
                      </Alert>
                    )}

                    {isFirstOnboarding && (
                      <FormField
                        control={form.control}
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
                                disabled={isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
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
                              disabled={isPending}
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
                      control={form.control}
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
                              disabled={isPending}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            {t("tagsHint")}
                          </p>
                        </FormItem>
                      )}
                    />

                    {isFirstOnboarding && (
                      <OnboardingInviteeManager
                        invitees={invitees}
                        onChange={setInvitees}
                        disabled={isPending}
                      />
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 font-medium"
                      disabled={isPending || !form.formState.isValid}
                    >
                      {isPending ? (
                        <>
                          <Loader2
                            className="h-4 w-4 mr-2 animate-spin"
                            aria-hidden="true"
                          />
                          {t("creating")}
                        </>
                      ) : (
                        <>
                          {isFirstOnboarding ? (
                            <Rocket
                              className="h-4 w-4 mr-2"
                              aria-hidden="true"
                            />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                          )}
                          {t(isFirstOnboarding ? "submit" : "submitReturning")}
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
