import { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Trash2, User } from "lucide-react";

import type { RabbitMQUser } from "@/lib/api/userTypes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  onDelete: () => void;
}

/**
 * A single row in the users list. The user's name is a real `<Link>`
 * that owns the primary affordance — clicking it (or pressing Enter
 * with it focused) opens the detail page. The Delete icon is a
 * secondary action for admins; clicking it must NOT follow the link,
 * so it stops click propagation defensively even though the link is
 * scoped to the name cell.
 *
 * The admin user and any user tagged `protected` cannot be deleted —
 * their Delete button is hidden outright rather than disabled, because
 * a ghosted button in the middle of a table row is visual noise the
 * operator has to parse every time.
 *
 * Previous implementation used `<TableRow onClick={navigate}>` which
 * was keyboard-inaccessible: mouse users could click anywhere in the
 * row, but keyboard users had no way to activate it short of Tab-ing
 * to the icon buttons. WCAG 2.1.1 Keyboard violation — fixed here.
 */
export function UsersTableRow({ user, href, onDelete }: UsersTableRowProps) {
  const { t } = useTranslation("users");

  const isProtected = user.name === "admin" || user.tags?.includes("protected");
  const hasPassword = !!user.password_hash?.trim();

  const stopAnd = (fn: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    fn();
  };

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-medium max-w-[300px]">
        <Link
          to={href}
          className="flex items-center gap-2 min-w-0 rounded-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <User
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="truncate" title={user.name}>
            {user.name}
          </span>
        </Link>
      </TableCell>
      <TableCell>
        {user.tags?.length ? (
          <div className="flex flex-wrap gap-1">
            {user.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
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
          className={`w-2 h-2 rounded-full ${
            hasPassword ? "bg-success" : "bg-destructive"
          }`}
          role="img"
          aria-label={hasPassword ? t("passwordSet") : t("noPassword")}
          title={hasPassword ? t("passwordSet") : t("noPassword")}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {!isProtected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={stopAnd(onDelete)}
              className="h-9 w-9 p-0 text-destructive hover:text-destructive"
              aria-label={t("deleteUser") + ": " + user.name}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
