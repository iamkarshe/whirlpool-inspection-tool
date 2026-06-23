import { useCallback, useEffect, useRef, useState } from "react";

import { useGeolocation } from "@/hooks/use-geolocation";
import {
  getNetworkHealthCheckUrl,
  NETWORK_HEALTH_TIMEOUT_MS,
  pingNetworkHealth,
} from "@/lib/network-health";

const HEALTH_INTERVAL_MS = 12_000 * 5;

export { getNetworkHealthCheckUrl as getOpsHealthCheckUrl };

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
    const timeout = window.setTimeout(
      () => controller.abort(),
      NETWORK_HEALTH_TIMEOUT_MS,
    );
    try {
      const result = await pingNetworkHealth(controller.signal);
      if (healthRequestId.current === id) {
        setHealthOk(result.configured ? result.ok : false);
      }
    } catch {
      if (healthRequestId.current === id) setHealthOk(false);
    } finally {
      window.clearTimeout(timeout);
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
    queueMicrotask(() => void runHealthCheck());
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

  const apiBaseConfigured = getNetworkHealthCheckUrl() !== null;
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
