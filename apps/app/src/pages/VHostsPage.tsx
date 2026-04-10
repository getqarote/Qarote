import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { toast } from "sonner";

import { UserRole } from "@/lib/api";

import { AddVirtualHostButton } from "@/components/AddVirtualHostButton";
import { filterByRegex } from "@/components/filterByRegex";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageError } from "@/components/PageError";
import {
  FullPageAlert,
  NoServerSelectedCard,
  PageShell,
} from "@/components/PageShell";
import { RegexFilterInput } from "@/components/RegexFilterInput";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TitleWithCount } from "@/components/ui/TitleWithCount";
import { DeleteVHostModal } from "@/components/vhosts/DeleteVHostModal";
import { LoadingSkeleton } from "@/components/VHostsList/LoadingSkeleton";
import { VHostsTable } from "@/components/VHostsList/VHostsTable";
import type { VHostListItem } from "@/components/VHostsList/VHostsTableRow";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useDeleteVHost, useVHosts } from "@/hooks/queries/useRabbitMQVHosts";
import { useServers } from "@/hooks/queries/useServer";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

/**
 * Whether a keyboard event should suppress the `/` shortcut. Typing
 * in an input or contenteditable surface means the operator is
 * already writing text — we don't want `/` to jump focus away.
 */
function isTextualEventTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export default function VHostsPage() {
  const { t } = useTranslation("vhosts");
  const { t: tc } = useTranslation("common");
  const { serverId } = useParams<{ serverId: string }>();
  const { selectedServerId, hasServers } = useServerContext();
  const { user } = useAuth();
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  const [deleteVHost, setDeleteVHost] = useState<VHostListItem | null>(null);
  const [filterRegex, setFilterRegex] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const filterInputRef = useRef<HTMLInputElement>(null);

  const currentServerId = serverId || selectedServerId;
  const serverExists = currentServerId
    ? servers.some((s) => s.id === currentServerId)
    : false;

  const {
    data: vhostsData,
    isLoading,
    error,
  } = useVHosts(currentServerId, serverExists);

  const deleteVHostMutation = useDeleteVHost();
  const { workspace } = useWorkspace();

  // Page-level keyboard shortcuts:
  //   "/"   → focus the filter input (Linear/GitHub convention)
  //   "?"   → open the shortcut cheatsheet dialog
  // Both are ignored while the operator is already typing in an
  // input, textarea, or contenteditable — we never want to hijack
  // keystrokes mid-type.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTextualEventTarget(e)) return;

      if (e.key === "/") {
        e.preventDefault();
        filterInputRef.current?.focus();
        return;
      }

      // "?" is Shift + "/" on US layouts; browsers report `e.key`
      // as "?" directly, so that's the single check we need.
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleDeleteVHost = async () => {
    if (!deleteVHost || !workspace?.id || !currentServerId) {
      toast.error(t("workspaceRequired"));
      return;
    }
    try {
      await deleteVHostMutation.mutateAsync({
        serverId: currentServerId,
        workspaceId: workspace.id,
        vhostName: deleteVHost.name,
      });
      toast.success(t("deleteSuccess"));
      setDeleteVHost(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deleteError"));
    }
  };

  // Guard: non-admins cannot reach this page
  if (user?.role !== UserRole.ADMIN) {
    return (
      <PageShell>
        <FullPageAlert message={t("accessDenied")} />
      </PageShell>
    );
  }

  // Guard: zero servers configured — onboarding state owns its own
  // content container, so render it bare to avoid double-wrapping.
  if (!hasServers) {
    return (
      <PageShell bare>
        <NoServerConfigured
          title={t("noServerTitle")}
          subtitle={t("pageSubtitle")}
          description={t("noServerDescription")}
        />
      </PageShell>
    );
  }

  // Guard: servers exist but none is selected yet.
  if (!currentServerId) {
    return (
      <PageShell>
        <NoServerSelectedCard
          title={t("pageTitle")}
          subtitle={t("pageSubtitle")}
          heading={t("noServerSelected")}
          description={t("selectServerPrompt")}
        />
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <LoadingSkeleton />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex items-center gap-4">
          <SidebarTrigger />
        </div>
        <PageError message={t("common:serverConnectionError")} />
      </PageShell>
    );
  }

  const vhosts = (vhostsData?.vhosts || []) as VHostListItem[];
  const filteredVhosts = filterByRegex(vhosts, filterRegex, (v) => v.name);
  const hasFilter = filterRegex.trim().length > 0;

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <SidebarTrigger />
          <TitleWithCount
            count={filteredVhosts.length}
            total={hasFilter ? vhosts.length : undefined}
          >
            {t("pageTitle")}
          </TitleWithCount>
        </div>
        <AddVirtualHostButton serverId={currentServerId} />
      </div>

      <RegexFilterInput
        ref={filterInputRef}
        value={filterRegex}
        onChange={setFilterRegex}
        shortcutHint="/"
      />

      <VHostsTable
        vhosts={filteredVhosts}
        buildHref={(v) => `/vhosts/${encodeURIComponent(v.name)}`}
        onDelete={(v) => setDeleteVHost(v)}
        filterQuery={filterRegex}
        onClearFilter={() => setFilterRegex("")}
      />

      {deleteVHost && (
        <DeleteVHostModal
          isOpen
          onClose={() => setDeleteVHost(null)}
          vhost={deleteVHost}
          onConfirm={handleDeleteVHost}
          isLoading={deleteVHostMutation.isPending}
        />
      )}

      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        sections={[
          {
            title: tc("shortcuts.sectionGeneral"),
            shortcuts: [
              { keys: ["?"], label: tc("shortcuts.showShortcuts") },
              { keys: ["Esc"], label: tc("shortcuts.closeDialog") },
            ],
          },
          {
            title: tc("shortcuts.sectionList"),
            shortcuts: [{ keys: ["/"], label: tc("shortcuts.focusFilter") }],
          },
        ]}
      />
    </PageShell>
  );
}
