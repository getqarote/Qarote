import crypto from "node:crypto";

import type { Context } from "hono";
import { Hono } from "hono";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { createRateLimiter } from "@/middlewares/rateLimiter";

import { captureSchema, TIER_PRISMA_MAP } from "@/schemas/quiz";

function getClientIp(c: Context): string | null {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    null
  );
}

const quizRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour window
  5, // 5 submissions per IP per hour
  (c) => {
    const ip = getClientIp(c);
    return ip ? `quiz:${ip}` : `quiz:no-proxy`;
  }
);

// Keep in sync with TIERS[].range in apps/web/src/lib/quiz-logic.ts
const TIER_THRESHOLDS: Record<
  "reactive" | "proactive" | "production-grade",
  [number, number]
> = {
  reactive: [0, 40],
  proactive: [41, 70],
  "production-grade": [71, 100],
};

const quizController = new Hono();

quizController.post("/lead", quizRateLimiter, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = captureSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      400
    );
  }

  const { email, tier, score } = parsed.data;

  const [min, max] = TIER_THRESHOLDS[tier];
  if (score < min || score > max) {
    return c.json({ error: "Score does not match tier" }, 400);
  }

  const rawIp = getClientIp(c);
  const ipHash = rawIp
    ? crypto.createHash("sha256").update(rawIp).digest("hex").slice(0, 16)
    : null;

  try {
    await prisma.quizLead.create({
      data: {
        email,
        tier: TIER_PRISMA_MAP[tier],
        score,
        ipHash,
        source: "quiz",
      },
    });
    return c.json({ ok: true }, 201);
  } catch (error) {
    logger.error({ error }, "Failed to save quiz lead");
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default quizController;
