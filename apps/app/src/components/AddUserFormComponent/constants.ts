import type { UserTag } from "@/schemas";

/**
 * Presentation metadata for the RabbitMQ tag toggle group.
 *
 * `severity` controls selected-state coloring so operators can tell
 * at a glance which tags are privileged: administrator = danger
 * (root-equivalent across the cluster), policymaker = warning
 * (cluster-wide policy), impersonator = warning (auth bypass),
 * monitoring/management = neutral.
 */
interface UserTagDescriptor {
  id: UserTag;
  titleKey: string;
  descKey: string;
  severity: "danger" | "warning" | "neutral";
}

export const USER_TAG_DESCRIPTORS: UserTagDescriptor[] = [
  {
    id: "administrator",
    titleKey: "administrator",
    descKey: "tagAdminDesc",
    severity: "danger",
  },
  {
    id: "policymaker",
    titleKey: "policymaker",
    descKey: "tagPolicymakerDesc",
    severity: "warning",
  },
  {
    id: "monitoring",
    titleKey: "monitoring",
    descKey: "tagMonitoringDesc",
    severity: "neutral",
  },
  {
    id: "management",
    titleKey: "management",
    descKey: "tagManagementDesc",
    severity: "neutral",
  },
  {
    id: "impersonator",
    titleKey: "impersonator",
    descKey: "tagImpersonatorDesc",
    severity: "warning",
  },
];

/**
 * Permission presets. Covers the three common account shapes so
 * operators don't have to hand-author regex for the usual cases.
 */
export type UserPermissionPresetId = "full" | "readOnly" | "writeOnly";

interface UserPermissionPreset {
  id: UserPermissionPresetId;
  titleKey: string;
  descKey: string;
  configure: string;
  write: string;
  read: string;
}

export const USER_PERMISSION_PRESETS: UserPermissionPreset[] = [
  {
    id: "full",
    titleKey: "presetFullTitle",
    descKey: "presetFullDesc",
    configure: ".*",
    write: ".*",
    read: ".*",
  },
  {
    id: "readOnly",
    titleKey: "presetReadOnlyTitle",
    descKey: "presetReadOnlyDesc",
    configure: "^$",
    write: "^$",
    read: ".*",
  },
  {
    id: "writeOnly",
    titleKey: "presetWriteOnlyTitle",
    descKey: "presetWriteOnlyDesc",
    configure: "^$",
    write: ".*",
    read: "^$",
  },
];

export function detectPresetId(
  configure: string,
  write: string,
  read: string
): UserPermissionPresetId | "custom" {
  const match = USER_PERMISSION_PRESETS.find(
    (p) => p.configure === configure && p.write === write && p.read === read
  );
  return match?.id ?? "custom";
}
