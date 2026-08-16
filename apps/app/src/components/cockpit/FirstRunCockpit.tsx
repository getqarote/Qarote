import { useState } from "react";
import { useTranslation } from "react-i18next";

import { consumeLastRemovedServer } from "@/lib/lastRemovedServer";

import { Button } from "@/components/ui/button";
import {
  IconLock,
  IconPlus,
  IconServer,
  IconSparkle,
} from "@/components/ui/icons";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useAddServerDialog } from "@/contexts/AddServerDialogContext";

import { usePermission } from "@/hooks/queries/useWorkspaceRole";

/**
 * Cockpit first-run / empty state — shown by the Home cockpit when the current
 * workspace has zero connected brokers. A distinct agent-first screen (NOT the
 * normal cockpit greyed out): a centered card with a pulsing radar icon, a
 * single primary CTA, and a one-line agent hint.
 *
 * Two wordings, one component:
 *   - never connected   → "Connect your first broker"
 *   - last one removed  → "No broker connected" + acknowledges {previousName}
 *
 * The "just removed" name is recorded by the delete flow (handleRemoveServer)
 * only when the deleted server was the last one, and read here consume-once via
 * lastRemovedServer. The success toast is fired separately by the delete flow.
 *
 * Permission-gated: without `server:create` the CTA becomes an inert lock chip
 * pointing at a workspace admin — never a dead button.
 */

export function FirstRunCockpit() {
  const { t } = useTranslation("dashboard");
  const { open: openAddServer } = useAddServerDialog();
  const canAddServer = usePermission("server:create");

  // Consume-once at mount: the initializer runs a single time so a re-render
  // can't re-read (and the record is cleared on read regardless).
  const [previousName] = useState(consumeLastRemovedServer);
  const justRemoved = previousName !== null;

  return (
    <div className="content-container-large !space-y-6">
      {/* Minimal mobile nav affordance — no "Dashboard" page chrome. */}
      <div className="flex items-center gap-4">
        <SidebarTrigger />
      </div>

      <div className="mx-auto mt-[clamp(24px,6vh,72px)] w-full max-w-[560px]">
        <div className="rounded-lg border border-border bg-card p-[clamp(32px,5vw,52px)] text-center">
          {/* Radar icon — two carrot rings pulse outward + the icon breathes.
              Rings are aria-hidden; all motion is CSS, gated on no-preference. */}
          <div className="firstrun-radar relative mx-auto mb-5 grid h-14 w-14 place-items-center rounded-[14px] bg-accent text-primary">
            <span className="firstrun-ring" aria-hidden="true" />
            <span
              className="firstrun-ring firstrun-ring--2"
              aria-hidden="true"
            />
            <IconServer size={24} aria-hidden="true" />
          </div>

          <h1 className="font-heading text-[clamp(22px,3vw,28px)] font-semibold tracking-[-0.02em] text-foreground">
            {justRemoved
              ? t("home.firstRun.removedTitle")
              : t("home.firstRun.title")}
          </h1>

          <p className="mx-auto mb-6 mt-3 max-w-[44ch] text-pretty text-[15px] leading-relaxed text-muted-foreground">
            {justRemoved
              ? t("home.firstRun.removedDescription", { name: previousName })
              : t("home.firstRun.description")}
          </p>

          {canAddServer ? (
            <>
              <Button
                autoFocus
                size="lg"
                className="gap-2"
                onClick={openAddServer}
              >
                <IconPlus size={16} aria-hidden="true" />
                {t("home.firstRun.addServer")}
              </Button>
              <p className="mt-4 font-mono text-[11.5px] text-muted-foreground">
                {t("home.firstRun.meta")}
              </p>
            </>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-md border border-border px-3.5 py-2.5 text-[13.5px] text-foreground/80">
              <IconLock size={15} aria-hidden="true" />
              {t("home.firstRun.gated")}
            </span>
          )}

          {/* Agent hint (prototype `.firstrun__hint`) — carrot wash, left-aligned,
              the example question emphasized. */}
          <div className="mt-4 flex items-start gap-[11px] rounded-lg border border-primary/30 bg-accent px-4 py-3.5 text-left text-[13px] leading-[1.55] text-foreground/80 dark:bg-primary/10">
            <IconSparkle
              size={16}
              className="mt-0.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>
              {t("home.firstRun.hintBefore")}
              <em className="text-foreground">
                {t("home.firstRun.hintQuestion")}
              </em>
              {t("home.firstRun.hintAfter")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
