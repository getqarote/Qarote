import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Search } from "lucide-react";

import { ConnectionsList } from "@/components/ConnectionsList/ConnectionsList";
import { ConnectionsOverviewCards } from "@/components/ConnectionsList/ConnectionsOverviewCards";
import { LoadingSkeleton } from "@/components/ConnectionsList/LoadingSkeleton";
import type { ConnectionListItem } from "@/components/ConnectionsList/types";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageErrorOrGate } from "@/components/PageErrorOrGate";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { PixelX } from "@/components/ui/pixel-x";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TitleWithCount } from "@/components/ui/TitleWithCount";

import { useServerContext } from "@/contexts/ServerContext";

import { useChannels, useConnections } from "@/hooks/queries/useRabbitMQ";

const Connections = () => {
  const { t } = useTranslation("connections");
  const { selectedServerId, hasServers } = useServerContext();
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    error: connectionsError,
  } = useConnections(selectedServerId);

  const { data: channelsData, isLoading: channelsLoading } =
    useChannels(selectedServerId);

  const connections = useMemo(
    () =>
      (connectionsData?.connections ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any): ConnectionListItem => ({
          name: c.name,
          state: c.state,
          user: c.user,
          vhost: c.vhost,
          node: c.node,
          protocol: c.protocol,
          channelCount: c.channels ?? c.channelCount ?? 0, // RabbitMQ API returns `channels`, not `channelCount`
          recv_oct: c.recv_oct,
          send_oct: c.send_oct,
          recv_cnt: c.recv_cnt,
          send_cnt: c.send_cnt,
          channelDetails: c.channelDetails,
        })
      ),
    [connectionsData?.connections]
  );

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return connections;
    const q = searchTerm.toLowerCase();
    return connections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.user.toLowerCase().includes(q) ||
        c.vhost.toLowerCase().includes(q) ||
        c.node.toLowerCase().includes(q)
    );
  }, [connections, searchTerm]);

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
        <PageErrorOrGate
          error={connectionsError}
          fallbackMessage={t("common:serverConnectionError")}
        />
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
        connections={connections}
        isLoadingConnections={connectionsLoading}
        isLoadingChannels={channelsLoading}
      />

      {connections.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 h-9"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <PixelX className="h-4 w-auto shrink-0" />
            </button>
          )}
        </div>
      )}

      <ConnectionsList connections={filtered} isLoading={connectionsLoading} />
    </PageShell>
  );
};

export default Connections;
