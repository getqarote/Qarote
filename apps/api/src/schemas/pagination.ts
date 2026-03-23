import { z } from "zod";

export const PaginationInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

type PaginationInput = z.infer<typeof PaginationInputSchema>;

export function paginateQuery(input: PaginationInput) {
  const { page, limit } = input;
  return { skip: (page - 1) * limit, take: limit };
}

export function paginationMeta(page: number, limit: number, total: number) {
  return { page, limit, total, pages: Math.ceil(total / limit) };
}
