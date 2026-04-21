import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Search } from "lucide-react";

import { ChannelsList } from "@/components/ChannelsList/ChannelsList";
import { ChannelsOverviewCards } from "@/components/ChannelsList/ChannelsOverviewCards";
import { LoadingSkeleton } from "@/components/ChannelsList/LoadingSkeleton";
import type { ChannelListItem } from "@/components/ChannelsList/types";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageError } from "@/components/PageError";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { PixelX } from "@/components/ui/pixel-x";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TitleWithCount } from "@/components/ui/TitleWithCount";

import { useServerContext } from "@/contexts/ServerContext";

import { useChannels } from "@/hooks/queries/useRabbitMQ";

type StateFilter = "running" | "idle" | "blocked" | "flow" | null;

const STATE_FILTERS: { value: StateFilter; labelKey: string }[] = [
  { value: null, labelKey: "stateAll" },
  { value: "running", labelKey: "stateRunning" },
  { value: "idle", labelKey: "stateIdle" },
  { value: "blocked", labelKey: "stateBlocked" },
  { value: "flow", labelKey: "stateFlow" },
];

const Channels = () => {
  const { t } = useTranslation("channels");
  const { selectedServerId, hasServers } = useServerContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStateFilter, setActiveStateFilter] = useState<StateFilter>(null);

  const {
    data: channelsData,
    isLoading,
    error,
  } = useChannels(selectedServerId);

  const channels = useMemo(
    () => (channelsData?.channels ?? []) as ChannelListItem[],
    [channelsData?.channels]
  );

  const filtered = useMemo(() => {
    let result = channels;
    if (activeStateFilter) {
      result = result.filter(
        (c) => c.state?.toLowerCase() === activeStateFilter
      );
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.connection_details.name.toLowerCase().includes(q) ||
          c.user.toLowerCase().includes(q) ||
          c.vhost.toLowerCase().includes(q) ||
          c.node.toLowerCase().includes(q)
      );
    }
    return result;
  }, [channels, activeStateFilter, searchTerm]);

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
          <div>
            <h1 className="title-page">{t("pageTitle")}</h1>
          </div>
        </div>
        <PageError message={t("common:serverConnectionError")} />
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <LoadingSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center gap-4 min-w-0">
        <SidebarTrigger />
        <div className="min-w-0">
          <TitleWithCount count={channels.length}>
            {t("pageTitle")}
          </TitleWithCount>
        </div>
      </div>

      <ChannelsOverviewCards
        totalChannels={channelsData?.totalChannels}
        channels={channels}
        isLoading={isLoading}
        activeFilter={activeStateFilter}
        onStateFilter={setActiveStateFilter}
      />

      {/* State filter pills */}
      {channels.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATE_FILTERS.map(({ value, labelKey }) => {
            const isActive = activeStateFilter === value;
            return (
              <button
                key={String(value)}
                type="button"
                onClick={() => setActiveStateFilter(value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                }`}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      {channels.length > 0 && (
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
              aria-label={t("clearSearch")}
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <PixelX className="h-4 w-auto shrink-0" />
            </button>
          )}
        </div>
      )}

      <ChannelsList channels={filtered} />
    </PageShell>
  );
};

export default Channels;
