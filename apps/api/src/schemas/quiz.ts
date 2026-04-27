import { z } from "zod";

import { QuizLeadTier } from "@/generated/prisma/client";

export const captureSchema = z.object({
  email: z.email(),
  tier: z.enum(["reactive", "proactive", "production-grade"]),
  score: z.number().int().min(0).max(100),
});

export const TIER_PRISMA_MAP: Record<
  "reactive" | "proactive" | "production-grade",
  QuizLeadTier
> = {
  reactive: QuizLeadTier.reactive,
  proactive: QuizLeadTier.proactive,
  "production-grade": QuizLeadTier.production_grade,
};
