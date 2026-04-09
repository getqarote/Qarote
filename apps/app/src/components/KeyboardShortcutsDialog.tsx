import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface KeyboardShortcut {
  /**
   * The key chord to display, e.g. "/", "?", "Esc", "Enter".
   * Rendered as a `<kbd>` chip with the same treatment as the
   * filter input's shortcut hint.
   */
  keys: string[];
  /**
   * Human-readable description of what the shortcut does.
   * Already translated — the caller is responsible for i18n.
   */
  label: string;
}

export interface KeyboardShortcutSection {
  /**
   * Section heading (already translated).
   */
  title: string;
  shortcuts: KeyboardShortcut[];
}

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: KeyboardShortcutSection[];
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-background px-1.5 font-mono text-[10px] font-semibold text-foreground/80 shadow-[0_1px_0_0_hsl(var(--border))]">
      {children}
    </kbd>
  );
}

/**
 * Reusable keyboard-shortcuts cheatsheet dialog.
 *
 * Invoked globally via `?` on pages that register shortcuts. Follows
 * the Linear/GitHub convention: no heavy chrome, just a clean list
 * of chords grouped into sections. Start small — pages can pass a
 * single section, and the component grows with their needs.
 *
 * The `<kbd>` chips use the same visual treatment as the inline
 * shortcut hint in `RegexFilterInput` so keyboard affordances feel
 * like a consistent language across the app.
 */
export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  sections,
}: KeyboardShortcutsDialogProps) {
  const { t } = useTranslation("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("shortcuts.title")}</DialogTitle>
          <DialogDescription>{t("shortcuts.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {section.title}
              </h3>
              <dl className="space-y-2">
                {section.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.keys.join("+") + shortcut.label}
                    className="flex items-center justify-between gap-4"
                  >
                    <dt className="text-sm">{shortcut.label}</dt>
                    <dd className="flex items-center gap-1 shrink-0">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && (
                            <span className="text-xs text-muted-foreground">
                              +
                            </span>
                          )}
                          <Kbd>{key}</Kbd>
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
