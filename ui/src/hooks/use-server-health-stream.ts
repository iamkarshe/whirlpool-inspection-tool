import { useCallback, useEffect, useRef, useState } from "react";

import type { ServerHealthSnapshot } from "@/api/generated/model/serverHealthSnapshot";
import {
  buildServerHealthWebSocketUrl,
  getSessionAccessToken,
} from "@/services/server-health-api";

export type ServerHealthStreamStatus =
  | "idle"
  | "connecting"
  | "live"
  | "reconnecting"
  | "unauthorized"
  | "forbidden"
  | "closed";

const WS_CLOSE_UNAUTHORIZED = 4401;
const WS_CLOSE_FORBIDDEN = 4403;
const PING_INTERVAL_MS = 30_000;
const RECONNECT_BACKOFF_MS = [1000, 2000, 5000, 10_000, 30_000] as const;

type WsPayload = {
  type?: string;
};

function isServerHealthSnapshot(value: unknown): value is ServerHealthSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.collected_at === "string" &&
    typeof record.host === "object" &&
    record.host !== null
  );
}

export function useServerHealthStream(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<ServerHealthSnapshot | null>(null);
  const [status, setStatus] = useState<ServerHealthStreamStatus>("idle");
  const [closeReason, setCloseReason] = useState<string | null>(null);
  const reconnectAttemptRef = useRef(0);
  const connectRef = useRef<(() => void) | null>(null);

  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0;
    connectRef.current?.();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let socket: WebSocket | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const clearPing = () => {
      if (pingTimer !== null) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    };

    const clearReconnect = () => {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      const attempt = reconnectAttemptRef.current;
      const delay =
        RECONNECT_BACKOFF_MS[Math.min(attempt, RECONNECT_BACKOFF_MS.length - 1)];
      reconnectAttemptRef.current = attempt + 1;
      setStatus("reconnecting");
      setCloseReason("Live connection lost. Reconnecting…");
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposed) return;

      const token = getSessionAccessToken();
      if (!token) {
        setStatus("unauthorized");
        setCloseReason("No access token. Sign in again.");
        return;
      }

      clearReconnect();
      setStatus(
        reconnectAttemptRef.current === 0 ? "connecting" : "reconnecting",
      );

      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
        socket = null;
      }

      socket = new WebSocket(buildServerHealthWebSocketUrl(token));

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
        setStatus("live");
        setCloseReason(null);
        clearPing();
        pingTimer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ action: "ping" }));
          }
        }, PING_INTERVAL_MS);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as WsPayload;
          if (payload.type === "pong") return;
          if (isServerHealthSnapshot(payload)) {
            setSnapshot(payload);
          }
        } catch {
          // ignore malformed frames
        }
      };

      socket.onerror = () => {
        if (!disposed && socket?.readyState !== WebSocket.OPEN) {
          setCloseReason("WebSocket connection failed. Retrying…");
        }
      };

      socket.onclose = (event) => {
        clearPing();
        socket = null;
        if (disposed) {
          setStatus("closed");
          return;
        }
        if (event.code === WS_CLOSE_UNAUTHORIZED) {
          setStatus("unauthorized");
          setCloseReason(
            "Session expired or invalid. Refresh the page and sign in again.",
          );
          return;
        }
        if (event.code === WS_CLOSE_FORBIDDEN) {
          setStatus("forbidden");
          setCloseReason("You do not have permission to view server health.");
          return;
        }
        scheduleReconnect();
      };
    };

    connectRef.current = connect;
    queueMicrotask(() => connect());

    return () => {
      disposed = true;
      connectRef.current = null;
      clearPing();
      clearReconnect();
      socket?.close();
      setStatus("closed");
    };
  }, [enabled]);

  return {
    snapshot,
    status: enabled ? status : "idle",
    closeReason: enabled ? closeReason : null,
    reconnect,
  };
}
