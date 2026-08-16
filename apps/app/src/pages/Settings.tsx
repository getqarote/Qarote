import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";

import { PageShell } from "@/components/PageShell";
import { DemoSectionGuard } from "@/components/settings/DemoSectionGuard";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

const SectionLoader = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

// intent — Settings — account, workspace, organization, and billing. Org
// (billing) and workspace (operations) are peers, not nested. The grouped
// sub-nav mirrors that peering; each section owns its own h2.
const Settings = () => {
  const { t } = useTranslation("settings");

  return (
    <PageShell>
      {/* Intent note (prototype `.intent-note`) */}
      <div className="flex items-start gap-4">
        <SidebarTrigger className="md:hidden" />
        <p className="border-l-2 border-border pl-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
          <span className="text-primary">// intent — </span>
          {t("intent")}
        </p>
      </div>

      {/* 2-col: sticky grouped sub-nav · active section */}
      <div className="mt-6 flex flex-col gap-8 md:flex-row">
        <SettingsSidebar />
        <div className="min-w-0 flex-1">
          <Suspense fallback={<SectionLoader />}>
            <DemoSectionGuard>
              <Outlet />
            </DemoSectionGuard>
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
};

export default Settings;
