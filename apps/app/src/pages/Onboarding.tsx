import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, Plus, Rocket } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";

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
 *   5. Full page reload to "/" for a clean render without flicker
 */
const Onboarding = () => {
  const { t } = useTranslation("onboarding");
  const navigate = useNavigate();
  const { user } = useAuth();
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

      // Full page reload — clean slate, no re-render flicker
      globalThis.location.assign("/");
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                src="/images/new_icon.svg"
                alt="Qarote"
                className="w-8 h-8"
              />
              <h1 className="text-xl font-semibold text-foreground">Qarote</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                  className="mx-auto flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 mb-4"
                  aria-hidden="true"
                >
                  {isFirstOnboarding ? (
                    <Building2 className="h-6 w-6 text-primary" />
                  ) : (
                    <Plus className="h-6 w-6 text-primary" />
                  )}
                </div>
                <CardTitle className="text-xl">
                  {t(isFirstOnboarding ? "cardTitle" : "cardTitleReturning")}
                </CardTitle>
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
