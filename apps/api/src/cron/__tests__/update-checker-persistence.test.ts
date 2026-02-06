import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/core/prisma";

/**
 * Test suite for SystemState persistence in update checker
 * Verifies that lastNotifiedVersion survives process restarts
 */
describe("Update Checker - SystemState Persistence", () => {
  const SYSTEM_STATE_KEY = "last_notified_version";

  beforeEach(async () => {
    // Clean up any existing state
    await prisma.systemState.deleteMany({
      where: { key: SYSTEM_STATE_KEY },
    });
  });

  afterEach(async () => {
    // Clean up after tests
    await prisma.systemState.deleteMany({
      where: { key: SYSTEM_STATE_KEY },
    });
  });

  it("should persist last notified version to database", async () => {
    // Arrange
    const version = "1.2.0";

    // Act - Simulate setting the version
    await prisma.systemState.upsert({
      where: { key: SYSTEM_STATE_KEY },
      update: { value: version },
      create: {
        key: SYSTEM_STATE_KEY,
        value: version,
      },
    });

    // Assert - Verify it was saved
    const state = await prisma.systemState.findUnique({
      where: { key: SYSTEM_STATE_KEY },
    });

    expect(state).not.toBeNull();
    expect(state?.value).toBe(version);
  });

  it("should retrieve last notified version after 'restart' (separate query)", async () => {
    // Arrange - Simulate first process: set version
    const version = "1.3.0";
    await prisma.systemState.create({
      data: {
        key: SYSTEM_STATE_KEY,
        value: version,
      },
    });

    // Act - Simulate second process: retrieve version
    const state = await prisma.systemState.findUnique({
      where: { key: SYSTEM_STATE_KEY },
    });

    // Assert - Version should be retrievable
    expect(state).not.toBeNull();
    expect(state?.value).toBe(version);
  });

  it("should update existing version using upsert", async () => {
    // Arrange - Create initial version
    await prisma.systemState.create({
      data: {
        key: SYSTEM_STATE_KEY,
        value: "1.0.0",
      },
    });

    // Act - Update to new version
    const newVersion = "1.1.0";
    await prisma.systemState.upsert({
      where: { key: SYSTEM_STATE_KEY },
      update: { value: newVersion },
      create: {
        key: SYSTEM_STATE_KEY,
        value: newVersion,
      },
    });

    // Assert - Should have updated version
    const state = await prisma.systemState.findUnique({
      where: { key: SYSTEM_STATE_KEY },
    });

    expect(state?.value).toBe(newVersion);

    // Verify only one record exists
    const count = await prisma.systemState.count({
      where: { key: SYSTEM_STATE_KEY },
    });
    expect(count).toBe(1);
  });

  it("should return null when no version has been set", async () => {
    // Act
    const state = await prisma.systemState.findUnique({
      where: { key: SYSTEM_STATE_KEY },
    });

    // Assert
    expect(state).toBeNull();
  });
});
