import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useChangePassword } from "@/hooks/queries/useProfile";

import { extractErrorMessage } from "@/pages/settings/utils";

const MIN_LENGTH = 8;

/** Masked input with a reveal toggle (prototype `.sinput.has-reveal` + `.sreveal`). */
function RevealInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  revealLabel,
  hideLabel,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  revealLabel: string;
  hideLabel: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? hideLabel : revealLabel}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/**
 * Password card (prototype `.scard` with `.scard__h` / `.scard__d` + `.savebar`).
 * Only mounted for password accounts — a social/SSO-only account has no password
 * to change (the page omits this card entirely rather than fake a "set password"
 * flow the backend doesn't expose).
 */
export function PasswordCard() {
  const { t } = useTranslation("profile");
  const changePassword = useChangePassword();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validate = (): boolean => {
    let message: string | null = null;
    if (!current) {
      message = t("password.currentRequired");
    } else if (next.length < MIN_LENGTH) {
      message = t("password.tooShort", { count: MIN_LENGTH });
    } else if (next === current) {
      message = t("password.mustDiffer");
    } else if (next !== confirm) {
      message = t("password.mismatch");
    }
    setError(message);
    return message === null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await changePassword.mutateAsync({
        currentPassword: current,
        newPassword: next,
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
      toast.success(t("toast.passwordChanged"));
    } catch (err) {
      logger.error("Password change error:", err);
      toast.error(extractErrorMessage(err));
    }
  };

  const dirty = !!(current || next || confirm);

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-6"
    >
      <h3 className="text-sm font-semibold">{t("password.title")}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {t("password.description")}
      </p>

      <div className="mt-4 space-y-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">{t("password.current")}</Label>
          <RevealInput
            id="currentPassword"
            value={current}
            onChange={setCurrent}
            placeholder={t("password.currentPlaceholder")}
            autoComplete="current-password"
            disabled={changePassword.isPending}
            revealLabel={t("password.show")}
            hideLabel={t("password.hide")}
          />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">{t("password.new")}</Label>
            <RevealInput
              id="newPassword"
              value={next}
              onChange={setNext}
              placeholder={t("password.newPlaceholder")}
              autoComplete="new-password"
              disabled={changePassword.isPending}
              revealLabel={t("password.show")}
              hideLabel={t("password.hide")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">{t("password.confirm")}</Label>
            <RevealInput
              id="confirmPassword"
              value={confirm}
              onChange={setConfirm}
              placeholder={t("password.confirmPlaceholder")}
              autoComplete="new-password"
              disabled={changePassword.isPending}
              revealLabel={t("password.show")}
              hideLabel={t("password.hide")}
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="mt-5 flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={!dirty || changePassword.isPending}>
          {t("password.update")}
        </Button>
      </div>
    </form>
  );
}
