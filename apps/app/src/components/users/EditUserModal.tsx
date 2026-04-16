import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { RabbitMQUser } from "@/lib/api/userTypes";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

import { useUpdateUser } from "@/hooks/queries/useRabbitMQUsers";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import {
  type EditUserForm,
  editUserSchema,
  USER_TAGS,
  type UserTag,
} from "@/schemas";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  user: RabbitMQUser;
}

function toUserTags(raw: string[] | undefined): UserTag[] {
  return (raw ?? []).filter((t): t is UserTag =>
    (USER_TAGS as readonly string[]).includes(t)
  );
}

export function EditUserModal({
  isOpen,
  onClose,
  serverId,
  user,
}: EditUserModalProps) {
  const { t } = useTranslation("users");
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      password: "",
      tags: toUserTags(user.tags),
      passwordAction: "keep",
    },
  });

  const updateUserMutation = useUpdateUser();

  const onSubmit = async (data: EditUserForm) => {
    if (!workspace?.id) {
      toast.error(t("requiredWorkspace"));
      return;
    }

    try {
      await updateUserMutation.mutateAsync({
        serverId,
        workspaceId: workspace.id,
        username: user.name,
        password:
          data.passwordAction === "set"
            ? data.password?.trim() || undefined
            : undefined,
        tags: data.tags.join(","),
        removePassword: data.passwordAction === "remove",
      });

      queryClient.invalidateQueries({
        queryKey: ["user", serverId, user.name],
      });
      queryClient.invalidateQueries({ queryKey: ["users", serverId] });
      toast.success(t("updateSuccess"));
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("updateError"));
    }
  };

  const handleClose = () => {
    form.reset({
      password: "",
      tags: toUserTags(user.tags),
      passwordAction: "keep",
    });
    setShowPassword(false);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editUser")}</DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="users:editUserDescription"
              values={{ name: user.name }}
              components={{ strong: <strong /> }}
            />
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            onKeyDown={handleKeyDown}
          >
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
              name="passwordAction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("password")}</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="pw-keep"
                          value="keep"
                          checked={field.value === "keep"}
                          onChange={() => field.onChange("keep")}
                          className="accent-primary"
                        />
                        <Label
                          htmlFor="pw-keep"
                          className="font-normal cursor-pointer"
                        >
                          {t("passwordKeep")}
                        </Label>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="pw-set"
                            value="set"
                            checked={field.value === "set"}
                            onChange={() => field.onChange("set")}
                            className="accent-primary"
                          />
                          <Label
                            htmlFor="pw-set"
                            className="font-normal cursor-pointer"
                          >
                            {t("passwordSetAction")}
                          </Label>
                        </div>
                        {field.value === "set" && (
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field: pwField }) => (
                              <PasswordInput
                                placeholder={t("passwordNewPlaceholder")}
                                autoComplete="new-password"
                                showPassword={showPassword}
                                onToggleVisibility={() =>
                                  setShowPassword((s) => !s)
                                }
                                className="ml-6"
                                {...pwField}
                              />
                            )}
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="pw-remove"
                            value="remove"
                            checked={field.value === "remove"}
                            onChange={() => field.onChange("remove")}
                            className="accent-primary"
                          />
                          <Label
                            htmlFor="pw-remove"
                            className="font-normal cursor-pointer text-destructive"
                          >
                            {t("removePassword")}
                          </Label>
                        </div>
                        {field.value === "remove" && (
                          <div
                            role="alert"
                            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive ml-6"
                          >
                            <AlertTriangle
                              className="h-3.5 w-3.5 mt-0.5 shrink-0"
                              aria-hidden
                            />
                            <span>{t("removePasswordWarning")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateUserMutation.isPending}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
                className="btn-primary"
              >
                {updateUserMutation.isPending ? t("updating") : t("updateUser")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
