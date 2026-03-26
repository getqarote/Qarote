import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserCog } from "lucide-react";
import { toast } from "sonner";

import { RabbitMQUser } from "@/lib/api/userTypes";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
      removePassword: false,
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        password: "",
        tags: user.tags?.join(", ") || "",
        removePassword: false,
      });
    }
  }, [isOpen, user]);

  const updateUserMutation = useUpdateUser();

  const removePassword = form.watch("removePassword");

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
      password: data.removePassword ? "" : data.password?.trim() || undefined,
      tags: data.tags || "",
      removePassword: data.removePassword,
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
              name="removePassword"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("removePassword")}</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("password")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t("passwordUpdatePlaceholder")}
                      disabled={removePassword}
                      {...field}
                    />
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
