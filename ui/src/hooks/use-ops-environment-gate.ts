import { useGeolocation } from "@/hooks/use-geolocation";
import { useCallback, useEffect, useRef, useState } from "react";

const HEALTH_INTERVAL_MS = 12_000 * 5;
const HEALTH_TIMEOUT_MS = 8_000;

function getApiBaseUrl(): string {
  return String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
}

export function getOpsHealthCheckUrl(): string | null {
  const base = getApiBaseUrl();
  if (!base) return null;
  return `${base}/health`;
}

async function pingHealth(signal: AbortSignal): Promise<boolean> {
  const url = getOpsHealthCheckUrl();
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "GET",
      signal,
      cache: "no-store",
      headers: { Accept: "application/json, text/plain, */*" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Ops shell readiness: browser online, `/health` reachable, geolocation acquired.
 * Used by `OpsLayout` to block the app until all pass.
 */
export function useOpsEnvironmentGate() {
  const {
    isLocationReady,
    isLocationPromptOpen,
    status: locationStatus,
    lastErrorMessage: locationError,
    acquireLocation,
  } = useGeolocation();

  const [online, setOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine,
  );
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [healthChecking, setHealthChecking] = useState(false);
  const healthRequestId = useRef(0);

  const runHealthCheck = useCallback(async () => {
    const id = ++healthRequestId.current;
    setHealthChecking(true);
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      const url = getOpsHealthCheckUrl();
      if (!url) {
        if (healthRequestId.current === id) setHealthOk(false);
        return;
      }
      const ok = await pingHealth(controller.signal);
      if (healthRequestId.current === id) setHealthOk(ok);
    } catch {
      if (healthRequestId.current === id) setHealthOk(false);
    } finally {
      window.clearTimeout(t);
      if (healthRequestId.current === id) setHealthChecking(false);
    }
  }, []);

  const recheckAll = useCallback(async () => {
    if (typeof navigator !== "undefined") {
      setOnline(navigator.onLine);
    }
    await runHealthCheck();
  }, [runHealthCheck]);

  useEffect(() => {
    void runHealthCheck();
    const interval = window.setInterval(() => {
      void runHealthCheck();
    }, HEALTH_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void runHealthCheck();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [runHealthCheck]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => {
      setOnline(true);
      void runHealthCheck();
    };
    const onOffline = () => {
      setOnline(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [runHealthCheck]);

  const apiBaseConfigured = getOpsHealthCheckUrl() !== null;
  const locationUnsupported = locationStatus === "unsupported";

  const environmentReady =
    online && healthOk === true && isLocationReady && !locationUnsupported;

  return {
    environmentReady,
    online,
    apiBaseConfigured,
    healthOk,
    healthChecking,
    locationUnsupported,
    isLocationReady,
    isLocationPromptOpen,
    locationStatus,
    locationError,
    acquireLocation,
    recheckAll,
  };
}
