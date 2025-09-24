import React from "react";
import { WorkspaceSelector } from "./WorkspaceSelector";

export function AppHeader() {
  return (
    <header className="h-14 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40 ml-0 md:ml-64 transition-[margin] duration-200 ease-linear">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side - Workspace selector */}
        <div className="flex items-center gap-4">
          <WorkspaceSelector />
        </div>

        {/* Right side - Could add breadcrumbs, search, or other header items here */}
        <div className="flex items-center gap-4">
          {/* Future: Add breadcrumbs, global search, notifications, etc. */}
        </div>
      </div>
    </header>
  );
}
