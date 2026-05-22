import { describe, expect, it, vi } from "vitest";

import { withSerializableRetry } from "@/core/serializable-retry";

import { Prisma } from "@/generated/prisma/client";

function makeSerializationFailure(): Error {
  // Construct a Prisma known-error with the P2034 code (write-conflict
  // on transactions) — what Prisma surfaces for SQLSTATE 40001.
  return new Prisma.PrismaClientKnownRequestError(
    "Write conflict — transaction failed due to a write conflict or a deadlock.",
    {
      code: "P2034",
      clientVersion: "test",
    }
  );
}

describe("withSerializableRetry", () => {
  it("returns the result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withSerializableRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on SQLSTATE 40001 and returns the eventual success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeSerializationFailure())
      .mockRejectedValueOnce(makeSerializationFailure())
      .mockResolvedValue("ok");
    await expect(withSerializableRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("gives up after 3 attempts on persistent serialization failure", async () => {
    const fn = vi.fn().mockRejectedValue(makeSerializationFailure());
    await expect(withSerializableRetry(fn)).rejects.toMatchObject({
      code: "P2034",
    });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("propagates non-serialization errors immediately (no retry)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new Error("validation failed: missing field"));
    await expect(withSerializableRetry(fn)).rejects.toThrow(
      "validation failed"
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("recognises raw SQLSTATE 40001 from non-Prisma drivers", async () => {
    const rawErr = Object.assign(new Error("serialization_failure"), {
      code: "40001",
    });
    const fn = vi.fn().mockRejectedValueOnce(rawErr).mockResolvedValue("ok");
    await expect(withSerializableRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
