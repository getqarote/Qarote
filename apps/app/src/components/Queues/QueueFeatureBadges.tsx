import { useTranslation } from "react-i18next";

import type { Queue } from "@/lib/api/types";

import { FeatureBadge } from "@/components/ui/feature-badge";

interface QueueFeatureBadgesProps {
  queue: Pick<
    Queue,
    "durable" | "auto_delete" | "exclusive" | "type" | "arguments"
  >;
}

export function QueueFeatureBadges({ queue }: QueueFeatureBadgesProps) {
  const { t } = useTranslation("queues");
  const args = queue.arguments ?? {};

  return (
    <>
      {queue.durable && (
        <FeatureBadge label="D" tooltip={t("featureDurable")} />
      )}
      {queue.auto_delete && (
        <FeatureBadge label="AD" tooltip={t("featureAutoDelete")} />
      )}
      {queue.exclusive && (
        <FeatureBadge label="Excl" tooltip={t("featureExclusive")} />
      )}
      {queue.type === "quorum" && (
        <FeatureBadge label="QQ" tooltip={t("featureQuorum")} />
      )}
      {queue.type === "stream" && (
        <FeatureBadge label="SQ" tooltip={t("featureStream")} />
      )}
      {args["x-message-ttl"] != null && (
        <FeatureBadge
          label="TTL"
          tooltip={t("featureTtl", { value: args["x-message-ttl"] })}
        />
      )}
      {(args["x-max-length"] != null || args["x-max-length-bytes"] != null) && (
        <FeatureBadge label="Lim" tooltip={t("featureLim")} />
      )}
      {args["x-dead-letter-exchange"] != null && (
        <FeatureBadge
          label="DLX"
          tooltip={t("featureDlx", {
            exchange: args["x-dead-letter-exchange"],
          })}
        />
      )}
      {args["x-max-priority"] != null && (
        <FeatureBadge
          label="Prio"
          tooltip={t("featurePrio", { value: args["x-max-priority"] })}
        />
      )}
      {args["x-single-active-consumer"] && (
        <FeatureBadge label="SAC" tooltip={t("featureSac")} />
      )}
    </>
  );
}
