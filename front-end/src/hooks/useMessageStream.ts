import { useState, useEffect, useCallback, useRef } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useAuth } from "@/contexts/AuthContext";
import { useStopMessageStreaming } from "./useApi";

export interface StreamedMessage {
  id: number;
  queueName: string;
  serverId: string;
  timestamp: string;
  message: {
    payload: string;
    properties: Record<string, unknown>;
    routingKey?: string;
    exchange?: string;
    messageCount?: number;
    redelivered?: boolean;
  };
}

export interface QueueStats {
  type: "stats";
  queueName: string;
  serverId: string;
  timestamp: string;
  stats: {
    messages: number;
    messages_ready: number;
    messages_unacknowledged: number;
    consumers: number;
    publishRate: number;
    consumeRate: number;
  };
}

export interface StreamEvent {
  type: "message" | "stats" | "heartbeat" | "error";
  data:
    | StreamedMessage
    | QueueStats
    | { timestamp: string }
    | { error: string; timestamp: string };
}

export interface UseMessageStreamOptions {
  queueName: string;
  serverId: string;
  count?: number;
  enabled?: boolean;
}

export interface UseMessageStreamReturn {
  messages: StreamedMessage[];
  queueStats: QueueStats | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastHeartbeat: string | null;
  connect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
}

