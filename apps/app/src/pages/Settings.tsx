import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";

import { Settings as SettingsIcon } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import { useIsMobile } from "@/hooks/ui/useMobile";

const SectionLoader = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

const Settings = () => {
  const { t } = useTranslation("settings");
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <main className="flex-1 p-6">
            <div className="container mx-auto space-y-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <SettingsIcon className="h-8 w-8" />
                <h1 className="title-page">{t("pageTitle")}</h1>
              </div>

              {isMobile && <SettingsSidebar />}

              <div className="flex gap-8">
                {!isMobile && <SettingsSidebar />}
                <div className="flex-1 min-w-0">
                  <Suspense fallback={<SectionLoader />}>
                    <Outlet />
                  </Suspense>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
