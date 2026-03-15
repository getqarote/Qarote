import { ReactNode } from "react";

import { AppFooter } from "./AppFooter";
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

      {/* Footer - positioned to account for sidebar */}
      <AppFooter className="ml-0 md:ml-64 transition-[margin] duration-200 ease-linear" />
    </div>
  );
}
