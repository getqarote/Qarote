import { beforeEach, describe, expect, it, vi } from "vitest";

const mockOrgFindUnique = vi.fn();
const mockCancelSubscription = vi.fn();

// In-transaction operation mocks.
const txWorkspaceFindMany = vi.fn();
const txWorkspaceDeleteMany = vi.fn();
const txServerDeleteMany = vi.fn();
const txLicenseDeleteMany = vi.fn();
const txOrgDelete = vi.fn();

const txClient = {
  workspace: {
    findMany: (...a: unknown[]) => txWorkspaceFindMany(...a),
    deleteMany: (...a: unknown[]) => txWorkspaceDeleteMany(...a),
  },
  rabbitMQServer: { deleteMany: (...a: unknown[]) => txServerDeleteMany(...a) },
  license: { deleteMany: (...a: unknown[]) => txLicenseDeleteMany(...a) },
  organization: { delete: (...a: unknown[]) => txOrgDelete(...a) },
};

vi.mock("@/core/prisma", () => ({
  prisma: {
    organization: {
      findUnique: (...a: unknown[]) => mockOrgFindUnique(...a),
    },
    $transaction: (fn: (tx: typeof txClient) => Promise<unknown>) =>
      fn(txClient),
  },
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/services/stripe/stripe.service", () => ({
  StripeService: {
    cancelSubscription: (...a: unknown[]) => mockCancelSubscription(...a),
  },
}));

const { deleteOrganizationCascade, SubscriptionCancelFailedError } =
  await import("../org-deletion.service");

beforeEach(() => {
  vi.clearAllMocks();
  txWorkspaceFindMany.mockResolvedValue([{ id: "ws-1" }, { id: "ws-2" }]);
  txWorkspaceDeleteMany.mockResolvedValue({ count: 2 });
  txServerDeleteMany.mockResolvedValue({ count: 1 });
  txLicenseDeleteMany.mockResolvedValue({ count: 0 });
  txOrgDelete.mockResolvedValue({});
});

describe("deleteOrganizationCascade", () => {
  it("cancels a live subscription IMMEDIATELY, then tears down the org subtree", async () => {
    mockOrgFindUnique.mockResolvedValue({
      subscription: { stripeSubscriptionId: "sub_live", status: "ACTIVE" },
    });
    mockCancelSubscription.mockResolvedValue({});

    await deleteOrganizationCascade("org-1");

    // false === cancel immediately, on the relation's subId.
    expect(mockCancelSubscription).toHaveBeenCalledWith("sub_live", false);
    // SET-NULL children removed explicitly so servers/licenses don't orphan.
    expect(txServerDeleteMany).toHaveBeenCalledWith({
      where: { workspaceId: { in: ["ws-1", "ws-2"] } },
    });
    expect(txLicenseDeleteMany).toHaveBeenCalledWith({
      where: { workspaceId: { in: ["ws-1", "ws-2"] } },
    });
    expect(txWorkspaceDeleteMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
    });
    expect(txOrgDelete).toHaveBeenCalledWith({ where: { id: "org-1" } });
    // Ordering: cancel precedes the destructive transaction.
    expect(mockCancelSubscription.mock.invocationCallOrder[0]).toBeLessThan(
      txOrgDelete.mock.invocationCallOrder[0]
    );
  });

  it("skips cancellation for a terminal subscription but still deletes", async () => {
    mockOrgFindUnique.mockResolvedValue({
      subscription: { stripeSubscriptionId: "sub_x", status: "CANCELED" },
    });

    await deleteOrganizationCascade("org-1");

    expect(mockCancelSubscription).not.toHaveBeenCalled();
    expect(txOrgDelete).toHaveBeenCalled();
  });

  it("does not cancel when the org has no Subscription row", async () => {
    mockOrgFindUnique.mockResolvedValue({
      subscription: null,
    });

    await deleteOrganizationCascade("org-1");

    expect(mockCancelSubscription).not.toHaveBeenCalled();
    expect(txOrgDelete).toHaveBeenCalledWith({ where: { id: "org-1" } });
  });

  it("skips the child deletes when the org has no workspaces", async () => {
    mockOrgFindUnique.mockResolvedValue({
      subscription: null,
    });
    txWorkspaceFindMany.mockResolvedValue([]);

    await deleteOrganizationCascade("org-1");

    expect(txServerDeleteMany).not.toHaveBeenCalled();
    expect(txLicenseDeleteMany).not.toHaveBeenCalled();
    expect(txWorkspaceDeleteMany).toHaveBeenCalled();
    expect(txOrgDelete).toHaveBeenCalled();
  });

  it("ABORTS (no DB writes) and throws when Stripe cancel fails — fail-safe", async () => {
    mockOrgFindUnique.mockResolvedValue({
      subscription: { stripeSubscriptionId: "sub_live", status: "ACTIVE" },
    });
    mockCancelSubscription.mockRejectedValue(new Error("stripe down"));

    await expect(deleteOrganizationCascade("org-1")).rejects.toBeInstanceOf(
      SubscriptionCancelFailedError
    );
    expect(txOrgDelete).not.toHaveBeenCalled();
    expect(txWorkspaceDeleteMany).not.toHaveBeenCalled();
  });

  it("is idempotent when the org is already gone", async () => {
    mockOrgFindUnique.mockResolvedValue(null);

    await expect(deleteOrganizationCascade("org-1")).resolves.toBeUndefined();
    expect(mockCancelSubscription).not.toHaveBeenCalled();
    expect(txOrgDelete).not.toHaveBeenCalled();
  });
});
