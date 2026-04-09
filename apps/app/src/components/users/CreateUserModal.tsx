import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ShieldCheck, UserPlus } from "lucide-react";
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
import {
  Form,
  FormControl,
  FormDescription,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggleGroup";

import {
  useCreateUser,
  useDeleteUser,
  useSetUserPermissions,
} from "@/hooks/queries/useRabbitMQUsers";
import { useVHosts } from "@/hooks/queries/useRabbitMQVHosts";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { type CreateUserForm, createUserSchema } from "@/schemas";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  onSuccess?: () => void;
}

/**
 * RabbitMQ tag enum. These are the only five valid tags the broker
 * recognises, so the form exposes them as an explicit toggle group
 * instead of a free-text field. See `UsersTableRow` for the display
 * treatment applied to the same tags in the users list — admin gets
 * an elevated primary tint, others are secondary chips.
 */
const TAG_OPTIONS = [
  "administrator",
  "policymaker",
  "monitoring",
  "management",
  "impersonator",
] as const;

type TagOption = (typeof TAG_OPTIONS)[number];

function parseTagsString(value: string | undefined): TagOption[] {
  if (!value) return [];
  const known = new Set<string>(TAG_OPTIONS);
  return value
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is TagOption => known.has(t));
}

export function CreateUserModal({
  isOpen,
  onClose,
  serverId,
  onSuccess,
}: CreateUserModalProps) {
  const { t } = useTranslation("users");
  const { t: tc } = useTranslation("common");
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      tags: "",
      vhost: "/",
      configure: ".*",
      write: ".*",
      read: ".*",
    },
  });

  const createUserMutation = useCreateUser();
  const setPermissionsMutation = useSetUserPermissions();
  const deleteUserMutation = useDeleteUser();
  const { data: vhostsData, isLoading: vhostsLoading } = useVHosts(serverId);

  const selectedVhost = form.watch("vhost");

  const onSubmit = async (data: CreateUserForm) => {
    if (!workspace?.id) {
      toast.error(t("requiredWorkspace"));
      return;
    }

    try {
      await createUserMutation.mutateAsync({
        serverId,
        workspaceId: workspace.id,
        username: data.username,
        password: data.password?.trim() || undefined,
        tags: data.tags || "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("createError"));
      return;
    }

    try {
      await setPermissionsMutation.mutateAsync({
        serverId,
        workspaceId: workspace.id,
        username: data.username,
        vhost: data.vhost,
        configure: data.configure,
        write: data.write,
        read: data.read,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("setPermissionsError")
      );
      // Permission setup failed — clean up the orphaned user so the
      // list doesn't end up with an unusable account.
      try {
        await deleteUserMutation.mutateAsync({
          serverId,
          workspaceId: workspace.id,
          username: data.username,
        });
      } catch {
        // Cleanup failed — user exists without permissions. Logged
        // upstream by the mutation hook.
      }
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["users", serverId] });
    toast.success(t("createSuccess"));
    form.reset();
    setAdvancedOpen(false);
    onSuccess?.();
    onClose();
  };

  const handleClose = () => {
    form.reset();
    setAdvancedOpen(false);
    onClose();
  };

  const isPending =
    createUserMutation.isPending || setPermissionsMutation.isPending;

  // Parse/serialize selected tags for the ToggleGroup. Form value
  // stays a comma-separated string for API compatibility; the toggle
  // group reads and writes an array via these helpers.
  const tagsString = form.watch("tags");
  const selectedTags = useMemo(() => parseTagsString(tagsString), [tagsString]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div
              className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0"
              aria-hidden="true"
            >
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <span>{t("addUser")}</span>
          </DialogTitle>
          <DialogDescription>{t("createUserDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("username")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("usernamePlaceholder")}
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t("usernameHelp")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("password")}{" "}
                      <span className="text-muted-foreground font-normal">
                        {t("passwordOptional")}
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("passwordOptionalHint")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("tagLabel")}</FormLabel>
                    <FormControl>
                      <ToggleGroup
                        type="multiple"
                        value={selectedTags}
                        onValueChange={(values: string[]) =>
                          field.onChange(values.join(", "))
                        }
                        className="flex flex-wrap justify-start gap-1.5"
                        aria-label={t("tagLabel")}
                      >
                        {TAG_OPTIONS.map((tag) => {
                          const isAdmin = tag === "administrator";
                          return (
                            <ToggleGroupItem
                              key={tag}
                              value={tag}
                              className={
                                isAdmin
                                  ? "h-7 px-2.5 text-xs data-[state=on]:bg-primary/10 data-[state=on]:border-primary/50 data-[state=on]:text-foreground data-[state=on]:font-semibold border border-border"
                                  : "h-7 px-2.5 text-xs data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground border border-border"
                              }
                            >
                              {t(tag)}
                            </ToggleGroupItem>
                          );
                        })}
                      </ToggleGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vhost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("virtualHostAccess")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={vhostsLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              vhostsLoading
                                ? tc("loading")
                                : t("virtualHostAccess")
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vhostsLoading ? (
                          <SelectItem value="/" disabled>
                            {tc("loading")}
                          </SelectItem>
                        ) : vhostsData?.vhosts?.length ? (
                          vhostsData.vhosts.map((vhost) => (
                            <SelectItem key={vhost.name} value={vhost.name}>
                              {vhost.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="/" disabled>
                            {t("noVhostsAvailable")}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Permissions preview panel.
                Shows the operator what they're about to grant so the
                wildcard default isn't buried as docs text. Advanced
                toggle reveals three regex inputs so power users can
                create read-only or write-only accounts in a single
                step instead of a follow-up edit. */}
              <div className="rounded-lg border border-warning/30 bg-warning-muted/40 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    className="h-4 w-4 mt-0.5 text-warning shrink-0"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {t("permissionsTitle", { vhost: selectedVhost })}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("permissionsDescription")}
                    </p>
                  </div>
                </div>

                {!advancedOpen ? (
                  <>
                    <dl className="grid grid-cols-3 gap-3 pl-7">
                      <PermissionSummaryItem
                        label={t("permissionConfigureLabel")}
                        value={form.watch("configure")}
                      />
                      <PermissionSummaryItem
                        label={t("permissionWriteLabel")}
                        value={form.watch("write")}
                      />
                      <PermissionSummaryItem
                        label={t("permissionReadLabel")}
                        value={form.watch("read")}
                      />
                    </dl>
                    <div className="pl-7">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAdvancedOpen(true)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ChevronDown
                          className="h-3.5 w-3.5 mr-1"
                          aria-hidden="true"
                        />
                        {t("permissionsAdvancedToggle")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 pl-7">
                    <FormField
                      control={form.control}
                      name="configure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t("permissionConfigureLabel")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="font-mono text-sm h-8"
                              placeholder=".*"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            {t("permissionConfigureHint")}
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="write"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t("permissionWriteLabel")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="font-mono text-sm h-8"
                              placeholder=".*"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            {t("permissionWriteHint")}
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="read"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t("permissionReadLabel")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="font-mono text-sm h-8"
                              placeholder=".*"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            {t("permissionReadHint")}
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("creating") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Single permission summary cell. Label on top, regex value as a
 * monospace kbd-styled chip so `.*` reads as a value, not regex
 * prose. Used only inside the permissions preview panel.
 */
function PermissionSummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1">
        <code className="inline-flex h-5 items-center rounded border border-border bg-background px-1.5 font-mono text-xs font-semibold text-foreground/80">
          {value}
        </code>
      </dd>
    </div>
  );
}
