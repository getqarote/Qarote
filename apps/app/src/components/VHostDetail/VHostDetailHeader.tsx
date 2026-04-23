import { useTranslation } from "react-i18next";

import { Lock, Radio } from "lucide-react";

import type { VHost } from "@/lib/api/vhostTypes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PixelChevronLeft } from "@/components/ui/pixel-chevron-left";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface VHostDetailHeaderProps {
  vhostName: string;
  vhost: VHost;
  onNavigateBack: () => void;
  onEdit: () => void;
}

export function VHostDetailHeader({
  vhostName,
  vhost,
  onNavigateBack,
  onEdit,
}: VHostDetailHeaderProps) {
  const { t } = useTranslation("vhosts");

  const queueTypeLabel =
    vhost.default_queue_type && vhost.default_queue_type !== "undefined"
      ? vhost.default_queue_type
      : t("serverDefault");

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-2 min-w-0">
        <SidebarTrigger className="mr-2 mt-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateBack}
          className="mr-2 flex items-center gap-1 shrink-0"
        >
          <PixelChevronLeft className="h-4 w-auto shrink-0" />
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="title-page break-words min-w-0">
              {t("virtualHostPrefix", { name: vhostName })}
            </h1>
            {vhost.protected_from_deletion && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1"
                title={t("protectedTooltip")}
              >
                <Lock className="w-3 h-3" />
                {t("protected")}
              </Badge>
            )}
            {vhost.tracing && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Radio className="w-3 h-3" />
                {t("tracing")}
              </Badge>
            )}
            <Badge variant="outline">{queueTypeLabel}</Badge>
          </div>
          {vhost.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 break-all">
              {vhost.description}
            </p>
          )}
        </div>
      </div>
      <Button onClick={onEdit} className="btn-primary shrink-0">
        {t("common:edit")}
      </Button>
    </div>
  );
}
