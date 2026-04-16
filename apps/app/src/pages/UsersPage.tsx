import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { toast } from "sonner";

import { UserRole } from "@/lib/api";
import { RabbitMQUser } from "@/lib/api/userTypes";

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
import { AddUserButton } from "@/components/users/AddUserButton";
import { BulkDeleteUsersModal } from "@/components/users/BulkDeleteUsersModal";
import { DeleteUserModal } from "@/components/users/DeleteUserModal";
import { LoadingSkeleton } from "@/components/UsersList/LoadingSkeleton";
import { UsersTable } from "@/components/UsersList/UsersTable";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useDeleteUser, useUsers } from "@/hooks/queries/useRabbitMQUsers";
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

export default function UsersPage() {
  const { t } = useTranslation("users");
  const { t: tc } = useTranslation("common");
  const { serverId } = useParams<{ serverId: string }>();
  const { selectedServerId, hasServers } = useServerContext();
  const { user } = useAuth();
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  const [deleteUser, setDeleteUser] = useState<RabbitMQUser | null>(null);
  const [bulkDeleteUsers, setBulkDeleteUsers] = useState<RabbitMQUser[]>([]);
  const [filterRegex, setFilterRegex] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const filterInputRef = useRef<HTMLInputElement>(null);

  const currentServerId = serverId || selectedServerId;
  const serverExists = currentServerId
    ? servers.some((s) => s.id === currentServerId)
    : false;

  const {
    data: usersData,
    isLoading,
    error,
  } = useUsers(currentServerId, serverExists);

  const deleteUserMutation = useDeleteUser();
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

  const handleDeleteUser = async () => {
    if (!deleteUser || !workspace?.id || !currentServerId) {
      toast.error(t("requiredWorkspace"));
      return;
    }
    try {
      await deleteUserMutation.mutateAsync({
        serverId: currentServerId,
        workspaceId: workspace.id,
        username: deleteUser.name,
      });
      toast.success(t("deleteSuccess"));
      setDeleteUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deleteError"));
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!workspace?.id || !currentServerId || bulkDeleteUsers.length === 0) {
      toast.error(t("requiredWorkspace"));
      return;
    }
    const results = await Promise.allSettled(
      bulkDeleteUsers.map((u) =>
        deleteUserMutation.mutateAsync({
          serverId: currentServerId,
          workspaceId: workspace.id,
          username: u.name,
        })
      )
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;
    if (failed === 0) {
      toast.success(t("bulkDeleteSuccess", { count: succeeded }));
    } else if (succeeded === 0) {
      toast.error(t("deleteError"));
    } else {
      toast.warning(t("bulkDeletePartial", { succeeded, failed }));
    }
    setBulkDeleteUsers([]);
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

  const users = usersData?.users || [];
  const filteredUsers = filterByRegex(users, filterRegex, (u) => u.name);
  const hasFilter = filterRegex.trim().length > 0;

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <SidebarTrigger />
          <TitleWithCount
            count={filteredUsers.length}
            total={hasFilter ? users.length : undefined}
          >
            {t("pageTitle")}
          </TitleWithCount>
        </div>
        <AddUserButton serverId={currentServerId} />
      </div>

      <RegexFilterInput
        ref={filterInputRef}
        value={filterRegex}
        onChange={setFilterRegex}
        shortcutHint="/"
      />

      <UsersTable
        users={filteredUsers}
        buildHref={(u) => `/users/${encodeURIComponent(u.name)}`}
        onDelete={(u) => setDeleteUser(u)}
        onBulkDelete={(selected) => setBulkDeleteUsers(selected)}
        filterQuery={filterRegex}
        onClearFilter={() => setFilterRegex("")}
      />

      {deleteUser && (
        <DeleteUserModal
          isOpen
          onClose={() => setDeleteUser(null)}
          user={deleteUser}
          onConfirm={handleDeleteUser}
          isLoading={deleteUserMutation.isPending}
        />
      )}

      {bulkDeleteUsers.length > 0 && (
        <BulkDeleteUsersModal
          isOpen
          onClose={() => setBulkDeleteUsers([])}
          usernames={bulkDeleteUsers.map((u) => u.name)}
          onConfirm={handleBulkDeleteConfirm}
          isLoading={deleteUserMutation.isPending}
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
            shortcuts: [
              { keys: ["/"], label: tc("shortcuts.focusFilter") },
              { keys: ["Enter"], label: tc("shortcuts.sortByName") },
            ],
          },
        ]}
      />
    </PageShell>
  );
}
