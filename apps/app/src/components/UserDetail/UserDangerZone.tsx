import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { ChevronRight, Trash2 } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alertDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UserDangerZoneProps {
  username: string;
  isConnectionUser: boolean;
  isProtectedUser: boolean;
  onDeleteClick: () => void;
  isDeleting?: boolean;
}

export function UserDangerZone({
  username,
  isConnectionUser,
  isProtectedUser,
  onDeleteClick,
  isDeleting,
}: UserDangerZoneProps) {
  const { t } = useTranslation("users");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const confirmInputId = useId();

  const isAdminUser = username === "admin";
  const disabled = isAdminUser || isConnectionUser || isProtectedUser;

  const disabledReason = isConnectionUser
    ? t("cannotModifyConnectionUser")
    : isProtectedUser
      ? t("cannotModifyProtectedUser")
      : isAdminUser
        ? t("cannotDeleteAdmin")
        : undefined;

  return (
    <>
      <Accordion type="single" collapsible>
        <AccordionItem value="danger" className="border rounded-lg px-4">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              {t("dangerZone")}
              <ChevronRight
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-sm font-normal text-muted-foreground">
                {t("dangerZoneHint", {
                  defaultValue: "Destructive actions",
                })}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-1">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("deleteUserDescription", {
                  defaultValue:
                    "Permanently delete this user and revoke all their permissions. This action cannot be undone.",
                })}
              </p>
              <Button
                variant="destructive-outline"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={disabled}
                title={disabledReason}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t("deleteUser")}
              </Button>
              {disabledReason && (
                <p className="text-sm text-muted-foreground">
                  {disabledReason}
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setConfirmName("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteUser")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteUserDialogDescription", {
                defaultValue:
                  "This will permanently delete the user <strong>{{name}}</strong> and revoke all their permissions. This action cannot be undone.",
                name: username,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label htmlFor={confirmInputId} className="text-sm font-medium">
              {t("deleteUserConfirmLabel", {
                defaultValue: "Type the username to confirm",
              })}
            </label>
            <Input
              id={confirmInputId}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={username}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmName !== username || isDeleting}
              onClick={onDeleteClick}
              className="border border-destructive/30 bg-background text-destructive hover:bg-destructive/10 hover:border-destructive/50"
            >
              {isDeleting ? t("deleting") : t("deleteUser")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
