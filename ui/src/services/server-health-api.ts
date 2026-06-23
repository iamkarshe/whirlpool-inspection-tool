import { isAxiosError } from "axios";

import type { ServerHealthSnapshot } from "@/api/generated/model/serverHealthSnapshot";
import { getApiBaseUrl } from "@/api/axios-instance";
import { getServerHealth } from "@/api/generated/server-health/server-health";
import { SESSION_ACCESS_TOKEN_KEY } from "@/lib/clear-authenticated-session-storage";

export type { ServerHealthSnapshot };

export function getSessionAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(SESSION_ACCESS_TOKEN_KEY)?.trim();
  return token && token.length > 0 ? token : null;
}

export function buildServerHealthWebSocketUrl(token: string): string {
  const encoded = encodeURIComponent(token);
  const path = `/api/server-health/ws?token=${encoded}`;
  const apiBase = getApiBaseUrl();

  if (apiBase) {
    const origin = new URL(apiBase);
    const protocol = origin.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${origin.host}${path}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${path}`;
}

export async function fetchServerHealthSnapshot(
  request?: { signal?: AbortSignal },
): Promise<ServerHealthSnapshot> {
  const api = getServerHealth();
  return api.getServerHealthSnapshotApiServerHealthSnapshotGet(
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export function serverHealthApiErrorMessage(
  err: unknown,
  fallback = "Could not load server health.",
): string {
  if (!isAxiosError(err)) {
    return err instanceof Error ? err.message : fallback;
  }
  const status = err.response?.status;
  if (status === 401) {
    return "Session expired or invalid. Sign in again.";
  }
  if (status === 403) {
    return "You do not have permission to view server health.";
  }
  const data = err.response?.data as unknown;
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    typeof (data as { detail: unknown }).detail === "string"
  ) {
    const detail = (data as { detail: string }).detail;
    if (detail.length > 0) return detail;
  }
  if (typeof status === "number") {
    return `${fallback} (HTTP ${status}).`;
  }
  if (typeof err.message === "string" && err.message.length > 0) {
    return err.message;
  }
  return fallback;
}

export function formatServerBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatServerUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [days > 0 && `${days}d`, hours > 0 && `${hours}h`, `${minutes}m`]
    .filter(Boolean)
    .join(" ");
}

export function usageProgressClass(
  percent: number,
  warnAt = 85,
): string | undefined {
  if (percent >= warnAt) return "bg-destructive";
  if (percent >= 70) return "bg-amber-500";
  return undefined;
}