export function useMessageStream({
  queueName,
  serverId,
  count = 10,
  enabled = false,
}: UseMessageStreamOptions): UseMessageStreamReturn {
  const { token } = useAuth();
  const [messages, setMessages] = useState<StreamedMessage[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);

  // API hooks
  const stopStreamingMutation = useStopMessageStreaming();

  const eventSourceRef = useRef<AbortController | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isConnectingRef = useRef(false);
  const isConnectedRef = useRef(false);
  const lastConnectAttemptRef = useRef<number>(0);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const CONNECT_COOLDOWN = 5000; // 5 seconds cooldown between connection attempts
  const CONNECTION_TIMEOUT = 30000; // 30 seconds timeout for connection

  // Update refs when state changes
  useEffect(() => {
    isConnectingRef.current = isConnecting;
    isConnectedRef.current = isConnected;
  }, [isConnecting, isConnected]);

  const disconnect = useCallback(async () => {
    console.log("useMessageStream: Disconnecting", {
      hasEventSource: !!eventSourceRef.current,
      hasAbortController: !!abortControllerRef.current,
      isConnected: isConnectedRef.current,
      isConnecting: isConnectingRef.current,
      queueName,
      serverId,
    });

    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Clear visibility timeout
    if (visibilityTimeoutRef.current) {
      clearTimeout(visibilityTimeoutRef.current);
      visibilityTimeoutRef.current = null;
    }

    // First, close the EventSource connection
    if (eventSourceRef.current) {
      console.log("useMessageStream: Aborting SSE connection");
      eventSourceRef.current.abort();
      eventSourceRef.current = null;
    }
    if (
      abortControllerRef.current &&
      abortControllerRef.current !== eventSourceRef.current
    ) {
      console.log("useMessageStream: Aborting additional controller");
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Then, notify the backend to stop streaming (fire and forget)
    if (
      queueName &&
      serverId &&
      (isConnectedRef.current || isConnectingRef.current)
    ) {
      try {
        console.log("useMessageStream: Notifying backend to stop streaming");
        stopStreamingMutation.mutate(
          { serverId, queueName },
          {
            onSuccess: (result) => {
              console.log("useMessageStream: Backend stop successful", result);
            },
            onError: (error) => {
              console.warn(
                "useMessageStream: Error notifying backend to stop:",
                error
              );
              // Don't throw - this is just a notification
            },
          }
        );
      } catch (error) {
        console.warn("useMessageStream: Error calling stop endpoint:", error);
        // Continue with cleanup even if stop endpoint fails
      }
    }

    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
    console.log("useMessageStream: Disconnect complete");
  }, [queueName, serverId, stopStreamingMutation]);

  const connect = useCallback(() => {
    const now = Date.now();
    if (
      isConnectingRef.current ||
      isConnectedRef.current ||
      !queueName ||
      !serverId ||
      !token ||
      now - lastConnectAttemptRef.current < CONNECT_COOLDOWN
    ) {
      console.log("useMessageStream: Connect attempt blocked", {
        isConnecting: isConnectingRef.current,
        isConnected: isConnectedRef.current,
        hasQueueName: !!queueName,
        hasServerId: !!serverId,
        hasToken: !!token,
        cooldownRemaining:
          CONNECT_COOLDOWN - (now - lastConnectAttemptRef.current),
      });
      return;
    }

    console.log("useMessageStream: Starting new connection", {
      queueName,
      serverId,
    });
    lastConnectAttemptRef.current = now;

    // disconnect(); // Clean up any existing connection
    setIsConnecting(true);
    setError(null);

    const abortController = new AbortController();
    eventSourceRef.current = abortController;
    abortControllerRef.current = abortController;

    // Set connection timeout
    // connectionTimeoutRef.current = setTimeout(() => {
    //   console.log("useMessageStream: Connection timeout");
    //   setError("Connection timeout after 30 seconds");
    //   disconnect();
    // }, CONNECTION_TIMEOUT);

    const params = new URLSearchParams({
      count: count.toString(),
    });

    // Use the correct backend URL with port 3000
    const url = `http://localhost:3000/api/rabbitmq/servers/${serverId}/queues/${encodeURIComponent(queueName)}/messages/browse?${params}`;

    try {
      // Use fetchEventSource with proper authentication
      fetchEventSource(url, {
        signal: abortController.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        onopen: async (response) => {
          if (
            response.ok &&
            response.headers.get("content-type")?.includes("text/event-stream")
          ) {
            console.log("SSE connection opened");

            // Clear connection timeout on successful connection
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }

            setIsConnected(true);
            setIsConnecting(false);
            setError(null);
            return; // return here to keep the connection open
          } else if (
            response.status >= 400 &&
            response.status < 500 &&
            response.status !== 429
          ) {
            // client-side errors are not retryable
            const errorText = await response.text();
            console.error("Client error:", response.status, errorText);
            setError(`Client error: ${response.status}`);
            throw new Error(`Client error: ${response.status}`);
          } else {
            console.error("Connection failed:", response.status);
            setError(`Connection failed: ${response.status}`);
            throw new Error(`Connection failed: ${response.status}`);
          }
        },
        onmessage: (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "stats") {
              setQueueStats(data);
            } else if (data.type === "heartbeat") {
              setLastHeartbeat(data.timestamp);
            } else if (data.type === "error") {
              setError(data.error);
            } else if (data.message) {
              // This is a message event
              setMessages((prev) => {
                // Prevent duplicates by checking message ID
                const exists = prev.some((msg) => msg.id === data.id);
                if (exists) return prev;

                // Keep only the latest 100 messages to prevent memory issues
                const newMessages = [data, ...prev];
                return newMessages.slice(0, 100);
              });
            }
          } catch (parseError) {
            console.error("Error parsing SSE data:", parseError);
          }
        },
        onerror: (error) => {
          console.error("SSE connection error:", error);
          setError("Connection error occurred");
          setIsConnected(false);
          setIsConnecting(false);
          // fetchEventSource will handle retries automatically
          throw error; // Re-throw to let fetchEventSource handle it
        },
        onclose: () => {
          console.log("SSE connection closed");
          setIsConnected(false);
          setIsConnecting(false);
        },
      }).catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Error creating SSE connection:", error);
          setError("Failed to create connection");
        }
        setIsConnecting(false);
        setIsConnected(false);
      });
    } catch (connectError) {
      console.error("Error creating SSE connection:", connectError);
      setError("Failed to create connection");
      setIsConnecting(false);
    }

    // Set a timeout to abort the connection attempt if it takes too long
    // connectionTimeoutRef.current = setTimeout(() => {
    //   console.warn("Connection attempt timed out");
    //   disconnect();
    // }, CONNECTION_TIMEOUT);
  }, [queueName, serverId, count, token, disconnect]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Auto-connect when enabled - use refs to prevent unnecessary re-runs
  useEffect(() => {
    if (
      enabled &&
      queueName &&
      serverId &&
      !isConnectedRef.current &&
      !isConnectingRef.current
    ) {
      connect();
    } else if (
      !enabled &&
      (isConnectedRef.current || isConnectingRef.current)
    ) {
      disconnect();
    }
  }, [enabled, queueName, serverId, connect, disconnect]);

  // Disconnect when queue or server changes
  //   useEffect(() => {
  //     return () => {
  //       if (isConnectedRef.current || isConnectingRef.current) {
  //         disconnect();
  //       }
  //     };
  //   }, [queueName, serverId, disconnect]);

  // Cleanup on unmount
  //   useEffect(() => {
  //     return () => {
  //       disconnect();
  //     };
  //   }, [disconnect]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isConnectedRef.current || isConnectingRef.current) {
        console.log("useMessageStream: Page unloading, sending stop signal");
        // Use fetch with keepalive for reliable cleanup on page unload
        if (queueName && serverId && token) {
          fetch(
            `http://localhost:3000/api/rabbitmq/servers/${serverId}/queues/${encodeURIComponent(queueName)}/messages/browse/stop`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              keepalive: true, // 🔑 CRITICAL: Ensures request continues even if page unloads
            }
          ).catch((error) => {
            console.error(
              "useMessageStream: Error in beforeunload stop call:",
              error
            );
          });
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [queueName, serverId, token]);

  return {
    messages,
    queueStats,
    isConnected,
    isConnecting,
    error,
    lastHeartbeat,
    connect,
    disconnect,
    clearMessages,
  };
}
