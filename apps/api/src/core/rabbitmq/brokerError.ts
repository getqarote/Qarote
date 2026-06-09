/**
 * Classify a broker-side failure into a kind the frontend can branch on
 * (cockpit ConnectionBar renders a distinct state per kind).
 *
 *   auth        — credentials rejected (HTTP 401/403 from the Management API)
 *   unreachable — network-level failure (DNS, refused, timeout)
 *   error       — anything else (Qarote/broker-side, unexpected HTTP)
 *
 * `BaseClient` throws `Error("RabbitMQ API error: <status> <text>")` for HTTP
 * errors and lets undici network errors propagate (the real code lives on
 * `error.cause.code`). We inspect both.
 */

type BrokerErrorKind = "auth" | "unreachable" | "error";

const NETWORK_RE =
  /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|ECONNRESET|EHOSTUNREACH|fetch failed|getaddrinfo|socket hang up|network|timed? ?out/i;

export function classifyBrokerError(error: unknown): BrokerErrorKind {
  const message = error instanceof Error ? error.message : String(error);

  // HTTP error from BaseClient: "RabbitMQ API error: <status> <statusText>"
  const statusMatch = message.match(/RabbitMQ API error:\s*(\d{3})/);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    if (status === 401 || status === 403) return "auth";
    return "error";
  }

  // Network-level failure — the undici code is usually on error.cause.
  const causeText =
    error instanceof Error && error.cause
      ? typeof error.cause === "object" && "code" in error.cause
        ? String((error.cause as { code: unknown }).code)
        : String(error.cause)
      : "";
  if (NETWORK_RE.test(message) || NETWORK_RE.test(causeText)) {
    return "unreachable";
  }

  return "error";
}
