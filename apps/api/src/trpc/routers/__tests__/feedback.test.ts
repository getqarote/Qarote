import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockFeedbackCreate = vi.fn();
const mockFeedbackFindMany = vi.fn();
const mockFeedbackCount = vi.fn();
const mockFeedbackFindUnique = vi.fn();
const mockFeedbackUpdate = vi.fn();
const mockFeedbackDelete = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    feedback: {
      create: (...a: unknown[]) => mockFeedbackCreate(...a),
      findMany: (...a: unknown[]) => mockFeedbackFindMany(...a),
      count: (...a: unknown[]) => mockFeedbackCount(...a),
      findUnique: (...a: unknown[]) => mockFeedbackFindUnique(...a),
      update: (...a: unknown[]) => mockFeedbackUpdate(...a),
      delete: (...a: unknown[]) => mockFeedbackDelete(...a),
    },
  },
}));

vi.mock("@/config/deployment", () => ({
  isSelfHostedMode: () => false,
  isCloudMode: () => true,
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/trpc/middlewares/rateLimiter", () => ({
  standardRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  strictRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  billingRateLimiter: (opts: { next: () => unknown }) => opts.next(),
}));

vi.mock("@/middlewares/workspace", () => ({
  hasWorkspaceAccess: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/services/plan/plan.service", () => ({
  getUserPlan: vi.fn(),
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

vi.mock("@/core/feature-flags", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
  getLicensePayload: vi.fn(),
  invalidateLicenseCache: vi.fn(),
  requirePremiumFeature: () => (opts: { next: () => unknown }) => opts.next(),
}));

vi.mock("@/config/features", () => ({
  FEATURES: {},
  getAllPremiumFeatures: () => [],
  FEATURE_DESCRIPTIONS: {},
}));

vi.mock("@/mappers/feedback", () => ({
  FeedbackMapper: {
    toApiResponse: vi.fn((f) => f),
    toApiResponseArray: vi.fn((arr) => arr),
  },
}));

// Import after mocks
const { feedbackRouter } = await import("../feedback");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      feedback: {
        create: mockFeedbackCreate,
        findMany: mockFeedbackFindMany,
        count: mockFeedbackCount,
        findUnique: mockFeedbackFindUnique,
        update: mockFeedbackUpdate,
        delete: mockFeedbackDelete,
      },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      email: "admin@example.com",
      role: "ADMIN",
      isActive: true,
      workspaceId: "ws-1",
    },
    workspaceId: "ws-1",
    locale: "en",
    req: {},
    ...overrides,
  };
}

const mockFeedback = {
  id: "fb-1",
  type: "BUG",
  category: "UI",
  title: "Button broken",
  description: "The button does nothing",
  priority: "HIGH",
  email: "user@example.com",
  status: "OPEN",
  metadata: {},
  userId: "user-1",
  workspaceId: "ws-1",
  user: {
    id: "user-1",
    email: "user@example.com",
    firstName: "Test",
    lastName: "User",
  },
  workspace: { id: "ws-1", name: "Test WS" },
  respondedBy: null,
  respondedAt: null,
  response: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// --- submit ---

describe("feedbackRouter.submit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates feedback and returns it", async () => {
    mockFeedbackCreate.mockResolvedValue(mockFeedback);

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    const result = await caller.submit({
      type: "BUG",
      category: "UI",
      title: "Button broken",
      description: "The button does nothing",
      priority: "HIGH",
    });

    expect(result.message).toBe("Feedback submitted successfully");
    expect(result.feedback.id).toBe("fb-1");
    expect(mockFeedbackCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "BUG",
          userId: "user-1",
          workspaceId: "ws-1",
        }),
      })
    );
  });

  it("uses provided email over user email when given", async () => {
    mockFeedbackCreate.mockResolvedValue(mockFeedback);

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    await caller.submit({
      type: "FEATURE",
      category: "UX",
      title: "Feature request",
      description: "Please add this",
      priority: "LOW",
      email: "custom@example.com",
    });

    expect(mockFeedbackCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "custom@example.com" }),
      })
    );
  });
});

// --- getAll ---

describe("feedbackRouter.getAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated feedback list", async () => {
    mockFeedbackFindMany.mockResolvedValue([mockFeedback]);
    mockFeedbackCount.mockResolvedValue(1);

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    const result = await caller.getAll({ page: 1, limit: 10 });

    expect(result.feedback).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.pages).toBe(1);
  });

  it("returns empty list when no feedback", async () => {
    mockFeedbackFindMany.mockResolvedValue([]);
    mockFeedbackCount.mockResolvedValue(0);

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    const result = await caller.getAll({ page: 1, limit: 10 });

    expect(result.feedback).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  it("applies status filter when provided", async () => {
    mockFeedbackFindMany.mockResolvedValue([]);
    mockFeedbackCount.mockResolvedValue(0);

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    await caller.getAll({ page: 1, limit: 10, status: "OPEN" });

    expect(mockFeedbackFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "OPEN" }),
      })
    );
  });
});

// --- getById ---

describe("feedbackRouter.getById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns feedback by ID", async () => {
    mockFeedbackFindUnique.mockResolvedValue(mockFeedback);

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    const result = await caller.getById({ id: "fb-1" });

    expect(result.feedback.id).toBe("fb-1");
  });

  it("throws NOT_FOUND when feedback not found", async () => {
    mockFeedbackFindUnique.mockResolvedValue(null);

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    await expect(caller.getById({ id: "no-such-id" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// --- update ---

describe("feedbackRouter.update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates feedback status", async () => {
    mockFeedbackUpdate.mockResolvedValue({
      ...mockFeedback,
      status: "IN_PROGRESS",
    });

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    const result = await caller.update({ id: "fb-1", status: "IN_PROGRESS" });

    expect(result.feedback.status).toBe("IN_PROGRESS");
    expect(mockFeedbackUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "fb-1" },
        data: expect.objectContaining({ status: "IN_PROGRESS" }),
      })
    );
  });

  it("sets respondedById when response is included", async () => {
    mockFeedbackUpdate.mockResolvedValue({
      ...mockFeedback,
      response: "Fixed!",
    });

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    await caller.update({ id: "fb-1", response: "Fixed!" });

    expect(mockFeedbackUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          response: "Fixed!",
          respondedById: "user-1",
        }),
      })
    );
  });
});

// --- delete ---

describe("feedbackRouter.delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes feedback and returns success message", async () => {
    mockFeedbackDelete.mockResolvedValue({});

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    const result = await caller.delete({ id: "fb-1" });

    expect(result.message).toBe("Feedback deleted successfully");
    expect(mockFeedbackDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "fb-1" } })
    );
  });
});

// --- getStats ---

describe("feedbackRouter.getStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns feedback counts by status", async () => {
    // getStats calls count 5 times in parallel
    mockFeedbackCount
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(4) // open
      .mockResolvedValueOnce(2) // inProgress
      .mockResolvedValueOnce(3) // resolved
      .mockResolvedValueOnce(1); // closed

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    const result = await caller.getStats({});

    expect(result.total).toBe(10);
    expect(result.open).toBe(4);
    expect(result.inProgress).toBe(2);
    expect(result.resolved).toBe(3);
    expect(result.closed).toBe(1);
  });

  it("filters by workspaceId when provided", async () => {
    mockFeedbackCount.mockResolvedValue(0);

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    await caller.getStats({ workspaceId: "ws-1" });

    expect(mockFeedbackCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "ws-1" }),
      })
    );
  });
});
