import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Lock } from "lucide-react";

import { getUpgradePath } from "@/lib/featureFlags";

import { AddServerForm } from "@/components/AddServerFormComponent";
import { Button } from "@/components/ui/button";

import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

export const AddServerButton = () => {
  const { t } = useTranslation("dashboard");
  const {
    userPlan,
    canAddServer,
    isLoading: userLoading,
    planData,
  } = useUser();
  const navigate = useNavigate();

  // Keep server usage since we still track servers
  const serverUsage = planData?.usage?.servers || {
    current: 0,
    limit: 1,
    percentage: 0,
    canAdd: false,
  };

  const getServerButtonConfig = () => {
    if (userLoading || canAddServer) return null;

    switch (userPlan) {
      case UserPlan.FREE:
        return {
          text: t("addServer"),
          badge: t("upgrade"),
          badgeColor: "bg-warning-muted",
          title: t("upgradeToAddServers"),
        };
      case UserPlan.DEVELOPER:
        return {
          text: t("addServer"),
          badge: `${serverUsage.current}/${serverUsage.limit || 2}`,
          badgeColor: "bg-info-muted",
          title: t("serverLimitReached"),
        };
      case UserPlan.ENTERPRISE:
        return {
          text: t("addServer"),
          badge: `${serverUsage.current}/${serverUsage.limit || 5}`,
          badgeColor: "bg-muted",
          title: t("serverLimitReached"),
        };
      default:
        return {
          text: t("addServer"),
          badge: t("upgrade"),
          badgeColor: "bg-warning-muted",
          title: t("upgradeToAddServers"),
        };
    }
  };

  const handleAddServerClick = () => {
    if (!canAddServer) {
      navigate(getUpgradePath());
    }
  };

  if (canAddServer) {
    return <AddServerForm />;
  }

  const buttonConfig = getServerButtonConfig();
  if (!buttonConfig) return null;

  return (
    <Button
      onClick={handleAddServerClick}
      variant="outline"
      className="flex items-center gap-2 rounded-none opacity-60 cursor-pointer hover:bg-muted"
      title={buttonConfig.title}
    >
      <Lock className="w-4 h-4" />
      {buttonConfig.text}
      <span
        className={`ml-1 px-1.5 py-0.5 ${buttonConfig.badgeColor} text-white text-[10px] rounded-full font-semibold`}
      >
        {buttonConfig.badge}
      </span>
    </Button>
  );
};
