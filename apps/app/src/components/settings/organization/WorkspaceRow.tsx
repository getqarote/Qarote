import { useTranslation } from "react-i18next";

import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useRoleLabels, WS_ROLE_OPTIONS, type WsRole } from "./roleUi";

interface WorkspaceRowProps {
  workspace: { id: string; name: string };
  selected: boolean;
  role: WsRole;
  onToggle: () => void;
  onRoleChange: (role: WsRole) => void;
  disabled?: boolean;
}

/**
 * A single workspace toggle row — used in both the invite dialog (to
 * pre-assign a new member to workspaces) and the per-member manage
 * dialog (to retroactively change an existing member's workspace
 * assignments).
 *
 * When the workspace is selected, a role picker appears inline to
 * the right so the operator can set the role without opening a
 * second dialog.
 */
export function WorkspaceRow({
  workspace,
  selected,
  role,
  onToggle,
  onRoleChange,
  disabled,
}: WorkspaceRowProps) {
  const { t } = useTranslation("profile");
  const roleLabels = useRoleLabels();

  const wsRoleDescKeys: Record<string, string> = {
    ADMIN: "org.roleDescWsAdmin",
    MEMBER: "org.roleDescWsMember",
    READONLY: "org.roleDescWsReadonly",
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-2">
      <Button
        type="button"
        size="sm"
        variant={selected ? "default" : "outline"}
        className="shrink-0"
        onClick={onToggle}
        disabled={disabled}
      >
        {selected ? (
          <Check className="h-4 w-4 mr-1" aria-hidden="true" />
        ) : (
          <X className="h-4 w-4 mr-1 opacity-40" aria-hidden="true" />
        )}
        {workspace.name}
      </Button>
      {selected && (
        <Select
          value={role}
          onValueChange={(v) => onRoleChange(v as WsRole)}
          disabled={disabled}
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-56">
            {WS_ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r} className="py-2">
                <div>
                  <span>{roleLabels[r]}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                    {t(wsRoleDescKeys[r])}
                  </p>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
