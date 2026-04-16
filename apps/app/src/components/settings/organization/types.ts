/**
 * Client-side shapes of the organization / members / invitations data
 * as consumed by the settings UI. Kept here rather than on the shared
 * tRPC-inferred types so the extracted card and dialog components have
 * a stable contract independent of the generated router output.
 *
 * Only the fields actually read in the UI are declared — keep the
 * surface tight.
 */

export interface OrganizationSummary {
  id: string;
  name: string;
  contactEmail?: string | null;
  createdAt: string | Date;
  _count?: {
    members?: number;
    workspaces?: number;
  };
}

export interface OrgMember {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  image?: string | null;
  role: string;
}

export interface PendingOrgInvitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string | Date;
  invitedBy: {
    firstName: string;
    lastName: string;
  };
}

export interface MyOrgInvitation {
  id: string;
  role: string;
  organization: {
    name: string;
  };
  invitedBy: {
    firstName: string;
    lastName: string;
  };
}
