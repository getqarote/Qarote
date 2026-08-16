/**
 * ConfirmDialog — the single parameterised confirm dialog for every
 * destructive or committing confirmation in the app. Built on the shadcn
 * AlertDialog primitive (Radix), so it inherits the scrim/overlay, focus
 * trap, Escape-to-close, and focus-return-to-trigger for free.
 *
 * Three levels, all chosen by the CALLER via props (KISS — one component,
 * no subclasses):
 *   A — simple/committing  (tone="default")
 *   B — destructive        (tone="danger")
 *   C — type-to-confirm     (tone="danger" + typeToConfirm)
 *
 * The component never toasts. The caller's `onConfirm` performs the mutation
 * AND fires the result qToast — keeping the side-effect with the code that
 * owns the data (Information Expert / SoC). On confirm we `await onConfirm()`
 * then close.
 *
 * Token map: surface→popover, line→border, amber-wash→warning-muted,
 * red-wash→destructive/10, red→destructive, carrot-ink→accent-foreground,
 * ink-3→muted-foreground. No hex.
 */

import { useId, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alertDialog";
import { Button } from "@/components/ui/button";
import { IconBell, IconLock } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** default = simple/committing; danger = destructive. */
  tone?: "default" | "danger";
  /** e.g. Remove "{name}"? — render resource names in font-mono. */
  title: React.ReactNode;
  /** States the concrete consequence. */
  body: React.ReactNode;
  /** e.g. "Remove server", "Revoke key". */
  confirmLabel: string;
  /** Caller does the action + fires the result toast. */
  onConfirm: () => void | Promise<void>;
  /** Disables buttons + shows the pending label while the action runs. */
  isPending?: boolean;
  /** Pending-state label for the confirm button (defaults to confirmLabel). */
  pendingLabel?: string;
  /** Cancel button label (defaults to "Cancel"). */
  cancelLabel?: string;
  /**
   * Level C: the EXACT phrase the user must type. The destructive button
   * stays disabled until the typed input matches exactly.
   */
  typeToConfirm?: string;
  /**
   * The warn box above the body. danger = red-wash + lock icon (irreversible);
   * warning = amber-wash (e.g. cluster-wide).
   */
  warn?: { tone: "danger" | "warning"; message: React.ReactNode };
  /**
   * A softer secondary action beside Cancel (e.g. "Purge" next to "Delete
   * queue"). Non-destructive styling — only ONE destructive/primary button
   * per dialog.
   */
  softAction?: { label: string; onClick: () => void };
}

export function ConfirmDialog({
  open,
  onOpenChange,
  tone = "default",
  title,
  body,
  confirmLabel,
  onConfirm,
  isPending = false,
  pendingLabel,
  cancelLabel = "Cancel",
  typeToConfirm,
  warn,
  softAction,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const inputId = useId();

  const isDanger = tone === "danger";
  // Level C gate: the destructive button stays disabled until the typed input
  // exactly equals the required phrase (Fail Fast at the boundary).
  const typeGatePassed = !typeToConfirm || typed === typeToConfirm;
  const confirmDisabled = isPending || !typeGatePassed;

  const handleOpenChange = (next: boolean) => {
    // Never tear down mid-flight; and reset the typed input on close so a
    // re-open starts clean.
    if (isPending) return;
    if (!next) setTyped("");
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    if (confirmDisabled) return;
    await onConfirm();
    setTyped("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="grid max-w-[460px] gap-0 overflow-hidden rounded-lg border-border bg-popover p-0 shadow-lg max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-auto max-sm:max-h-[92vh] max-sm:translate-x-0 max-sm:translate-y-0 max-sm:overflow-y-auto max-sm:rounded-b-none max-sm:rounded-t-lg">
        {/* __head */}
        <AlertDialogHeader className="space-y-0 border-b border-border px-[22px] py-[18px] text-left">
          <AlertDialogTitle className="text-[17px] font-semibold">
            {title}
          </AlertDialogTitle>
          {/* Radix requires a Description for a11y; keep it visually present as
              the body so screen readers announce the consequence. */}
          <AlertDialogDescription className="sr-only">
            {confirmLabel}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* __body */}
        <div className="flex flex-col gap-4 px-[22px] py-5">
          {warn && (
            <div
              className={
                warn.tone === "danger"
                  ? "flex gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm leading-snug text-destructive"
                  : "flex gap-2.5 rounded-md border border-warning/30 bg-warning-muted px-3.5 py-3 text-sm leading-snug text-warning"
              }
            >
              {warn.tone === "danger" ? (
                <IconLock className="mt-0.5 h-4 w-auto shrink-0" />
              ) : (
                <IconBell className="mt-0.5 h-4 w-auto shrink-0" />
              )}
              <span>{warn.message}</span>
            </div>
          )}

          <div className="text-sm leading-relaxed text-muted-foreground">
            {body}
          </div>

          {typeToConfirm && (
            <div className="space-y-1.5">
              <label htmlFor={inputId} className="text-sm font-medium">
                Type{" "}
                <code className="font-mono text-destructive">
                  {typeToConfirm}
                </code>{" "}
                to confirm
              </label>
              <Input
                id={inputId}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={typeToConfirm}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
            </div>
          )}
        </div>

        {/* __foot */}
        <AlertDialogFooter className="flex-row items-center gap-3 border-t border-border px-[22px] py-4 sm:justify-start">
          {/* Initial focus lands on Cancel (autoFocus), never the destructive
              button. AlertDialogCancel routes Escape to the same handler. */}
          <AlertDialogCancel
            autoFocus
            disabled={isPending}
            className="mt-0 flex-1"
          >
            {cancelLabel}
          </AlertDialogCancel>
          {softAction && (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={softAction.onClick}
            >
              {softAction.label}
            </Button>
          )}
          <Button
            type="button"
            variant={isDanger ? "destructive" : "default"}
            disabled={confirmDisabled}
            onClick={handleConfirm}
          >
            {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
