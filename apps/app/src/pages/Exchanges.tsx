import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { UserRole } from "@/lib/api";
import { logger } from "@/lib/logger";

import { AddExchangeButton } from "@/components/AddExchangeButton";
import { DeleteExchangeDialog } from "@/components/ExchangesList/DeleteExchangeDialog";
import { ExchangesList } from "@/components/ExchangesList/ExchangesList";
import { ExchangesOverviewCards } from "@/components/ExchangesList/ExchangesOverviewCards";
import type { ExchangeTypeFilterValue } from "@/components/ExchangesList/ExchangeTypeFilter";
import { LoadingSkeleton } from "@/components/ExchangesList/LoadingSkeleton";
import type { ExchangeListItem } from "@/components/ExchangesList/types";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageErrorOrGate } from "@/components/PageErrorOrGate";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TitleWithCount } from "@/components/ui/TitleWithCount";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useDeleteExchange, useExchanges } from "@/hooks/queries/useRabbitMQ";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { ApiErrorWithCode } from "@/types/apiErrors";

const Exchanges = () => {
  const { t } = useTranslation("exchanges");
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { selectedServerId, hasServers } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const [selectedExchangeType, setSelectedExchangeType] =
    useState<ExchangeTypeFilterValue>("all");
  const [exchangeToDelete, setExchangeToDelete] =
    useState<ExchangeListItem | null>(null);

  const {
    data: exchangesData,
    isLoading: exchangesLoading,
    error: exchangesError,
  } = useExchanges(selectedServerId, selectedVHost);

  const deleteExchangeMutation = useDeleteExchange();
  const { workspace } = useWorkspace();

  const handleDeleteExchange = async (force: boolean) => {
    if (!exchangeToDelete || !selectedServerId || !workspace?.id) return;

    const exchangeName = exchangeToDelete.name;

    try {
      await deleteExchangeMutation.mutateAsync({
        serverId: selectedServerId,
        workspaceId: workspace.id,
        exchangeName,
        ifUnused: force ? undefined : true,
        // Use the exchange's own vhost, not `selectedVHost`. When the
        // vhost filter is unset the list shows exchanges from multiple
        // vhosts, and the previous code defaulted to `/` which deleted
        // the wrong exchange entirely when the user acted on one from
        // a non-default vhost.
        vhost: encodeURIComponent(exchangeToDelete.vhost || "/"),
      });

      toast(t("common:success"), {
        description: t("deleteSuccess", { exchangeName }),
      });
      setExchangeToDelete(null);
    } catch (error) {
      logger.error("Failed to delete exchange:", error);

      // Surface RabbitMQ's "in use" errors with the more actionable
      // toast copy — the operator needs to see that the exchange has
      // bindings and can be force-deleted.
      let errorMessage = t("deleteError");
      let errorCode: string | null = null;

      if (error instanceof ApiErrorWithCode) {
        errorMessage = error.message;
        errorCode = error.code;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      const isInUse =
        errorCode === "EXCHANGE_IN_USE" ||
        errorMessage.includes("bindings") ||
        errorMessage.includes("being used");

      toast.error(isInUse ? t("cannotDeleteExchange") : t("common:error"), {
        description: errorMessage,
      });
    }
  };

  // Guard: zero servers configured — onboarding state owns its own
  // content container, so render it bare.
  if (!hasServers) {
    return (
      <PageShell bare>
        <NoServerConfigured
          title={t("noServerTitle")}
          subtitle={t("pageSubtitle")}
          description={t("noServerDescription")}
        />
      </PageShell>
    );
  }

  // Guard: servers exist but none selected.
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

  if (exchangesError) {
    return (
      <PageShell>
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="title-page">{t("pageTitle")}</h1>
          </div>
        </div>
        <PageErrorOrGate
          error={exchangesError}
          fallbackMessage={t("common:serverConnectionError")}
        />
      </PageShell>
    );
  }

  if (exchangesLoading) {
    return (
      <PageShell>
        <LoadingSkeleton />
      </PageShell>
    );
  }

  const allExchanges = (exchangesData?.exchanges ?? []) as ExchangeListItem[];
  const filteredExchanges =
    selectedExchangeType === "all"
      ? allExchanges
      : allExchanges.filter((e) => e.type === selectedExchangeType);

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <SidebarTrigger />
          <div className="min-w-0">
            <TitleWithCount count={filteredExchanges.length}>
              {t("pageTitle")}
            </TitleWithCount>
          </div>
        </div>
        {isAdmin && <AddExchangeButton serverId={selectedServerId} />}
      </div>

      <ExchangesOverviewCards
        totalExchanges={exchangesData?.totalExchanges}
        totalBindings={exchangesData?.totalBindings}
        exchangeTypes={exchangesData?.exchangeTypes}
        isLoading={exchangesLoading}
      />

      <ExchangesList
        exchanges={filteredExchanges}
        isLoading={exchangesLoading}
        typeFilter={selectedExchangeType}
        onTypeFilterChange={setSelectedExchangeType}
        onDelete={isAdmin ? (e) => setExchangeToDelete(e) : undefined}
        isDeleting={deleteExchangeMutation.isPending}
      />

      <DeleteExchangeDialog
        open={exchangeToDelete !== null}
        exchangeName={exchangeToDelete?.name ?? ""}
        isDeleting={deleteExchangeMutation.isPending}
        onCancel={() => setExchangeToDelete(null)}
        onConfirm={handleDeleteExchange}
      />
    </PageShell>
  );
};

export default Exchanges;
