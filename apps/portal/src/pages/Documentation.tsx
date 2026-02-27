import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Search, X } from "lucide-react";

import { InstallationGuideSection } from "@/components/documentation/InstallationGuideSection";
import { BackToTop } from "@/components/ui/back-to-top";
import { Input } from "@/components/ui/input";
import { TableOfContents } from "@/components/ui/table-of-contents";

import { TOC_ITEMS } from "@/constants/documentation.constants";

const Documentation = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDeployment, setActiveDeployment] = useState("binary");
  const { t } = useTranslation("portal");

  // Filter sections based on search query
  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const showInstallation = matchesSearch(
    "installation guide setup deploy prerequisites quick start updating troubleshooting security support dokku"
  );

  // Filter TOC items based on active deployment
  const filteredTocItems = useMemo(
    () =>
      TOC_ITEMS.filter((item) => {
        if (
          item.id === "docker-compose" &&
          activeDeployment !== "docker-compose"
        )
          return false;
        if (item.id === "environment-config" && activeDeployment === "binary")
          return false;
        return true;
      }),
    [activeDeployment]
  );

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="mb-6 max-w-5xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("documentation.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Layout with Sidebar */}
      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6 max-w-4xl">
          <div>
            <h1 className="text-3xl font-bold">{t("documentation.title")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("documentation.description")}
            </p>
          </div>

          {/* Installation Guide - primary content */}
          {showInstallation && (
            <InstallationGuideSection
              activeDeployment={activeDeployment}
              onDeploymentChange={setActiveDeployment}
            />
          )}
        </div>

        {/* Table of Contents Sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <TableOfContents items={filteredTocItems} />
        </aside>
      </div>

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
};

export default Documentation;
