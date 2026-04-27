import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import { UserRole } from "@/lib/api";
import { isCloudMode } from "@/lib/featureFlags";

import { Badge } from "@/components/ui/badge";
import { PixelBuilding } from "@/components/ui/pixel-building";
import { PixelCreditCard } from "@/components/ui/pixel-credit-card";
import { PixelEmail } from "@/components/ui/pixel-email";
import { PixelKey } from "@/components/ui/pixel-key";
import { PixelPalette } from "@/components/ui/pixel-palette";
import { PixelShield } from "@/components/ui/pixel-shield";
import { PixelUser } from "@/components/ui/pixel-user";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useIsMobile } from "@/hooks/ui/useMobile";
import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

interface NavItem {
  key: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  adminOnly?: boolean;
  selfHostedOnly?: boolean;
  cloudOnly?: boolean;
  enterpriseOnly?: boolean;
}

interface NavGroup {
  labelKey: string | null;
  adminOnly?: boolean;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    labelKey: "settings:groups.personal",
    items: [
      {
        key: "profile",
        path: "/settings/profile",
        icon: PixelUser,
        labelKey: "settings:nav.profile",
      },
      {
        key: "appearance",
        path: "/settings/appearance",
        icon: PixelPalette,
        labelKey: "settings:nav.appearance",
      },
    ],
  },
  {
    labelKey: "settings:groups.workspace",
    adminOnly: true,
    items: [
      {
        key: "workspace",
        path: "/settings/workspace",
        icon: PixelBuilding,
        labelKey: "settings:nav.workspaceSettings",
        adminOnly: true,
      },
      {
        key: "members",
        path: "/settings/members",
        icon: PixelUser,
        labelKey: "settings:nav.members",
        adminOnly: true,
      },
      {
        key: "digest",
        path: "/settings/digest",
        icon: PixelEmail,
        labelKey: "settings:nav.digest",
        adminOnly: true,
      },
    ],
  },
  {
    labelKey: "settings:groups.organization",
    adminOnly: true,
    items: [
      {
        key: "organization",
        path: "/settings/organization",
        icon: PixelBuilding,
        labelKey: "settings:nav.organization",
        adminOnly: true,
      },
      {
        key: "subscription",
        path: "/settings/subscription",
        icon: PixelCreditCard,
        labelKey: "settings:nav.subscription",
        adminOnly: true,
        cloudOnly: true,
      },
      {
        key: "sso",
        path: "/settings/sso",
        icon: PixelShield,
        labelKey: "settings:nav.sso",
        adminOnly: true,
        enterpriseOnly: true,
      },
      {
        key: "license",
        path: "/settings/license",
        icon: PixelKey,
        labelKey: "settings:nav.license",
        adminOnly: true,
        selfHostedOnly: true,
      },
      {
        key: "smtp",
        path: "/settings/smtp",
        icon: PixelEmail,
        labelKey: "settings:nav.smtp",
        adminOnly: true,
        selfHostedOnly: true,
      },
    ],
  },
  // Feedback section hidden for now — backend kept for future use
  // {
  //   labelKey: null,
  //   items: [
  //     {
  //       key: "feedback",
  //       path: "/settings/feedback",
  //       icon: MessageSquare,
  //       labelKey: "settings:nav.feedback",
  //       cloudOnly: true,
  //     },
  //   ],
  // },
];

export const SettingsSidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { userPlan } = useUser();
  const { data: orgData } = useCurrentOrganization();
  const orgRole = orgData?.role;
  const isOrgAdmin = orgRole === "OWNER" || orgRole === "ADMIN";
  const isGlobalAdmin = user?.role === UserRole.ADMIN;
  const isAdmin = isGlobalAdmin || isOrgAdmin;
  const isEnterprise = userPlan === UserPlan.ENTERPRISE;
  const cloudMode = isCloudMode();

  const filterItem = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.selfHostedOnly && cloudMode) return false;
    if (item.cloudOnly && !cloudMode) return false;
    return true;
  };

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(filterItem),
    }))
    .filter((group) => {
      if (group.adminOnly && !isAdmin) return false;
      return group.items.length > 0;
    });

  if (isMobile) {
    const allItems = visibleGroups.flatMap((g) => g.items);
    return (
      <nav className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
        {allItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.key}
              to={item.path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <item.icon className="h-3.5 w-auto shrink-0" />
              {t(item.labelKey)}
              {item.enterpriseOnly && !isEnterprise && (
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 font-medium ${
                    isActive
                      ? "border-white/40 text-white/90"
                      : "border-border text-muted-foreground dark:border-border dark:text-muted-foreground"
                  }`}
                >
                  {t("settings:nav.enterprise")}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="w-56 shrink-0">
      <div className="space-y-6">
        {visibleGroups.map((group, groupIdx) => (
          <div key={group.labelKey ?? `group-${groupIdx}`}>
            {group.labelKey && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                {t(group.labelKey)}
              </h3>
            )}
            {!group.labelKey && groupIdx > 0 && (
              <div className="border-t border-border mb-2" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + "/");
                return (
                  <li key={item.key}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-sidebar-accent text-primary font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-auto shrink-0" />
                      <span className="flex-1">{t(item.labelKey)}</span>
                      {item.enterpriseOnly && !isEnterprise && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-medium ${
                            isActive
                              ? "border-white/40 text-white/90"
                              : "border-border text-muted-foreground dark:border-border dark:text-muted-foreground"
                          }`}
                        >
                          {t("settings:nav.enterprise")}
                        </Badge>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
};
