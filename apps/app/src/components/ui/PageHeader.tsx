import { ReactNode } from "react";

import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
  /**
   * Page title. Accepts a string for simple titles or a ReactNode for
   * titles that include additional elements (like row counts).
   */
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  showSidebarTrigger?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  showSidebarTrigger = true,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {showSidebarTrigger && <SidebarTrigger />}
        <div>
          <h1 className="title-page">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">{actions}</div>
    </div>
  );
}
