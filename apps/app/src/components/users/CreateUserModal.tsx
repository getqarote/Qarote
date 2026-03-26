import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
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

import {
  useCreateUser,
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

const TAG_SHORTCUTS = [
  "administrator",
  "policymaker",
  "monitoring",
  "management",
  "impersonator",
  "none",
] as const;

export function CreateUserModal({
  isOpen,
  onClose,
  serverId,
  onSuccess,
}: CreateUserModalProps) {
  const { t } = useTranslation("users");
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      tags: "",
      vhost: "/",
    },
  });

  const createUserMutation = useCreateUser();
  const setPermissionsMutation = useSetUserPermissions();
  const { data: vhosts } = useVHosts(serverId);

  // Handle success/error
  useEffect(() => {
    if (createUserMutation.isSuccess && setPermissionsMutation.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ["users", serverId] });
      toast.success(t("createSuccess"));
      form.reset();
      onSuccess?.();
      onClose();
    }
    if (createUserMutation.isError) {
      toast.error(createUserMutation.error?.message || t("createError"));
    }
    if (setPermissionsMutation.isError) {
      toast.error(
        setPermissionsMutation.error?.message || t("setPermissionsError")
      );
    }
  }, [
    createUserMutation.isSuccess,
    createUserMutation.isError,
    createUserMutation.error,
    setPermissionsMutation.isSuccess,
    setPermissionsMutation.isError,
    setPermissionsMutation.error,
  ]);

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

      await setPermissionsMutation.mutateAsync({
        serverId,
        workspaceId: workspace.id,
        username: data.username,
        vhost: data.vhost,
        configure: ".*",
        write: ".*",
        read: ".*",
      });
    } catch {
      // Error handling is done in useEffect
    }
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

  const isPending =
    createUserMutation.isPending || setPermissionsMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("addUser")}
          </DialogTitle>
          <DialogDescription>{t("createUserDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("username")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("usernamePlaceholder")} {...field} />
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
                  <FormLabel>
                    {t("password")} {t("passwordOptional")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t("passwordPlaceholder")}
                      {...field}
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
              name="vhost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("virtualHostAccess")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vhosts?.map((vhost) => (
                        <SelectItem key={vhost.name} value={vhost.name}>
                          {vhost.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t("userPermissions")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
                className="btn-primary text-white"
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
