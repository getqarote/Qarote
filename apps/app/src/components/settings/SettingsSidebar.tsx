import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";

import { isCloudMode } from "@/lib/featureFlags";

import {
  IconCard,
  IconDoc,
  IconGrid,
  IconKey,
  IconLock,
  IconMail,
  IconServer,
  IconSparkle,
  IconSun,
  IconUser,
} from "@/components/ui/icons";

import { useCurrentOrganization } from "@/hooks/queries/useOrganization";

interface NavItem {
  key: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  adminOnly?: boolean;
  selfHostedOnly?: boolean;
}

interface NavGroup {
  labelKey: string;
  adminOnly?: boolean;
  items: NavItem[];
}

/**
 * Settings sub-nav (prototype `.set__nav`). Four peer groups — Account,
 * Workspace, Organization, Billing — reflecting that Org (billing + team) and
 * Workspace (operations) are PEERS, not nested. Mode-aware: Email (SMTP) shows
 * self-hosted only; Billing is a single item whose label/route flips between
 * Subscription (cloud) and License (self-hosted). Enterprise-gated items
 * (Roles, SSO, Audit) stay visible and lock inside the section — never hidden.
 */
function buildGroups(cloud: boolean): NavGroup[] {
  return [
    {
      labelKey: "settings:groups.account",
      items: [
        {
          key: "profile",
          path: "/settings/profile",
          icon: IconUser,
          labelKey: "settings:nav.profile",
        },
        {
          key: "appearance",
          path: "/settings/appearance",
          icon: IconSun,
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
          icon: IconGrid,
          labelKey: "settings:nav.workspace",
          adminOnly: true,
        },
        {
          key: "llm",
          path: "/settings/llm",
          icon: IconSparkle,
          labelKey: "settings:nav.aiExplain",
          adminOnly: true,
        },
        {
          key: "agent-access",
          path: "/settings/agent-access",
          icon: IconKey,
          labelKey: "settings:nav.agentKeys",
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
          icon: IconServer,
          labelKey: "settings:nav.organization",
          adminOnly: true,
        },
        {
          key: "members",
          path: "/settings/members",
          icon: IconUser,
          labelKey: "settings:nav.members",
          adminOnly: true,
        },
        {
          key: "roles",
          path: "/settings/roles",
          icon: IconLock,
          labelKey: "settings:nav.roles",
          adminOnly: true,
        },
        {
          key: "sso",
          path: "/settings/sso",
          icon: IconKey,
          labelKey: "settings:nav.sso",
          adminOnly: true,
        },
        // Email (SMTP) is self-hosted only — cloud uses a managed provider.
        {
          key: "smtp",
          path: "/settings/smtp",
          icon: IconMail,
          labelKey: "settings:nav.smtp",
          adminOnly: true,
          selfHostedOnly: true,
        },
        {
          key: "audit",
          path: "/settings/audit",
          icon: IconDoc,
          labelKey: "settings:nav.audit",
          adminOnly: true,
        },
      ],
    },
    {
      labelKey: "settings:groups.billing",
      adminOnly: true,
      items: [
        // One Billing item; label + route flip with the deployment mode.
        cloud
          ? {
              key: "subscription",
              path: "/settings/subscription",
              icon: IconCard,
              labelKey: "settings:nav.subscription",
              adminOnly: true,
            }
          : {
              key: "license",
              path: "/settings/license",
              icon: IconCard,
              labelKey: "settings:nav.license",
              adminOnly: true,
            },
      ],
    },
  ];
}

export const SettingsSidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: orgData } = useCurrentOrganization();
  const orgRole = orgData?.role;
  const isAdmin = orgRole === "OWNER" || orgRole === "ADMIN";
  const cloud = isCloudMode();

  const filterItem = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.selfHostedOnly && cloud) return false;
    return true;
  };

  const visibleGroups = buildGroups(cloud)
    .map((group) => ({ ...group, items: group.items.filter(filterItem) }))
    .filter((group) => {
      if (group.adminOnly && !isAdmin) return false;
      return group.items.length > 0;
    });

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const allItems = visibleGroups.flatMap((g) => g.items);
  const activeItem = allItems.find((i) => isActive(i.path));

  return (
    <>
      {/* Mobile: a select that navigates (prototype `.set__nav-mobile`) */}
      <div className="md:hidden">
        <label htmlFor="settings-nav" className="sr-only">
          {t("settings:pageTitle")}
        </label>
        <select
          id="settings-nav"
          value={activeItem?.path ?? allItems[0]?.path ?? ""}
          onChange={(e) => navigate(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
        >
          {visibleGroups.map((group) => (
            <optgroup key={group.labelKey} label={t(group.labelKey)}>
              {group.items.map((item) => (
                <option key={item.key} value={item.path}>
                  {t(item.labelKey)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Desktop: grouped sticky sub-nav */}
      <nav className="hidden w-[220px] shrink-0 self-start md:sticky md:top-6 md:block">
        <div className="space-y-5">
          {visibleGroups.map((group) => (
            <div key={group.labelKey}>
              <h3 className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                {t(group.labelKey)}
              </h3>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <li key={item.key}>
                      <Link
                        to={item.path}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-accent text-primary"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        <item.icon
                          className={`h-4 w-auto shrink-0 ${active ? "text-primary" : ""}`}
                        />
                        <span className="flex-1">{t(item.labelKey)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
};
