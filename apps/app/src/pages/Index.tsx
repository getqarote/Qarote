import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { AgentBlock } from "@/components/cockpit/AgentBlock";
import { AskYourAgent } from "@/components/cockpit/AskYourAgent";
import { ConnectionBar } from "@/components/cockpit/ConnectionBar";
import { WhatAgentSees } from "@/components/cockpit/WhatAgentSees";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

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
  const { selectedServerId, hasServers } = useServerContext();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Users without a workspace land in onboarding (create workspace + connect
  // first server). Guard against redirect loops by only acting off "/".
  useEffect(() => {
    if (isAuthenticated && !user?.workspaceId) {
      navigate("/onboarding", { replace: true });
    }
  }, [isAuthenticated, user?.workspaceId, navigate]);

  if (!hasServers) {
    return (
      <PageShell bare>
        <NoServerConfigured
          title={t("rabbitMQDashboard")}
          subtitle={t("pageSubtitle")}
          description={t("addServerDescription")}
        />
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

        <ConnectionBar />
        <AgentBlock />
        <WhatAgentSees />
        <AskYourAgent />
      </div>
    </PageShell>
  );
};

export default Index;
