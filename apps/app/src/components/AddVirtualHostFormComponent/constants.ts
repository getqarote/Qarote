import type { VHostQueueType } from "@/schemas";

/**
 * Presentation metadata for the vhost "default queue type" picker.
 *
 * The `dotClass` mirrors the coloring used on the queue-type badges across
 * the rest of the dashboard — quorum = success (the durable, replicated
 * default we steer people toward), stream = info (newer, log-shaped), classic
 * = warning (legacy non-replicated), "none" = muted (server default).
 */
interface VHostQueueTypeDescriptor {
  id: VHostQueueType | "default";
  titleKey: string;
  descKey: string;
  dotClass: string;
}

export const VHOST_QUEUE_TYPE_DESCRIPTORS: VHostQueueTypeDescriptor[] = [
  {
    id: "default",
    titleKey: "queueTypeServerDefaultTitle",
    descKey: "queueTypeServerDefaultDesc",
    dotClass: "bg-muted-foreground",
  },
  {
    id: "quorum",
    titleKey: "queueTypeQuorumTitle",
    descKey: "queueTypeQuorumDesc",
    dotClass: "bg-success",
  },
  {
    id: "classic",
    titleKey: "queueTypeClassicTitle",
    descKey: "queueTypeClassicDesc",
    dotClass: "bg-warning",
  },
  {
    id: "stream",
    titleKey: "queueTypeStreamTitle",
    descKey: "queueTypeStreamDesc",
    dotClass: "bg-info",
  },
];
