import React, { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { UserPermissionsCard } from "@/components/AddUserFormComponent/UserPermissionsCard";
import { UserTagToggles } from "@/components/AddUserFormComponent/UserTagToggles";
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
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
      password: "",
      tags: [],
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

  const selectedVhost =
    useWatch({ control: form.control, name: "vhost" }) || "/";
  const isPending =
    createUserMutation.isPending || setPermissionsMutation.isPending;

  const resetAll = () => {
    form.reset({
      username: "",
      password: "",
      tags: [],
      vhost: "/",
      configure: ".*",
      write: ".*",
      read: ".*",
    });
    setShowPassword(false);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const onSubmit = async (data: CreateUserForm) => {
    if (!workspace?.id) {
      toast.error(t("toast.workspaceRequired"));
      return;
    }

    // Map the array form field to RabbitMQ's comma-separated CSV
    // contract only at the mutation boundary.
    const tagsCsv = data.tags.join(",");

    try {
      await createUserMutation.mutateAsync({
        serverId,
        workspaceId: workspace.id,
        username: data.username,
        password: data.password?.trim() || undefined,
        tags: tagsCsv,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.toLowerCase().includes("already exists")) {
        toast.error(t("toast.alreadyExistsDesc", { name: data.username }));
      } else {
        toast.error(message || t("createError"));
      }
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
      // Permissions failed — clean up the orphaned user so the list
      // doesn't gain an unusable account. Tell the user we did it.
      try {
        await deleteUserMutation.mutateAsync({
          serverId,
          workspaceId: workspace.id,
          username: data.username,
        });
        toast.error(
          error instanceof Error
            ? `${error.message} — ${t("toast.userRolledBack")}`
            : t("toast.permissionsFailedRolledBack")
        );
      } catch {
        toast.error(
          error instanceof Error
            ? `${error.message} — ${t("toast.rollbackFailed")}`
            : t("toast.rollbackFailed")
        );
      }
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["users", serverId] });
    toast.success(t("toast.userCreatedDesc", { name: data.username }));
    resetAll();
    onSuccess?.();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-xl lg:max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col bg-card">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>{t("addUser")}</DialogTitle>
          <DialogDescription>{t("createUserDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
            onKeyDown={handleKeyDown}
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
                        autoFocus
                        spellCheck={false}
                        autoCapitalize="off"
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
                      <PasswordInput
                        placeholder={t("passwordPlaceholder")}
                        autoComplete="new-password"
                        showPassword={showPassword}
                        onToggleVisibility={() => setShowPassword((s) => !s)}
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
                      <UserTagToggles
                        value={field.value}
                        onChange={field.onChange}
                      />
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
                              {vhost.name === "/"
                                ? t("defaultVhost")
                                : vhost.name}
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

              <UserPermissionsCard vhost={selectedVhost} />
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
              <Button
                type="submit"
                disabled={isPending}
                className="btn-primary"
              >
                {isPending ? t("creating") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
