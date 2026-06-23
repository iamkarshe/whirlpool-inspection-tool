import { getApiBaseUrl } from "@/api/axios-instance";

export const NETWORK_HEALTH_TIMEOUT_MS = 8_000;
export const NETWORK_HEALTH_POLL_MS = 30_000;
export const NETWORK_SLOW_RTT_MS = 3_000;

export type NetworkHealthPingResult = {
  ok: boolean;
  rttMs: number;
  configured: boolean;
};

export function getNetworkHealthCheckUrl(): string | null {
  const base = getApiBaseUrl();
  if (!base) return null;
  return `${base}/health`;
}

type NetworkInformationLike = {
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

export function readBrowserNetworkHintSlow(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & {
    connection?: NetworkInformationLike;
  }).connection;
  if (!connection) return false;

  const effectiveType = connection.effectiveType?.toLowerCase();
  if (effectiveType === "slow-2g" || effectiveType === "2g") {
    return true;
  }
  if (typeof connection.rtt === "number" && connection.rtt > 1_000) {
    return true;
  }
  if (
    typeof connection.downlink === "number" &&
    connection.downlink > 0 &&
    connection.downlink < 0.5
  ) {
    return true;
  }
  return false;
}

export async function pingNetworkHealth(
  signal?: AbortSignal,
): Promise<NetworkHealthPingResult> {
  const url = getNetworkHealthCheckUrl();
  if (!url) {
    return { ok: false, rttMs: 0, configured: false };
  }

  const started = performance.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal,
      cache: "no-store",
      headers: { Accept: "application/json, text/plain, */*" },
    });
    const rttMs = Math.round(performance.now() - started);
    return { ok: res.ok, rttMs, configured: true };
  } catch {
    const rttMs = Math.round(performance.now() - started);
    return { ok: false, rttMs, configured: true };
  }
}

export function isSlowNetworkRtt(rttMs: number): boolean {
  return rttMs >= NETWORK_SLOW_RTT_MS;
}
