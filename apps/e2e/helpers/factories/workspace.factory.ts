let counter = 0;

export function uniqueWorkspaceName(prefix = "ws"): string {
  counter++;
  return `${prefix}-${counter}-${Date.now()}`;
}

export async function createWorkspace(
  prisma: any,
  overrides: Partial<{
    name: string;
    contactEmail: string;
    ownerId: string;
  }> = {}
) {
  const name = overrides.name || uniqueWorkspaceName();

  const workspace = await prisma.workspace.create({
    data: {
      name,
      contactEmail: overrides.contactEmail || `${name}@e2e-test.local`,
      ownerId: overrides.ownerId || undefined,
    },
  });

  return workspace;
}
