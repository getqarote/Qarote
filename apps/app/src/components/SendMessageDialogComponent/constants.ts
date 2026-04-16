/** Exchange dot colors reused from the queue binding field. */
export const EXCHANGE_DOT_CLASS: Record<string, string> = {
  direct: "bg-success",
  fanout: "bg-info",
  topic: "bg-warning",
  headers: "bg-muted-foreground",
};

export const CONTENT_TYPES = [
  "application/json",
  "text/plain",
  "application/xml",
  "text/xml",
  "application/octet-stream",
  "text/html",
  "text/csv",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/protobuf",
  "application/avro",
] as const;

export const CONTENT_ENCODINGS = [
  "none",
  "gzip",
  "deflate",
  "base64",
  "compress",
  "br",
  "identity",
] as const;
