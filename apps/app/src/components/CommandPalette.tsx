import { type ComponentType, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  IconActivity,
  IconBell,
  IconDatabase,
  IconHelp,
  IconHome,
  IconKey,
  IconLayers,
  IconMessage,
  IconPlay,
  IconPlus,
  IconSettings,
  IconSparkle,
  IconTopo,
  IconUser,
} from "@/components/ui/icons";

import { useCommandPalette } from "@/contexts/CommandPaletteContext";
import { useServerContext } from "@/contexts/ServerContext";

import { useIsWorkspaceAdmin } from "@/hooks/queries/useWorkspaceRole";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

type PaletteEntry = {
  /** i18n key under the `command` namespace. */
  labelKey: string;
  icon: IconComponent;
  /** Plain navigation target. Omitted for entries that use `action` instead. */
  to?: string;
  /** Non-navigation action (needs runtime state, e.g. the selected server). */
  action?: "runScan";
  /** Hidden from non-admins (admin-only object views). */
  adminOnly?: boolean;
  /**
   * Extra search terms (raw, not translated) so users can find an entry by
   * a synonym that isn't its visible label — e.g. "llm" for AI Explain.
   */
  keywords?: string[];
};

/**
 * The dissolved "Browse" section lives here as the ⌘K escape hatch (W5 in
 * docs/plans/agent-first-cockpit.md). Queues/exchanges point at Topology —
 * their V2 home. The admin object views (users/policies/vhosts/definitions)
 * point at their existing routes, kept alive but off the 3-item nav, until
 * the admin-near-Settings surface lands in a later phase.
 */
const GO_TO: PaletteEntry[] = [
  { labelKey: "goTo.cockpit", icon: IconHome, to: "/", keywords: ["home"] },
  { labelKey: "goTo.notifications", icon: IconBell, to: "/alerts" },
  { labelKey: "goTo.topology", icon: IconTopo, to: "/topology" },
  { labelKey: "goTo.settings", icon: IconSettings, to: "/settings" },
  { labelKey: "goTo.help", icon: IconHelp, to: "/help" },
];

const OBJECTS: PaletteEntry[] = [
  {
    labelKey: "objects.queues",
    icon: IconMessage,
    to: "/topology",
    keywords: ["queue"],
  },
  {
    labelKey: "objects.exchanges",
    icon: IconActivity,
    to: "/topology",
    keywords: ["exchange"],
  },
  { labelKey: "objects.users", icon: IconUser, to: "/users", adminOnly: true },
  {
    labelKey: "objects.policies",
    icon: IconKey,
    to: "/policies",
    adminOnly: true,
  },
  {
    labelKey: "objects.virtualHosts",
    icon: IconLayers,
    to: "/vhosts",
    adminOnly: true,
  },
  {
    labelKey: "objects.definitions",
    icon: IconDatabase,
    to: "/definitions",
    adminOnly: true,
  },
];

const ACTIONS: PaletteEntry[] = [
  {
    labelKey: "actions.runConfigScan",
    icon: IconPlay,
    action: "runScan",
    keywords: ["scan", "config", "findings", "diagnose", "rescan"],
  },
  {
    labelKey: "actions.addServer",
    icon: IconPlus,
    to: "/?addServer=true",
    keywords: ["server", "broker", "connect", "new"],
  },
  {
    labelKey: "actions.mintAgentKey",
    icon: IconKey,
    to: "/settings/agent-access",
    keywords: ["agent", "key", "api", "mcp", "token", "mint"],
  },
  {
    labelKey: "actions.configureAiExplain",
    icon: IconSparkle,
    to: "/settings/llm",
    keywords: ["llm", "ai", "explain", "anthropic", "openai", "ollama"],
  },
];

export function CommandPalette() {
  const { t } = useTranslation("command");
  const { isOpen, setOpen, close } = useCommandPalette();
  const navigate = useNavigate();
  const isAdmin = useIsWorkspaceAdmin() === true;
  const { selectedServerId } = useServerContext();

  const groups = useMemo(() => {
    const visible = (entries: PaletteEntry[]) =>
      entries.filter((e) => !e.adminOnly || isAdmin);
    return [
      { headingKey: "groups.goTo", entries: visible(GO_TO) },
      { headingKey: "groups.objects", entries: visible(OBJECTS) },
      { headingKey: "groups.actions", entries: visible(ACTIONS) },
    ].filter((g) => g.entries.length > 0);
  }, [isAdmin]);

  const handleSelect = (entry: PaletteEntry) => {
    close();
    if (entry.action === "runScan") {
      // The scan reveal runs the point-in-time config scan for the active
      // server; it redirects home when no server is selected.
      navigate("/scan", { state: { serverId: selectedServerId } });
      return;
    }
    if (entry.to) navigate(entry.to);
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput placeholder={t("placeholder")} />
      <CommandList>
        <CommandEmpty>{t("empty")}</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.headingKey} heading={t(group.headingKey)}>
            {group.entries.map((entry) => {
              const Icon = entry.icon;
              const label = t(entry.labelKey);
              return (
                <CommandItem
                  key={entry.labelKey}
                  value={`${label} ${(entry.keywords ?? []).join(" ")}`}
                  onSelect={() => handleSelect(entry)}
                  className="gap-3"
                >
                  <Icon className="h-4 w-auto shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
            ↑
          </kbd>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
            ↓
          </kbd>
          {t("footer.navigate")}
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
            ↵
          </kbd>
          {t("footer.open")}
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
            esc
          </kbd>
          {t("footer.close")}
        </span>
      </div>
    </CommandDialog>
  );
}
