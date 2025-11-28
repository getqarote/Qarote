import { cors } from "hono/cors";

import { corsConfig } from "@/config";

export const corsMiddleware = cors({
  origin: corsConfig.origin,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600, // 10 minutes
  credentials: true,
});
