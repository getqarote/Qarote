import { ReactNode } from "react";

import { AppHeader } from "./AppHeader";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* App Header with workspace selector */}
      <AppHeader />

      {/* Main content */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
