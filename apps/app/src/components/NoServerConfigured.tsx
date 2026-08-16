import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { Server } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useAddServerDialog } from "@/contexts/AddServerDialogContext";

interface NoServerConfiguredProps {
  title: string;
  subtitle: string;
  description: string;
}

export function NoServerConfigured({
  title,
  subtitle,
  description,
}: NoServerConfiguredProps) {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  // The add form lives in AddServerDialogProvider (app shell), not here, so its
  // scanning → done reveal isn't unmounted when adding the first server flips
  // this empty state to real content.
  const { open: openAddServer } = useAddServerDialog();

  useEffect(() => {
    if (searchParams.get("addServer") === "true") {
      openAddServer();
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("addServer");
        return next;
      });
    }
  }, [searchParams, setSearchParams, openAddServer]);

  return (
    <div className="content-container-large">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="title-page">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t("noServerConfigured")}
            </h2>
            <p className="text-muted-foreground mb-4">{description}</p>
            <Button className="btn-primary" onClick={openAddServer}>
              {t("addServer")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
