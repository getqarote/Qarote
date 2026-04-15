import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Edit, Loader2, Server } from "lucide-react";

import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

import { useServerContext } from "@/contexts/ServerContext";

import {
  useCreateServer,
  useTestConnection,
  useUpdateServer,
} from "@/hooks/queries/useServer";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { type AddServerFormData, addServerSchema } from "@/schemas";

import { ConfirmConnectionCard } from "./ConfirmConnectionCard";
import { ConnectionStatusDisplay } from "./ConnectionStatusDisplay";
import { PlanVersionSupport } from "./PlanVersionSupport";
import { ServerDetails } from "./ServerDetails";
import { ServerUrlInput } from "./ServerUrlInput";
import { TestConnectionButton } from "./TestConnectionButton";
import { TunnelHelper } from "./TunnelHelper";
import type { AddServerFormProps, ConnectionStatus } from "./types";

type Step = 1 | 2;

export const AddServerForm = ({
  onServerAdded,
  onServerUpdated,
  trigger,
  server,
  mode = "add",
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}: AddServerFormProps) => {
  const { t } = useTranslation("dashboard");
  const { setSelectedServerId } = useServerContext();
  const { refetchPlan } = useUser();
  const { workspace } = useWorkspace();
  const createServerMutation = useCreateServer();
  const updateServerMutation = useUpdateServer();
  const testConnectionMutation = useTestConnection();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: "idle",
  });
  const [step, setStep] = useState<Step>(1);

  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledOnOpenChange || setInternalIsOpen;

  const form = useForm<AddServerFormData>({
    resolver: zodResolver(addServerSchema),
    defaultValues: {
      name: server?.name || "",
      host: server?.host || "",
      port: server?.port || 15672,
      amqpPort: server?.amqpPort || 5672,
      username: server?.username || "guest",
      password: "",
      vhost: server?.vhost || "/",
      useHttps: server?.useHttps || false,
    },
  });

  useEffect(() => {
    if (mode === "edit" && server) {
      form.reset({
        name: server.name,
        host: server.host,
        port: server.port,
        amqpPort: server.amqpPort,
        username: server.username,
        password: "",
        vhost: server.vhost,
        useHttps: server.useHttps || false,
      });
      setConnectionStatus({ status: "idle" });
      setStep(1);
    }
  }, [server, mode, form]);

  const testConnection = async () => {
    // In step 1 add mode, name isn't filled yet — skip its validation.
    const fieldsToValidate: (keyof AddServerFormData)[] =
      mode === "add" && step === 1
        ? ["host", "port", "amqpPort", "username", "password", "useHttps"]
        : [
            "name",
            "host",
            "port",
            "amqpPort",
            "username",
            "password",
            "useHttps",
          ];

    const isValid = await form.trigger(fieldsToValidate);
    if (!isValid) return;

    const formData = form.getValues();
    setIsTestingConnection(true);
    setConnectionStatus({ status: "idle" });

    try {
      if (!workspace?.id) {
        throw new Error(t("workspaceIdRequired"));
      }
      const result = await testConnectionMutation.mutateAsync({
        workspaceId: workspace.id,
        host: formData.host,
        port: formData.port,
        amqpPort: formData.amqpPort,
        username: formData.username,
        password: formData.password,
        vhost: formData.vhost,
        useHttps: formData.useHttps,
      });

      if (result.success) {
        setConnectionStatus({
          status: "success",
          message: t("connectionSuccessful"),
          details: {
            version: result.version,
            cluster_name: result.cluster_name,
          },
        });

        if (mode === "add") {
          // Advance to step 2. Prefill server name from cluster name / host.
          const currentName = form.getValues("name");
          if (!currentName) {
            form.setValue("name", result.cluster_name || formData.host);
          }
          setStep(2);
        }
      } else {
        setConnectionStatus({
          status: "error",
          message: result.message || t("connectionFailed"),
        });
      }
    } catch (error) {
      setConnectionStatus({
        status: "error",
        message:
          error instanceof Error ? error.message : t("connectionTestFailed"),
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const onSubmit = async (data: AddServerFormData) => {
    setIsLoading(true);

    try {
      if (!workspace?.id) {
        throw new Error(t("workspaceIdRequired"));
      }
      if (mode === "edit" && server) {
        await updateServerMutation.mutateAsync({
          workspaceId: workspace.id,
          id: server.id,
          name: data.name,
          host: data.host,
          port: data.port,
          amqpPort: data.amqpPort,
          username: data.username,
          password: data.password,
          vhost: data.vhost,
          useHttps: data.useHttps,
        });

        setIsOpen(false);
        onServerUpdated?.();
      } else {
        const result = await createServerMutation.mutateAsync({
          workspaceId: workspace.id,
          name: data.name,
          host: data.host,
          port: data.port,
          amqpPort: data.amqpPort,
          username: data.username,
          password: data.password,
          vhost: data.vhost,
          useHttps: data.useHttps,
        });

        setSelectedServerId(result.server.id);
        await refetchPlan();
        setIsOpen(false);
        onServerAdded?.();
      }

      form.reset();
      setConnectionStatus({ status: "idle" });
      setStep(1);
    } catch (error) {
      setConnectionStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : mode === "edit"
              ? t("failedToUpdateServer")
              : t("failedToCreateServer"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    form.reset();
    setConnectionStatus({ status: "idle" });
    setStep(1);
  };

  const handleUpgrade = () => {
    logger.info("Upgrade plan requested");
  };

  const isEdit = mode === "edit";
  const showStepIndicator = !isEdit;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          resetForm();
        }
      }}
    >
      {controlledIsOpen === undefined && (
        <DialogTrigger asChild>
          {trigger || <Button className="btn-primary">{t("addServer")}</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl lg:max-w-2xl max-h-[90vh] flex flex-col bg-card">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <>
                <Edit className="h-5 w-5" />
                {t("editRabbitMQServer")}
              </>
            ) : (
              <>
                <Server className="h-5 w-5" />
                {t("addRabbitMQServer")}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {showStepIndicator
              ? t("stepIndicator", { current: step, total: 2 })
              : t("editServerFormDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {isEdit && (
                <>
                  <ServerDetails form={form} alwaysExpanded />
                  <ConnectionStatusDisplay
                    connectionStatus={connectionStatus}
                    onUpgrade={handleUpgrade}
                  />
                </>
              )}

              {!isEdit && step === 1 && (
                <>
                  <ServerUrlInput form={form} />
                  <TunnelHelper form={form} />
                  <ServerDetails form={form} hideNameField hideVhostField />
                  <ConnectionStatusDisplay
                    connectionStatus={connectionStatus}
                    onUpgrade={handleUpgrade}
                  />
                  <PlanVersionSupport />
                </>
              )}

              {!isEdit && step === 2 && (
                <div className="space-y-6">
                  <ConfirmConnectionCard
                    version={connectionStatus.details?.version}
                    clusterName={connectionStatus.details?.cluster_name}
                    host={form.getValues("host")}
                    onUpgrade={handleUpgrade}
                  />

                  <div className="space-y-4">
                    <p className="text-sm font-medium text-foreground">
                      {t("nameYourServer")}
                    </p>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("serverName")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("serverNamePlaceholder")}
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("serverNameHint")}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vhost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("virtualHost")}</FormLabel>
                          <FormControl>
                            <Input placeholder="/" {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("virtualHostHint")}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </form>
          </Form>
        </div>

        <DialogFooter className="flex gap-2 shrink-0 pt-6 border-t border-border">
          {!isEdit && step === 2 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(1)}
              disabled={isLoading}
              className="mr-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("back")}
            </Button>
          )}

          {(isEdit || step === 1) && (
            <TestConnectionButton
              onTestConnection={testConnection}
              isTestingConnection={isTestingConnection}
              isLoading={isLoading}
            />
          )}

          {(isEdit || step === 2) && (
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isLoading || isTestingConnection}
              className="btn-primary"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEdit ? t("updateServer") : t("addServer")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
