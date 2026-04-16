import { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { KeyRound, ShieldAlert } from "lucide-react";

import type { RabbitMQUser } from "@/lib/api/userTypes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PixelTrash } from "@/components/ui/pixel-trash";

interface UsersTableRowProps {
  user: RabbitMQUser;
  href: string;
  selected?: boolean;
  onToggleSelect?: () => void;
  onDelete: () => void;
}

/**
 * A single user row matching the div-based pattern. Grid layout aligned
 * to header columns, mono font for usernames, hover:bg-accent.
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

  const stopCheckbox = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    fn();
  };

  return (
    <Link
      to={href}
      data-state={selected ? "selected" : undefined}
      className="grid grid-cols-[2.5rem_1fr_auto_auto_8rem_2.5rem] items-center gap-x-4 px-4 py-3 hover:bg-accent transition-colors group"
    >
      {/* Checkbox */}
      <div onClick={(e) => e.preventDefault()}>
        {!isProtected && onToggleSelect ? (
          <Checkbox
            checked={!!selected}
            onCheckedChange={onToggleSelect}
            onClick={stopCheckbox(() => {})}
            aria-label={t("selectRow", { name: user.name })}
          />
        ) : null}
      </div>

      {/* Name */}
      <div className="min-w-0">
        <span
          className="font-medium font-mono text-sm truncate block"
          title={user.name}
        >
          {user.name}
        </span>
      </div>

      {/* Tags */}
      <div>
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
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </div>

      {/* Accessible VHosts */}
      <div>
        {user.accessibleVhosts?.length ? (
          <div className="flex flex-wrap gap-1">
            {user.accessibleVhosts.map((vhost) => (
              <Badge key={vhost} variant="outline" className="text-xs">
                {vhost}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </div>

      {/* Password */}
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

      {/* Actions */}
      <div className="flex justify-end">
        {!isProtected && !selected && (
          <Button
            variant="ghost"
            size="icon"
            onClick={stopAnd(onDelete)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={t("deleteUser") + ": " + user.name}
          >
            <PixelTrash className="h-4 w-auto shrink-0" aria-hidden="true" />
          </Button>
        )}
      </div>
    </Link>
  );
}
