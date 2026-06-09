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
import { PixelActivity } from "@/components/ui/pixel-activity";
import { PixelChart } from "@/components/ui/pixel-chart";
import { PixelDatabase } from "@/components/ui/pixel-database";
import { PixelFlag } from "@/components/ui/pixel-flag";
import { PixelHelp } from "@/components/ui/pixel-help";
import { PixelKey } from "@/components/ui/pixel-key";
import { PixelLayers } from "@/components/ui/pixel-layers";
import { PixelMessage } from "@/components/ui/pixel-message";
import { PixelNetwork } from "@/components/ui/pixel-network";
import { PixelSettings } from "@/components/ui/pixel-settings";
import { PixelUser } from "@/components/ui/pixel-user";
import { PixelZap } from "@/components/ui/pixel-zap";

import { useCommandPalette } from "@/contexts/CommandPaletteContext";

import { useIsWorkspaceAdmin } from "@/hooks/queries/useWorkspaceRole";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

type PaletteEntry = {
  /** i18n key under the `command` namespace. */
  labelKey: string;
  icon: IconComponent;
  to: string;
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
  { labelKey: "goTo.cockpit", icon: PixelChart, to: "/", keywords: ["home"] },
  { labelKey: "goTo.notifications", icon: PixelFlag, to: "/alerts" },
  { labelKey: "goTo.topology", icon: PixelNetwork, to: "/topology" },
  { labelKey: "goTo.settings", icon: PixelSettings, to: "/settings" },
  { labelKey: "goTo.help", icon: PixelHelp, to: "/help" },
];

const OBJECTS: PaletteEntry[] = [
  {
    labelKey: "objects.queues",
    icon: PixelMessage,
    to: "/topology",
    keywords: ["queue"],
  },
  {
    labelKey: "objects.exchanges",
    icon: PixelActivity,
    to: "/topology",
    keywords: ["exchange"],
  },
  { labelKey: "objects.users", icon: PixelUser, to: "/users", adminOnly: true },
  {
    labelKey: "objects.policies",
    icon: PixelKey,
    to: "/policies",
    adminOnly: true,
  },
  {
    labelKey: "objects.virtualHosts",
    icon: PixelLayers,
    to: "/vhosts",
    adminOnly: true,
  },
  {
    labelKey: "objects.definitions",
    icon: PixelDatabase,
    to: "/definitions",
    adminOnly: true,
  },
];

const ACTIONS: PaletteEntry[] = [
  {
    labelKey: "actions.configureAiExplain",
    icon: PixelZap,
    to: "/settings/llm",
    keywords: ["llm", "ai", "explain", "anthropic", "openai", "ollama"],
  },
];

export function CommandPalette() {
  const { t } = useTranslation("command");
  const { isOpen, setOpen, close } = useCommandPalette();
  const navigate = useNavigate();
  const isAdmin = useIsWorkspaceAdmin() === true;

  const groups = useMemo(() => {
    const visible = (entries: PaletteEntry[]) =>
      entries.filter((e) => !e.adminOnly || isAdmin);
    return [
      { headingKey: "groups.goTo", entries: visible(GO_TO) },
      { headingKey: "groups.objects", entries: visible(OBJECTS) },
      { headingKey: "groups.actions", entries: visible(ACTIONS) },
    ].filter((g) => g.entries.length > 0);
  }, [isAdmin]);

  const handleSelect = (to: string) => {
    close();
    navigate(to);
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
                  onSelect={() => handleSelect(entry.to)}
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
    </CommandDialog>
  );
}
