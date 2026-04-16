import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Activity,
  GitBranch,
  Hash,
  Inbox,
  Radio,
  Search,
  Share2,
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PixelChevronRight } from "@/components/ui/pixel-chevron-right";

interface Exchange {
  name: string;
  type: string;
}

interface Queue {
  name: string;
  type: string;
  state: string;
}

interface TopologyFilterPanelProps {
  exchanges: Exchange[];
  queues: Queue[];
  hiddenExchanges: Set<string>;
  hiddenQueues: Set<string>;
  onToggleExchange: (name: string) => void;
  onToggleQueue: (name: string) => void;
  onToggleAllExchanges: (visible: boolean) => void;
  onToggleAllQueues: (visible: boolean) => void;
}

const exchangeTypeIcons: Record<string, typeof GitBranch> = {
  direct: GitBranch,
  fanout: Radio,
  topic: Share2,
  headers: Hash,
};

export function TopologyFilterPanel({
  exchanges,
  queues,
  hiddenExchanges,
  hiddenQueues,
  onToggleExchange,
  onToggleQueue,
  onToggleAllExchanges,
  onToggleAllQueues,
}: TopologyFilterPanelProps) {
  const { t } = useTranslation("topology");
  const [search, setSearch] = useState("");
  const [exchangesOpen, setExchangesOpen] = useState(true);
  const [queuesOpen, setQueuesOpen] = useState(true);

  const query = search.toLowerCase().trim();

  const filteredExchanges = useMemo(
    () =>
      query
        ? exchanges.filter((e) => e.name.toLowerCase().includes(query))
        : exchanges,
    [exchanges, query]
  );

  const filteredQueues = useMemo(
    () =>
      query
        ? queues.filter((q) => q.name.toLowerCase().includes(query))
        : queues,
    [queues, query]
  );

  const noExchangesHidden = exchanges.every(
    (e) => !hiddenExchanges.has(e.name)
  );
  const someExchangesHidden =
    !noExchangesHidden && exchanges.some((e) => !hiddenExchanges.has(e.name));
  const exchangesChecked = someExchangesHidden
    ? "indeterminate"
    : noExchangesHidden;

  const noQueuesHidden = queues.every((q) => !hiddenQueues.has(q.name));
  const someQueuesHidden =
    !noQueuesHidden && queues.some((q) => !hiddenQueues.has(q.name));
  const queuesChecked = someQueuesHidden ? "indeterminate" : noQueuesHidden;

  return (
    <div className="w-64 shrink-0 border-r border-border flex flex-col bg-card">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("filter.search")}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Exchanges section */}
        <div>
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
            <div
              className="flex items-center gap-2 flex-1"
              onClick={() => setExchangesOpen(!exchangesOpen)}
            >
              <PixelChevronRight
                className={`h-2.5 shrink-0 text-muted-foreground transition-transform ${
                  exchangesOpen ? "rotate-90" : ""
                }`}
              />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("filter.exchanges")}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                ({exchanges.length})
              </span>
            </div>
            <Checkbox
              checked={exchangesChecked}
              onCheckedChange={(checked) => {
                onToggleAllExchanges(!!checked);
              }}
              className="h-3.5 w-3.5"
            />
          </div>
          {exchangesOpen && (
            <div className="py-1">
              {filteredExchanges.map((exchange) => {
                const Icon = exchangeTypeIcons[exchange.type] || Activity;
                const visible = !hiddenExchanges.has(exchange.name);
                return (
                  <label
                    key={exchange.name}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer group"
                  >
                    <Checkbox
                      checked={visible}
                      onCheckedChange={() => onToggleExchange(exchange.name)}
                      className="h-3.5 w-3.5"
                    />
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span
                      className={`text-sm font-mono truncate ${
                        visible
                          ? "text-foreground"
                          : "text-muted-foreground line-through"
                      }`}
                      title={exchange.name}
                    >
                      {exchange.name}
                    </span>
                  </label>
                );
              })}
              {filteredExchanges.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  {t("filter.noMatch")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Queues section */}
        <div>
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
            <div
              className="flex items-center gap-2 flex-1"
              onClick={() => setQueuesOpen(!queuesOpen)}
            >
              <PixelChevronRight
                className={`h-2.5 shrink-0 text-muted-foreground transition-transform ${
                  queuesOpen ? "rotate-90" : ""
                }`}
              />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("filter.queues")}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                ({queues.length})
              </span>
            </div>
            <Checkbox
              checked={queuesChecked}
              onCheckedChange={(checked) => {
                onToggleAllQueues(!!checked);
              }}
              className="h-3.5 w-3.5"
            />
          </div>
          {queuesOpen && (
            <div className="py-1">
              {filteredQueues.map((queue) => {
                const visible = !hiddenQueues.has(queue.name);
                return (
                  <label
                    key={queue.name}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer group"
                  >
                    <Checkbox
                      checked={visible}
                      onCheckedChange={() => onToggleQueue(queue.name)}
                      className="h-3.5 w-3.5"
                    />
                    <Inbox className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span
                      className={`text-sm font-mono truncate ${
                        visible
                          ? "text-foreground"
                          : "text-muted-foreground line-through"
                      }`}
                      title={queue.name}
                    >
                      {queue.name}
                    </span>
                  </label>
                );
              })}
              {filteredQueues.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  {t("filter.noMatch")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
