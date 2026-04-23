import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockFeedbackCreate = vi.fn();
const mockFeedbackFindMany = vi.fn();
const mockFeedbackFindUnique = vi.fn();
const mockFeedbackUpdate = vi.fn();
const mockFeedbackDelete = vi.fn();
const mockFeedbackCount = vi.fn();
const mockFeedbackGroupBy = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    feedback: {
      create: (...a: unknown[]) => mockFeedbackCreate(...a),
      findMany: (...a: unknown[]) => mockFeedbackFindMany(...a),
      findUnique: (...a: unknown[]) => mockFeedbackFindUnique(...a),
      update: (...a: unknown[]) => mockFeedbackUpdate(...a),
      delete: (...a: unknown[]) => mockFeedbackDelete(...a),
      count: (...a: unknown[]) => mockFeedbackCount(...a),
      groupBy: (...a: unknown[]) => mockFeedbackGroupBy(...a),
    },
  },
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
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

vi.mock("@/mappers/feedback", () => ({
  FeedbackMapper: {
    toApiResponse: vi.fn((f) => ({ id: f.id, title: f.title })),
    toApiResponseArray: vi.fn((f) =>
      f.map((item: { id: string; title: string }) => ({
        id: item.id,
        title: item.title,
      }))
    ),
  },
}));

const { feedbackRouter } = await import("../feedback");

// --- Helpers ---

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      feedback: {
        create: mockFeedbackCreate,
        findMany: mockFeedbackFindMany,
        findUnique: mockFeedbackFindUnique,
        update: mockFeedbackUpdate,
        delete: mockFeedbackDelete,
        count: mockFeedbackCount,
        groupBy: mockFeedbackGroupBy,
      },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      email: "test@example.com",
      isActive: true,
      role: "ADMIN",
      workspaceId: "ws-1",
    },
    locale: "en",
    ...overrides,
  };
}

const mockFeedback = {
  id: "fb-1",
  type: "BUG",
  category: "UI_UX" as const,
  title: "Button broken",
  description: "The save button does not work",
  priority: "HIGH",
  email: "test@example.com",
  status: "OPEN",
  userId: "user-1",
  workspaceId: "ws-1",
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    id: "user-1",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
  },
};

const validSubmitInput = {
  type: "BUG" as const,
  category: "UI_UX" as const,
  title: "Button broken",
  description: "The save button does not work",
  priority: "HIGH" as const,
};

// --- Tests ---

describe("feedbackRouter.submit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates feedback record linked to current user", async () => {
    mockFeedbackCreate.mockResolvedValue(mockFeedback);

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    await caller.submit(validSubmitInput);

    expect(mockFeedbackCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1" }),
      })
    );
  });

  it("uses provided email over user email when supplied", async () => {
    mockFeedbackCreate.mockResolvedValue(mockFeedback);

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    await caller.submit({ ...validSubmitInput, email: "override@example.com" });

    expect(mockFeedbackCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "override@example.com" }),
      })
    );
  });
});

describe("feedbackRouter.getAll (ADMIN only)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated feedback list", async () => {
    mockFeedbackCount.mockResolvedValue(1);
    mockFeedbackFindMany.mockResolvedValue([mockFeedback]);

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    const result = await caller.getAll({ page: 1, limit: 10 });

    expect(result.feedback).toBeDefined();
    expect(mockFeedbackFindMany).toHaveBeenCalledOnce();
  });

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = feedbackRouter.createCaller(
      makeCtx({
        user: {
          id: "user-1",
          email: "u@u.com",
          isActive: true,
          role: "USER",
          workspaceId: "ws-1",
        },
      }) as never
    );

    await expect(caller.getAll({ page: 1, limit: 10 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("feedbackRouter.getById (ADMIN only)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when feedback does not exist", async () => {
    mockFeedbackFindUnique.mockResolvedValue(null);

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    await expect(caller.getById({ id: "fb-999" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns feedback when found", async () => {
    mockFeedbackFindUnique.mockResolvedValue(mockFeedback);

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    const result = await caller.getById({ id: "fb-1" });

    expect(result.feedback).toBeDefined();
  });
});

describe("feedbackRouter.delete (ADMIN only)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes feedback by id", async () => {
    mockFeedbackDelete.mockResolvedValue({});

    const caller = feedbackRouter.createCaller(makeCtx() as never);
    const result = await caller.delete({ id: "fb-1" });

    expect(mockFeedbackDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "fb-1" } })
    );
    expect(result.message).toBeDefined();
  });

  it("throws FORBIDDEN when user is not ADMIN", async () => {
    const caller = feedbackRouter.createCaller(
      makeCtx({
        user: {
          id: "user-1",
          email: "u@u.com",
          isActive: true,
          role: "USER",
          workspaceId: "ws-1",
        },
      }) as never
    );

    await expect(caller.delete({ id: "fb-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
