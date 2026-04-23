import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { UserRole } from "@/lib/api";
import { logger } from "@/lib/logger";

import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageError } from "@/components/PageError";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { DeletePolicyDialog } from "@/components/PoliciesList/DeletePolicyDialog";
import { PoliciesTable } from "@/components/PoliciesList/PoliciesTable";
import { PolicyForm } from "@/components/PoliciesList/PolicyForm";
import type { PolicyListItem } from "@/components/PoliciesList/types";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TitleWithCount } from "@/components/ui/TitleWithCount";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useDeletePolicy, usePolicies } from "@/hooks/queries/useRabbitMQ";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

const Policies = () => {
  const { t } = useTranslation("policies");
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { selectedServerId, hasServers } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const { workspace } = useWorkspace();

  const [policyToDelete, setPolicyToDelete] = useState<PolicyListItem | null>(
    null
  );
  const [policyToEdit, setPolicyToEdit] = useState<PolicyListItem | null>(null);

  const {
    data: policiesData,
    isLoading,
    error,
  } = usePolicies(selectedServerId, selectedVHost);

  const deleteMutation = useDeletePolicy();

  const handleDelete = async () => {
    if (!policyToDelete || !selectedServerId || !workspace?.id) return;

    const { name, vhost } = policyToDelete;

    try {
      await deleteMutation.mutateAsync({
        serverId: selectedServerId,
        workspaceId: workspace.id,
        vhost: encodeURIComponent(vhost),
        policyName: name,
      });

      toast(t("common:success"), {
        description: t("deleteSuccess", { policyName: name }),
      });
      setPolicyToDelete(null);
    } catch (err) {
      logger.error("Failed to delete policy:", err);
      toast.error(t("common:error"), {
        description: err instanceof Error ? err.message : t("deleteError"),
      });
    }
  };

  if (!hasServers) {
    return (
      <PageShell bare>
        <NoServerConfigured
          title={t("pageTitle")}
          subtitle={t("pageSubtitle")}
          description={t("noServerDescription")}
        />
      </PageShell>
    );
  }

  if (!selectedServerId) {
    return (
      <PageShell>
        <NoServerSelectedCard
          title={t("pageTitle")}
          subtitle={t("pageSubtitle")}
          heading={t("noServerSelected")}
          description={t("selectServerPrompt")}
        />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="title-page">{t("pageTitle")}</h1>
        </div>
        <PageError message={t("common:serverConnectionError")} />
      </PageShell>
    );
  }

  const policies = (policiesData?.policies ?? []) as PolicyListItem[];

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <SidebarTrigger />
          <div className="min-w-0">
            <TitleWithCount count={policies.length}>
              {t("pageTitle")}
            </TitleWithCount>
          </div>
        </div>
        {isAdmin && selectedServerId && (
          <PolicyForm
            serverId={selectedServerId}
            trigger={<Button className="btn-primary">{t("addPolicy")}</Button>}
          />
        )}
      </div>

      <PoliciesTable
        policies={policies}
        isLoading={isLoading}
        onEdit={isAdmin ? (p) => setPolicyToEdit(p) : undefined}
        onDelete={isAdmin ? (p) => setPolicyToDelete(p) : undefined}
        isDeleting={deleteMutation.isPending}
      />

      {/* Edit dialog */}
      {policyToEdit && selectedServerId && (
        <PolicyForm
          serverId={selectedServerId}
          initialValues={policyToEdit}
          open={policyToEdit !== null}
          onOpenChange={(open) => {
            if (!open) setPolicyToEdit(null);
          }}
          onSuccess={() => setPolicyToEdit(null)}
          trigger={null}
        />
      )}

      <DeletePolicyDialog
        open={policyToDelete !== null}
        policyName={policyToDelete?.name ?? ""}
        isDeleting={deleteMutation.isPending}
        onCancel={() => setPolicyToDelete(null)}
        onConfirm={handleDelete}
      />
    </PageShell>
  );
};

export default Policies;
