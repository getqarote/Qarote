/**
 * Message Browser Utilities
 * Helper functions for message formatting and processing
 */

/**
 * Format message payload for display
 */
export const formatPayload = (payload: string, encoding?: string): string => {
  try {
    if (encoding === "base64") {
      const decoded = atob(payload);
      try {
        return JSON.stringify(JSON.parse(decoded), null, 2);
      } catch {
        return decoded;
      }
    }
    const parsed = JSON.parse(payload);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return payload;
  }
};

/**
 * Determine payload type for display
 */
export const getPayloadType = (payload: string, encoding?: string): string => {
  try {
    if (encoding === "base64") {
      const decoded = atob(payload);
      try {
        JSON.parse(decoded);
        return "JSON";
      } catch {
        return "Text";
      }
    }
    JSON.parse(payload);
    return "JSON";
  } catch {
    return "Text";
  }
};

/**
 * Enhanced message search function
 */
export const searchMessages = <
  T extends {
    queueName?: string;
    routing_key?: string;
    payload?: string;
    properties?: {
      message_id?: string;
      type?: string;
      content_type?: string;
      user_id?: string;
      app_id?: string;
      correlation_id?: string;
      reply_to?: string;
      headers?: Record<string, unknown>;
    };
  }
>(
  messages: T[],
  searchTerm: string
): T[] => {
  if (!searchTerm.trim()) return messages;

  const searchLower = searchTerm.toLowerCase();

  return messages.filter((message) => {
    // Search in queue name
    if (message.queueName?.toLowerCase().includes(searchLower)) return true;

    // Search in routing key
    if (message.routing_key?.toLowerCase().includes(searchLower)) return true;

    // Search in payload (handle both string and object payloads)
    if (message.payload) {
      const payloadString =
        typeof message.payload === "string"
          ? message.payload
          : JSON.stringify(message.payload);
      if (payloadString.toLowerCase().includes(searchLower)) return true;
    }

    // Search in message properties
    if (message.properties) {
      // Search in specific properties
      if (message.properties.message_id?.toLowerCase().includes(searchLower))
        return true;
      if (message.properties.type?.toLowerCase().includes(searchLower))
        return true;
      if (message.properties.content_type?.toLowerCase().includes(searchLower))
        return true;
      if (message.properties.user_id?.toLowerCase().includes(searchLower))
        return true;
      if (message.properties.app_id?.toLowerCase().includes(searchLower))
        return true;
      if (
        message.properties.correlation_id?.toLowerCase().includes(searchLower)
      )
        return true;
      if (message.properties.reply_to?.toLowerCase().includes(searchLower))
        return true;

      // Search in headers
      if (message.properties.headers) {
        const headersString = JSON.stringify(message.properties.headers);
        if (headersString.toLowerCase().includes(searchLower)) return true;
      }
    }

    return false;
  });
};
