import { ReactNode } from "react";

import { AppHeader } from "./AppHeader";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* App Header with workspace selector */}
      <AppHeader />

      {/* Main content */}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
