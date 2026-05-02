/**
 * Payload detection helpers shared by message-spy / tap / recording.
 *
 * Decides whether a RabbitMQ message body should be rendered as text or
 * as a hex preview. Lives under `core/rabbitmq` because the heuristic
 * is broker-agnostic but only ever runs on bodies pulled off a queue —
 * it has no business with HTTP request payloads or arbitrary uploads.
 */

/**
 * Strategy:
 *
 *   1. If the content-type is set, parse the media type (strip
 *      parameters such as `; charset=utf-8`, lowercase) and accept
 *      anything that is structurally text: `text/*`,
 *      `application/json`, `application/xml`, `application/yaml`, and
 *      any media type using the RFC 6839 structured-syntax suffixes
 *      `+json`, `+xml`, `+yaml`.
 *   2. If the content-type is missing or unrecognized, sniff the
 *      payload for null bytes in the first 512 bytes — null bytes are
 *      a strong binary indicator (the same heuristic `file(1)` uses
 *      for text vs binary).
 */
export function isTextPayload(
  contentType: string | undefined,
  content: Buffer
): boolean {
  if (contentType) {
    const mediaType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (mediaType.startsWith("text/")) return true;
    if (mediaType === "application/json") return true;
    if (mediaType === "application/xml") return true;
    if (mediaType === "application/yaml") return true;
    if (mediaType === "application/x-yaml") return true;
    if (mediaType === "application/javascript") return true;
    if (mediaType === "application/ecmascript") return true;
    // RFC 6839 structured syntax suffixes (e.g. application/vnd.api+json)
    if (mediaType.endsWith("+json")) return true;
    if (mediaType.endsWith("+xml")) return true;
    if (mediaType.endsWith("+yaml")) return true;
    // Unrecognized content-type (e.g. application/octet-stream): fall through
    // to null-byte sniffing so we still display text payloads correctly.
  }

  // No content-type or unrecognized — sniff for null bytes in the first 512 bytes
  const sample = content.subarray(0, Math.min(content.length, 512));
  for (const byte of sample) {
    if (byte === 0x00) return false;
  }
  return true;
}
