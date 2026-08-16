import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { AgentBlock } from "@/components/cockpit/AgentBlock";
import { AskYourAgent } from "@/components/cockpit/AskYourAgent";
import { ConnectionBar } from "@/components/cockpit/ConnectionBar";
import { FirstRunCockpit } from "@/components/cockpit/FirstRunCockpit";
import { PushBanner } from "@/components/cockpit/PushBanner";
import { WhatAgentSees } from "@/components/cockpit/WhatAgentSees";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { CockpitSkeleton } from "@/components/skeletons/CockpitSkeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useUserWorkspaces } from "@/hooks/queries/useWorkspaceApi";
import { useDelayedLoading } from "@/hooks/ui/useDelayedLoading";

/**
 * Home cockpit — the agent-first centerpiece. One state-driven page built
 * from four self-contained blocks (each owns its data; react-query dedupes
 * shared queries):
 *   ConnectionBar   — broker reachability + manage/add
 *   AgentBlock      — wire your agent (MCP) / wired status
 *   WhatAgentSees   — calm / incident glance + live metrics
 *   AskYourAgent    — example prompts to paste into your agent
 *
 * The cockpit is never a dead empty room: the onboarding scan + live state
 * fill it before the user wires an agent.
 */
const Index = () => {
  const { t } = useTranslation("dashboard");
  const { selectedServerId, hasServers, isLoading } = useServerContext();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Anti-flash: while the servers query is in flight, hasServers is false, so
  // the empty-state would flash before data lands. Gate it behind the cockpit
  // skeleton (shown only past ~180ms).
  const showSkeleton = useDelayedLoading(isLoading);

  // Send users with NO workspace to onboarding. Decide off the workspaces query
  // — the SAME source onboarding's own guard uses — so the two can't disagree.
  // (Keying this off the auth-context `user.workspaceId` race-loops with
  // onboarding: that field lags the session refetch after a workspace switch,
  // reading stale-null here while the workspace already exists there.) Wait for
  // the query to resolve so we never bounce on the in-flight empty state.
  const { data: workspacesData, isLoading: workspacesLoading } =
    useUserWorkspaces();
  useEffect(() => {
    if (
      isAuthenticated &&
      !workspacesLoading &&
      !workspacesData?.workspaces?.length
    ) {
      navigate("/onboarding", { replace: true });
    }
  }, [isAuthenticated, workspacesLoading, workspacesData, navigate]);

  if (isLoading) {
    return (
      <PageShell bare>{showSkeleton ? <CockpitSkeleton /> : null}</PageShell>
    );
  }

  if (!hasServers) {
    return (
      <PageShell bare>
        <FirstRunCockpit />
      </PageShell>
    );
  }

  if (!selectedServerId) {
    return (
      <PageShell>
        <NoServerSelectedCard
          title={t("rabbitMQDashboard")}
          subtitle={t("pageSubtitle")}
          heading={t("pleaseSelectServer")}
          description={t("chooseServerFromSidebar")}
        />
      </PageShell>
    );
  }

  return (
    <PageShell bare>
      <div className="content-container-large !space-y-6">
        {/* The status banner role moved to ConnectionBar; the sr-only h1
            keeps the document outline + a SidebarTrigger for mobile. */}
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="sr-only">{t("home.title")}</h1>
        </div>

        {/* Intent note (prototype `.intent-note`) — a monospace one-liner that
            frames the page's design intent. The "// intent — " prefix is
            rendered as literal copy here (we can't use the prototype's CSS
            ::before pseudo-element with an i18n value). */}
        <p className="border-l-2 border-border pl-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
          <span className="text-primary">// intent — </span>
          {t("home.intent")}
        </p>

        <PushBanner />
        <ConnectionBar />
        <AgentBlock />
        <WhatAgentSees />
        <AskYourAgent />
      </div>
    </PageShell>
  );
};

export default Index;
