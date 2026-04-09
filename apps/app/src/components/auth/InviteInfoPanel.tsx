import { ComponentType, ReactNode } from "react";

import { LucideProps } from "lucide-react";

export interface InviteInfoField {
  /**
   * Lucide icon component (not an instance) rendered to the left of
   * the field value. Passed as a component so this panel applies
   * consistent sizing and muted coloring.
   */
  Icon?: ComponentType<LucideProps>;
  /** Field label rendered before the value, e.g. "Workspace:" */
  label: ReactNode;
  /** Field value, rendered bold via `<strong>` */
  value: ReactNode;
}

interface InviteInfoPanelProps {
  fields: InviteInfoField[];
}

/**
 * Muted info panel shown on invitation-acceptance pages, listing the
 * key facts about the invitation (organization/workspace, role,
 * inviter, plan) in a vertical stack of icon-labeled rows.
 *
 * The original had two cousin components (`InvitationInfo` for
 * workspace invitations and `OrgInvitationInfo` for organization
 * invitations) that were identical except for which icons and labels
 * they used. Collapsed into a data-driven `fields` array so every
 * caller controls their own label set.
 */
export function InviteInfoPanel({ fields }: InviteInfoPanelProps) {
  return (
    <div className="bg-muted rounded-lg p-4 space-y-3">
      {fields.map((field, index) => (
        <div
          key={index}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          {field.Icon && (
            <field.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">
            {field.label} <strong>{field.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}
