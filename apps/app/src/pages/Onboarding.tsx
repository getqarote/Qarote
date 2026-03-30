import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, Rocket, Users, X } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagsInput } from "@/components/ui/tags-input";

import { useAuth } from "@/contexts/AuthContextDefinition";

import {
  useCurrentOrganization,
  useInviteOrgMember,
  useUpdateOrganization,
} from "@/hooks/queries/useOrganization";
import {
  useCreateWorkspace,
  useUserWorkspaces,
} from "@/hooks/queries/useWorkspaceApi";

import { type OnboardingFormData, onboardingSchema } from "@/schemas";

const Onboarding = () => {
  const { t } = useTranslation("onboarding");
  const navigate = useNavigate();
  const { user, refetchUser } = useAuth();
  const isCreatingRef = useRef(false);

  // Invite state: each invitee has their own role
  const [invitees, setInvitees] = useState<
    { email: string; role: "ADMIN" | "MEMBER" }[]
  >([]);
  const [emailInput, setEmailInput] = useState("");

  // Check if user already has workspaces
  const { data: workspacesData, isLoading: workspacesLoading } =
    useUserWorkspaces();

  // Get current org name for pre-filling
  const { data: currentOrg } = useCurrentOrganization();
  const defaultOrgName =
    currentOrg?.name || `${user?.firstName || "My"}'s Organization`;

  // Redirect to dashboard if user already has workspaces (skip during creation)
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

  // Update org name default once loaded
  useEffect(() => {
    if (defaultOrgName && !form.getValues("orgName")) {
      form.setValue("orgName", defaultOrgName);
    }
  }, [defaultOrgName, form]);

  // Mutations
  const createWorkspaceMutation = useCreateWorkspace();
  const updateOrgMutation = useUpdateOrganization();
  const inviteOrgMemberMutation = useInviteOrgMember();

  const isPending =
    createWorkspaceMutation.isPending ||
    updateOrgMutation.isPending ||
    inviteOrgMemberMutation.isPending;

  const onSubmit = async (data: OnboardingFormData) => {
    isCreatingRef.current = true;

    try {
      // 1. Create workspace (also auto-creates org if needed)
      const result = await createWorkspaceMutation.mutateAsync({
        name: data.workspaceName.trim(),
        tags:
          data.tags && data.tags.length > 0
            ? data.tags.filter((tag) => tag.trim().length > 0)
            : undefined,
      });
      const newWorkspaceId = result.workspace.id;

      // 2. Refresh session to get workspaceId + org context
      await refetchUser();

      // 3. Rename org if user changed it
      const trimmedOrgName = data.orgName.trim();
      if (trimmedOrgName && trimmedOrgName !== defaultOrgName) {
        try {
          await updateOrgMutation.mutateAsync({ name: trimmedOrgName });
        } catch {
          toast.warning(t("orgRenameFailed"));
        }
      }

      // 4. Send invitations (non-blocking)
      if (invitees.length > 0 && newWorkspaceId) {
        const results = await Promise.allSettled(
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

        results.forEach((result, i) => {
          if (result.status === "fulfilled") {
            toast.success(t("inviteSent", { email: invitees[i].email }));
          } else {
            toast.error(
              t("inviteFailed", {
                email: invitees[i].email,
                error:
                  result.reason instanceof Error
                    ? result.reason.message
                    : "Unknown error",
              })
            );
          }
        });
      }

      navigate("/", { replace: true });
    } catch (error) {
      isCreatingRef.current = false;
      toast.error(
        t("setupFailed", {
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  };

  if (workspacesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
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
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Qarote
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              {t("title")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("description")}
            </p>
          </div>

          {/* Organization Setup Card */}
          <div className="max-w-lg mx-auto">
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 mb-4">
                  <Building2 className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle className="text-xl">{t("cardTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
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

                    {/* Organization Name */}
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

                    {/* Workspace Name */}
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

                    {/* Tags */}
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

                    {/* Divider */}
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-card px-3 text-sm text-muted-foreground flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {t("inviteTitle")}
                        </span>
                      </div>
                    </div>

                    {/* Invite Members */}
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        {t("inviteDescription")}
                      </p>

                      {/* Email input */}
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const email = emailInput.trim();
                              if (
                                email &&
                                email.includes("@") &&
                                !invitees.some((inv) => inv.email === email) &&
                                invitees.length < 10
                              ) {
                                setInvitees([
                                  ...invitees,
                                  { email, role: "MEMBER" },
                                ]);
                                setEmailInput("");
                              }
                            }
                          }}
                          placeholder={t("inviteEmailPlaceholder")}
                          disabled={isPending || invitees.length >= 10}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 px-4"
                          disabled={
                            isPending ||
                            !emailInput.trim() ||
                            !emailInput.includes("@") ||
                            invitees.some(
                              (inv) => inv.email === emailInput.trim()
                            ) ||
                            invitees.length >= 10
                          }
                          onClick={() => {
                            const email = emailInput.trim();
                            if (email && email.includes("@")) {
                              setInvitees([
                                ...invitees,
                                { email, role: "MEMBER" },
                              ]);
                              setEmailInput("");
                            }
                          }}
                        >
                          {t("inviteAdd", { defaultValue: "Add" })}
                        </Button>
                      </div>

                      {/* Invitee list with per-email role selector */}
                      {invitees.length > 0 && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          {invitees.map((invitee, idx) => (
                            <div
                              key={invitee.email}
                              className="flex items-center gap-2 rounded-md border border-border p-2"
                            >
                              <span className="flex-1 text-sm truncate">
                                {invitee.email}
                              </span>
                              <Select
                                value={invitee.role}
                                onValueChange={(v) => {
                                  const updated = [...invitees];
                                  updated[idx] = {
                                    ...updated[idx],
                                    role: v as "ADMIN" | "MEMBER",
                                  };
                                  setInvitees(updated);
                                }}
                              >
                                <SelectTrigger className="w-28 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MEMBER">
                                    {t("inviteRoleMember")}
                                  </SelectItem>
                                  <SelectItem value="ADMIN">
                                    {t("inviteRoleAdmin")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <button
                                type="button"
                                onClick={() =>
                                  setInvitees(
                                    invitees.filter((_, i) => i !== idx)
                                  )
                                }
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submit */}
                    <Button
                      type="submit"
                      className="w-full h-11 bg-gradient-button hover:bg-gradient-button-hover text-white font-medium"
                      disabled={isPending || !form.formState.isValid}
                    >
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("creating")}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Rocket className="h-4 w-4" />
                          {t("submit")}
                        </div>
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
