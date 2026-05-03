import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import {
  extractGatePayload,
  throwGateError,
} from "@/services/feature-gate/error";

import { PlanLimitExceededError, PlanValidationError } from "../plan.service";
import { planErrorToBlockedGate } from "../plan-gate";

import { UserPlan } from "@/generated/prisma/client";

describe("planErrorToBlockedGate", () => {
  it("maps PlanValidationError to a featureRequiresUpgrade BlockedGate", () => {
    const err = new PlanValidationError(
      "Server creation",
      UserPlan.FREE,
      "Developer or Enterprise"
    );
    const gate = planErrorToBlockedGate(err);
    expect(gate).toEqual({
      kind: "blocked",
      blockedBy: "plan",
      feature: "workspace_management",
      reasonKey: "plan.featureRequiresUpgrade",
      reasonParams: {
        feature: "Server creation",
        currentPlan: UserPlan.FREE,
      },
    });
  });

  it("preserves the descriptive feature name in reasonParams.feature", () => {
    // RabbitMQ version validation packs the version into the feature string.
    const err = new PlanValidationError(
      "RabbitMQ version 3.12",
      UserPlan.FREE,
      "Developer or Enterprise"
    );
    const gate = planErrorToBlockedGate(err);
    expect(gate?.reasonParams).toMatchObject({
      feature: "RabbitMQ version 3.12",
    });
  });

  it("maps PlanLimitExceededError to a limitExceeded BlockedGate with current/max", () => {
    const err = new PlanLimitExceededError(
      "User invitation",
      5,
      3,
      UserPlan.DEVELOPER
    );
    const gate = planErrorToBlockedGate(err);
    expect(gate).toEqual({
      kind: "blocked",
      blockedBy: "plan",
      feature: "workspace_management",
      reasonKey: "plan.limitExceeded",
      reasonParams: {
        feature: "User invitation",
        current: 5,
        max: 3,
        currentPlan: UserPlan.DEVELOPER,
      },
    });
  });

  it("returns null for a plain Error so the caller re-throws", () => {
    expect(planErrorToBlockedGate(new Error("boom"))).toBeNull();
  });

  it("returns null for non-error values", () => {
    expect(planErrorToBlockedGate(null)).toBeNull();
    expect(planErrorToBlockedGate(undefined)).toBeNull();
    expect(planErrorToBlockedGate("string error")).toBeNull();
    expect(planErrorToBlockedGate({ message: "duck-typed" })).toBeNull();
  });
});

describe("plan-error → gate → wire round trip", () => {
  // Simulates exactly what `planValidationProcedure` does in trpc.ts:
  // catches a plan error, converts it via `planErrorToBlockedGate`, and
  // throws the gate via `throwGateError`. The errorFormatter then lifts
  // the payload via `extractGatePayload` onto `shape.data.gate`. This
  // test locks in that contract — a regression in any link breaks the
  // frontend's `readGateError` consumer silently otherwise.
  function simulateMiddleware(thrown: unknown): TRPCError {
    try {
      const gate = planErrorToBlockedGate(thrown);
      if (gate) throwGateError(gate);
      throw thrown;
    } catch (e) {
      return e as TRPCError;
    }
  }

  it("PlanValidationError → FORBIDDEN with featureRequiresUpgrade payload", () => {
    const tRpcError = simulateMiddleware(
      new PlanValidationError("Server creation", UserPlan.FREE, "Developer")
    );
    expect(tRpcError).toBeInstanceOf(TRPCError);
    expect(tRpcError.code).toBe("FORBIDDEN");
    const payload = extractGatePayload(tRpcError);
    expect(payload).toMatchObject({
      blockedBy: "plan",
      feature: "workspace_management",
      reasonKey: "plan.featureRequiresUpgrade",
      reasonParams: { feature: "Server creation", currentPlan: UserPlan.FREE },
    });
  });

  it("PlanLimitExceededError → FORBIDDEN with limitExceeded payload + counts", () => {
    const tRpcError = simulateMiddleware(
      new PlanLimitExceededError("User invitation", 5, 3, UserPlan.DEVELOPER)
    );
    expect(tRpcError.code).toBe("FORBIDDEN");
    const payload = extractGatePayload(tRpcError);
    expect(payload?.reasonKey).toBe("plan.limitExceeded");
    expect(payload?.reasonParams).toMatchObject({
      feature: "User invitation",
      current: 5,
      max: 3,
      currentPlan: UserPlan.DEVELOPER,
    });
  });
});
