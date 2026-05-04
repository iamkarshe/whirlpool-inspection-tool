import DialogRequestLocation, {
  type DialogRequestLocationMode,
} from "@/components/dialogs/dialog-request-location";
import { GeolocationContext } from "@/contexts/geolocation-context";
import type {
  GeolocationContextValue,
  GeolocationCoords,
  GeolocationStatus,
} from "@/contexts/geolocation-context";
import {
  isGeolocationSupported,
  requestCurrentPosition,
} from "@/lib/browser-location";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Tab session only — cleared when the tab closes. */
const OPS_GEO_SESSION_KEY = "whirlpool.ops.geolocationSession.v1";
/** Re-use coordinates for this long without asking again (reload-safe). */
const OPS_GEO_SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000;

type StoredGeoSession = { lat: number; lng: number; savedAt: number };

function readStoredGeoSession(): GeolocationCoords | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(OPS_GEO_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredGeoSession;
    if (
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number" ||
      typeof parsed.savedAt !== "number" ||
      !Number.isFinite(parsed.savedAt)
    ) {
      return null;
    }
    if (Date.now() - parsed.savedAt > OPS_GEO_SESSION_MAX_AGE_MS) {
      window.sessionStorage.removeItem(OPS_GEO_SESSION_KEY);
      return null;
    }
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return null;
  }
}

function writeStoredGeoSession(coords: GeolocationCoords): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredGeoSession = {
      lat: coords.lat,
      lng: coords.lng,
      savedAt: Date.now(),
    };
    window.sessionStorage.setItem(OPS_GEO_SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

function getInitialGeoState(): {
  status: GeolocationStatus;
  coordinates: GeolocationCoords | null;
} {
  if (typeof window === "undefined") {
    return { status: "idle", coordinates: null };
  }
  if (!isGeolocationSupported()) {
    return { status: "unsupported", coordinates: null };
  }
  const stored = readStoredGeoSession();
  if (stored) {
    return { status: "ready", coordinates: stored };
  }
  return { status: "idle", coordinates: null };
}

export function GeolocationProvider({ children }: { children: ReactNode }) {
  const initial = getInitialGeoState();
  const coordinatesRef = useRef<GeolocationCoords | null>(initial.coordinates);
  const statusRef = useRef<GeolocationStatus>(initial.status);
  const pendingResolvers = useRef<
    Array<(value: GeolocationCoords | null) => void>
  >([]);

  const [status, setStatusState] = useState<GeolocationStatus>(initial.status);
  const [coordinates, setCoordinatesState] = useState<GeolocationCoords | null>(
    initial.coordinates,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<
    string | undefined
  >();

  const setStatus = useCallback((next: GeolocationStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const setCoordinates = useCallback((next: GeolocationCoords | null) => {
    coordinatesRef.current = next;
    setCoordinatesState(next);
  }, []);

  /** After reload: if permission is already granted, reuse cached fix without opening dialogs. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isGeolocationSupported()) return;
    if (statusRef.current === "ready" && coordinatesRef.current) return;
    if (statusRef.current === "unsupported") return;

    let cancelled = false;
    void (async () => {
      const result = await requestCurrentPosition({
        maximumAge: 24 * 60 * 60 * 1000,
        enableHighAccuracy: false,
        timeoutMs: 12_000,
      });
      if (cancelled) return;
      if (result.ok) {
        const coords = { lat: result.lat, lng: result.lng };
        setCoordinates(coords);
        setStatus("ready");
        writeStoredGeoSession(coords);
        return;
      }
      if (result.code === 1) {
        setLastErrorMessage(result.message);
        setStatus("locked");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setCoordinates, setStatus]);

  const flushPending = useCallback((value: GeolocationCoords | null) => {
    const list = pendingResolvers.current;
    pendingResolvers.current = [];
    for (const resolve of list) {
      resolve(value);
    }
  }, []);

  const acquireLocation = useCallback((): Promise<GeolocationCoords | null> => {
    if (!isGeolocationSupported()) {
      setStatus("unsupported");
      setDialogOpen(true);
      return Promise.resolve(null);
    }

    if (statusRef.current === "unsupported") {
      setDialogOpen(true);
      return Promise.resolve(null);
    }

    if (statusRef.current === "ready" && coordinatesRef.current) {
      return Promise.resolve(coordinatesRef.current);
    }

    if (statusRef.current === "locked") {
      setLastErrorMessage(undefined);
      setStatus("prompt");
    }

    return new Promise((resolve) => {
      pendingResolvers.current.push(resolve);
      setDialogOpen(true);
      if (statusRef.current === "idle" || statusRef.current === "locked") {
        setStatus("prompt");
      }
    });
  }, [setStatus]);

  const handleAllowLocation = useCallback(async () => {
    if (!isGeolocationSupported()) {
      setStatus("unsupported");
      setLastErrorMessage(undefined);
      setDialogOpen(true);
      flushPending(null);
      return;
    }

    setStatus("requesting");
    setLastErrorMessage(undefined);

    const result = await requestCurrentPosition();
    if (result.ok) {
      const coords = { lat: result.lat, lng: result.lng };
      setCoordinates(coords);
      setStatus("ready");
      writeStoredGeoSession(coords);
      setDialogOpen(false);
      flushPending(coords);
      return;
    }

    setLastErrorMessage(result.message);
    setStatus("locked");
    setDialogOpen(true);
    flushPending(null);
  }, [flushPending, setCoordinates, setStatus]);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    const unlocked =
      statusRef.current === "ready" && coordinatesRef.current !== null;
    if (!open && !unlocked) return;
    setDialogOpen(open);
  }, []);

  const isLocationReady = status === "ready" && coordinates !== null;

  const dismissDisabled = !isLocationReady;

  const dialogMode: DialogRequestLocationMode =
    status === "ready" || status === "idle" ? "prompt" : status;

  const value = useMemo<GeolocationContextValue>(
    () => ({
      status,
      isLocationPromptOpen: dialogOpen,
      coordinates,
      coordinatesRef,
      lastErrorMessage,
      isLocationReady,
      acquireLocation,
    }),
    [
      status,
      dialogOpen,
      coordinates,
      coordinatesRef,
      lastErrorMessage,
      isLocationReady,
      acquireLocation,
    ],
  );

  return (
    <GeolocationContext.Provider value={value}>
      {children}
      <DialogRequestLocation
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        mode={dialogMode}
        dismissDisabled={dismissDisabled}
        lastErrorMessage={lastErrorMessage}
        onAllowLocation={handleAllowLocation}
      />
    </GeolocationContext.Provider>
  );
}
