import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserCog } from "lucide-react";
import { toast } from "sonner";

import { RabbitMQUser } from "@/lib/api/userTypes";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useUpdateUser } from "@/hooks/queries/useRabbitMQUsers";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { type EditUserForm, editUserSchema } from "@/schemas";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  user: RabbitMQUser;
}

const TAG_SHORTCUTS = [
  "administrator",
  "policymaker",
  "monitoring",
  "management",
  "impersonator",
  "none",
] as const;

export function EditUserModal({
  isOpen,
  onClose,
  serverId,
  user,
}: EditUserModalProps) {
  const { t } = useTranslation("users");
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      password: "",
      tags: user.tags?.join(", ") || "",
      passwordAction: "keep",
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        password: "",
        tags: user.tags?.join(", ") || "",
        passwordAction: "keep",
      });
    }
  }, [isOpen, user]);

  const updateUserMutation = useUpdateUser();

  // Handle success/error
  useEffect(() => {
    if (updateUserMutation.isSuccess) {
      queryClient.invalidateQueries({
        queryKey: ["user", serverId, user.name],
      });
      queryClient.invalidateQueries({ queryKey: ["users", serverId] });
      toast.success(t("updateSuccess"));
      onClose();
    }
    if (updateUserMutation.isError) {
      toast.error(updateUserMutation.error?.message || t("updateError"));
    }
  }, [
    updateUserMutation.isSuccess,
    updateUserMutation.isError,
    updateUserMutation.error,
  ]);

  const onSubmit = (data: EditUserForm) => {
    if (!workspace?.id) {
      toast.error(t("requiredWorkspace"));
      return;
    }

    updateUserMutation.mutate({
      serverId,
      workspaceId: workspace.id,
      username: user.name,
      password:
        data.passwordAction === "set"
          ? data.password?.trim() || undefined
          : undefined,
      tags: data.tags || "",
      removePassword: data.passwordAction === "remove",
    });
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleTagClick = (tag: string) => {
    const currentTags = form.getValues("tags") || "";
    if (tag === "none") {
      form.setValue("tags", "");
      return;
    }
    const tagList = currentTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tagList.includes(tag)) {
      form.setValue("tags", tagList.filter((t) => t !== tag).join(", "));
    } else {
      form.setValue("tags", [...tagList, tag].join(", "));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            {t("editUser")}
          </DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="users:editUserDescription"
              values={{ name: user.name }}
              components={{ strong: <strong /> }}
            />
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tagLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("tagPlaceholder")} {...field} />
                  </FormControl>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {TAG_SHORTCUTS.map((tag) => (
                      <Button
                        key={tag}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleTagClick(tag)}
                      >
                        {t(tag)}
                      </Button>
                    ))}
                  </div>
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
                            {t("passwordSet")}
                          </Label>
                        </div>
                        {field.value === "set" && (
                          <Input
                            type="password"
                            placeholder={t("passwordNewPlaceholder")}
                            value={form.watch("password") || ""}
                            onChange={(e) =>
                              form.setValue("password", e.target.value)
                            }
                            className="ml-6"
                          />
                        )}
                      </div>
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
                          className="font-normal cursor-pointer text-red-600"
                        >
                          {t("removePassword")}
                        </Label>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
                className="btn-primary text-white"
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
