import { KeyboardEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type OnboardingInvitee = {
  email: string;
  role: "ADMIN" | "MEMBER";
};

interface OnboardingInviteeManagerProps {
  invitees: OnboardingInvitee[];
  onChange: (invitees: OnboardingInvitee[]) => void;
  disabled?: boolean;
  maxInvitees?: number;
}

/**
 * Invitee list manager shown at the bottom of the onboarding form
 * for first-time users. Operators type an email, press Enter (or
 * click Add), and the invitee appears below with a role picker and
 * a remove button. Capped at 10 invitees by default to prevent
 * accidental mass invites during onboarding.
 *
 * Owns the email input state locally (pure UI concern). The list
 * itself is controlled by the parent via `invitees` + `onChange`
 * so the final form submit handler can read the whole list.
 */
export function OnboardingInviteeManager({
  invitees,
  onChange,
  disabled = false,
  maxInvitees = 10,
}: OnboardingInviteeManagerProps) {
  const { t } = useTranslation("onboarding");
  const [emailInput, setEmailInput] = useState("");

  const trimmedInput = emailInput.trim();
  const isValidEmail = trimmedInput.length > 0 && trimmedInput.includes("@");
  const isDuplicate = invitees.some((inv) => inv.email === trimmedInput);
  const isFull = invitees.length >= maxInvitees;
  const canAdd = !disabled && isValidEmail && !isDuplicate && !isFull;

  const addInvitee = () => {
    if (!canAdd) return;
    onChange([...invitees, { email: trimmedInput, role: "MEMBER" }]);
    setEmailInput("");
  };

  const removeInvitee = (index: number) => {
    onChange(invitees.filter((_, i) => i !== index));
  };

  const updateRole = (index: number, role: "ADMIN" | "MEMBER") => {
    const next = [...invitees];
    next[index] = { ...next[index], role };
    onChange(next);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addInvitee();
    }
  };

  return (
    <>
      {/* Divider with "Invite teammates" label centered on it */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-sm text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {t("inviteTitle")}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {t("inviteDescription")}
        </p>

        <div className="flex gap-2">
          <Input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("inviteEmailPlaceholder")}
            disabled={disabled || isFull}
            className="flex-1"
            autoComplete="email"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 px-4"
            disabled={!canAdd}
            onClick={addInvitee}
          >
            {t("inviteAdd", { defaultValue: "Add" })}
          </Button>
        </div>

        {invitees.length > 0 && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            {invitees.map((invitee, index) => (
              <InviteeRow
                key={invitee.email}
                invitee={invitee}
                onRoleChange={(role) => updateRole(index, role)}
                onRemove={() => removeInvitee(index)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function InviteeRow({
  invitee,
  onRoleChange,
  onRemove,
}: {
  invitee: OnboardingInvitee;
  onRoleChange: (role: "ADMIN" | "MEMBER") => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation("onboarding");

  return (
    <div className="flex items-center gap-2 rounded-md border border-border p-2">
      <span className="flex-1 text-sm truncate" title={invitee.email}>
        {invitee.email}
      </span>
      <Select
        value={invitee.role}
        onValueChange={(v) => onRoleChange(v as "ADMIN" | "MEMBER")}
      >
        <SelectTrigger className="w-28 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="MEMBER">{t("inviteRoleMember")}</SelectItem>
          <SelectItem value="ADMIN">{t("inviteRoleAdmin")}</SelectItem>
        </SelectContent>
      </Select>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-colors"
        aria-label={t("inviteRemove", { defaultValue: "Remove invitee" })}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
