import { ReactNode } from "react";

import { AppHeader } from "./AppHeader";
import { DemoBanner } from "./DemoBanner";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Demo mode banner */}
      <DemoBanner />

      {/* App Header with workspace selector */}
      <AppHeader />

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </div>
  );
}
