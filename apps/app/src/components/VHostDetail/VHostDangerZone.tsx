import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

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
import { PixelTrash } from "@/components/ui/pixel-trash";

interface VHostDangerZoneProps {
  vhostName: string;
  onDeleteClick: () => void;
  isDeleting?: boolean;
}

export function VHostDangerZone({
  vhostName,
  onDeleteClick,
  isDeleting,
}: VHostDangerZoneProps) {
  const { t } = useTranslation("vhosts");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const confirmInputId = useId();

  const isDefault = vhostName === "/";
  const displayName = isDefault ? "/" : vhostName;

  return (
    <>
      <Accordion type="single" collapsible>
        <AccordionItem value="danger" className="border rounded-lg px-4">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              {t("dangerZone")}
              <span className="text-sm font-normal text-muted-foreground">
                {t("dangerZoneHint")}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-1">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("deleteVhostDescription")}
              </p>
              <Button
                variant="destructive-outline"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isDefault}
                title={isDefault ? t("cannotDeleteDefault") : undefined}
              >
                <PixelTrash
                  className="h-4 w-auto shrink-0"
                  aria-hidden="true"
                />
                {t("deleteVhost")}
              </Button>
              {isDefault && (
                <p className="text-sm text-muted-foreground">
                  {t("cannotDeleteDefault")}
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
            <AlertDialogTitle>{t("deleteVhostDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteVhostDialogDescription", {
                name: displayName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label htmlFor={confirmInputId} className="text-sm font-medium">
              {t("deleteVhostConfirmLabel")}
            </label>
            <Input
              id={confirmInputId}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={displayName}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmName !== displayName || isDeleting}
              onClick={onDeleteClick}
              className="border border-destructive/30 bg-background text-destructive hover:bg-destructive/10 hover:border-destructive/50"
            >
              {isDeleting ? t("deleting") : t("deleteVhost")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
