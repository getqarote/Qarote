import { cors } from "hono/cors";

import { corsConfig } from "@/config";

// Parse CORS origins - support comma-separated string or array.
// When origin is "*" and credentials are enabled, browsers reject
// Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true.
// In that case, reflect the requesting origin instead (allow-all behavior).
const parseCorsOrigins = (
  origin: string
): string[] | string | ((requestOrigin: string) => string | undefined) => {
  if (origin === "*") {
    // Reflect the requesting origin so credentials work
    return (requestOrigin: string) => requestOrigin || "*";
  }
  if (origin.includes(",")) {
    return origin
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
  }
  return origin;
};

export const corsMiddleware = cors({
  origin: parseCorsOrigins(corsConfig.origin),
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-workspace-id"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600, // 10 minutes
  credentials: true,
});
