import { useTranslation } from "react-i18next";

import { commandKeyLabel } from "@/lib/shortcut";

import { IconSearch } from "@/components/ui/icons";

import { useCommandPalette } from "@/contexts/CommandPaletteContext";

import { ContextBreadcrumb } from "./ContextBreadcrumb";

/**
 * The app bar (prototype `.appbar`): sticky, blurred surface above the page.
 * Holds the Org › Workspace context path on the left and a command-palette
 * search affordance on the right. Offset by the fixed sidebar width on
 * desktop (md:ml-64) so it aligns with the scroll container.
 */
export function AppHeader() {
  const { t } = useTranslation("command");
  const { open } = useCommandPalette();

  return (
    <header className="sticky top-0 z-40 ml-0 min-h-[52px] border-b border-border bg-background/[0.78] backdrop-blur-[8px] backdrop-saturate-150 transition-[margin] duration-200 ease-linear md:ml-64">
      <div className="flex h-full items-center gap-2.5 py-[9px] pl-5 pr-4">
        {/* Left — Organization › Workspace context path */}
        <div className="flex min-w-0 items-center">
          <ContextBreadcrumb />
        </div>

        <span className="flex-1" />

        {/* Right — global command palette trigger */}
        <button
          type="button"
          onClick={open}
          aria-label={t("trigger")}
          title={`${t("trigger")} (${commandKeyLabel()})`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <IconSearch size={16} />
        </button>
      </div>
    </header>
  );
}
