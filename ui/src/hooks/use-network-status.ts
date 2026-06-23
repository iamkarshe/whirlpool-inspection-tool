import { useCallback, useEffect, useRef, useState } from "react";

import {
  isSlowNetworkRtt,
  NETWORK_HEALTH_POLL_MS,
  NETWORK_HEALTH_TIMEOUT_MS,
  NETWORK_SLOW_RTT_MS,
  pingNetworkHealth,
  readBrowserNetworkHintSlow,
} from "@/lib/network-health";

const SLOW_BANNER_DISMISSED_KEY = "whirlpool.network.slow_banner_dismissed";

export type NetworkBannerKind = "offline" | "api_unreachable" | "slow" | null;

export type NetworkStatusState = {
  online: boolean;
  apiReachable: boolean | null;
  apiConfigured: boolean;
  slowNetwork: boolean;
  lastRttMs: number | null;
  bannerKind: NetworkBannerKind;
  slowBannerDismissed: boolean;
  healthChecking: boolean;
  dismissSlowBanner: () => void;
  recheck: () => Promise<void>;
};

function readSlowBannerDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(SLOW_BANNER_DISMISSED_KEY) === "true";
}

function writeSlowBannerDismissed(dismissed: boolean): void {
  if (typeof window === "undefined") return;
  if (dismissed) {
    window.sessionStorage.setItem(SLOW_BANNER_DISMISSED_KEY, "true");
  } else {
    window.sessionStorage.removeItem(SLOW_BANNER_DISMISSED_KEY);
  }
}

export function useNetworkStatus(
  pollIntervalMs = NETWORK_HEALTH_POLL_MS,
): NetworkStatusState {
  const [online, setOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine,
  );
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const [apiConfigured, setApiConfigured] = useState(true);
  const [lastRttMs, setLastRttMs] = useState<number | null>(null);
  const [browserHintSlow, setBrowserHintSlow] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);
  const [slowBannerDismissed, setSlowBannerDismissed] = useState(
    readSlowBannerDismissed,
  );
  const requestIdRef = useRef(0);

  const syncBrowserHint = useCallback(() => {
    setBrowserHintSlow(readBrowserNetworkHintSlow());
  }, []);

  const runHealthCheck = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setHealthChecking(true);
    syncBrowserHint();

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      NETWORK_HEALTH_TIMEOUT_MS,
    );

    try {
      const result = await pingNetworkHealth(controller.signal);
      if (requestId !== requestIdRef.current) return;

      setApiConfigured(result.configured);
      setApiReachable(result.ok);
      setLastRttMs(result.rttMs);

      if (
        result.configured &&
        result.ok &&
        !isSlowNetworkRtt(result.rttMs) &&
        !readBrowserNetworkHintSlow()
      ) {
        setSlowBannerDismissed(false);
        writeSlowBannerDismissed(false);
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestId === requestIdRef.current) {
        setHealthChecking(false);
      }
    }
  }, [syncBrowserHint]);

  const recheck = useCallback(async () => {
    if (typeof navigator !== "undefined") {
      setOnline(navigator.onLine);
    }
    await runHealthCheck();
  }, [runHealthCheck]);

  useEffect(() => {
    queueMicrotask(() => void runHealthCheck());

    const interval = window.setInterval(() => {
      void runHealthCheck();
    }, pollIntervalMs);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void runHealthCheck();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pollIntervalMs, runHealthCheck]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOnline = () => {
      setOnline(true);
      void runHealthCheck();
    };
    const onOffline = () => {
      setOnline(false);
      setApiReachable(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const connection = (navigator as Navigator & {
      connection?: {
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    }).connection;

    const onConnectionChange = () => syncBrowserHint();
    connection?.addEventListener?.("change", onConnectionChange);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      connection?.removeEventListener?.("change", onConnectionChange);
    };
  }, [runHealthCheck, syncBrowserHint]);

  const slowNetwork =
    online &&
    (browserHintSlow ||
      (lastRttMs !== null && isSlowNetworkRtt(lastRttMs)));

  const bannerKind: NetworkBannerKind = !online
    ? "offline"
    : apiReachable === false
      ? "api_unreachable"
      : slowNetwork && !slowBannerDismissed
        ? "slow"
        : null;

  const dismissSlowBanner = useCallback(() => {
    setSlowBannerDismissed(true);
    writeSlowBannerDismissed(true);
  }, []);

  return {
    online,
    apiReachable,
    apiConfigured,
    slowNetwork,
    lastRttMs,
    bannerKind,
    slowBannerDismissed,
    healthChecking,
    dismissSlowBanner,
    recheck,
  };
}

export function networkBannerMessage(
  kind: Exclude<NetworkBannerKind, null>,
  opts?: { lastRttMs?: number | null },
): string {
  switch (kind) {
    case "offline":
      return "You're offline. Syncing, uploads, and live updates won't work until you're back online.";
    case "api_unreachable":
      return "Can't reach the server. Check your internet connection, VPN, or try again in a moment.";
    case "slow":
      return opts?.lastRttMs && opts.lastRttMs >= NETWORK_SLOW_RTT_MS
        ? `Slow network detected (${opts.lastRttMs} ms). Features may not work well.`
        : "Slow network detected. Features may not work well.";
  }
}
