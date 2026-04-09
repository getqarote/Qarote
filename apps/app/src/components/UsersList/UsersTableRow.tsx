import { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { KeyRound, ShieldAlert, Trash2, User } from "lucide-react";

import type { RabbitMQUser } from "@/lib/api/userTypes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

interface UsersTableRowProps {
  user: RabbitMQUser;
  /**
   * Route the user's name cell links to. A real `<Link>` — not a
   * programmatic `navigate()` — so keyboard users can Tab into it,
   * screen readers announce it as a link, and mouse users can
   * right-click / middle-click / Cmd+click for new-tab behaviour.
   */
  href: string;
  /**
   * Whether this row is currently selected in the bulk-action pool.
   * Undefined on protected rows (the checkbox is hidden entirely
   * rather than disabled).
   */
  selected?: boolean;
  /**
   * Called when the operator toggles the row's selection checkbox.
   * Undefined for protected rows (admin, anything tagged `protected`).
   */
  onToggleSelect?: () => void;
  onDelete: () => void;
}

/**
 * A single row in the users list.
 *
 * The user's name is a real `<Link>` that owns the primary
 * affordance — clicking it (or pressing Enter with it focused) opens
 * the detail page. The Delete icon is a secondary action; clicking it
 * must NOT follow the link, so it stops propagation defensively even
 * though the link is scoped to the name cell.
 *
 * The admin user and any user tagged `protected` cannot be deleted
 * nor bulk-selected — both their checkbox and Delete button are
 * hidden outright rather than disabled, because a ghosted control in
 * the middle of a table row is visual noise the operator has to
 * parse every time.
 *
 * Password state is rendered as an icon pair (KeyRound / KeyOff)
 * rather than a color-only dot. This keeps the meaning accessible to
 * colorblind sighted users who can see the dot but can't distinguish
 * red from green — color becomes the secondary channel and icon
 * shape is primary.
 *
 * Previous implementation used `<TableRow onClick={navigate}>` which
 * was keyboard-inaccessible: mouse users could click anywhere in the
 * row, but keyboard users had no way to activate it short of Tab-ing
 * to the icon buttons. WCAG 2.1.1 Keyboard violation — fixed here.
 */
export function UsersTableRow({
  user,
  href,
  selected,
  onToggleSelect,
  onDelete,
}: UsersTableRowProps) {
  const { t } = useTranslation("users");

  const isProtected = user.name === "admin" || user.tags?.includes("protected");
  const hasPassword = !!user.password_hash?.trim();

  const stopAnd = (fn: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    fn();
  };

  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      className="hover:bg-muted/50"
    >
      <TableCell className="w-[44px] pr-0">
        {!isProtected && onToggleSelect ? (
          <Checkbox
            checked={!!selected}
            onCheckedChange={onToggleSelect}
            aria-label={t("selectRow", { name: user.name })}
          />
        ) : null}
      </TableCell>
      <TableCell className="font-medium">
        <Link
          to={href}
          className="inline-flex items-start gap-2 rounded-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <User
            className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="break-all">{user.name}</span>
        </Link>
      </TableCell>
      <TableCell>
        {user.tags?.length ? (
          <div className="flex flex-wrap gap-1">
            {user.tags.map((tag) => {
              const isAdmin = tag === "administrator";
              const isProtectedTag = tag === "protected";
              return (
                <Badge
                  key={tag}
                  variant={isAdmin || isProtectedTag ? "outline" : "secondary"}
                  className={
                    isAdmin
                      ? "text-xs bg-primary/10 border-primary/50 text-foreground font-semibold"
                      : isProtectedTag
                        ? "text-xs border-dashed border-border text-foreground/75"
                        : "text-xs"
                  }
                >
                  {tag}
                </Badge>
              );
            })}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {user.accessibleVhosts?.length ? (
          <div className="flex flex-wrap gap-1">
            {user.accessibleVhosts.map((vhost) => (
              <Badge key={vhost} variant="outline" className="text-xs">
                {vhost}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div
          className="inline-flex items-center gap-1.5"
          title={hasPassword ? t("passwordSet") : t("noPassword")}
        >
          {hasPassword ? (
            <KeyRound
              className="h-4 w-4 text-success"
              aria-label={t("passwordSet")}
              role="img"
            />
          ) : (
            <ShieldAlert
              className="h-4 w-4 text-warning"
              aria-label={t("noPassword")}
              role="img"
            />
          )}
          <span
            className={`text-xs ${
              hasPassword ? "text-muted-foreground" : "text-warning"
            }`}
          >
            {hasPassword ? t("passwordSet") : t("noPassword")}
          </span>
        </div>
      </TableCell>
      <TableCell className="w-[56px] text-right">
        {!isProtected && !selected && (
          <Button
            variant="ghost"
            size="icon"
            onClick={stopAnd(onDelete)}
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            aria-label={t("deleteUser") + ": " + user.name}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
