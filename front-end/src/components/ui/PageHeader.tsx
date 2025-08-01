import { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  showPlanBadge?: boolean;
  showSidebarTrigger?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  showPlanBadge = true,
  showSidebarTrigger = true,
}: PageHeaderProps) {
  const { workspacePlan } = useWorkspace();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {showSidebarTrigger && <SidebarTrigger />}
        <div>
          <h1 className="title-page">
            {title}
          </h1>
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showPlanBadge && <PlanBadge workspacePlan={workspacePlan} />}
        {actions}
      </div>
    </div>
  );
}
