import { beforeEach, describe, expect, it, vi } from "vitest";

const invalidateWorkspaceUsers = vi.fn();
const invalidateGetMyRole = vi.fn();

let capturedOnSuccess: (() => void) | undefined;

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({
      user: { getWorkspaceUsers: { invalidate: invalidateWorkspaceUsers } },
      workspace: {
        core: { getMyRole: { invalidate: invalidateGetMyRole } },
      },
    }),
    workspace: {
      role: {
        assignRole: {
          useMutation: (opts: { onSuccess?: () => void }) => {
            capturedOnSuccess = opts.onSuccess;
            return { mutate: vi.fn(), mutateAsync: vi.fn() };
          },
        },
      },
    },
  },
}));

describe("useAssignRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnSuccess = undefined;
  });

  it("invalidates both getWorkspaceUsers and getMyRole on success", async () => {
    const { useAssignRole } = await import("./useWorkspaceApi");
    useAssignRole();

    expect(capturedOnSuccess).toBeDefined();
    capturedOnSuccess!();

    expect(invalidateWorkspaceUsers).toHaveBeenCalledOnce();
    expect(invalidateGetMyRole).toHaveBeenCalledOnce();
  });
});
