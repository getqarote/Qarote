import { beforeEach, describe, expect, it, vi } from "vitest";

// Spies for invalidate calls
const invalidateSession = vi.fn();
const invalidateWorkspaceUsers = vi.fn();
const invalidateGetUserWorkspaces = vi.fn();
const invalidateGetCurrent = vi.fn();

// Capture the onSuccess callback passed to useMutation
let capturedOnSuccess: (() => void) | undefined;

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({
      auth: { session: { getSession: { invalidate: invalidateSession } } },
      user: { getWorkspaceUsers: { invalidate: invalidateWorkspaceUsers } },
      workspace: {
        management: {
          getUserWorkspaces: { invalidate: invalidateGetUserWorkspaces },
        },
        core: { getCurrent: { invalidate: invalidateGetCurrent } },
      },
    }),
    workspace: {
      management: {
        update: {
          useMutation: (opts: { onSuccess?: () => void }) => {
            capturedOnSuccess = opts.onSuccess;
            return { mutate: vi.fn(), mutateAsync: vi.fn() };
          },
        },
      },
    },
  },
}));

vi.mock("@/contexts/AuthContextDefinition", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock("../../ui/useWorkspace", () => ({
  useWorkspace: () => ({ workspace: { id: "test-ws" } }),
}));

describe("useUpdateWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnSuccess = undefined;
  });

  it("should invalidate all required queries on success", async () => {
    // Dynamic import after mocks are set up
    const { useUpdateWorkspace } = await import("./useWorkspaceApi");
    useUpdateWorkspace();

    expect(capturedOnSuccess).toBeDefined();
    capturedOnSuccess!();

    expect(invalidateSession).toHaveBeenCalledOnce();
    expect(invalidateWorkspaceUsers).toHaveBeenCalledOnce();
    expect(invalidateGetUserWorkspaces).toHaveBeenCalledOnce();
    expect(invalidateGetCurrent).toHaveBeenCalledOnce();
  });
});
