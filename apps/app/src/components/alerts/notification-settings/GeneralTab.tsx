import { useTranslation } from "react-i18next";

import { Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { SeverityCheckboxGroup } from "./SeverityCheckboxGroup";
import type { GeneralTabProps } from "./types";

export function GeneralTab({
  servers,
  setNotificationServerIds,
  selectedServers,
  filteredServers,
  selectedCount,
  serverSearchOpen,
  setServerSearchOpen,
  serverSearchTerm,
  setServerSearchTerm,
  notificationSeverities,
  setNotificationSeverities,
  isPending,
}: GeneralTabProps) {
  const { t } = useTranslation("alerts");
  return (
    <div className="space-y-6">
      {/* Server Selection */}
      {servers.length > 0 && (
        <div className="space-y-3">
          <div>
            <Label className="text-base">{t("modal.servers")}</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {t("modal.serversDescription")}
            </p>
          </div>

          {/* Selected Servers as Tags */}
          {selectedServers.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/50">
              {selectedServers.map((server) => (
                <Badge
                  key={server.id}
                  variant="secondary"
                  className="flex items-center gap-1.5 pr-1"
                >
                  <span className="text-xs">
                    {server.name} ({server.host}:{server.port})
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${server.name || server.id}`}
                    onClick={() => {
                      setNotificationServerIds((prev) => {
                        const newIds = (prev || []).filter(
                          (id) => id !== server.id
                        );
                        return newIds.length > 0 ? newIds : null;
                      });
                    }}
                    disabled={isPending}
                    className="ml-1 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Search Input with Popover */}
          <div className="flex items-center gap-2">
            <Popover open={serverSearchOpen} onOpenChange={setServerSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-controls="server-search-list"
                  aria-expanded={serverSearchOpen}
                  className="w-full justify-between"
                  disabled={isPending}
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {selectedCount > 0
                        ? t("modal.serversSelected", {
                            count: selectedCount,
                          })
                        : t("modal.searchAndSelect")}
                    </span>
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder={t("modal.searchPlaceholder")}
                    value={serverSearchTerm}
                    onValueChange={setServerSearchTerm}
                  />
                  <CommandList id="server-search-list">
                    <CommandEmpty>
                      {serverSearchTerm
                        ? t("modal.noServersFound", {
                            term: serverSearchTerm,
                          })
                        : t("modal.noServersAvailable")}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredServers.map((server) => (
                        <CommandItem
                          key={server.id}
                          value={`${server.name} ${server.host} ${server.port}`}
                          onSelect={() => {
                            setNotificationServerIds((prev) => {
                              const ids = new Set(prev || []);
                              ids.add(server.id);
                              return Array.from(ids);
                            });
                            setServerSearchTerm("");
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{server.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {server.host}:{server.port}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setNotificationServerIds(null);
                  setServerSearchOpen(false);
                }}
                disabled={isPending}
              >
                {t("modal.clearAll")}
              </Button>
            )}
          </div>

          {selectedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("modal.serverSelectionCount", {
                selected: selectedCount,
                total: servers.length,
                count: servers.length,
              })}
            </p>
          )}
        </div>
      )}

      {/* Alert Severity Selection */}
      <div className="space-y-3">
        <Label className="text-base">{t("modal.alertSeverities")}</Label>
        <p className="text-sm text-muted-foreground mb-3">
          {t("modal.alertSeveritiesDescription")}
        </p>
        <SeverityCheckboxGroup
          severities={notificationSeverities}
          onChange={setNotificationSeverities}
          disabled={isPending}
          idPrefix="severity"
        />
        {notificationSeverities.length === 0 && (
          <p className="text-xs text-destructive mt-2">
            {t("modal.selectAtLeastOneSeverity")}
          </p>
        )}
      </div>
    </div>
  );
}
