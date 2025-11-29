import { cors } from "hono/cors";

import { corsConfig } from "@/config";

// Parse CORS origins - support comma-separated string or array
const parseCorsOrigins = (origin: string): string[] | string => {
  if (origin.includes(",")) {
    // Multiple origins - return array
    return origin
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
  }
  // Single origin or wildcard
  return origin;
};

export const corsMiddleware = cors({
  origin: parseCorsOrigins(corsConfig.origin),
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600, // 10 minutes
  credentials: true,
});
