import { useTranslation } from "react-i18next";

import { Search } from "lucide-react";

import { commandKeyLabel } from "@/lib/shortcut";

import { Button } from "@/components/ui/button";

import { useCommandPalette } from "@/contexts/CommandPaletteContext";

import { ContextBreadcrumb } from "./ContextBreadcrumb";

export function AppHeader() {
  const { t } = useTranslation("command");
  const { open } = useCommandPalette();

  return (
    <header className="h-14 border-b bg-background/80 backdrop-blur-xs sticky top-0 z-40 ml-0 md:ml-64 transition-[margin] duration-200 ease-linear">
      <div className="flex items-center justify-between h-full px-6 gap-4">
        {/* Left — Organization › Workspace context path */}
        <div className="flex items-center min-w-0">
          <ContextBreadcrumb />
        </div>

        {/* Right — global command palette trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={open}
            aria-label={t("trigger")}
            title={`${t("trigger")} (${commandKeyLabel()})`}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
