import { useTranslation } from "react-i18next";

import { ConnectionsList } from "@/components/ConnectionsList/ConnectionsList";
import { ConnectionsOverviewCards } from "@/components/ConnectionsList/ConnectionsOverviewCards";
import { LoadingSkeleton } from "@/components/ConnectionsList/LoadingSkeleton";
import type { ConnectionListItem } from "@/components/ConnectionsList/types";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageError } from "@/components/PageError";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TitleWithCount } from "@/components/ui/TitleWithCount";

import { useServerContext } from "@/contexts/ServerContext";

import { useChannels, useConnections } from "@/hooks/queries/useRabbitMQ";

const Connections = () => {
  const { t } = useTranslation("connections");
  const { selectedServerId, hasServers } = useServerContext();

  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    error: connectionsError,
  } = useConnections(selectedServerId);

  const { data: channelsData, isLoading: channelsLoading } =
    useChannels(selectedServerId);

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

  if (connectionsError) {
    return (
      <PageShell>
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="title-page">{t("pageTitle")}</h1>
          </div>
        </div>
        <PageError message={t("common:serverConnectionError")} />
      </PageShell>
    );
  }

  if (connectionsLoading) {
    return (
      <PageShell>
        <LoadingSkeleton />
      </PageShell>
    );
  }

  const connections = (connectionsData?.connections ??
    []) as ConnectionListItem[];

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <SidebarTrigger />
          <div className="min-w-0">
            <TitleWithCount count={connections.length}>
              {t("pageTitle")}
            </TitleWithCount>
          </div>
        </div>
      </div>

      <ConnectionsOverviewCards
        totalConnections={connectionsData?.totalConnections}
        totalChannels={channelsData?.totalChannels}
        isLoadingConnections={connectionsLoading}
        isLoadingChannels={channelsLoading}
      />

      <ConnectionsList
        connections={connections}
        isLoading={connectionsLoading}
      />
    </PageShell>
  );
};

export default Connections;
